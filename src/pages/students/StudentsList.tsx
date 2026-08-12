import React, { useEffect, useState } from 'react';
import { UserCheck, Search, PlusCircle, UserX, UserCheck as CheckIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Student } from '../../types/permissions';

export const StudentsList: React.FC = () => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add student modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      setStudents((data as Student[]) || []);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .insert({ name: studentName.trim(), added_by: user.id })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setStudents((prev) => [...prev, data as Student]);
        setIsAddOpen(false);
        setStudentName('');
      }
    } catch (err) {
      console.error('Failed to add student:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: !currentStatus })
        .eq('id', studentId);

      if (error) throw error;
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, is_active: !currentStatus } : s))
      );
    } catch (err) {
      console.error('Error toggling student status:', err);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-400" /> Student Registry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Directory of martial arts students authorized for weapon checkouts.
          </p>
        </div>
        {can('issue_management', 'manage') && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Add Student
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search student by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading student directory...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <p className="text-slate-400">No students registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-white text-base">{student.name}</h3>
                <span
                  className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                    student.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {student.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {can('issue_management', 'manage') && (
                <button
                  onClick={() => toggleStudentStatus(student.id, student.is_active)}
                  title={student.is_active ? 'Deactivate Student' : 'Activate Student'}
                  className={`p-2 rounded-xl border transition-colors ${
                    student.is_active
                      ? 'text-slate-400 hover:text-rose-400 border-slate-800 hover:border-rose-500/30'
                      : 'text-slate-400 hover:text-emerald-400 border-slate-800 hover:border-emerald-500/30'
                  }`}
                >
                  {student.is_active ? <UserX className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Register New Student">
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder='e.g., "John Doe"'
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Save Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
