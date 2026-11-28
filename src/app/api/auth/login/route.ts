import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  attachSessionCookie,
  createSignedSessionToken,
  SESSION_DURATION_MS,
} from '@/lib/auth/session';
import {
  attachLoginGuardCookie,
  checkAccountLockout,
  checkIpRateLimit,
  clearLoginGuardCookie,
  getClientIp,
  getTurnstileServerConfig,
  hashGuardKey,
  LOCKOUT_DISPLAY_MESSAGE,
  LOGIN_LOCKOUT_SECONDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  normalizeLoginEmail,
  recordAccountLoginFailure,
  resetAccountLoginFailures,
  verifyTurnstileToken,
  withAccountMutex,
} from '@/lib/auth/loginSecurity';
import { UserProfile } from '@/types';

function getAuthSupabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const configured =
    url.length > 0 &&
    !url.includes('your-project') &&
    anonKey.length > 0 &&
    !anonKey.includes('your-anon-key');
  return { configured, url, anonKey };
}

function buildProfileFromSupabaseUser(u: {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, any>;
}): UserProfile {
  return {
    id: u.id,
    email: u.email || '',
    fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'QA Engineer',
    role: u.user_metadata?.role || 'qa_engineer',
    companyName: u.user_metadata?.company_name || 'Industrial Facility',
    plantName: u.user_metadata?.plant_name || 'Main QA Lab',
    designation: u.user_metadata?.designation || 'Quality Engineer',
    createdAt: u.created_at,
  };
}

// GET /api/auth/login - Safe public Turnstile widget config (never exposes secrets)
export async function GET() {
  const turnstile = getTurnstileServerConfig();
  return NextResponse.json({
    success: true,
    configured: turnstile.configured,
    turnstileSiteKey: turnstile.siteKey,
    isTestMode: turnstile.isTestKeys,
    maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    lockoutSeconds: LOGIN_LOCKOUT_SECONDS,
  });
}

