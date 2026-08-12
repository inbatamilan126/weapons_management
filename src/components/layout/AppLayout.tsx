import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Sword,
  ClipboardList,
  Users,
  UserCheck,
  Bell,
  LogOut,
  Menu,
  X,
  PlusCircle,
  LayoutDashboard,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import { PWAInstallBanner } from '../common/PWAInstallBanner';

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, show: true },
    {
      label: 'Inventory',
      path: '/inventory',
      icon: Sword,
      show: can('inventory_management', 'view'),
    },
    {
      label: 'Issue Weapon',
      path: '/issue',
      icon: PlusCircle,
      show: can('issue_management', 'manage'),
    },
    {
      label: 'Issue Log',
      path: '/issues',
      icon: ClipboardList,
      show: can('issue_management', 'view'),
    },
    {
      label: 'Students',
      path: '/students',
      icon: UserCheck,
      show: can('issue_management', 'view'),
    },
    {
      label: 'Staff Users',
      path: '/users',
      icon: Users,
      show: can('user_management', 'view'),
    },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      show: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <PWAInstallBanner />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-800 p-4 sticky top-0 h-screen z-20">
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Sword className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-sm">WEAPONS CONTROL</h1>
              <p className="text-[11px] text-slate-400">Martial Arts Inventory</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
          </nav>

          {/* User Info & Logout */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{profile?.full_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {profile?.is_admin ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> ADMIN
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Staff User</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => signOut().then(() => navigate('/login'))}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Top Header (Menu icon on the left corner) */}
        <header className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button on top left corner */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2">
              <Sword className="w-5 h-5 text-sky-400" />
              <span className="font-bold text-sm text-white tracking-wide">Weapons Control</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Link to="/notifications" className="relative p-1.5 text-slate-300">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Drawer Overlay with Empty Space Click to Close */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Empty space backdrop - clicking closes the menu */}
            <div
              className="absolute inset-0"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Left slide-out drawer */}
            <div className="relative w-4/5 max-w-xs h-full bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sword className="w-5 h-5 text-sky-400" />
                    <span className="font-bold text-sm text-white">Weapons Control</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {navItems
                    .filter((item) => item.show)
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut().then(() => navigate('/login'));
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-medium text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out ({profile?.full_name})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full min-w-0">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
