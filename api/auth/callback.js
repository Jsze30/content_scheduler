import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    (cookieHeader || '').split('; ').filter(Boolean).map(c => {
      const idx = c.indexOf('=');
      return [c.slice(0, idx), c.slice(idx + 1)];
    })
  );
}

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = parseCookies(req.headers.cookie);
  const codeVerifier = cookies.oauth_code_verifier;
  const savedState = cookies.oauth_state;

  if (!code || !codeVerifier || !state || state !== savedState) {
    return res.status(400).send('Invalid OAuth callback — please try connecting again.');
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const baseUrl = `${proto}://${host}`;

  const client = new TwitterApi({
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
  });

  let tokens;
  try {
    tokens = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: `${baseUrl}/api/auth/callback`,
    });
  } catch (err) {
    console.error('OAuth token exchange failed:', err);
    return res.status(400).send('Failed to exchange OAuth code — please try again.');
  }

  const { accessToken, refreshToken, expiresIn } = tokens;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase.from('x_tokens').upsert({
    id: 1,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Failed to save tokens:', error);
    return res.status(500).send('Failed to save tokens — please try again.');
  }

  // Clear OAuth cookies
  res.setHeader('Set-Cookie', [
    'oauth_code_verifier=; HttpOnly; Path=/; Max-Age=0',
    'oauth_state=; HttpOnly; Path=/; Max-Age=0',
  ]);

  res.redirect('/?connected=true');
}
