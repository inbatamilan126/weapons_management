import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sword, Plus, Search, Filter, Eye, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { Badge } from '../../components/common/Badge';
import { Weapon } from '../../types/permissions';

export const InventoryList: React.FC = () => {
  const { can } = usePermissions();
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeapons();
  }, []);

  const fetchWeapons = async () => {
    try {
      const { data, error } = await supabase
        .from('weapons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWeapons((data as Weapon[]) || []);
    } catch (err) {
      console.error('Error loading weapons inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = Array.from(new Set(weapons.map((w) => w.category).filter(Boolean)));

  const filteredWeapons = weapons.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.serial_or_tag && w.serial_or_tag.toLowerCase().includes(search.toLowerCase())) ||
      w.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || w.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'in_stock') matchesStock = w.available_quantity > 0;
    if (stockFilter === 'out_of_stock') matchesStock = w.available_quantity === 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sword className="w-6 h-6 text-sky-400" /> Weapons Inventory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage bulk weapon quantities and martial arts equipment stock.
          </p>
        </div>
        {can('inventory_management', 'manage') && (
          <Link
            to="/inventory/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" /> Add Weapon Stock
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, tag, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Filter:
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="in_stock">In Stock (&gt; 0)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Grid View */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading weapons catalog...</div>
      ) : filteredWeapons.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <p className="text-slate-400">No weapons found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWeapons.map((weapon) => (
            <div
              key={weapon.id}
              className="glass-card rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between p-5 space-y-4"
            >
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                  {weapon.photo_url ? (
                    <img src={weapon.photo_url} alt={weapon.name} className="w-full h-full object-cover" />
                  ) : (
                    <Sword className="w-7 h-7 text-slate-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white text-base truncate">{weapon.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {weapon.tracking_type}
                    </span>
                  </div>
                  <p className="text-xs text-sky-400 font-medium">{weapon.category}</p>
                  {weapon.serial_or_tag && (
                    <p className="text-[11px] text-slate-500 mt-1">Tag: {weapon.serial_or_tag}</p>
                  )}
                </div>
              </div>

              {/* Stock Quantity Badge */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Stock Availability</span>
                <span
                  className={`font-bold text-sm ${
                    weapon.available_quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {weapon.available_quantity} / {weapon.total_quantity} Available
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <Badge type="condition" value={weapon.current_condition || 'good'} />

                <div className="flex items-center gap-2">
                  <Link
                    to={`/inventory/${weapon.id}`}
                    title="View Details"
                    className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {can('inventory_management', 'manage') && (
                    <Link
                      to={`/inventory/${weapon.id}/edit`}
                      title="Edit Weapon"
                      className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
