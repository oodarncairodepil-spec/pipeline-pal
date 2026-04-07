import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

const GET_SESSION_TIMEOUT_MS = 12_000;

/** Remove broken / expired refresh tokens from storage without server round-trip. */
export async function clearLocalAuthSession(): Promise<void> {
  const supabase = getSupabaseClient();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem('sb:token');
  } catch {
    /* ignore */
  }
}

function isRefreshOrSessionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('refresh') ||
    m.includes('invalid') ||
    m.includes('jwt') ||
    m.includes('session')
  );
}

// Legacy function for backward compatibility - now uses Supabase Auth
export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anon };
};

export const loginWithSupabasePassword = async (email: string, password: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message || 'Login failed');
  }

  // Store session info for backward compatibility
  if (data.session) {
    try {
      localStorage.setItem('sb:token', JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: data.user,
      }));
    } catch {}
  }

  return data;
};

export const signOut = async () => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    await clearLocalAuthSession();
  }
  try {
    localStorage.removeItem('sb:token');
  } catch {}
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const supabase = getSupabaseClient();

  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('getSession_timeout')), GET_SESSION_TIMEOUT_MS);
      }),
    ]);

    const {
      data: { session },
      error,
    } = result as Awaited<ReturnType<typeof supabase.auth.getSession>>;

    if (error) {
      console.warn('Supabase getSession error:', error.message);
      if (isRefreshOrSessionError(error.message)) {
        await clearLocalAuthSession();
      }
      return null;
    }
    return session ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'getSession_timeout') {
      console.warn('Supabase getSession timed out; clearing local session');
    } else {
      console.warn('Supabase getSession failed:', e);
    }
    await clearLocalAuthSession();
    return null;
  }
};

export const getCurrentAuthUser = async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
};
