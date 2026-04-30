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

  if (new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
    const { accessToken, refreshToken, expiresIn } =
      await xClient.refreshOAuth2Token(tokenRow.refresh_token);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    await supabase.from('x_tokens').update({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    }).eq('id', 1);

    return new TwitterApi(accessToken);
  }

  return new TwitterApi(tokenRow.access_token);
}

async function postTweets(client, tweets) {
  const tweetIds = [];
  let previousTweetId = null;

  for (const tweet of tweets) {
    const text = typeof tweet === 'string' ? tweet : tweet.content;
    const options = previousTweetId
      ? { text, reply: { in_reply_to_tweet_id: previousTweetId } }
      : { text };

    const response = await client.v2.tweet(options);
    previousTweetId = response.data.id;
    tweetIds.push(response.data.id);
  }

  return tweetIds;
}

export default async function handler(req, res) {
  // Validate cron secret to prevent unauthorised triggers
  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Find all due posts
  const { data: duePosts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString());

  if (error) {
    console.error('Failed to fetch due posts:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  if (!duePosts || duePosts.length === 0) {
    return res.status(200).json({ ok: true, posted: 0 });
  }

  let client;
  try {
    client = await getRefreshedClient(supabase);
  } catch (err) {
    console.error('No X tokens available:', err.message);
    return res.status(200).json({ ok: true, posted: 0, note: 'No X account connected' });
  }

  let posted = 0;

  for (const post of duePosts) {
    try {
      const tweetIds = await postTweets(client, post.tweets);
      await supabase.from('posts').update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        tweet_ids: tweetIds,
        error: null,
      }).eq('id', post.id);
      posted++;
    } catch (err) {
      console.error(`Failed to post ${post.id}:`, err.message);
      await supabase.from('posts').update({
        status: 'failed',
        error: err.message,
      }).eq('id', post.id);
    }
  }

  return res.status(200).json({ ok: true, posted });
}
