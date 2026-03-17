import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const authWindowRef = useRef<Window | null>(null);
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'free';
  
  const { loginWithEmail, signupWithEmail, loginWithGoogle, loginWithPinterest, updateProfileData } = useAuth();
  const navigate = useNavigate();

  const handleCheckoutRedirect = async (userId: string) => {
    try {
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan: 'pro' })
      });
      if (!response.ok) {
        const text = await response.text();
        let errorMsg = text;
        try { errorMsg = JSON.parse(text).error; } catch (e) {}
        throw new Error(errorMsg || 'Failed to create checkout session');
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to initiate checkout. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plan === 'pro') {
      setIsLogin(false);
    }
  }, [plan]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'PINTEREST_AUTH_SUCCESS') {
        if (authWindowRef.current) {
          authWindowRef.current.close();
          authWindowRef.current = null;
        }
        
        const token = event.data.token;
        try {
          setLoading(true);
          setError('');
          await loginWithPinterest(token);
          
          // Get current user from Firebase Auth
          const { auth } = await import('../firebase');
          const currentUser = auth.currentUser;
          
          if (plan === 'pro' && currentUser) {
            await handleCheckoutRedirect(currentUser.uid);
          } else {
            navigate('/app');
          }
        } catch (err: any) {
          let errorMessage = err.message || 'Failed to authenticate with Pinterest';
          if (err.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email/Password authentication must be enabled in the Firebase Console (Authentication > Sign-in method) to use Pinterest login.';
          }
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loginWithPinterest, navigate, plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        navigate('/app');
      } else {
        await signupWithEmail(email, password);
        if (name) {
          await updateProfileData({ displayName: name });
        }
        
        // Wait briefly for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get current user from Firebase Auth
        const { auth } = await import('../firebase');
        const currentUser = auth.currentUser;
        
        if (plan === 'pro' && currentUser) {
          await handleCheckoutRedirect(currentUser.uid);
        } else {
          navigate('/app');
        }
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to authenticate';
      if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password authentication is not enabled. Please enable it in the Firebase Console (Authentication > Sign-in method).';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use. Please sign in instead.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      
      // Wait briefly for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { auth } = await import('../firebase');
      const currentUser = auth.currentUser;
      
      if (plan === 'pro' && currentUser) {
        await handleCheckoutRedirect(currentUser.uid);
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google');
      setLoading(false);
    }
  };

  const handlePinterestLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await fetch('/api/auth/pinterest/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      authWindowRef.current = window.open(
        url,
        'pinterest_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
      );

      if (!authWindowRef.current) {
        setError('Please allow popups to connect your Pinterest account.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start Pinterest authentication');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex justify-center mb-8">
          <div className="bg-red-600 p-3 rounded-full">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>
        
        {!isLogin && plan === 'pro' && (
          <p className="text-center text-slate-600 mb-6">
            Sign up to continue to checkout for the Pro plan ($19).
          </p>
        )}
        
        {isLogin && (
          <p className="text-center text-slate-600 mb-6">
            Log in to access your dashboard.
          </p>
        )}

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {isLogin ? 'Sign In' : (plan === 'pro' ? 'Continue to Payment' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-px bg-slate-200 flex-1"></div>
          <span className="text-sm text-slate-500">OR</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        <div className="mt-6 space-y-3">
          <button 
            onClick={handlePinterestLogin}
            disabled={loading}
            className="w-full bg-[#E60023] hover:bg-[#ad081b] text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.182 0 7.433 2.981 7.433 6.959 0 4.156-2.618 7.503-6.257 7.503-1.222 0-2.372-.635-2.764-1.385l-.752 2.868c-.272 1.043-1.008 2.35-1.503 3.146 1.123.345 2.318.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.604 0 12.017 0z"/>
            </svg>
            Continue with Pinterest
          </button>

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-red-600 font-semibold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
