import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';

async function getRefreshedClient(supabase) {
  const { data: tokenRow, error } = await supabase
    .from('x_tokens')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !tokenRow) throw new Error('No X account connected.');

  const xClient = new TwitterApi({
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
  });

  let accessToken = tokenRow.access_token;

  if (new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
    const refreshed = await xClient.refreshOAuth2Token(tokenRow.refresh_token);
    accessToken = refreshed.accessToken;
    const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
    await supabase.from('x_tokens').update({
      access_token: accessToken,
      refresh_token: refreshed.refreshToken,
      expires_at: expiresAt,
    }).eq('id', 1);
  }

  const client = new TwitterApi(accessToken);

  // Return cached userId from DB to avoid a me() API call every 15 min ($28/mo)
  if (tokenRow.user_id) {
    return { client, userId: tokenRow.user_id };
  }

  // First run only: fetch and store user_id permanently
  const me = await client.v2.me();
  await supabase.from('x_tokens').update({ user_id: me.data.id }).eq('id', 1);
  return { client, userId: me.data.id };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.BOOST_WORKER_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let client, userId;
  try {
    ({ client, userId } = await getRefreshedClient(supabase));
  } catch (err) {
    console.error('No X account available:', err.message);
    return res.status(200).json({ ok: true, reposted: 0, unreposted: 0, note: 'No X account connected' });
  }

  const now = Date.now();
  let reposted = 0;
  let unreposted = 0;

  // --- Step 1: Repost (self-RT) ---
  const { data: pendingPosts, error: pendingError } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'posted')
    .eq('boost->>status', 'pending');

  if (pendingError) {
    console.error('Failed to fetch pending boost posts:', pendingError);
  } else {
    for (const post of pendingPosts || []) {
      const boost = post.boost;
      const dueAt = new Date(post.posted_at).getTime() + boost.repostAfterHours * 3_600_000;
      if (now < dueAt) continue;

      const tweetId = post.tweet_ids?.[0];
      if (!tweetId) {
        await supabase.from('posts').update({
          boost: { ...boost, status: 'skipped', error: 'No tweet_ids on post' },
        }).eq('id', post.id);
        continue;
      }

      try {
        await client.v2.retweet(userId, tweetId);
        await supabase.from('posts').update({
          boost: {
            ...boost,
            status: 'reposted',
            repostId: tweetId,
            repostedAt: new Date().toISOString(),
          },
        }).eq('id', post.id);
        reposted++;
      } catch (err) {
        console.error(`Repost failed for post ${post.id}:`, err.message);
        await supabase.from('posts').update({
          boost: { ...boost, status: 'failed', error: err.message },
        }).eq('id', post.id);
      }
    }
  }

  // --- Step 2: Unrepost (delete RT) ---
  const { data: repostedPosts, error: repostedError } = await supabase
    .from('posts')
    .select('*')
    .eq('boost->>status', 'reposted');

  if (repostedError) {
    console.error('Failed to fetch reposted boost posts:', repostedError);
  } else {
    for (const post of repostedPosts || []) {
      const boost = post.boost;
      const dueAt = new Date(boost.repostedAt).getTime() + boost.unrepostAfterHours * 3_600_000;
      if (now < dueAt) continue;

      try {
        await client.v2.unretweet(userId, boost.repostId);
        await supabase.from('posts').update({
          boost: {
            ...boost,
            status: 'unreposted',
            unrepostedAt: new Date().toISOString(),
          },
        }).eq('id', post.id);
        unreposted++;
      } catch (err) {
        console.error(`Unrepost failed for post ${post.id}:`, err.message);
        await supabase.from('posts').update({
          boost: { ...boost, status: 'failed', error: err.message },
        }).eq('id', post.id);
      }
    }
  }

  return res.status(200).json({ ok: true, reposted, unreposted });
}
