import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Module, PermissionLevel } from '../../types/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: Module;
  level?: PermissionLevel;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  module,
  level = 'view',
}) => {
  const { user, isLoading } = useAuth();
  const { can } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (module && !can(module, level)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl font-bold">403</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 max-w-md mb-6">
          You do not have the required permissions ({module}:{level}) to access this page. Please contact your system administrator.
        </p>
        <a
          href="/"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-sm font-medium transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
};