// POST /api/auth/login - CAPTCHA-verified, IP-rate-limited, 3-attempt-locked server login
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const captchaToken = typeof body?.captchaToken === 'string' ? body.captchaToken : '';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) || !password) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_INPUT',
          error: 'Valid work email address and password are required.',
        },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeLoginEmail(rawEmail);
    const emailHash = hashGuardKey(`acct:${normalizedEmail}`);
    const clientIp = getClientIp(request);
    const nowMs = Date.now();

    // 1. IP-based rate limiting (prevents high-rate automated spraying across emails)
    const ipRate = await checkIpRateLimit(clientIp, nowMs);
    if (!ipRate.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: 'IP_RATE_LIMITED',
          error: `Too many login attempts from your network. Please wait ${ipRate.retryAfterSeconds} seconds before trying again.`,
          retryAfterSeconds: ipRate.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Server-side CAPTCHA verification MUST succeed BEFORE authentication or lockout updates
    const captchaCheck = await verifyTurnstileToken(captchaToken, clientIp);
    if (!captchaCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          code: captchaCheck.code || 'CAPTCHA_FAILED',
          error: captchaCheck.error || 'CAPTCHA verification failed. Please complete the challenge again.',
        },
        { status: captchaCheck.code === 'CAPTCHA_NOT_CONFIGURED' ? 503 : 400 }
      );
    }

    // 3. Serialize per-account lockout check + password verification + counter update atomically
    return await withAccountMutex(`acct:${normalizedEmail}`, async () => {
      const checkNow = Date.now();
      const lockoutState = await checkAccountLockout(normalizedEmail, checkNow, request);

      if (lockoutState.locked) {
        return NextResponse.json(
          {
            success: false,
            code: 'ACCOUNT_LOCKED',
            error: LOCKOUT_DISPLAY_MESSAGE,
            locked: true,
            lockedUntil: lockoutState.lockedUntil,
            remainingSeconds: lockoutState.remainingSeconds,
            remainingAttempts: 0,
            emailHash,
          },
          { status: 423 }
        );
      }

      const { configured, url, anonKey } = getAuthSupabaseConfig();

      if (configured) {
        const supabase = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error || !data?.user || !data?.session?.access_token) {
          const failure = await recordAccountLoginFailure(normalizedEmail, Date.now(), request);
          if (failure.locked) {
            const res = NextResponse.json(
              {
                success: false,
                code: 'ACCOUNT_LOCKED',
                error: LOCKOUT_DISPLAY_MESSAGE,
                locked: true,
                lockedUntil: failure.lockedUntil,
                remainingSeconds: failure.remainingSeconds,
                remainingAttempts: 0,
                emailHash,
              },
              { status: 423 }
            );
            attachLoginGuardCookie(res, normalizedEmail, failure, request);
            return res;
          }

          const res = NextResponse.json(
            {
              success: false,
              code: 'INVALID_CREDENTIALS',
              error: `Invalid work email or password. ${failure.remainingAttempts} attempt${
                failure.remainingAttempts === 1 ? '' : 's'
              } remaining before temporary lockout.`,
              locked: false,
              remainingAttempts: failure.remainingAttempts,
              failedAttempts: failure.failedAttempts,
            },
            { status: 401 }
          );
          attachLoginGuardCookie(res, normalizedEmail, failure, request);
          return res;
        }

        // Valid credentials -> reset failed attempts atomically and issue strict 24h session cookie
        await resetAccountLoginFailures(normalizedEmail);

        const profile = buildProfileFromSupabaseUser(data.user);
        const loginNowMs = Date.now();
        const lastSignInMs = data.user.last_sign_in_at
          ? new Date(data.user.last_sign_in_at).getTime()
          : NaN;

        let anchorLoginAt = loginNowMs;
        if (
          Number.isFinite(lastSignInMs) &&
          loginNowMs - lastSignInMs <= 5 * 60 * 1000 &&
          lastSignInMs <= loginNowMs + 60_000
        ) {
          anchorLoginAt = Math.min(lastSignInMs, loginNowMs);
        } else if (
          Number.isFinite(lastSignInMs) &&
          loginNowMs - lastSignInMs >= SESSION_DURATION_MS
        ) {
          anchorLoginAt = loginNowMs;
        }

        const { token, payload } = createSignedSessionToken(
          {
            sub: profile.id,
            email: profile.email,
            fullName: profile.fullName,
            role: profile.role || 'qa_engineer',
            companyName: profile.companyName,
            plantName: profile.plantName,
            designation: profile.designation,
            createdAt: profile.createdAt,
            authMode: 'supabase',
            loginAt: anchorLoginAt,
          },
          loginNowMs
        );

        const response = NextResponse.json({
          success: true,
          authenticated: true,
          user: profile,
          loginAt: payload.loginAt,
          expiresAt: payload.expiresAt,
          remainingMs: payload.expiresAt - loginNowMs,
          authMode: 'supabase',
          supabaseSession: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        });
        attachSessionCookie(response, token, payload.expiresAt, request, loginNowMs);
        clearLoginGuardCookie(response, request);
        return response;
      }

      // Non-Supabase local fallback (only when Supabase env vars are unconfigured)
      const localExpectedPassword = process.env.LOCAL_DEV_PASSWORD || '';
      if (localExpectedPassword && password !== localExpectedPassword) {
        const failure = await recordAccountLoginFailure(normalizedEmail, Date.now(), request);
        if (failure.locked) {
          const res = NextResponse.json(
            {
              success: false,
              code: 'ACCOUNT_LOCKED',
              error: LOCKOUT_DISPLAY_MESSAGE,
              locked: true,
              lockedUntil: failure.lockedUntil,
              remainingSeconds: failure.remainingSeconds,
              remainingAttempts: 0,
              emailHash,
            },
            { status: 423 }
          );
          attachLoginGuardCookie(res, normalizedEmail, failure, request);
          return res;
        }
        const res = NextResponse.json(
          {
            success: false,
            code: 'INVALID_CREDENTIALS',
            error: `Invalid work email or password. ${failure.remainingAttempts} attempt${
              failure.remainingAttempts === 1 ? '' : 's'
            } remaining before temporary lockout.`,
            locked: false,
            remainingAttempts: failure.remainingAttempts,
            failedAttempts: failure.failedAttempts,
          },
          { status: 401 }
        );
        attachLoginGuardCookie(res, normalizedEmail, failure, request);
        return res;
      }

      await resetAccountLoginFailures(normalizedEmail);
      const loginNowMs = Date.now();
      const localProfile: UserProfile = {
        id: `usr_${hashGuardKey(normalizedEmail).slice(0, 12)}`,
        email: normalizedEmail,
        fullName: normalizedEmail.split('@')[0].replace('.', ' ').toUpperCase(),
        role: 'qa_engineer',
        companyName: 'ChittorTech Cement Works',
        plantName: 'Chittorgarh Unit 1',
        designation: 'Senior QA / QC Chemist',
        createdAt: new Date(loginNowMs).toISOString(),
      };

      const { token, payload } = createSignedSessionToken(
        {
          sub: localProfile.id,
          email: localProfile.email,
          fullName: localProfile.fullName,
          role: localProfile.role || 'qa_engineer',
          companyName: localProfile.companyName,
          plantName: localProfile.plantName,
          designation: localProfile.designation,
          createdAt: localProfile.createdAt,
          authMode: 'local',
          loginAt: loginNowMs,
        },
        loginNowMs
      );

      const response = NextResponse.json({
        success: true,
        authenticated: true,
        user: localProfile,
        loginAt: payload.loginAt,
        expiresAt: payload.expiresAt,
        remainingMs: payload.expiresAt - loginNowMs,
        authMode: 'local',
      });
      attachSessionCookie(response, token, payload.expiresAt, request, loginNowMs);
      return response;
    });
  } catch (err: any) {
    console.error('POST /api/auth/login error:', err?.message || 'Login error');
    return NextResponse.json(
      {
        success: false,
        code: 'LOGIN_ERROR',
        error: 'Unable to process sign-in request. Please try again.',
      },
      { status: 500 }
    );
  }
}

