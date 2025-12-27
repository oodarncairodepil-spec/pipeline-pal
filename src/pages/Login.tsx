import { Helmet } from 'react-helmet-async';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { loginWithSupabasePassword, getCurrentAuthUser } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentAuthUser();
        if (user) {
          // Get first available pipeline first to validate lastPipeline
          const { getPipelines } = await import('@/lib/settings');
          const pipelines = await getPipelines();
          
          // Get last pipeline from localStorage and validate it exists
          const lastPipeline = localStorage.getItem('lastPipelineId');
          
          // Only use lastPipeline if it exists in the pipelines list
          if (lastPipeline && pipelines.some(p => p.name === lastPipeline)) {
            navigate(`/pipeline/${lastPipeline}`, { replace: true });
          } else if (pipelines.length > 0) {
            // Update localStorage with first pipeline
            try { localStorage.setItem('lastPipelineId', pipelines[0].name); } catch {}
            navigate(`/pipeline/${pipelines[0].name}`, { replace: true });
          } else {
            // No pipelines, redirect to settings to create one
            navigate('/settings', { replace: true });
          }
        }
      } catch (error) {
        // Not authenticated, stay on login page
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const e = email.trim();
      if (!/.+@.+\..+/.test(e)) throw new Error('Please enter a valid email');
      if (!password) throw new Error('Please enter your password');
      await loginWithSupabasePassword(e, password);
      
      // Get first available pipeline first to validate lastPipeline
      const { getPipelines } = await import('@/lib/settings');
      const pipelines = await getPipelines();
      
      // Get last pipeline from localStorage and validate it exists
      const lastPipeline = localStorage.getItem('lastPipelineId');
      
      // Only use lastPipeline if it exists in the pipelines list
      if (lastPipeline && pipelines.some(p => p.name === lastPipeline)) {
        navigate(`/pipeline/${lastPipeline}`, { replace: true });
      } else if (pipelines.length > 0) {
        // Update localStorage with first pipeline
        try { localStorage.setItem('lastPipelineId', pipelines[0].name); } catch {}
        navigate(`/pipeline/${pipelines[0].name}`, { replace: true });
      } else {
        // No pipelines, redirect to settings to create one
        navigate('/settings', { replace: true });
      }
    } catch (e: any) {
      setError(e?.message || 'Invalid credentials or configuration');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

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
