import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { X, Key, Save, Loader2, Trash2, AlertCircle } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, user, accounts, onRemoveAccount }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      const fetchSettings = async () => {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().geminiApiKey) {
            setApiKey(docSnap.data().geminiApiKey);
          }
        } catch (err) {
          console.error("Failed to load settings", err);
        }
      };
      fetchSettings();
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        geminiApiKey: apiKey,
        updatedAt: new Date()
      });
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-zinc-900">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl border border-emerald-100">
                {success}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Custom Gemini API Key</label>
              <p className="text-xs text-zinc-500 mb-2">Use your own Gemini API key for generation. Leave blank to use the default.</p>
              <div className="relative">
                <Key className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="AIzaSy..."
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </form>

          <div className="pt-6 border-t border-zinc-100">
            <h3 className="text-sm font-medium text-zinc-900 mb-3">Connected Pinterest Accounts ({accounts.length}/10)</h3>
            {accounts.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No accounts connected yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-sm font-medium text-zinc-700 truncate mr-2">{account.name}</span>
                    <button
                      onClick={() => onRemoveAccount(account.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Remove Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
