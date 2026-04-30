import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  const client = new TwitterApi({
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
  });

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const baseUrl = `${proto}://${host}`;

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    `${baseUrl}/api/auth/callback`,
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );

  res.setHeader('Set-Cookie', [
    `oauth_code_verifier=${codeVerifier}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`,
    `oauth_state=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`,
  ]);

  res.redirect(url);
}
