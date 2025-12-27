import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
};

// Create Supabase client singleton
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { url, anonKey } = getSupabaseConfig();
  
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
};

// Helper to get the current session
export const getSession = async () => {
  const client = getSupabaseClient();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  return session;
};

// Helper to get the current user
export const getCurrentUser = async () => {
  const session = await getSession();
  return session?.user ?? null;
};

// Helper to sign out
export const signOut = async () => {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};

