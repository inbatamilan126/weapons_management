import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { WeaponCondition, TrackingType } from '../../types/permissions';

export const WeaponForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [trackingType, setTrackingType] = useState<TrackingType>('bulk');
  const [totalQuantity, setTotalQuantity] = useState<number>(1);
  const [serialOrTag, setSerialOrTag] = useState('');
  const [acquiredDate, setAcquiredDate] = useState('');
  const [condition, setCondition] = useState<WeaponCondition>('good');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      supabase
        .from('weapons')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) setError('Failed to fetch weapon details.');
          if (data) {
            setName(data.name || '');
            setCategory(data.category || '');
            setTrackingType(data.tracking_type as TrackingType || 'bulk');
            setTotalQuantity(data.total_quantity || 1);
            setSerialOrTag(data.serial_or_tag || '');
            setAcquiredDate(data.acquired_date || '');
            setCondition((data.current_condition as WeaponCondition) || 'good');
            setNotes(data.notes || '');
            setPhotoUrl(data.photo_url || '');
          }
        });
    }
  }, [id, isEditing]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `weapons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('weapon-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('weapon-photos').getPublicUrl(filePath);
      setPhotoUrl(data.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Error uploading photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (totalQuantity < 1) {
        throw new Error('Total quantity must be at least 1.');
      }

      if (isEditing && id) {
        const { data: existing } = await supabase
          .from('weapons')
          .select('total_quantity, available_quantity')
          .eq('id', id)
          .single();

        const diff = totalQuantity - (existing?.total_quantity || totalQuantity);
        const newAvailable = Math.max(0, (existing?.available_quantity || 0) + diff);

        const { error: updateError } = await supabase
          .from('weapons')
          .update({
            name,
            category,
            tracking_type: trackingType,
            total_quantity: totalQuantity,
            available_quantity: newAvailable,
            serial_or_tag: serialOrTag || null,
            acquired_date: acquiredDate || null,
            photo_url: photoUrl || null,
            current_condition: condition,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        const { data: newWeapon, error: insertError } = await supabase
          .from('weapons')
          .insert({
            name,
            category,
            tracking_type: trackingType,
            total_quantity: totalQuantity,
            available_quantity: totalQuantity,
            serial_or_tag: serialOrTag || null,
            acquired_date: acquiredDate || null,
            photo_url: photoUrl || null,
            current_condition: condition,
            notes: notes || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (newWeapon && user) {
          await supabase.from('weapon_condition_logs').insert({
            weapon_id: newWeapon.id,
            recorded_by: user.id,
            condition,
            quantity: totalQuantity,
            note: `Initial acquisition of ${totalQuantity} units`,
          });
        }
      }

      navigate('/inventory');
    } catch (err: any) {
      setError(err.message || 'Error saving weapon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/inventory"
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Weapon Model' : 'Add Weapon Stock'}
          </h1>
          <p className="text-xs text-slate-400">
            {isEditing ? 'Update bulk stock details' : 'Register new weapon type or bulk inventory'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Weapon Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., "Wooden Bo Staff" or "Metal Sai Pair"'
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Category *</label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder='e.g., "Bo Staff", "Sai", "Katana"'
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Tracking Type</label>
            <select
              value={trackingType}
              onChange={(e) => setTrackingType(e.target.value as TrackingType)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            >
              <option value="bulk">Bulk (Count-based)</option>
              <option value="individual">Individual (Serial/Tag tracked)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Total Units / Quantity *</label>
            <input
              type="number"
              min={1}
              required
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 font-bold text-sky-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Serial / Tag (Optional)</label>
            <input
              type="text"
              value={serialOrTag}
              onChange={(e) => setSerialOrTag(e.target.value)}
              placeholder='e.g., "LOT-2026-STAFFS"'
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Acquisition Date</label>
            <input
              type="date"
              value={acquiredDate}
              onChange={(e) => setAcquiredDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Initial Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as WeaponCondition)}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Weapon Photo</label>
          <div className="flex items-center gap-4">
            {photoUrl && (
              <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-slate-700" />
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm text-slate-300 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>{uploading ? 'Uploading...' : 'Choose Image File'}</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">Notes & Remarks</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Storage racks, wood quality, or maintenance notes..."
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            to="/inventory"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Weapon Stock'}
          </button>
        </div>
      </form>
    </div>
  );
};
