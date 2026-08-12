import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Shield, Key } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { Profile } from '../../types/permissions';

export const UsersList: React.FC = () => {
  const { can } = usePermissions();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Error fetching staff profiles:', error);
        if (data) setProfiles(data as Profile[]);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" /> App Users
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Other members with access to issue or manage martial arts weapons.
          </p>
        </div>
        {can('user_management', 'manage') && (
          <Link
            to="/users/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20"
          >
            <UserPlus className="w-4 h-4" /> Create App User
          </Link>
        )}
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading other users...</div>
      ) : profiles.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <p className="text-slate-400">No other profiles found.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs font-semibold text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role / Access</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-white">{profile.full_name}</td>
                    <td className="p-4">
                      {profile.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                          <Shield className="w-3 h-3" /> Super Admin
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Standard User</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          profile.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {can('user_management', 'manage') && !profile.is_admin && (
                        <Link
                          to={`/users/${profile.id}/permissions`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" /> Edit Grants
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
