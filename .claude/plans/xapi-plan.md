# 🔌 X API Integration Plan

> Everything needed to connect Content Scheduler to the X (Twitter) API for real posting.
> **Stack: Vercel (frontend + API functions) + Supabase (database + token storage)**

---

## 1. What You Need to Do (Account Setup)

### 1.1 Create an X Developer Account
1. Go to [https://developer.x.com/](https://developer.x.com/)
2. Sign in with the X account you want to post from
3. Apply for developer access — you'll need to describe your use case (e.g., "personal content scheduling tool")
4. Wait for approval (usually instant)

### 1.2 Create a Project & App
1. In the Developer Portal, go to **Projects & Apps** → **Create Project**
2. Name it something like "Content Scheduler"
3. Create an **App** inside that project

### 1.3 Configure Authentication
1. Go to your App → **Settings** → **User authentication settings** → **Edit**
2. Set these values:

| Setting | Value |
|---|---|
| **App permissions** | **Read and Write** (required to post tweets) |
| **Type of App** | **Web App** |
| **Callback URL (local dev)** | `http://127.0.0.1:5173/auth/callback` |
| **Callback URL (production)** | `https://your-app.vercel.app/auth/callback` |
| **Website URL** | `http://127.0.0.1:5173` (update to your Vercel URL after deploy) |

> [!IMPORTANT]
> X **does not allow `localhost`** as a callback or website URL. Use `http://127.0.0.1` instead — it's the same thing but X accepts it. In production, use `https://`.

> [!NOTE]
> You can register up to 10 callback URLs — add both your local and production URLs so both work without changing settings.

3. Click **Save**

### 1.4 Get Your Credentials
1. Go to your App → **Keys and Tokens**
2. Copy and save these somewhere safe:
   - **Client ID** (for OAuth 2.0)
   - **Client Secret** (for OAuth 2.0)

> [!CAUTION]
> **NEVER put these in your frontend code.** They go in Vercel environment variables only.

### 1.5 Understand the Costs & Limits

The X API uses **pay-per-usage credits** — no subscriptions. You buy credits upfront and they're deducted per API call.

**Request rate limits:**

| Limit | Value |
|---|---|
| POST (write) per user per 15 min | 200 requests |
| POST (write) per user per 3 hours | 300 requests total |
| DELETE per user per 15 min | 50 requests |

For 3 posts per day you'll never come close to these limits. For exact credit costs, check the [Developer Console](https://console.x.com).

> [!NOTE]
> You can set a **spending limit** in the Developer Console to cap your monthly cost.

---

## 2. Architecture Overview

The app moves from frontend-only (localStorage) to a full stack:
- **Vercel** hosts the React frontend and serverless API functions (no separate server needed)
- **Supabase** stores posts and X OAuth tokens securely
- **Vercel Cron** checks for due posts every 5 minutes and fires them automatically

```
┌──────────────────┐       ┌────────────────────────┐       ┌─────────┐
│  React Frontend  │ ────→ │   Vercel API Functions  │ ────→ │  X API  │
│  (Vite → Vercel) │ ←──── │  /api/auth/*, /api/post │ ←──── │  v2     │
└──────────────────┘       └────────────────────────┘       └─────────┘
                                       │ ↕
                               ┌───────────────┐
                               │   Supabase    │
                               │  posts table  │
                               │  tokens table │
                               └───────────────┘
                                       ↑
                            Vercel Cron (every 5 min)
                            → checks for due posts
                            → posts to X automatically
```

**Why every 5 minutes?** You're scheduling ~3 posts/day at specific times. The worst case is a post fires 4 minutes late — completely fine for a content scheduler.

---

## 3. New Accounts to Set Up

### 3.1 Vercel
1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Connect your GitHub account
3. Import your `content_poster` repo → it will auto-deploy on every push

### 3.2 Supabase
1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Create a new project (pick a region close to you)
3. Save the **Project URL** and **anon public key** from Settings → API

### 3.3 Supabase Database Schema

Run this SQL in the Supabase SQL Editor:

```sql
-- Stores scheduled posts
create table posts (
  id uuid primary key default gen_random_uuid(),
  tweets jsonb not null,           -- array of tweet strings
  scheduled_at timestamptz not null,
  status text not null default 'queued',  -- queued | posted | failed
  posted_at timestamptz,
  tweet_ids text[],                -- X tweet IDs after posting
  error text,
  created_at timestamptz default now()
);

-- Stores X OAuth tokens (one row — personal tool)
create table x_tokens (
  id int primary key default 1,    -- single row
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null
);

-- Lock the tokens table to one row
alter table x_tokens add constraint one_row check (id = 1);
```

> [!IMPORTANT]
> In Supabase → Authentication → Policies, make sure both tables have **Row Level Security enabled** and are **not publicly readable**. Only your API functions (using the service role key) should access them.

---

## 4. New Dependencies

```bash
# X API client
npm install twitter-api-v2

# Supabase client
npm install @supabase/supabase-js
```

The `twitter-api-v2` package handles OAuth signing and all API calls. The Supabase client talks to your database.

---

## 5. New Files to Create

```
content_poster/
├── api/                             # NEW — Vercel serverless functions
│   ├── auth/
│   │   ├── login.js                 # Redirects to X OAuth
│   │   └── callback.js              # Handles X redirect, stores tokens
│   ├── post.js                      # Posts a single tweet or thread
│   └── cron.js                      # Scheduler — checks for due posts
├── vercel.json                      # NEW — cron config
├── .env.local                       # API keys (git-ignored)
├── .env.example                     # Template for required env vars
└── src/
    ├── lib/
    │   └── supabase.js              # NEW — Supabase client
    ├── hooks/
    │   └── useAuth.js               # NEW — auth state hook
    ├── components/
    │   ├── AuthButton.jsx           # NEW — Login with X button
    │   └── PostCard.jsx             # MODIFIED — add "Post Now" button
    ├── App.jsx                      # MODIFIED — add auth state, post actions
    └── ...
```

---

## 6. Backend Implementation

### 6.1 Environment Variables (`.env.local`)

```env
# X API Credentials
X_CLIENT_ID=your_client_id_here
X_CLIENT_SECRET=your_client_secret_here

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
VITE_APP_URL=http://127.0.0.1:5173
CRON_SECRET=some_random_string   # protects the cron endpoint
```

Add all of these in **Vercel Dashboard → Settings → Environment Variables** too.

### 6.2 Vercel Cron Config (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs `/api/cron` every 5 minutes, 24/7, at no extra cost on the Vercel Hobby plan.

### 6.3 OAuth Flow (`api/auth/login.js` and `api/auth/callback.js`)

**Routes:**

| Route | Purpose |
|---|---|
| `GET /api/auth/login` | Generates OAuth URL & redirects user to X |
| `GET /api/auth/callback` | X redirects here — exchanges code for tokens, saves to Supabase |

**Flow:**
1. User clicks "Connect X" in the frontend
2. Frontend navigates to `/api/auth/login`
3. Function generates a PKCE code verifier + challenge, stores verifier in a cookie
4. Function redirects to `https://x.com/i/oauth2/authorize?...`
5. User logs in and approves the app on X
6. X redirects to `/api/auth/callback?code=...`
7. Function exchanges the code for **access_token** + **refresh_token** — **must happen within 30 seconds** or the auth code expires
8. Tokens are saved to the `x_tokens` table in Supabase
9. Function redirects back to the frontend

**Required OAuth 2.0 Scopes:**
- `tweet.read` — read tweets
- `tweet.write` — post tweets
- `users.read` — read user profile (for displaying logged-in user)
- `offline.access` — get a refresh token (required for auto-posting)

### 6.4 Tweet Posting (`api/post.js`)

| Route | Purpose |
|---|---|
| `POST /api/post` | Post a single tweet or thread immediately |

**Thread logic (sequential — no batch endpoint exists):**
```javascript
// Body: { tweets: ["First tweet", "Second tweet", "Third tweet"] }
let previousTweetId = null;
for (const text of tweets) {
  const options = previousTweetId
    ? { text, reply: { in_reply_to_tweet_id: previousTweetId } }
    : { text };
  const response = await client.v2.tweet(options);
  previousTweetId = response.data.id;
}
```

> [!IMPORTANT]
> Threads must be posted **sequentially** — each tweet needs the previous tweet's ID to chain as a reply.

### 6.5 Cron Scheduler (`api/cron.js`)

Runs every 5 minutes. Logic:
1. Verify the `CRON_SECRET` header (prevents unauthorised triggers)
2. Query Supabase for posts where `status = 'queued'` and `scheduled_at <= now()`
3. For each due post: fetch tokens, refresh if expired, post to X, update status to `posted`
4. On failure: update status to `failed`, save error message

### 6.6 Token Management

- Access tokens expire after **~2 hours**
- Before every post (both manual and cron), check `expires_at` in Supabase
- If expired, use the refresh token to get a new one and update Supabase
- If the refresh token is also expired, the user must re-connect X

---

## 7. Frontend Changes

### 7.1 New: Supabase Client (`src/lib/supabase.js`)

```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 7.2 New: `useAuth` Hook (`src/hooks/useAuth.js`)

```javascript
export function useAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if a token row exists in Supabase
    supabase.from('x_tokens').select('id').maybeSingle()
      .then(({ data }) => { setIsConnected(!!data); setIsLoading(false); });
  }, []);

  const login = () => window.location.href = '/api/auth/login';
  const logout = () => { /* delete token row, update state */ };

  return { isConnected, isLoading, login, logout };
}
```

### 7.3 New: `AuthButton` Component (`src/components/AuthButton.jsx`)

- Shows in the top nav (right side, next to Settings)
- If not connected: "Connect X" button (opens OAuth flow)
- If connected: Shows "X Connected ✓" with a disconnect option

### 7.4 Modified: `PostCard.jsx`

Add a **"Post Now"** button to each queued post card:
- Only visible if X is connected
- Calls `POST /api/post` immediately
- Updates post status from `queued` → `posted` on success
- Shows error toast on failure

### 7.5 Modified: Data Model

Posts now live in **Supabase** instead of localStorage. The shape matches the DB schema:

```javascript
{
  id: "uuid",
  tweets: [{ content: "Hello!" }],   // stored as JSONB
  scheduled_at: "2026-04-08T14:30:00Z",
  status: "posted",                  // queued | posted | failed
  posted_at: "2026-04-08T14:31:02Z",
  tweet_ids: ["123456789"],          // real X tweet IDs
  error: null,
}
```

All CRUD operations (create, read, update, delete) go through the Supabase JS client directly from the frontend, using the anon key + Row Level Security.

---

## 8. Implementation Order

### Step 1 — Set Up Accounts & Database
1. Create Vercel account, connect GitHub repo
2. Create Supabase project, run the SQL schema
3. Copy all env vars into `.env.local` and Vercel dashboard

### Step 2 — OAuth Flow
1. Implement `/api/auth/login` (generate PKCE, redirect to X)
2. Implement `/api/auth/callback` (exchange code, save tokens to Supabase)
3. Test: visit `/api/auth/login` in browser → can you connect X and see the token row in Supabase?

### Step 3 — Manual Posting
1. Implement `POST /api/post` (single tweet + thread)
2. Test with curl/Postman: can you post a tweet?

### Step 4 — Migrate Posts to Supabase
1. Replace localStorage reads/writes with Supabase queries
2. Test: create a post in the UI, verify it appears in Supabase

### Step 5 — Auto-Scheduler
1. Add `vercel.json` with cron config
2. Implement `/api/cron` (query due posts, post them, update status)
3. Deploy to Vercel (cron only runs in production, not local dev)
4. Test: schedule a post 6 minutes in the future, wait for it to fire

### Step 6 — Frontend Integration
1. Add Supabase client (`src/lib/supabase.js`)
2. Create `useAuth` hook + `AuthButton` component
3. Add "Post Now" button to PostCard
4. Wire up posting flow with toasts
5. Add `posted` / `failed` status styling

### Step 7 — Polish
1. Error handling (rate limits, token expiry, network errors)
2. Loading states on post buttons
3. Token auto-refresh before posting
4. Show scheduled posts with a countdown or timestamp

---

## 9. Security Checklist

- [ ] `.env.local` is in `.gitignore` — **never commit API keys**
- [ ] X credentials only in Vercel env vars, never in frontend code
- [ ] Supabase `x_tokens` table has RLS enabled and no public read policy
- [ ] `CRON_SECRET` header validated in `/api/cron` to prevent unauthorised triggers
- [ ] OAuth `state` parameter validated in callback to prevent CSRF
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only used server-side (API functions), never exposed to frontend
- [ ] Use `SUPABASE_ANON_KEY` in the frontend (it's safe to expose, RLS enforces access)

---

## 10. Testing Checklist

- [ ] OAuth login flow works (redirect to X → approve → redirect back → token in Supabase)
- [ ] "Connect X" button shows "X Connected ✓" after auth
- [ ] Single tweet posts successfully via "Post Now"
- [ ] Thread posts all tweets in correct order
- [ ] Post status updates to `posted` after success
- [ ] Error toast shows on API failure
- [ ] Token refresh works when access token expires
- [ ] Cron fires within 5 minutes of scheduled time and posts correctly
- [ ] Failed posts show error state, not stuck as `queued`
- [ ] Disconnect clears token from Supabase

---

> [!NOTE]
> **Start with Steps 1–3 and test with curl before touching the frontend.** Once you can post a tweet via the API, the rest is wiring up the UI. The cron scheduler (Step 5) only works after deploying to Vercel — test it in production with a post scheduled a few minutes out.
