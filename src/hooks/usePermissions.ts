import { useAuth } from '../context/AuthContext';
import { Module, PermissionLevel } from '../types/permissions';

export function usePermissions() {
  const { profile, permissions } = useAuth();

  const can = (module: Module, level: PermissionLevel = 'view'): boolean => {
    if (!profile || !profile.is_active) return false;
    if (profile.is_admin) return true;

    const perm = permissions.find((p) => p.module === module);
    if (!perm) return false;

    if (level === 'view') {
      return perm.can_view || perm.can_manage;
    }
    if (level === 'manage') {
      return perm.can_manage;
    }
    return false;
  };

  return {
    can,
    isAdmin: profile?.is_admin ?? false,
    permissions,
  };
}
