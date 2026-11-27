import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  attachSessionCookie,
  clearSessionCookie,
  createSignedSessionToken,
  extractCookieValue,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  sessionToUserProfile,
  verifySignedSessionToken,
} from '@/lib/auth/session';
import { UserProfile } from '@/types';

function getServerSupabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const configured =
    url.length > 0 &&
    !url.includes('your-project') &&
    key.length > 0 &&
    !key.includes('your-anon-key');
  return { configured, url, key };
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

// GET /api/auth/session - Validate current 24h session without extending its expiry
export async function GET(request: Request) {
  const cookieToken = extractCookieValue(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  const verification = verifySignedSessionToken(cookieToken);

  if (!verification.valid) {
    const response = NextResponse.json({
      success: true,
      authenticated: false,
      expired: verification.expired,
      reason: verification.reason,
    });
    if (cookieToken) {
      clearSessionCookie(response, request);
    }
    return response;
  }

  const { session, remainingMs } = verification;
  return NextResponse.json({
    success: true,
    authenticated: true,
    expired: false,
    user: sessionToUserProfile(session),
    loginAt: session.loginAt,
    expiresAt: session.expiresAt,
    remainingMs,
    authMode: session.authMode,
  });
}

// POST /api/auth/session - Establish or sync a fixed 24h server session cookie
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode: 'login' | 'restore' | 'profile-sync' = body?.mode || 'login';
    const accessToken: string | undefined =
      typeof body?.accessToken === 'string' && body.accessToken.trim()
        ? body.accessToken.trim()
        : undefined;

    const nowMs = Date.now();
    const { configured, url, key } = getServerSupabaseConfig();
    const existingCookie = extractCookieValue(request.headers.get('cookie'), SESSION_COOKIE_NAME);
    const existingVerification = verifySignedSessionToken(existingCookie, nowMs);

    if (configured) {
      if (!accessToken) {
        return NextResponse.json(
          { success: false, authenticated: false, error: 'Supabase access token required' },
          { status: 401 }
        );
      }

      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data, error } = await supabase.auth.getUser(accessToken);

      if (error || !data?.user) {
        const res = NextResponse.json(
          { success: false, authenticated: false, error: 'Invalid or expired authentication token' },
          { status: 401 }
        );
        if (existingCookie) clearSessionCookie(res, request);
        return res;
      }

      const profile = buildProfileFromSupabaseUser(data.user);
      const lastSignInMs = data.user.last_sign_in_at
        ? new Date(data.user.last_sign_in_at).getTime()
        : NaN;

      // Never extend an existing unexpired session on restore or profile-sync
      let anchorLoginAt = nowMs;
      if (mode === 'login') {
        // Anchor to Supabase's recorded last_sign_in_at when close to now, preventing sliding via old tokens
        if (Number.isFinite(lastSignInMs) && nowMs - lastSignInMs <= 5 * 60 * 1000 && lastSignInMs <= nowMs + 60_000) {
          anchorLoginAt = Math.min(lastSignInMs, nowMs);
        } else if (Number.isFinite(lastSignInMs) && nowMs - lastSignInMs >= SESSION_DURATION_MS) {
          anchorLoginAt = nowMs; // Genuine fresh sign-in where metadata might lag
        }
      } else {
        if (existingVerification.valid && existingVerification.session.sub === profile.id) {
          anchorLoginAt = existingVerification.session.loginAt;
        } else if (existingVerification.expired) {
          const res = NextResponse.json(
            { success: false, authenticated: false, expired: true, error: '24-hour session expired' },
            { status: 401 }
          );
          clearSessionCookie(res, request);
          return res;
        } else if (Number.isFinite(lastSignInMs)) {
          if (nowMs >= lastSignInMs + SESSION_DURATION_MS) {
            const res = NextResponse.json(
              { success: false, authenticated: false, expired: true, error: '24-hour session expired' },
              { status: 401 }
            );
            return res;
          }
          anchorLoginAt = Math.min(lastSignInMs, nowMs);
        }
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
        nowMs
      );

      const response = NextResponse.json({
        success: true,
        authenticated: true,
        user: profile,
        loginAt: payload.loginAt,
        expiresAt: payload.expiresAt,
        remainingMs: payload.expiresAt - nowMs,
        authMode: 'supabase',
      });
      attachSessionCookie(response, token, payload.expiresAt, request, nowMs);
      return response;
    }

    // Local development fallback when Supabase env vars are not configured
    const rawUser = body?.user as Partial<UserProfile> | undefined;
    if (!rawUser?.id || !rawUser?.email) {
      return NextResponse.json(
        { success: false, authenticated: false, error: 'User profile required for local session' },
        { status: 400 }
      );
    }

    let anchorLoginAt = nowMs;
    if (mode !== 'login') {
      if (existingVerification.valid && existingVerification.session.sub === rawUser.id) {
        anchorLoginAt = existingVerification.session.loginAt;
      } else {
        const res = NextResponse.json(
          { success: false, authenticated: false, expired: true, error: '24-hour local session expired' },
          { status: 401 }
        );
        if (existingCookie) clearSessionCookie(res, request);
        return res;
      }
    }

    const localProfile: UserProfile = {
      id: rawUser.id,
      email: rawUser.email,
      fullName: rawUser.fullName || rawUser.email.split('@')[0],
      role: rawUser.role || 'qa_engineer',
      companyName: rawUser.companyName || 'ChittorTech Cement Works',
      plantName: rawUser.plantName || 'Chittorgarh Unit 1',
      designation: rawUser.designation || 'Senior QA / QC Chemist',
      createdAt: rawUser.createdAt || new Date(nowMs).toISOString(),
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
        loginAt: anchorLoginAt,
      },
      nowMs
    );

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user: localProfile,
      loginAt: payload.loginAt,
      expiresAt: payload.expiresAt,
      remainingMs: payload.expiresAt - nowMs,
      authMode: 'local',
    });
    attachSessionCookie(response, token, payload.expiresAt, request, nowMs);
    return response;
  } catch (err: any) {
    console.error('POST /api/auth/session error:', err?.message || 'Session error');
    return NextResponse.json(
      { success: false, authenticated: false, error: 'Failed to establish authentication session' },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/session - Sign out and clear persistent session cookie
export async function DELETE(request: Request) {
  const response = NextResponse.json({ success: true, authenticated: false });
  clearSessionCookie(response, request);
  return response;
}
