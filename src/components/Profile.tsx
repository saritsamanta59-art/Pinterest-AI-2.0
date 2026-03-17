import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Camera, Loader2 } from 'lucide-react';

export function Profile() {
  const { profile, updateProfileData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
    photoURL: profile?.photoURL || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfileData(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Profile</h2>
        <p className="text-zinc-500 mt-2">Manage your personal information and preferences.</p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-zinc-900 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              {(isEditing ? formData.photoURL : profile?.photoURL) ? (
                <img
                  src={isEditing ? formData.photoURL : profile?.photoURL}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white bg-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 border-4 border-white shadow-sm">
                  <UserCircle className="w-12 h-12" />
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900">{profile?.displayName || 'Anonymous User'}</h3>
                  <p className="text-zinc-500">{profile?.email}</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 transition-colors font-medium text-sm"
                >
                  Edit Profile
                </button>
              </div>

              {profile?.bio && (
                <div className="pt-6 border-t border-zinc-100">
                  <h4 className="text-sm font-semibold text-zinc-900 mb-2">About</h4>
                  <p className="text-zinc-600 leading-relaxed">{profile.bio}</p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-zinc-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="photoURL" className="block text-sm font-medium text-zinc-700 mb-2">
                    Profile Picture URL
                  </label>
                  <input
                    type="url"
                    id="photoURL"
                    name="photoURL"
                    value={formData.photoURL}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-zinc-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none"
                    placeholder="Tell us a little about yourself..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors font-medium text-sm"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium text-sm disabled:opacity-70"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
