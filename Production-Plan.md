# Production Plan — Content Scheduler

> Goal: turn this single-user personal tool into a multi-tenant, user-facing product with Supabase magic-link auth and per-user editable context files for the AI chat.

---

## 1. Current state (what exists today)

- **Frontend**: Vite + React 19 SPA (`src/`). Views: Composer, Queue, Calendar, AI Assistant, Settings.
- **Backend**: Vercel Functions in `/api/` — `ai.js` (chat), `cron.js` (scheduled posting), `boost-worker.js`, `post.js`, `auth/*` (Twitter OAuth).
- **Storage**: Supabase Postgres with two tables — `posts`, `settings` (single-row id=1), `x_tokens` (single-row id=1).
- **Context files**: filesystem-based at `/context/*.md` with frontmatter (`always`, `triggers`). Loaded by `api/ai.js` from disk.
- **Auth**: only Twitter/X OAuth for posting. **No app-level user accounts.** Everyone hitting the deployment shares the same data.

**Blockers to public release**: no user identity, all rows are global, context files are baked into the deploy, no row-level security, no rate limiting, no abuse protection.

---

## 2. Architecture changes (the core shift)

### 2.1 Add a user identity layer (Supabase Auth, magic link)

- Enable **Email magic link** in Supabase Dashboard → Authentication → Providers → Email (toggle "Email" with "Magic link" option, disable password).
- Configure Site URL + redirect URLs (prod + preview deployment URL pattern).
- Email template: customize sender, subject, branded copy.
- Replace the current Twitter "connect" gate (`useAuth` checks `/api/auth/status`) with a Supabase auth gate. Twitter OAuth becomes a *secondary* per-user integration, not the app login.

### 2.2 Make every table user-scoped

Add `user_id uuid references auth.users(id) on delete cascade` to:

- `posts`
- `settings` (drop the hardcoded `id=1` pattern; key by `user_id` instead)
- `x_tokens` (one row per user, not one global row)
- **new** `context_files` table (see §3)

### 2.3 Lock down with Row-Level Security (RLS)

Enable RLS on every user-scoped table and add policies like:

```sql
alter table posts enable row level security;
create policy "users read own posts"   on posts for select using (auth.uid() = user_id);
create policy "users insert own posts" on posts for insert with check (auth.uid() = user_id);
create policy "users update own posts" on posts for update using (auth.uid() = user_id);
create policy "users delete own posts" on posts for delete using (auth.uid() = user_id);
```

Repeat for `settings`, `x_tokens`, `context_files`.

The browser uses the **anon key** (already in `src/lib/supabase.js`) — RLS is what keeps users isolated. The server functions that need to bypass RLS (cron, OAuth callback) keep using the **service role key** but must filter by `user_id` explicitly.

---

## 3. Per-user context files (replaces `/context/*.md`)

The current filesystem load in `api/ai.js` (`loadContextFiles`) cannot work for multiple users. Move context to the database.

### 3.1 Schema

```sql
create table context_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                    -- e.g. "profile", "tone", "content_angles"
  content text not null,                 -- the markdown body
  always_include boolean default false,  -- replaces frontmatter `always: true`
  triggers text[] default '{}',          -- replaces frontmatter `triggers:`
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, name)
);
```

Enable RLS with the same four policies as above.

### 3.2 New UI: "Context" view

Add a top-level view (alongside Composer / Queue / Calendar / AI) where users:

