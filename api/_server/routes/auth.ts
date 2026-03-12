import { Hono } from 'hono';
import { signJwt, getSession, isAdmin } from '../lib/auth.js';

const app = new Hono();

function generateState(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function cookie(name: string, value: string, opts: { maxAge: number; secure?: boolean }): string {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${opts.maxAge}`];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

// GET /auth/github — redirect to GitHub OAuth
app.get('/github', (c) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return c.json({ error: 'GITHUB_CLIENT_ID not set' }, 500);
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5173/api/auth/github/callback';
    const state = generateState();
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=read:user&state=${state}`;

    return new Response(null, {
      status: 302,
      headers: [
        ['Location', url],
        ['Set-Cookie', cookie('oauth_state', state, { maxAge: 600 })],
      ],
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// GET /auth/github/callback — exchange code for token
app.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  const cookieHeader = c.req.header('cookie') || '';
  const stateMatch = cookieHeader.match(/(?:^|;\s*)oauth_state=([^;]+)/);
  const savedState = stateMatch?.[1];

  if (!state || !savedState || state !== savedState) {
    return c.redirect('/?error=invalid_state');
  }
  if (!code) {
    return c.redirect('/?error=no_code');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) {
      return c.redirect('/?error=token_exchange_failed');
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const user = await userRes.json() as { id: number; login: string; avatar_url: string };
    const githubId = String(user.id);

    if (!isAdmin(githubId)) {
      return new Response(null, {
        status: 302,
        headers: [
          ['Location', '/?error=not_admin'],
          ['Set-Cookie', cookie('oauth_state', '', { maxAge: 0 })],
        ],
      });
    }

    const token = await signJwt({ githubId, username: user.login, avatarUrl: user.avatar_url });
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

    return new Response(null, {
      status: 302,
      headers: [
        ['Location', '/admin'],
        ['Set-Cookie', cookie('admin_token', token, { maxAge: 7 * 24 * 60 * 60, secure: isProduction })],
        ['Set-Cookie', cookie('oauth_state', '', { maxAge: 0 })],
      ],
    });
  } catch (err) {
    console.error('[Auth callback error]', err);
    return c.redirect('/?error=auth_failed');
  }
});

// POST /auth/logout
app.post('/logout', (c) => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: [
      ['Content-Type', 'application/json'],
      ['Set-Cookie', cookie('admin_token', '', { maxAge: 0 })],
    ],
  });
});

// GET /auth/me
app.get('/me', async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  return c.json(session);
});

export default app;
