import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateProfileData, logout } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token || !user) {
      navigate('/');
      return;
    }

    const verifySession = async () => {
      try {
        const response = await fetch(`/api/capture-subscription?token=${token}`);
        if (!response.ok) {
          throw new Error(`Failed to verify session: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.success && data.userId === user.uid) {
          await updateProfileData({ plan: 'pro' });
          setStatus('success');
          setTimeout(async () => {
            await logout();
            navigate('/auth');
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error verifying session:', error);
        setStatus('error');
      }
    };

    verifySession();
  }, [searchParams, user, navigate, updateProfileData, logout]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying Payment...</h2>
            <p className="text-slate-600">Please wait while we confirm your subscription.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="bg-emerald-100 p-3 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-6">Welcome to the Pro plan. Your account has been upgraded.</p>
            <p className="text-sm text-slate-500">Redirecting to login...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
            <p className="text-slate-600 mb-6">We couldn't verify your payment. If you were charged, please contact support.</p>
            <button 
              onClick={() => navigate('/app')}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
