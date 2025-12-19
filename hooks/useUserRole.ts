import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ============================================================================
// TIPOS
// ============================================================================
export type UserRole = 'pro' | 'free';

export interface UserRoleData {
  role: UserRole;
  spotifyConnected: boolean;
  spotifyPremium: boolean;
}

interface UseUserRoleResult {
  role: UserRole;
  isPro: boolean;
  isFree: boolean;
  spotifyConnected: boolean;
  spotifyPremium: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSpotifyStatus: (connected: boolean, premium: boolean) => Promise<void>;
}

// ============================================================================
// HOOK: useUserRole
// ============================================================================
export function useUserRole(userId: string | undefined): UseUserRoleResult {
  const [data, setData] = useState<UserRoleData>({
    role: 'free',
    spotifyConnected: false,
    spotifyPremium: false,
  });
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
        .select('role, spotify_connected, spotify_premium')
        .eq('id', userId)
        .single();

      if (roleError) {
        // Si no existe, crear registro con rol FREE
        if (roleError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ id: userId, role: 'free' });

          if (insertError) {
            throw insertError;
          }

          setData({
            role: 'free',
            spotifyConnected: false,
            spotifyPremium: false,
          });
        } else {
          throw roleError;
        }
      } else if (roleData) {
        setData({
          role: roleData.role as UserRole,
          spotifyConnected: roleData.spotify_connected || false,
          spotifyPremium: roleData.spotify_premium || false,
        });
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError('Error al obtener rol del usuario');
      // Default a FREE en caso de error
      setData({
        role: 'free',
        spotifyConnected: false,
        spotifyPremium: false,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // -------------------------------------------------------------------------
  // UPDATE SPOTIFY STATUS
  // -------------------------------------------------------------------------
  const updateSpotifyStatus = useCallback(
    async (connected: boolean, premium: boolean) => {
      if (!userId) return;

      try {
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({
            spotify_connected: connected,
            spotify_premium: premium,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        setData((prev) => ({
          ...prev,
          spotifyConnected: connected,
          spotifyPremium: premium,
        }));
      } catch (err) {
        console.error('Error updating Spotify status:', err);
      }
    },
    [userId]
  );

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
    isPro: data.role === 'pro',
    isFree: data.role === 'free',
    spotifyConnected: data.spotifyConnected,
    spotifyPremium: data.spotifyPremium,
    loading,
    error,
    refetch: fetchRole,
    updateSpotifyStatus,
  };
}

// ============================================================================
// HELPER: Check permissions
// ============================================================================
export const rolePermissions = {
  // PRO permissions
  canRecord: (role: UserRole) => role === 'pro',
  canUploadVideos: (role: UserRole) => role === 'pro',
  hasHistory: (role: UserRole) => role === 'pro',
  canControlSpotify: (role: UserRole) => role === 'pro',

  // All users
  canViewFeed: () => true,
  canSwitchAudioMode: () => true, // Música / Ambiente
  canAutoPlaySpotify: (spotifyPremium: boolean) => spotifyPremium,
};
