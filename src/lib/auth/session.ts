import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { UserProfile } from '@/types';

export const SESSION_COOKIE_NAME = 'ct_qa_session';
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // Strictly 24 hours (86,400,000 ms)
export const SESSION_DURATION_SECONDS = 24 * 60 * 60;

export interface ServerSessionPayload {
  sub: string;
  email: string;
  fullName: string;
  role: UserProfile['role'] | string;
  companyName?: string;
  plantName?: string;
  designation?: string;
  createdAt?: string;
  authMode: 'supabase' | 'local';
  loginAt: number;
  expiresAt: number;
  sid: string;
}

export type SessionVerificationResult =
  | {
      valid: true;
      expired: false;
      session: ServerSessionPayload;
      remainingMs: number;
    }
  | {
      valid: false;
      expired: boolean;
      reason: string;
      session?: ServerSessionPayload;
    };

function getSessionSecret(): Buffer {
  const configured = process.env.SESSION_SECRET?.trim();
  const baseSecret =
    configured ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SMTP_PASSWORD?.trim() ||
    'chittortech-qa-lms-dev-fallback-secret';

  return crypto
    .createHash('sha256')
    .update(`ct-qa-session-v1:${baseSecret}`)
    .digest();
}

export function isSessionExpired(expiresAt: number, nowMs: number = Date.now()): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return true;
  return nowMs >= expiresAt;
}

export function createSignedSessionToken(
  input: Omit<ServerSessionPayload, 'loginAt' | 'expiresAt' | 'sid'> & { loginAt?: number },
  nowMs: number = Date.now()
): { token: string; payload: ServerSessionPayload } {
  const loginAt =
    typeof input.loginAt === 'number' && Number.isFinite(input.loginAt) && input.loginAt > 0
      ? Math.min(input.loginAt, nowMs)
      : nowMs;
  const expiresAt = loginAt + SESSION_DURATION_MS;

  const payload: ServerSessionPayload = {
    sub: input.sub,
    email: input.email,
    fullName: input.fullName,
    role: input.role || 'qa_engineer',
    companyName: input.companyName,
    plantName: input.plantName,
    designation: input.designation,
    createdAt: input.createdAt,
    authMode: input.authMode,
    loginAt,
    expiresAt,
    sid: crypto.randomBytes(16).toString('hex'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signatureB64 = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');

  return {
    token: `${payloadB64}.${signatureB64}`,
    payload,
  };
}

export function verifySignedSessionToken(
  token: string | undefined | null,
  nowMs: number = Date.now()
): SessionVerificationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, expired: false, reason: 'Missing session token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, expired: false, reason: 'Malformed session token' };
  }

  const [payloadB64, incomingSigB64] = parts;
  if (!payloadB64 || !incomingSigB64) {
    return { valid: false, expired: false, reason: 'Malformed session token' };
  }

  const expectedSigB64 = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');

  const incomingBuf = Buffer.from(incomingSigB64, 'utf8');
  const expectedBuf = Buffer.from(expectedSigB64, 'utf8');
  if (incomingBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(incomingBuf, expectedBuf)) {
    return { valid: false, expired: false, reason: 'Invalid session signature' };
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as ServerSessionPayload;
    if (
      !decoded ||
      typeof decoded.sub !== 'string' ||
      !decoded.sub ||
      typeof decoded.loginAt !== 'number' ||
      typeof decoded.expiresAt !== 'number'
    ) {
      return { valid: false, expired: false, reason: 'Invalid session payload' };
    }

    // Strict non-sliding invariant: expiresAt must never exceed loginAt + 24 hours
    const strictExpiry = Math.min(decoded.expiresAt, decoded.loginAt + SESSION_DURATION_MS);
    if (isSessionExpired(strictExpiry, nowMs)) {
      return {
        valid: false,
        expired: true,
        reason: 'Fixed 24-hour login session has expired',
        session: { ...decoded, expiresAt: strictExpiry },
      };
    }

    return {
      valid: true,
      expired: false,
      session: { ...decoded, expiresAt: strictExpiry },
      remainingMs: strictExpiry - nowMs,
    };
  } catch {
    return { valid: false, expired: false, reason: 'Unreadable session payload' };
  }
}

export function extractCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) {
      const rawVal = pair.slice(idx + 1).trim();
      try {
        return decodeURIComponent(rawVal);
      } catch {
        return rawVal;
      }
    }
  }
  return null;
}

export function shouldUseSecureCookie(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto === 'https') return true;
  if (forwardedProto === 'http') return false;
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: number,
  request: Request,
  nowMs: number = Date.now()
): void {
  const remainingSeconds = Math.max(1, Math.floor((expiresAt - nowMs) / 1000));
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: shouldUseSecureCookie(request),
    maxAge: remainingSeconds,
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse, request: Request): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: shouldUseSecureCookie(request),
    maxAge: 0,
    expires: new Date(0),
  });
}

export function sessionToUserProfile(session: ServerSessionPayload): UserProfile {
  return {
    id: session.sub,
    email: session.email,
    fullName: session.fullName,
    role: (session.role as UserProfile['role']) || 'qa_engineer',
    companyName: session.companyName,
    plantName: session.plantName,
    designation: session.designation,
    createdAt: session.createdAt,
  };
}

export type AuthCheckResult =
  | { ok: true; session: ServerSessionPayload; remainingMs: number }
  | { ok: false; response: NextResponse };

export function requireAuthenticatedSession(
  request: Request,
  nowMs: number = Date.now()
): AuthCheckResult {
  const cookieToken = extractCookieValue(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  const verification = verifySignedSessionToken(cookieToken, nowMs);

  if (!verification.valid) {
    const response = NextResponse.json(
      {
        success: false,
        code: verification.expired ? 'SESSION_EXPIRED' : 'UNAUTHORIZED',
        error: verification.expired
          ? 'Your 24-hour login session has expired. Please sign in again.'
          : 'Authentication required. Please sign in.',
      },
      { status: 401 }
    );
    if (cookieToken) {
      clearSessionCookie(response, request);
    }
    return { ok: false, response };
  }

  return {
    ok: true,
    session: verification.session,
    remainingMs: verification.remainingMs,
  };
}
