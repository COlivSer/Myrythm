import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabaseConfigurationError } from '@/lib/supabase';
import { Heart, Mail, ArrowLeft, Check } from 'lucide-react';

type View = 'auth' | 'forgot';

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [view, setView] = useState<View>('auth');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: errMsg } = await fn(email.trim(), password);
    if (errMsg) setError(errMsg);
    setLoading(false);
  }

  function isNetworkError(msg: string): boolean {
    return msg.includes('Unable to reach the server') || msg.includes('Failed to fetch');
  }

  function isConfigurationError(msg: string): boolean {
    return msg.includes('Supabase connection key has expired');
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const { error: errMsg } = await signInWithGoogle();
    if (errMsg) {
      setError(errMsg);
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: errMsg } = await resetPassword(email.trim());
    if (errMsg) {
      setError(errMsg);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  }

  if (view === 'forgot') {
    return (
      <div className="app-container flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm flex flex-col items-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-primary-light)' }}>
            <Mail size={32} color="var(--color-primary)" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Reset password</h1>
          <p className="text-sm mb-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
            Enter your email and we'll send you a link to reset your password.
          </p>

          {resetSent ? (
            <div className="w-full space-y-4">
              <div className="card p-5 flex items-center gap-3" style={{ backgroundColor: 'var(--color-success-light)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-success)' }}>
                  <Check size={20} color="white" strokeWidth={3} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#15803d' }}>Check your email</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    We sent a reset link to {email.trim()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setView('auth'); setResetSent(false); setEmail(''); }}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} /> Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="w-full space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                autoComplete="email"
              />
              {error && (
                <p className="text-sm text-red-500 text-center px-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Please wait...' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => { setView('auth'); setError(null); }}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <ArrowLeft size={16} /> Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-primary-light)' }}>
          <Heart size={32} color="var(--color-primary)" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>My Rhythm</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Your personal ADHD-friendly tracker
        </p>
        {supabaseConfigurationError && (
          <div className="w-full rounded-2xl px-4 py-3 mb-4" style={{ backgroundColor: 'var(--color-error-light)' }}>
            <p className="text-sm font-semibold text-center" style={{ color: 'var(--color-error)' }}>Sign-in is temporarily unavailable</p>
            <p className="text-xs text-center mt-1" style={{ color: 'var(--color-text-muted)' }}>The connected database key has expired and needs to be refreshed in Bolt.</p>
          </div>
        )}

        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 w-full">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'signin' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'signup' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
          />
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-500 text-center px-2">{error}</p>
              {isConfigurationError(error) ? (
                <p className="text-xs text-center px-2" style={{ color: 'var(--color-text-muted)' }}>
                  The app owner needs to refresh the connected database credentials before sign-in can work again.
                </p>
              ) : isNetworkError(error) && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                  disabled={loading}
                  className="text-sm font-semibold w-full py-2 rounded-xl"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {loading ? 'Retrying...' : 'Try again'}
                </button>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'signin' && (
          <button
            onClick={() => { setView('forgot'); setError(null); }}
            className="text-sm font-medium mt-3"
            style={{ color: 'var(--color-primary)' }}
          >
            Forgot your password?
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 w-full my-6">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>OR</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-white border rounded-2xl py-3.5 px-4 flex items-center justify-center gap-3 tap-target transition-all"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <GoogleIcon />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Continue with Google
          </span>
        </button>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
          {mode === 'signin'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
            className="font-semibold"
            style={{ color: 'var(--color-primary)' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
