import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sword, Clock, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Weapon, WeaponConditionLog, WeaponIssueItem, WeaponCondition } from '../../types/permissions';

export const WeaponDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { can } = usePermissions();

  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [logs, setLogs] = useState<WeaponConditionLog[]>([]);
  const [issueItems, setIssueItems] = useState<WeaponIssueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Manual condition adjust state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [newCondition, setNewCondition] = useState<WeaponCondition>('good');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNote, setAdjustNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWeaponData(id);
    }
  }, [id]);

  const fetchWeaponData = async (weaponId: string) => {
    setIsLoading(true);
    try {
      const [weaponRes, logsRes, itemsRes] = await Promise.all([
        supabase.from('weapons').select('*').eq('id', weaponId).single(),
        supabase
          .from('weapon_condition_logs')
          .select('*, recorded_by_profile:profiles!recorded_by(*)')
          .eq('weapon_id', weaponId)
          .order('created_at', { ascending: false }),
        supabase
          .from('weapon_issue_items')
          .select('*, weapon:weapons(*)')
          .eq('weapon_id', weaponId)
          .order('created_at', { ascending: false }),
      ]);

      if (weaponRes.data) setWeapon(weaponRes.data as Weapon);
      if (logsRes.data) setLogs(logsRes.data as WeaponConditionLog[]);
      if (itemsRes.data) setIssueItems(itemsRes.data as WeaponIssueItem[]);
    } catch (err) {
      console.error('Error fetching weapon details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weapon || !user || !id) return;

    setIsSubmitting(true);
    try {
      const { error: lError } = await supabase.from('weapon_condition_logs').insert({
        weapon_id: id,
        recorded_by: user.id,
        condition: newCondition,
        quantity: adjustQty,
        note: adjustNote || 'Manual condition check',
      });
      if (lError) throw lError;

      setIsAdjustModalOpen(false);
      setAdjustNote('');
      fetchWeaponData(id);
    } catch (err) {
      console.error('Failed to log condition:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Loading weapon details...</div>;
  }

  if (!weapon) {
    return <div className="text-center py-12 text-slate-400 text-sm">Weapon not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/inventory"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{weapon.name}</h1>
            <p className="text-xs text-sky-400 font-medium">{weapon.category}</p>
          </div>
        </div>

        {can('inventory_management', 'manage') && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-sm font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Log Condition Inspection
            </button>
            <Link
              to={`/inventory/${weapon.id}/edit`}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20"
            >
              Edit Stock
            </Link>
          </div>
        )}
      </div>

      {/* Main Info Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="w-full h-48 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
          {weapon.photo_url ? (
            <img src={weapon.photo_url} alt={weapon.name} className="w-full h-full object-cover" />
          ) : (
            <Sword className="w-16 h-16 text-slate-700" />
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase">Available</span>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{weapon.available_quantity}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Arsenal</span>
              <p className="text-2xl font-bold text-white mt-0.5">{weapon.total_quantity}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase">Checked Out</span>
              <p className="text-2xl font-bold text-purple-400 mt-0.5">
                {weapon.total_quantity - weapon.available_quantity}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm pt-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Tracking Type</p>
              <p className="text-slate-200 font-medium uppercase">{weapon.tracking_type}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Serial / Tag</p>
              <p className="text-slate-200 font-medium">{weapon.serial_or_tag || 'N/A'}</p>
            </div>
          </div>

          {weapon.notes && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-semibold uppercase text-slate-500">Notes & Storage</p>
              <p className="text-sm text-slate-300 mt-0.5">{weapon.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Timelines Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Condition Audit History */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" /> Condition Audit History
          </h2>
          {logs.length === 0 ? (
            <p className="text-slate-500 text-sm">No condition log entries recorded.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-400">{log.quantity}x</span>
                      <Badge type="condition" value={log.condition} />
                    </div>
                    <span className="text-slate-500">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-300 font-medium">{log.note || 'Condition update'}</p>
                  <p className="text-[11px] text-slate-500">
                    Logged by: {log.recorded_by_profile?.full_name || 'Staff User'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Issue History */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-sky-400" /> Checkout History
          </h2>
          {issueItems.length === 0 ? (
            <p className="text-slate-500 text-sm">No checkout records for this weapon model.</p>
          ) : (
            <div className="space-y-3">
              {issueItems.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      Issued: {item.quantity_issued} unit(s)
                    </span>
                    <Badge type="issueStatus" value={item.status} />
                  </div>
                  <p className="text-slate-400">
                    Returned: {item.quantity_returned} / {item.quantity_issued}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Adjust Condition Modal */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Log Condition Inspection">
        <form onSubmit={handleAdjustCondition} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Condition</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as WeaponCondition)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged / Needs Repair</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Quantity</label>
              <input
                type="number"
                min={1}
                max={weapon.total_quantity}
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm font-bold text-sky-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Inspection Note</label>
            <textarea
              required
              rows={3}
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Describe physical inspection notes..."
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Inspection Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
