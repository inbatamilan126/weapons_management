import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, UserPermission } from '../types/permissions';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  permissions: UserPermission[];
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfileAndPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileAndPermissions = async (userId: string) => {
    try {
      const [profileRes, permsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_permissions').select('*').eq('user_id', userId),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as Profile);
      }
      if (permsRes.data) {
        setPermissions(permsRes.data as UserPermission[]);
      }
    } catch (err) {
      console.error('Error loading profile and permissions:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndPermissions(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfileAndPermissions(session.user.id);
      } else {
        setProfile(null);
        setPermissions([]);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setPermissions([]);
  };

  const refreshProfileAndPermissions = async () => {
    if (user) {
      await fetchProfileAndPermissions(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        permissions,
        isLoading,
        signOut,
        refreshProfileAndPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
