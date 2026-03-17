import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Zap, Calendar, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = (plan: 'free' | 'pro') => {
    if (user) {
      if (plan === 'pro') {
        // Redirect to checkout
        fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid })
        })
        .then(res => res.json())
        .then(data => {
          if (data.url) window.location.href = data.url;
        })
        .catch(err => console.error(err));
      } else {
        navigate('/app');
      }
    } else {
      navigate(`/auth?plan=${plan}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">PinScheduler</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <button 
                onClick={() => navigate('/app')}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                Go to Dashboard
              </button>
            ) : (
              <button 
                onClick={() => navigate('/auth')}
                className="text-slate-600 hover:text-slate-900 font-medium"
              >
                Log In
              </button>
            )}
            <button 
              onClick={() => handleSelectPlan('free')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
          Automate your Pinterest growth.
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          Schedule pins, generate AI captions, and manage multiple accounts from one powerful dashboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => handleSelectPlan('free')}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Start for Free
          </button>
          <button 
            onClick={() => handleSelectPlan('pro')}
            className="w-full sm:w-auto bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            View Pro Plan
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Scheduling</h3>
              <p className="text-slate-600">Plan your content calendar weeks in advance and let us handle the publishing automatically.</p>
            </div>
            <div className="text-center">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Captions</h3>
              <p className="text-slate-600">Generate engaging, SEO-optimized titles and descriptions using advanced AI.</p>
            </div>
            <div className="text-center">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Account</h3>
              <p className="text-slate-600">Manage up to 10 different Pinterest accounts from a single, unified dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="pricing">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-600">Choose the plan that fits your needs.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-extrabold text-slate-900">$0</span>
              <span className="text-slate-500">/forever</span>
            </div>
            <p className="text-slate-600 mb-8">Perfect for individuals just getting started with Pinterest.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-slate-700">1 Pinterest Account</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-slate-700">Basic Scheduling</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-slate-700">AI Captions (Limited)</span>
              </li>
            </ul>

            <button 
              onClick={() => handleSelectPlan('free')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-4 rounded-xl transition-colors"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-extrabold text-white">$1</span>
              <span className="text-slate-400">/one-time</span>
            </div>
            <p className="text-slate-400 mb-8">For creators and agencies managing multiple brands.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-slate-200">Up to 10 Pinterest Accounts</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-slate-200">Unlimited Scheduling</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-slate-200">Unlimited AI Captions</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-slate-200">Priority Support</span>
              </li>
            </ul>

            <button 
              onClick={() => handleSelectPlan('pro')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
