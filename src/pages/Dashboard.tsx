import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sword,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import { Badge } from '../components/common/Badge';
import { WeaponIssue, Weapon } from '../types/permissions';

export const Dashboard: React.FC = () => {
  const { can } = usePermissions();
  const [stats, setStats] = useState({
    totalWeapons: 0,
    availableWeapons: 0,
    issuedWeapons: 0,
    overdueIssues: 0,
  });
  const [recentIssues, setRecentIssues] = useState<WeaponIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [weaponsRes, issuesRes, overdueRes] = await Promise.all([
          supabase.from('weapons').select('total_quantity, available_quantity'),
          supabase
            .from('weapon_issues')
            .select('*, student:students(*), items:weapon_issue_items(*, weapon:weapons(*))')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('weapon_issues').select('id', { count: 'exact' }).eq('status', 'overdue'),
        ]);

        if (weaponsRes.data) {
          const weapons = weaponsRes.data as Weapon[];
          const total = weapons.reduce((acc, w) => acc + (w.total_quantity || 0), 0);
          const avail = weapons.reduce((acc, w) => acc + (w.available_quantity || 0), 0);

          setStats({
            totalWeapons: total,
            availableWeapons: avail,
            issuedWeapons: total - avail,
            overdueIssues: overdueRes.count || 0,
          });
        }

        if (issuesRes.data) {
          setRecentIssues(issuesRes.data as WeaponIssue[]);
        }
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kalari Weapons Control</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status overview of Kalaripayattu weapons inventory and student checkouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {can('issue_management', 'manage') && (
            <Link
              to="/issue"
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20"
            >
              <PlusCircle className="w-4 h-4" /> Multi-Weapon Checkout
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Total Units</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.totalWeapons}</p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
            <Sword className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Available Arsenal</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.availableWeapons}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Currently Issued</p>
            <p className="text-3xl font-bold text-purple-400 mt-1">{stats.issuedWeapons}</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Overdue Returns</p>
            <p className="text-3xl font-bold text-rose-400 mt-1">{stats.overdueIssues}</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      {can('issue_management', 'view') && (
        <div className="glass-panel rounded-3xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-sky-400" /> Recent Checkout Activity
            </h2>
            <Link
              to="/issues"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading activity...</div>
          ) : recentIssues.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No checkout records found yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs font-semibold text-slate-400 uppercase border-b border-slate-800 pb-2">
                  <tr>
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Weapons Issued</th>
                    <th className="pb-3">Issued Date</th>
                    <th className="pb-3">Expected Return</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 font-bold text-white">{issue.student?.name || 'Student'}</td>
                      <td className="py-3.5">
                        <div className="space-y-0.5 text-xs">
                          {(issue.items || []).map((item) => (
                            <div key={item.id} className="flex items-center gap-1.5">
                              <span className="font-bold text-sky-400">{item.quantity_issued}x</span>
                              <span className="text-slate-300">{item.weapon?.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-400 text-xs">{issue.issue_date}</td>
                      <td className="py-3.5 text-slate-400 text-xs">{issue.expected_return_date}</td>
                      <td className="py-3.5">
                        <Badge type="issueStatus" value={issue.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