- See a list of their context files.
- Create / rename / delete files.
- Edit the markdown body in a simple textarea (or later, a markdown editor).
- Toggle "Always include" and edit the trigger keywords list.
- Optionally seed defaults on first signup (copy current `/context/*.md` files as starter templates so new users aren't staring at an empty list).

### 3.3 Refactor `api/ai.js`

Replace the `fs.readdirSync('context')` block with a Supabase query scoped to the calling user:

```js
const { data: files } = await supabase
  .from('context_files')
  .select('name, content, always_include, triggers')
  .eq('user_id', userId);
```

The user identity for the API call comes from the Supabase access token in the request — pass it via `Authorization: Bearer <token>` from the client (`useChat` `headers`) and verify server-side with `supabase.auth.getUser(token)`.

The same `posts` query in `ai.js` must add `.eq('user_id', userId)`.

---

## 4. Auth flow (concrete)

### 4.1 Client

- New `<AuthGate>` component that wraps `<App>`. If no Supabase session, render a "Sign in with magic link" screen; otherwise render the app.
- Replace `src/hooks/useAuth.js` (currently Twitter-only) with `useSession` that wraps `supabase.auth.getSession()` + `onAuthStateChange`.
- Keep `useAuth` (Twitter) but rename it `useTwitterConnection` — it represents a per-user *integration*, not app login.
- Magic link send: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: <site-url> } })`.

### 4.2 Server

- All `/api/*` routes must read the user from the Supabase JWT in `Authorization` header and reject if missing/invalid.
- `api/auth/callback.js` (Twitter OAuth callback): the `state` cookie should embed the Supabase user id so the resulting `x_tokens` row gets the right `user_id`.
- `api/cron.js`: this runs on a schedule with no user context. Update the loop to fetch *all* due posts across all users, then group by `user_id` and use each user's `x_tokens` row.

---

## 5. Multi-tenant cron / posting

`api/cron.js` today assumes one global X account. Changes:

```js
// fetch all due posts joined with the right user's tokens
const { data: duePosts } = await supabase
  .from('posts')
  .select('*, x_tokens!inner(*)')
  .eq('status', 'queued')
  .lte('scheduled_at', new Date().toISOString());
```

Per post, refresh that user's token if needed and post via their X client. Same pattern in `api/boost-worker.js`.

---

## 6. Settings cleanup

- Drop the `id = 1` hardcode in `usePosts.js` and `Settings.jsx`. Key by `user_id`.
- `localStorage` cache is fine but namespace by user id (`cp-settings-${userId}`) so account-switching on the same browser doesn't leak.

---

## 7. Production hardening

| Concern | Action |
|---|---|
| **Rate limiting** | Add per-user rate limits on `/api/ai` (token + request budget). Use Vercel KV or Upstash. |
| **AI cost cap** | Track tokens per user per day; cut off above threshold. Surface usage in UI. |
| **Abuse / spam signups** | Supabase has built-in rate limits on magic links; consider a CAPTCHA (hCaptcha/Turnstile) on the sign-in form for prod. |
| **Email deliverability** | Configure custom SMTP in Supabase (Resend, Postmark, SendGrid) — the default Supabase SMTP is rate-limited and not for production. |
| **Error tracking** | Add Sentry (or similar) to both client and Vercel functions. |
| **Logging** | Keep `console.error` in functions; pipe to Vercel Logs / Logtail. |
| **Secrets** | Move all keys to Vercel Project Env Vars (Production + Preview, separate Supabase projects ideally). |
| **CORS** | Lock `/api/*` to the production domain. |
| **Backups** | Enable Supabase daily backups (Pro plan or Point-in-Time Recovery). |

---

## 8. Legal & UX prerequisites for a public product

- **Terms of Service** and **Privacy Policy** pages (must disclose data stored, X/Twitter integration, AI processing of user content via Anthropic).
- **Account deletion**: an in-app "Delete my account" flow that triggers `auth.admin.deleteUser(id)` server-side; `on delete cascade` on every FK takes care of the rest.
- **Data export**: nice-to-have — JSON dump of posts + context files.
- **Onboarding**: empty-state copy for first-time users; seed default context files; short walkthrough.
- **Pricing / paywall**: decide if free tier exists, where the paywall sits (post count? AI tokens?). Stripe via Supabase or directly.

---

## 9. Migration plan (your existing data)

Since you're the only current user, the migration is small:

1. Create your Supabase auth account first (sign in with magic link in the new flow).
2. Grab your `auth.users.id`.
3. One-time SQL: `update posts set user_id = '<your-uuid>'; update settings set user_id = '<your-uuid>'; update x_tokens set user_id = '<your-uuid>';`
4. Insert your existing `/context/*.md` files into `context_files` with that `user_id`. Then delete the `/context/` directory from the repo.

---

## 10. Phased rollout

**Phase 1 — Auth foundation (no UX changes for you yet)**
- Enable Supabase magic link, build `<AuthGate>`, add `user_id` columns + RLS.
- Migrate your data.
- Verify the app still works end-to-end as a logged-in user.

**Phase 2 — Per-user context files**
- `context_files` table + RLS.
- New "Context" view in the app (CRUD UI).
- Refactor `api/ai.js` to read from DB scoped to the user.
- Delete `/context/*.md` from repo.

**Phase 3 — Multi-tenant infrastructure**
- Rewrite `api/cron.js` and `api/boost-worker.js` to iterate users.
- Per-user Twitter OAuth (state cookie carries user id).
- Per-user settings.

**Phase 4 — Production hardening**
- Rate limits, AI cost caps, custom SMTP, Sentry, CORS lock-down.
- Account deletion + data export.
- ToS / Privacy Policy.

**Phase 5 — Polish & launch**
- Onboarding flow, empty states, default context templates.
- Pricing decision + Stripe (if paid).
- Marketing site / landing page (could be the same SPA or separate).
- Open signups.

---

## 11. Open decisions (need your input before starting)

1. **Free vs paid?** Free tier limits drive AI cost cap design.
2. **One Anthropic API key for all users (you absorb cost)** or **users supply their own**? The first is normal SaaS; the second is cheaper to launch but worse UX.
3. **Custom domain** for the production app?
4. **Email sender identity** — what address should magic links come from?
5. **Should the X account integration stay required**, or can users use the AI/drafting features without ever connecting X?
