import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Loader2, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email to confirm your account');
      setMode('login');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent');
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">FreightFlow ERP</h1>
          <p className="text-sm text-muted-foreground mt-1">Iraq Operations Management</p>
        </div>

        <div className="erp-metric-card">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-lg font-semibold text-center">Sign In</h2>
              <div><Label>Email</Label><div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" placeholder="you@company.com" required /></div></div>
              <div><Label>Password</Label><div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" required minLength={6} /></div></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Sign In
              </Button>
              <div className="flex justify-between text-sm">
                <button type="button" className="text-primary hover:underline" onClick={() => setMode('forgot')}>Forgot password?</button>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode('signup')}>Create account</button>
              </div>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="text-lg font-semibold text-center">Create Account</h2>
              <div><Label>Full Name</Label><div className="relative"><User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input value={fullName} onChange={e => setFullName(e.target.value)} className="pl-10" placeholder="John Doe" required /></div></div>
              <div><Label>Email</Label><div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" placeholder="you@company.com" required /></div></div>
              <div><Label>Password</Label><div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" placeholder="Min 6 characters" required minLength={6} /></div></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Account
              </Button>
              <button type="button" className="text-sm text-primary hover:underline w-full text-center" onClick={() => setMode('login')}>Already have an account? Sign in</button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-lg font-semibold text-center">Reset Password</h2>
              <p className="text-sm text-muted-foreground text-center">Enter your email to receive a reset link.</p>
              <div><Label>Email</Label><div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" placeholder="you@company.com" required /></div></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Send Reset Link
              </Button>
              <button type="button" className="text-sm text-primary hover:underline w-full text-center" onClick={() => setMode('login')}>Back to sign in</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
