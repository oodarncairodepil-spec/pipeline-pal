import { getSupabaseClient } from './supabase';

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
  if (error) throw error;
  
  // Clear legacy token
  try {
    localStorage.removeItem('sb:token');
  } catch {}
};

export const getCurrentSession = async () => {
  const supabase = getSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const getCurrentAuthUser = async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
};
