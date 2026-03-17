import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Shield, Key, Smartphone, Moon } from 'lucide-react';

export function Settings() {
  const { profile, updateProfileData } = useAuth();

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    try {
      await updateProfileData({ theme });
    } catch (error) {
      console.error('Failed to update theme', error);
    }
  };

  const sections = [
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize how the application looks on your device.',
      icon: <Moon className="w-5 h-5" />,
      content: (
        <div className="flex items-center gap-4">
          {['light', 'dark', 'system'].map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                profile?.theme === t
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage how you receive alerts and updates.',
      icon: <Bell className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          {['Email notifications', 'Push notifications', 'Weekly digest'].map((item, i) => (
            <label key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors">
              <span className="text-sm font-medium text-zinc-900">{item}</span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-zinc-900 border-zinc-300" defaultChecked={i === 0} />
                <label htmlFor="toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-zinc-300 cursor-pointer"></label>
              </div>
            </label>
          ))}
        </div>
      ),
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Protect your account with additional security measures.',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <button className="flex items-center gap-3 px-4 py-3 w-full bg-zinc-50 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors text-left">
            <Key className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900">Change Password</p>
              <p className="text-xs text-zinc-500">Update your password regularly to keep your account secure</p>
            </div>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 w-full bg-zinc-50 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors text-left">
            <Smartphone className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900">Two-Factor Authentication</p>
              <p className="text-xs text-zinc-500">Add an extra layer of security to your account</p>
            </div>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Settings</h2>
        <p className="text-zinc-500 mt-2">Manage your account settings and preferences.</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-start gap-4">
              <div className="p-2 bg-zinc-100 text-zinc-900 rounded-xl">
                {section.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">{section.title}</h3>
                <p className="text-sm text-zinc-500 mt-1">{section.description}</p>
              </div>
            </div>
            <div className="p-6 bg-zinc-50/50">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
