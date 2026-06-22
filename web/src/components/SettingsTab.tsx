'use client';

import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { Shield, Key, User, Plus, Trash2, Copy, Check, ShieldCheck, Database, HardDrive } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsTabProps {
  user: any;
  apiKeys: any[];
  onRefreshKeys: () => void;
  onUserUpdate: (updatedUser: any) => void;
}

export default function SettingsTab({ user, apiKeys, onRefreshKeys, onUserUpdate }: SettingsTabProps) {
  const [userName, setUserName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  
  // Custom API key override state
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savingGeminiKey, setSavingGeminiKey] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const data = await apiRequest('/auth/profile', 'PATCH', { name: userName, avatarUrl });
      localStorage.setItem('user', JSON.stringify(data));
      onUserUpdate(data);
      confetti({ particleCount: 50, spread: 40 });
    } catch (err: any) {
      alert(`Profile update failed: ${err.message}`);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || creatingKey) return;
    setCreatingKey(true);
    try {
      await apiRequest('/auth/keys', 'POST', { name: newKeyName });
      setNewKeyName('');
      onRefreshKeys();
    } catch (err: any) {
      alert(`Key creation failed: ${err.message}`);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Any applications currently using it will be blocked.')) return;
    try {
      await apiRequest(`/auth/keys/${id}`, 'DELETE');
      onRefreshKeys();
    } catch (err: any) {
      alert(`Key deletion failed: ${err.message}`);
    }
  };

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeminiKey(true);
    try {
      // Typically we'd save this securely in session state, in an env settings override endpoint,
      // or we can save it to localStorage for frontend direct headers, or make a backend config route.
      // To keep it simple and effective, let's write it to localStorage so the frontend can pass it 
      // dynamically in headers if they wish, or simulate saving.
      // Let's call simulated save
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('gemini_api_key_override', geminiApiKey);
      alert('Gemini API key override saved successfully! (Frontend local configuration)');
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingGeminiKey(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">System Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Manage developer credentials, user profile configs, and database storage runtimes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hand: User profile & overrides */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile form */}
          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <User className="w-4.5 h-4.5 text-indigo-400" />
              Developer Profile Information
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label>Email Address (Immutable)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full mt-1.5 p-2.5 rounded bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label>Display Name</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full mt-1.5 p-2.5 rounded bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label>Avatar Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full mt-1.5 p-2.5 rounded bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {updatingProfile ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Gemini Key Override Form */}
          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4.5 h-4.5 text-purple-400" />
              Gemini API Access Overrides
            </h3>
            <form onSubmit={handleSaveGeminiKey} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="space-y-1">
                <label>Gemini API Key (Google AI Studio)</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full mt-1.5 p-2.5 rounded bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                By default, the system runs in AI Mock Mode if no backend key is configured. If you enter your own key here, the frontend can query Google Generative AI capabilities for custom local executions.
              </p>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingGeminiKey || !geminiApiKey.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {savingGeminiKey ? 'Saving Override...' : 'Save Local Override'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Hand: API Key Lists & Runtime */}
        <div className="space-y-6">
          {/* Key Creation and list */}
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Key className="w-4.5 h-4.5 text-pink-400" />
              Gateway API Credentials
            </h3>
            
            <form onSubmit={handleCreateKey} className="flex gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="Key label (e.g. Prod Mobile)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 p-2 rounded bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={creatingKey || !newKeyName.trim()}
                className="p-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 cursor-pointer font-bold disabled:opacity-50"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </form>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-3 bg-black/30 border border-white/5 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-300">
                    <span>{key.name}</span>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-1 rounded hover:bg-red-900/50 hover:text-red-400 text-slate-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-black/40 rounded border border-white/5">
                    <code className="text-indigo-300 font-mono text-[10px] truncate max-w-[130px]">{key.key}</code>
                    <button
                      onClick={() => handleCopyKey(key.key, key.id)}
                      className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKeyId === key.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {apiKeys.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-8">
                  Create a developer token to authorize your external REST requests.
                </div>
              )}
            </div>
          </div>

          {/* System Runtime Metrics */}
          <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Database className="w-4.5 h-4.5 text-emerald-400" />
              Application Environment
            </h3>
            <div className="divide-y divide-white/5 text-xs text-slate-400 space-y-3 font-semibold">
              <div className="flex justify-between items-center pb-2">
                <span>Database Engine</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  SQLite (Native)
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Database Connection</span>
                <code className="text-indigo-400 font-mono text-[10px]">dev.db</code>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Vector Dimension</span>
                <span className="text-slate-300 font-bold">768 (Cosine Similarity)</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Job Queuing Service</span>
                <span className="text-slate-300 font-bold">In-process Promise queue</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span>Disk File Storage</span>
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  Local disk (uploads/)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
