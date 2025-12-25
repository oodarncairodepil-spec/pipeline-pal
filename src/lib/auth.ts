export const getSupabaseConfig = () => {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
  const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
  return { url, anon };
};

export const loginWithSupabasePassword = async (email: string, password: string) => {
  const { url, anon } = getSupabaseConfig();
  if (!url || !anon) {
    throw new Error('Missing Supabase environment configuration');
  }
  const endpoint = `${url.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anon,
    },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    let message = 'Login failed';
    try {
      const err = await res.json();
      message = err.error_description || err.error || err.message || message;
    } catch {
      try { message = await res.text(); } catch {}
    }
    throw new Error(message);
  }
  const data = await res.json();
  try {
    localStorage.setItem('sb:token', JSON.stringify(data));
  } catch {}
  return data;
};
