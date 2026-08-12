import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, PlusCircle, Search, Filter, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { Badge } from '../../components/common/Badge';
import { WeaponIssue } from '../../types/permissions';

export const IssuesList: React.FC = () => {
  const { can } = usePermissions();
  const [issues, setIssues] = useState<WeaponIssue[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('weapon_issues')
        .select('*, student:students(*), items:weapon_issue_items(*, weapon:weapons(*))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues((data as WeaponIssue[]) || []);
    } catch (err) {
      console.error('Error loading checkout records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const studentName = issue.student?.name?.toLowerCase() || '';
    const itemNames = (issue.items || [])
      .map((i) => i.weapon?.name?.toLowerCase() || '')
      .join(' ');

    const matchesSearch =
      studentName.includes(search.toLowerCase()) || itemNames.includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-sky-400" /> Checkout & Return Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor multi-weapon checkout sessions, return statuses, and overdue items.
          </p>
        </div>
        {can('issue_management', 'manage') && (
          <Link
            to="/issue"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Multi-Weapon Checkout
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search student or weapon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="issued">Issued (Active)</option>
            <option value="partially_returned">Partially Returned</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading checkout records...</div>
      ) : filteredIssues.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <p className="text-slate-400">No checkout records found.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs font-semibold text-slate-400 uppercase bg-slate-900/80 border-b border-slate-800">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Weapons Checked Out</th>
                  <th className="p-4">Issued On</th>
                  <th className="p-4">Expected Return</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-white">{issue.student?.name || 'Student'}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {(issue.items || []).map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-sky-400">
                              {item.quantity_issued}x
                            </span>
                            <span className="text-slate-200">{item.weapon?.name}</span>
                            {item.quantity_returned > 0 && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                ({item.quantity_returned} returned)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">{issue.issue_date}</td>
                    <td className="p-4 text-slate-400 text-xs">
                      <span
                        className={issue.status === 'overdue' ? 'text-rose-400 font-bold' : ''}
                      >
                        {issue.expected_return_date}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge type="issueStatus" value={issue.status} />
                    </td>
                    <td className="p-4 text-right">
                      {issue.status !== 'returned' && can('issue_management', 'manage') && (
                        <Link
                          to={`/issues/${issue.id}/return`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Return / Inspect
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
