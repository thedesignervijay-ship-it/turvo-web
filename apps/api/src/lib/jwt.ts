import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from 'jose';
import { config } from '../config.js';

const encoder = new TextEncoder();

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getRemoteJwks() {
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(
      new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }
  return remoteJwks;
}

/**
 * Verifies a Supabase Auth access token. Supports both ES256 (via JWKS) and
 * HS256 (via shared secret) for compatibility with different Supabase project
 * configurations. The backend never trusts the token's role claim; the
 * application role is resolved from the users table in the authenticate
 * middleware.
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getRemoteJwks());
    return payload;
  } catch {
    const { payload } = await jwtVerify(token, encoder.encode(config.supabaseJwtSecret), {
      algorithms: ['HS256'],
    });
    return payload;
  }
}

/** Mints an HS256 access token. Used by tests (and local development). */
export async function signAccessToken(
  sub: string,
  extra: JWTPayload = {},
): Promise<string> {
  return new SignJWT({ role: 'authenticated', ...extra })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(encoder.encode(config.supabaseJwtSecret));
}
