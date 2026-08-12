import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, UserPlus, Trash2, AlertCircle, Sword } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Weapon, Student, WeaponCondition } from '../../types/permissions';

interface IssueLineItem {
  weapon_id: string;
  quantity_issued: number;
  condition_on_issue: WeaponCondition;
}

export const IssueWeapon: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [availableWeapons, setAvailableWeapons] = useState<Weapon[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [purpose, setPurpose] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);

  const defaultReturn = new Date();
  defaultReturn.setDate(defaultReturn.getDate() + 7);
  const [expectedReturnDate, setExpectedReturnDate] = useState(defaultReturn.toISOString().split('T')[0]);

  // Multi-weapon line items
  const [lineItems, setLineItems] = useState<IssueLineItem[]>([
    { weapon_id: '', quantity_issued: 1, condition_on_issue: 'good' },
  ]);

  // Add inline student state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const [weaponsRes, studentsRes] = await Promise.all([
        supabase.from('weapons').select('*').gt('available_quantity', 0).order('name'),
        supabase.from('students').select('*').eq('is_active', true).order('name'),
      ]);

      if (weaponsRes.data) setAvailableWeapons(weaponsRes.data as Weapon[]);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
    } catch (err) {
      console.error('Error fetching checkout form data:', err);
    }
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { weapon_id: '', quantity_issued: 1, condition_on_issue: 'good' },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (
    index: number,
    field: keyof IssueLineItem,
    value: any
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      if (field === 'weapon_id') {
        const weapon = availableWeapons.find((w) => w.id === value);
        if (weapon) {
          updated.condition_on_issue = weapon.current_condition || 'good';
        }
      }
      next[index] = updated;
      return next;
    });
  };

  const handleAddInlineStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .insert({ name: newStudentName.trim(), added_by: user.id })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setStudents((prev) => [...prev, data as Student]);
        setSelectedStudentId(data.id);
        setIsAddStudentOpen(false);
        setNewStudentName('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add student.');
    }
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudentId) {
      setError('Please select a student.');
      return;
    }

    if (lineItems.some((item) => !item.weapon_id)) {
      setError('Please select a weapon for all line items.');
      return;
    }

    // Validate quantities against stock
    for (const item of lineItems) {
      const weapon = availableWeapons.find((w) => w.id === item.weapon_id);
      if (weapon && item.quantity_issued > weapon.available_quantity) {
        setError(
          `Requested quantity for ${weapon.name} (${item.quantity_issued}) exceeds available stock (${weapon.available_quantity}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create parent issue session
      const { data: parentIssue, error: parentError } = await supabase
        .from('weapon_issues')
        .insert({
          student_id: selectedStudentId,
          issued_by: user.id,
          purpose: purpose || null,
          issue_date: issueDate,
          expected_return_date: expectedReturnDate,
          status: 'issued',
        })
        .select()
        .single();

      if (parentError) throw parentError;

      // 2. Insert child weapon line items
      const itemsToInsert = lineItems.map((item) => ({
        issue_id: parentIssue.id,
        weapon_id: item.weapon_id,
        quantity_issued: item.quantity_issued,
        quantity_returned: 0,
        condition_on_issue: item.condition_on_issue,
        status: 'issued',
      }));

      const { error: itemsError } = await supabase
        .from('weapon_issue_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      navigate('/issues');
    } catch (err: any) {
      setError(err.message || 'Error processing multi-weapon checkout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-sky-400" /> Multi-Weapon Checkout
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Issue multiple weapon types and quantities to a student in a single session.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmitIssue} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        {/* Student Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold uppercase text-slate-300">Select Student *</label>
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(true)}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Add New Student
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search student name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            />
            <select
              required
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            >
              <option value="">-- Choose Student --</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates & Purpose */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Issue Date *</label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Expected Return Date *</label>
            <input
              type="date"
              required
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Purpose / Event</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder='e.g., "Rank Test"'
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Weapons Line Items */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sword className="w-4 h-4 text-sky-400" /> Weapons to Checkout
            </h3>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
            >
              + Add Another Weapon
            </button>
          </div>

          {lineItems.map((item, index) => {
            const selectedWeapon = availableWeapons.find((w) => w.id === item.weapon_id);
            return (
              <div
                key={index}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
              >
                <div className="md:col-span-6">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Weapon Type</label>
                  <select
                    required
                    value={item.weapon_id}
                    onChange={(e) => handleUpdateLineItem(index, 'weapon_id', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Choose Weapon --</option>
                    {availableWeapons.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.category}) - Available: {w.available_quantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Qty (Max: {selectedWeapon?.available_quantity || 1})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedWeapon?.available_quantity || 99}
                    value={item.quantity_issued}
                    onChange={(e) =>
                      handleUpdateLineItem(index, 'quantity_issued', parseInt(e.target.value) || 1)
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold text-sky-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Condition</label>
                  <select
                    value={item.condition_on_issue}
                    onChange={(e) =>
                      handleUpdateLineItem(index, 'condition_on_issue', e.target.value)
                    }
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>

                <div className="md:col-span-1 flex justify-end pt-4 md:pt-0">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove weapon line item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Checkout'}
          </button>
        </div>
      </form>

      {/* Inline Add Student Modal */}
      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Register New Student">
        <form onSubmit={handleAddInlineStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Student Full Name *</label>
            <input
              type="text"
              required
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder='e.g., "Alex Rivera"'
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddStudentOpen(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20"
            >
              Save Student
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
