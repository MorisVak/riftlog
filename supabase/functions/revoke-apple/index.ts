// revoke-apple — Sign in with Apple token revocation, for account deletion.
//
// Apple asks apps that offer Sign in with Apple to revoke the user's Apple
// tokens when the account is deleted. The app never keeps an Apple token
// (it signs in natively with an id-token), so at deletion it asks the user
// to confirm with Apple once more and sends the one-time authorization code
// here. This function:
//   1. checks the caller is a signed-in user (their own JWT, via Auth),
//   2. trades the code for the user's Apple refresh token (/auth/token),
//   3. checks that token belongs to the same person (the id_token's `sub`
//      is the caller's Apple identity) and revokes it (/auth/revoke).
// The app then deletes the account itself (the `delete_my_account` RPC).
//
// Secrets (`supabase secrets set`, never in the app): APPLE_TEAM_ID,
// APPLE_KEY_ID, APPLE_CLIENT_ID (the bundle id), APPLE_PRIVATE_KEY (the
// Sign in with Apple .p8). SUPABASE_URL is injected by the runtime.
//
// verify_jwt is off (config.toml): the caller is checked here, against Auth,
// which works with the project's asymmetric signing keys.

import { SignJWT, importPKCS8 } from 'npm:jose@5.9.6';

const APPLE = 'https://appleid.apple.com';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const env = (name: string): string => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing secret ${name}`);
  return v;
};

/** Apple's client secret: a short-lived ES256 JWT signed with the .p8 key. */
async function clientSecret(): Promise<string> {
  // A key pasted with literal "\n"s still reads as a PEM.
  const pem = env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const key = await importPKCS8(pem, 'ES256');
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env('APPLE_KEY_ID') })
    .setIssuer(env('APPLE_TEAM_ID'))
    .setSubject(env('APPLE_CLIENT_ID'))
    .setAudience(APPLE)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

/** The payload of a JWT that came straight from Apple over TLS (not re-verified). */
const jwtPayload = (jwt: string): Record<string, unknown> => {
  const part = jwt.split('.')[1] ?? '';
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
};

type AuthUser = {
  id: string;
  identities?: { provider: string; id: string; identity_data?: { sub?: string } }[];
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // 1. The caller: their own session, checked by Auth.
  const authorization = req.headers.get('authorization');
  const apikey = req.headers.get('apikey');
  if (!authorization || !apikey) return json(401, { error: 'not_authenticated' });
  const who = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { authorization, apikey },
  });
  if (!who.ok) return json(401, { error: 'not_authenticated' });
  const user = (await who.json()) as AuthUser;

  let code: unknown;
  try {
    ({ code } = await req.json());
  } catch {
    return json(400, { error: 'bad_request' });
  }
  if (typeof code !== 'string' || code === '') return json(400, { error: 'bad_request' });

  try {
    const secret = await clientSecret();
    const clientId = env('APPLE_CLIENT_ID');

    // 2. The code → the user's Apple tokens.
    const tokenRes = await fetch(`${APPLE}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: secret,
        code,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = (await tokenRes.json()) as {
      refresh_token?: string;
      access_token?: string;
      id_token?: string;
      error?: string;
    };
    if (!tokenRes.ok || (!tokens.refresh_token && !tokens.access_token)) {
      // `invalid_grant`: a used / expired code; `invalid_client`: our secret.
      console.error('[revoke-apple] token exchange failed:', tokens.error ?? tokenRes.status);
      return json(502, { error: 'apple_token', detail: tokens.error ?? `http_${tokenRes.status}` });
    }

    // 3a. Only the caller's own Apple account.
    const appleSub = tokens.id_token ? jwtPayload(tokens.id_token).sub : undefined;
    const mine = (user.identities ?? []).some(
      (i) => i.provider === 'apple' && (i.id === appleSub || i.identity_data?.sub === appleSub),
    );
    if (!appleSub || !mine) return json(403, { error: 'not_your_apple_account' });

    // 3b. Revoke (the refresh token ends the whole grant).
    const token = tokens.refresh_token ?? tokens.access_token!;
    const revokeRes = await fetch(`${APPLE}/auth/revoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: secret,
        token,
        token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
      }),
    });
    if (!revokeRes.ok) {
      console.error('[revoke-apple] revoke failed:', revokeRes.status);
      return json(502, { error: 'apple_revoke', detail: `http_${revokeRes.status}` });
    }
    return json(200, { ok: true });
  } catch (e) {
    console.error('[revoke-apple]', e instanceof Error ? e.message : e);
    return json(500, { error: 'server_error' });
  }
});
