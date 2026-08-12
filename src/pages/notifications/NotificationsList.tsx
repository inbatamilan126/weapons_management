import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Notification } from '../../types/permissions';

export const NotificationsList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-sky-400" /> Reminders & Notifications
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated alerts for due-soon checkouts and overdue return reminders.
          </p>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-sky-400 text-xs font-semibold rounded-xl border border-slate-800 transition-colors"
        >
          <CheckCheck className="w-4 h-4" /> Mark All as Read
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
            filter === 'all'
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
            filter === 'unread'
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          Unread ({notifications.filter((n) => !n.is_read).length})
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading notification feed...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <p className="text-slate-400">No notifications to display.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                !n.is_read
                  ? 'glass-panel border-sky-500/30 bg-sky-500/5 shadow-lg shadow-sky-500/5'
                  : 'glass-card border-slate-800 opacity-70'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    n.type === 'overdue'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {n.type === 'overdue' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-white">{n.message}</p>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                  title="Mark as Read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
