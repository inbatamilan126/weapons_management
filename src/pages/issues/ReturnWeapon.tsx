import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, AlertCircle, Sword } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { WeaponIssue, WeaponIssueItem } from '../../types/permissions';

interface ItemReturnState {
  itemId: string;
  weaponName: string;
  qtyIssued: number;
  qtyAlreadyReturned: number;
  qtyToReturnGood: number;
  qtyToReturnFair: number;
  qtyToReturnPoor: number;
  qtyToReturnDamaged: number;
}

export const ReturnWeapon: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [issue, setIssue] = useState<WeaponIssue | null>(null);
  const [returnItems, setReturnItems] = useState<ItemReturnState[]>([]);
  const [returnNotes, setReturnNotes] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchIssueDetails(id);
    }
  }, [id]);

  const fetchIssueDetails = async (issueId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('weapon_issues')
        .select('*, student:students(*), items:weapon_issue_items(*, weapon:weapons(*))')
        .eq('id', issueId)
        .single();

      if (error) throw error;
      if (data) {
        const record = data as WeaponIssue;
        setIssue(record);

        const initialReturnState: ItemReturnState[] = (record.items || []).map((item) => {
          const remaining = item.quantity_issued - item.quantity_returned;
          return {
            itemId: item.id,
            weaponName: item.weapon?.name || 'Weapon',
            qtyIssued: item.quantity_issued,
            qtyAlreadyReturned: item.quantity_returned,
            qtyToReturnGood: remaining > 0 ? remaining : 0,
            qtyToReturnFair: 0,
            qtyToReturnPoor: 0,
            qtyToReturnDamaged: 0,
          };
        });

        setReturnItems(initialReturnState);
      }
    } catch (err) {
      setError('Issue record not found.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQtyChange = (
    index: number,
    field: 'qtyToReturnGood' | 'qtyToReturnFair' | 'qtyToReturnPoor' | 'qtyToReturnDamaged',
    val: number
  ) => {
    setReturnItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: Math.max(0, val) };
      return next;
    });
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue || !user || !id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      for (const itemState of returnItems) {
        const totalReturning =
          itemState.qtyToReturnGood +
          itemState.qtyToReturnFair +
          itemState.qtyToReturnPoor +
          itemState.qtyToReturnDamaged;

        const maxRemaining = itemState.qtyIssued - itemState.qtyAlreadyReturned;

        if (totalReturning > maxRemaining) {
          throw new Error(
            `Returned count (${totalReturning}) for ${itemState.weaponName} exceeds remaining unreturned count (${maxRemaining}).`
          );
        }

        if (totalReturning > 0) {
          const breakdown = {
            good: itemState.qtyToReturnGood,
            fair: itemState.qtyToReturnFair,
            poor: itemState.qtyToReturnPoor,
            damaged: itemState.qtyToReturnDamaged,
          };

          const newTotalReturned = itemState.qtyAlreadyReturned + totalReturning;

          const { error: itemUpdateError } = await supabase
            .from('weapon_issue_items')
            .update({
              quantity_returned: newTotalReturned,
              condition_on_return_breakdown: breakdown,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itemState.itemId);

          if (itemUpdateError) throw itemUpdateError;

          // Log condition entries
          const originalItem = (issue.items || []).find((i) => i.id === itemState.itemId);
          if (originalItem) {
            if (itemState.qtyToReturnGood > 0) {
              await supabase.from('weapon_condition_logs').insert({
                weapon_id: originalItem.weapon_id,
                recorded_by: user.id,
                condition: 'good',
                quantity: itemState.qtyToReturnGood,
                note: `Returned Good: ${returnNotes || 'Regular return'}`,
                related_issue_id: id,
              });
            }
            if (itemState.qtyToReturnDamaged > 0) {
              await supabase.from('weapon_condition_logs').insert({
                weapon_id: originalItem.weapon_id,
                recorded_by: user.id,
                condition: 'damaged',
                quantity: itemState.qtyToReturnDamaged,
                note: `Returned Damaged/Needs Repair: ${returnNotes || 'Damaged on return'}`,
                related_issue_id: id,
              });
            }
          }
        }
      }

      navigate('/issues');
    } catch (err: any) {
      setError(err.message || 'Error processing return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 text-sm">Loading issue record...</div>;
  }

  if (!issue) {
    return <div className="text-center py-12 text-slate-400 text-sm">Record not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/issues"
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-emerald-400" /> Process Return & Inspection
          </h1>
          <p className="text-xs text-slate-400">
            Student: <span className="font-semibold text-white">{issue.student?.name}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleProcessReturn} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sword className="w-4 h-4 text-emerald-400" /> Condition Breakdown Per Weapon Line Item
          </h3>

          {returnItems.map((itemState, index) => {
            const maxRemaining = itemState.qtyIssued - itemState.qtyAlreadyReturned;
            return (
              <div
                key={itemState.itemId}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">{itemState.weaponName}</span>
                  <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                    Remaining Unreturned: {maxRemaining} / {itemState.qtyIssued}
                  </span>
                </div>

                {maxRemaining > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                        Good Qty
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={maxRemaining}
                        value={itemState.qtyToReturnGood}
                        onChange={(e) =>
                          handleQtyChange(index, 'qtyToReturnGood', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-sky-400 mb-1">
                        Fair Qty
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={maxRemaining}
                        value={itemState.qtyToReturnFair}
                        onChange={(e) =>
                          handleQtyChange(index, 'qtyToReturnFair', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                        Poor Qty
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={maxRemaining}
                        value={itemState.qtyToReturnPoor}
                        onChange={(e) =>
                          handleQtyChange(index, 'qtyToReturnPoor', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-rose-400 mb-1">
                        Needs Repair
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={maxRemaining}
                        value={itemState.qtyToReturnDamaged}
                        onChange={(e) =>
                          handleQtyChange(index, 'qtyToReturnDamaged', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-semibold">Fully returned.</p>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
            Inspection & Return Notes
          </label>
          <textarea
            rows={3}
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Add any notes on physical condition or return circumstances..."
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            to="/issues"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Complete Return'}
          </button>
        </div>
      </form>
    </div>
  );
};
