import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Key, Copy, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  
  const [createdUser, setCreatedUser] = useState<{ id: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pass);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempPassword) generateRandomPassword();

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to create users.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email,
            password: tempPassword,
            full_name: fullName,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user account.');
      }

      setCreatedUser(result.user);
    } catch (err: any) {
      setError(err.message || 'Error creating user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/users"
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-sky-400" /> Provision Staff App Account
          </h1>
          <p className="text-xs text-slate-400">Create new staff account with temporary password</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {createdUser ? (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <h3 className="font-bold text-base text-white">Staff Account Created Successfully!</h3>
            <p className="mt-1">
              Account created for <span className="font-semibold text-white">{fullName}</span> ({email}).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold uppercase text-slate-400">Temporary Password</label>
            <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <code className="text-amber-400 font-mono text-base font-bold">{tempPassword}</code>
              <button
                onClick={handleCopyPassword}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy Password'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Provide this temporary password directly to the staff member.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              to={`/users/${createdUser.id}/permissions`}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20"
            >
              Configure Permissions Grants &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreateUser} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Staff Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder='e.g., "Sensei Sarah"'
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Staff Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@dojo.com"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase text-slate-300">Temporary Password *</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                Generate Random
              </button>
            </div>
            <input
              type="text"
              required
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="Click Generate Random or type temp password"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Link
              to="/users"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Account...' : 'Provision User'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
