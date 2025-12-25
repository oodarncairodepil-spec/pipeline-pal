import { Helmet } from 'react-helmet-async';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { loginWithSupabasePassword } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const e = email.trim();
      if (!/.+@.+\..+/.test(e)) throw new Error('Please enter a valid email');
      if (!password) throw new Error('Please enter your password');
      await loginWithSupabasePassword(e, password);
      navigate('/pipeline/default');
    } catch (e: any) {
      setError(e?.message || 'Invalid credentials or configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Login</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 border rounded-lg p-6 bg-card">
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="flex gap-2">
            <Button disabled={loading} onClick={handleLogin}>{loading ? 'Logging in...' : 'Login'}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Only invited staff can login. Account creation is via Supabase invite URL.</p>
        </div>
      </div>
    </>
  );
}
