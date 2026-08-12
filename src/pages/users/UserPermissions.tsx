import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Key, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Module, Profile, UserPermission } from '../../types/permissions';

interface ModuleConfig {
  key: Module;
  label: string;
  description: string;
  hasManage: boolean;
}

const MODULES: ModuleConfig[] = [
  {
    key: 'inventory_management',
    label: 'Inventory Management',
    description: 'View weapons inventory, condition logs; add/edit weapons and adjust conditions.',
    hasManage: true,
  },
  {
    key: 'issue_management',
    label: 'Issue Management',
    description: 'View checkouts/returns; add students, issue weapons to students, process returns.',
    hasManage: true,
  },
  {
    key: 'user_management',
    label: 'User Management',
    description: 'View staff users; create users, grant/revoke permissions, activate/deactivate accounts.',
    hasManage: true,
  },
  {
    key: 'issue_notifications',
    label: 'All Due Notifications',
    description: 'View due-soon and overdue reminders for ALL issues across the entire kalari (not just personal).',
    hasManage: false,
  },
];

export const UserPermissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [grants, setGrants] = useState<Record<Module, { can_view: boolean; can_manage: boolean }>>({
    inventory_management: { can_view: false, can_manage: false },
    issue_management: { can_view: false, can_manage: false },
    user_management: { can_view: false, can_manage: false },
    issue_notifications: { can_view: false, can_manage: false },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUserAndGrants(id);
    }
  }, [id]);

  const fetchUserAndGrants = async (targetUserId: string) => {
    setIsLoading(true);
    try {
      const [profileRes, permsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', targetUserId).single(),
        supabase.from('user_permissions').select('*').eq('user_id', targetUserId),
      ]);

      if (profileRes.data) setTargetProfile(profileRes.data as Profile);

      if (permsRes.data) {
        const existingPerms = permsRes.data as UserPermission[];
        const nextGrants = { ...grants };

        existingPerms.forEach((p) => {
          if (p.module in nextGrants) {
            nextGrants[p.module as Module] = {
              can_view: p.can_view || p.can_manage,
              can_manage: p.can_manage,
            };
          }
        });
        setGrants(nextGrants);
      }
    } catch (err) {
      console.error('Error fetching user grants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (module: Module, type: 'view' | 'manage', value: boolean) => {
    setGrants((prev) => {
      const current = prev[module];
      if (type === 'manage') {
        return {
          ...prev,
          [module]: {
            can_manage: value,
            can_view: value ? true : current.can_view,
          },
        };
      } else {
        return {
          ...prev,
          [module]: {
            can_view: value,
            can_manage: !value ? false : current.can_manage,
          },
        };
      }
    });
  };

  const handleSaveGrants = async () => {
    if (!id || !user) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const rowsToUpsert = MODULES.map((m) => ({
        user_id: id,
        module: m.key,
        can_view: grants[m.key].can_view || grants[m.key].can_manage,
        can_manage: m.hasManage ? grants[m.key].can_manage : false,
        granted_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('user_permissions')
        .upsert(rowsToUpsert, { onConflict: 'user_id,module' });

      if (upsertError) throw upsertError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error saving user permission grants.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Loading permission matrix...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/users"
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-amber-400" /> Module Access Control
          </h1>
          <p className="text-xs text-slate-400">
            Grant or revoke permissions for <span className="text-white font-semibold">{targetProfile?.full_name}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>Permission grants updated successfully!</span>
        </div>
      )}

      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="space-y-4 divide-y divide-slate-800/80">
          {MODULES.map((m) => {
            const current = grants[m.key];
            return (
              <div key={m.key} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="max-w-md">
                  <h3 className="font-bold text-white text-base">{m.label}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.can_view}
                      onChange={(e) => handleToggle(m.key, 'view', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                    />
                    <span>VIEW</span>
                  </label>

                  {m.hasManage && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={current.can_manage}
                        onChange={(e) => handleToggle(m.key, 'manage', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                      />
                      <span>MANAGE</span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
          <Link
            to="/users"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl"
          >
            Back
          </Link>
          <button
            onClick={handleSaveGrants}
            disabled={isSaving}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving Grants...' : 'Save Permission Matrix'}
          </button>
        </div>
      </div>
    </div>
  );
};
