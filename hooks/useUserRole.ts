import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================================
// TIPOS
// ============================================================================
export type UserRole = 'pro' | 'free' | 'admin';

export interface UserRoleData {
  role: UserRole;
}

interface UseUserRoleResult {
  role: UserRole;
  isPro: boolean;
  isFree: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOK: useUserRole
// ============================================================================
export function useUserRole(userId: string | undefined): UseUserRoleResult {
  const [data, setData] = useState<UserRoleData>({ role: 'free' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // FETCH ROLE
  // -------------------------------------------------------------------------
  const fetchRole = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        // Si no existe, crear registro con rol FREE
        if (roleError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'free' });

          if (insertError) {
            throw insertError;
          }

          setData({ role: 'free' });
        } else {
          throw roleError;
        }
      } else if (roleData) {
        setData({ role: roleData.role as UserRole });
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError('Error al obtener rol del usuario');
      setData({ role: 'free' });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // -------------------------------------------------------------------------
  // EFFECT: Fetch on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------
  return {
    role: data.role,
    isPro: data.role === 'pro' || data.role === 'admin',
    isFree: data.role === 'free',
    isAdmin: data.role === 'admin',
    loading,
    error,
    refetch: fetchRole,
  };
}

// ============================================================================
// HELPER: Check permissions
// ============================================================================
export const rolePermissions = {
  // PRO permissions
  canRecord: (role: UserRole) => role === 'pro' || role === 'admin',
  canUploadVideos: (role: UserRole) => role === 'pro' || role === 'admin',
  hasHistory: (role: UserRole) => role === 'pro' || role === 'admin',

  // All users
  canViewFeed: () => true,
  canSwitchAudioMode: () => true,
};
