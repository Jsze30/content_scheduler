# Repost Boost Feature — Plan

## What It Does

A one-time impression boost for any published post:

1. **Original post** publishes at scheduled time
2. **Repost** — after a configurable delay, the post is retweeted (self-RT) to push it back to the top of follower feeds for a second impression wave
3. **Unrepost** — after another configurable delay, the RT is deleted so the profile stays clean

This is a single cycle, not recurring. It requires X API access (OAuth tokens).

---

## Lifecycle

```
queued → posted → (repostAfterHours) → reposted → (unrepostAfterHours) → unreposted
```

Status field on a post with boost enabled:
- `queued` — waiting to be posted
- `posted` — original tweet is live, waiting for repost window
- `reposted` — self-RT is live, waiting for unrepost window
- `unreposted` — RT deleted, cycle complete
- `failed` — any step failed (stored in `boost.error`)

---

## Optimal Timing

| Parameter | Default | Reasoning |
|-----------|---------|-----------|
| Repost after | **20 hours** | First engagement wave is dead; hits different time zones and scroll sessions |
| Unrepost after | **3 hours** | Enough time for a second impression spike; profile stays clean |

Acceptable ranges:
- Repost delay: 18–24 hours
- Unrepost delay: 2–6 hours

---

## Data Model Addition

```javascript
// Added to DEFAULT_SETTINGS in usePosts.js
boost: {
  enabled: false,           // global toggle — applies to all new posts when on
  repostAfterHours: 20,     // hours after original post → fire self-RT
  unrepostAfterHours: 3,    // hours after self-RT → delete the RT
}
```

Post-level boost state (tracked in Supabase `posts` table, `boost` JSONB column):

```javascript
boost: {
  repostId: null,           // tweet ID of the RT (needed to delete it)
  repostedAt: null,         // ISO timestamp when RT was fired
  unrepostedAt: null,       // ISO timestamp when RT was deleted
  status: 'pending',        // 'pending' | 'reposted' | 'unreposted' | 'skipped' | 'failed'
  error: null,              // error message if any step failed
}
```

---

## Supabase Schema — SQL to Run

Open the **Supabase Dashboard → SQL Editor** and run:

```sql
-- 1. Add boost column to posts table
ALTER TABLE posts ADD COLUMN boost JSONB DEFAULT NULL;

-- 2. Index for worker queries (filters by boost status efficiently)
CREATE INDEX idx_posts_boost_status
  ON posts ((boost->>'status'))
  WHERE boost IS NOT NULL;

-- 3. Index for finding posts ready to repost
--    Worker queries: status='posted' AND boost->>'status'='pending' AND scheduled_at <= now - interval
CREATE INDEX idx_posts_boost_pending
  ON posts (scheduled_at)
  WHERE status = 'posted' AND boost IS NOT NULL;
```

Verify the column exists after running:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts' AND column_name = 'boost';
```

---

## X API Cost — Pay-Per-Use Reality

> **Important:** X does not offer true pay-per-use pricing. Access is sold as monthly subscription tiers. There is no way to pay per API call.

| Action | Endpoint | "Units" consumed |
|--------|----------|-----------------|
| Repost (self-RT) | `POST /2/users/:id/retweets` | 1 write |
| Unrepost (delete RT) | `DELETE /2/users/:id/retweets/:tweet_id` | 1 write |

**Cost per boosted post: 2 writes** (on top of the 1 write for posting the original = 3 writes total per boosted post)

### Tier Breakdown

| Tier | Monthly price | Write allowance | Boosted posts possible* |
|------|--------------|-----------------|------------------------|
| **Free** | $0 | 500 writes/month | ~83 boosted posts/month |
| **Basic** | $100/mo | 3,000 writes/month (~100/day) | ~500 boosted posts/month |
| **Pro** | $5,000/mo | 30,000 writes/month (~1,000/day) | ~5,000 boosted posts/month |

*Assumes 3 writes per boosted post (1 post + 1 repost + 1 unrepost). Non-boosted posts use only 1 write each.

### Closest thing to "pay per use"

The **Basic tier at $100/mo** is the practical entry point for personal use. At ~500 boosted posts/month capacity, that works out to ~$0.20 per boosted post — but you pay the $100 whether you use it or not.

If you're on **Free tier**, budget 500 writes/month carefully:
- Each boosted post = 3 writes
- Each non-boosted post = 1 write
- Example: 50 posts + 50 boosted posts = 50 + (50×3) = 200 writes → well within 500/month

---

## Implementation Phases

### Phase 1 — Settings UI ✅
- [x] Toggle: enable/disable boost globally
- [x] Delay inputs: repost after N hours, unrepost after N hours
- [x] Persist to `cp-settings` in localStorage

### Phase 2 — Scheduler Worker (cron-job.org)

**Why cron-job.org:** Free external cron service, no Vercel or Supabase dependency, hits any public HTTPS endpoint on a schedule. No account lock-in.

**Setup:**
1. Create a protected API route: `POST /api/boost-worker`
   - Validate `Authorization: Bearer <BOOST_WORKER_SECRET>` header
   - Query Supabase for posts due for repost or unrepost
   - Fire X API calls and update `boost` column
2. Go to [cron-job.org](https://cron-job.org) → create a free account → add a cron job:
   - **URL:** `https://your-app.vercel.app/api/boost-worker`
   - **Schedule:** every 15 minutes (`*/15 * * * *`)
   - **Headers:** `Authorization: Bearer <BOOST_WORKER_SECRET>`
   - **Method:** POST
3. Store `BOOST_WORKER_SECRET` as an environment variable in Supabase/Vercel

**Worker logic (pseudocode):**

```js
// /api/boost-worker.js
// 1. Find posts due for repost
const toRepost = await supabase
  .from('posts')
  .select('*')
  .eq('status', 'posted')
  .eq("boost->>status", 'pending')
  .lte('repost_due_at', new Date().toISOString());  // computed col or stored on post

// 2. For each: POST /2/users/:id/retweets → store repostId, update boost.status='reposted'

// 3. Find posts due for unrepost
const toUnrepost = await supabase
  .from('posts')
  .select('*')
  .eq("boost->>status", 'reposted')
  .lte('unrepost_due_at', new Date().toISOString());

// 4. For each: DELETE /2/users/:id/retweets/:repostId → update boost.status='unreposted'
```

**cron-job.org limits (free tier):**
- 5 cron jobs free
- Minimum interval: 1 minute
- Execution timeout: 30s (plenty for an API worker)
- Request logs stored for 30 days

### Phase 3 — Per-post Override (future)
Allow overriding or disabling boost per individual post from the Composer.
