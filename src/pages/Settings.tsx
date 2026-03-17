import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Key, Save, Loader2, AlertCircle, Check, ArrowLeft } from 'lucide-react';

export default function Settings() {
  const { profile, updateProfileData } = useAuth();
  const navigate = useNavigate();
  
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile?.geminiApiKey) {
      setApiKey(profile.geminiApiKey);
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      await updateProfileData({ geminiApiKey: apiKey });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to App
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <div className="bg-slate-200 p-2 rounded-lg">
              <SettingsIcon className="w-5 h-5 text-slate-700" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Settings saved successfully!</span>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                <Key className="w-4 h-4" /> Gemini API Key
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Provide your own Google Gemini API key to generate pins. This key is stored securely in your profile.
              </p>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-mono text-sm"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
