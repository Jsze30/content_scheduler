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

  // Refresh if expired (with 60s buffer)
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tweets, postId } = req.body;
  if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
    return res.status(400).json({ error: 'Invalid tweets payload' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let client;
  try {
    client = await getRefreshedClient(supabase);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const tweetIds = [];
  let previousTweetId = null;

  try {
    for (const tweet of tweets) {
      const text = typeof tweet === 'string' ? tweet : tweet.content;
      const options = previousTweetId
        ? { text, reply: { in_reply_to_tweet_id: previousTweetId } }
        : { text };

      const response = await client.v2.tweet(options);
      previousTweetId = response.data.id;
      tweetIds.push(response.data.id);
    }
  } catch (err) {
    console.error('Tweet posting failed:', err);

    if (postId) {
      await supabase.from('posts').update({
        status: 'failed',
        error: err.message,
      }).eq('id', postId);
    }

    return res.status(500).json({ error: 'Failed to post tweet — ' + err.message });
  }

  // Update post status in Supabase if a postId was given
  if (postId) {
    await supabase.from('posts').update({
      status: 'posted',
      posted_at: new Date().toISOString(),
      tweet_ids: tweetIds,
      error: null,
    }).eq('id', postId);
  }

  return res.status(200).json({ ok: true, tweetIds });
}
