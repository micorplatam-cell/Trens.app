import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import spotify from '../services/spotify/spotify';
import { spotifyLogger, authLogger } from '../lib/logger';

// ============================================================================
// TIPOS
// ============================================================================
export type UserRole = 'pro' | 'free';

export interface UserRoleContextValue {
  // Estado de autenticación
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;

  // Rol del usuario
  role: UserRole;
  isPro: boolean;
  isFree: boolean;

  // Spotify
  spotifyConnected: boolean;
  spotifyPremium: boolean;

  // Acciones
  refetch: () => Promise<void>;
  updateSpotifyStatus: (connected: boolean, premium: boolean) => Promise<void>;

  // Permisos explícitos (según MASTER)
  permissions: {
    canUseCamera: boolean;
    canRecord: boolean;
    canPublish: boolean;
    canSaveToVault: boolean;
    hasHistory: boolean;
    canControlSpotify: boolean;
    canViewFeed: boolean;
    canSwitchAudioMode: boolean;
  };
}

// ============================================================================
// CONTEXT
// ============================================================================
const UserRoleContext = createContext<UserRoleContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================
export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('free');
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyPremium, setSpotifyPremium] = useState(false);

  // -------------------------------------------------------------------------
  // FETCH USER ROLE + SPOTIFY STATUS
  // -------------------------------------------------------------------------
  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, spotify_connected, spotify_premium')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        // Si no existe, crear registro con rol FREE
        if (roleError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: 'free' });

          if (!insertError) {
            setRole('free');
            setSpotifyConnected(false);
            setSpotifyPremium(false);
          }
        }
      } else if (roleData) {
        setRole(roleData.role as UserRole);
        // Cargar estado de Spotify desde la DB
        setSpotifyConnected(roleData.spotify_connected ?? false);
        setSpotifyPremium(roleData.spotify_premium ?? false);
        spotifyLogger.debug('Status cargado:', {
          connected: roleData.spotify_connected,
          premium: roleData.spotify_premium,
        });
      }
    } catch (err) {
      authLogger.error('Error fetching user role:', err);
      setRole('free');
    }
  }, []);

  // -------------------------------------------------------------------------
  // AUTH LISTENER
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        // 🎵 Cargar token de Spotify al inicio
        await spotify.loadStoredTokens();
      }
      setLoading(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        // 🎵 Cargar token de Spotify en cambio de auth
        await spotify.loadStoredTokens();
      } else {
        // Reset a FREE cuando se desloguea
        setRole('free');
        setSpotifyConnected(false);
        setSpotifyPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  // -------------------------------------------------------------------------
  // UPDATE SPOTIFY STATUS
  // -------------------------------------------------------------------------
  const updateSpotifyStatus = useCallback(
    async (connected: boolean, premium: boolean) => {
      if (!user) return;

      try {
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({
            spotify_connected: connected,
            spotify_premium: premium,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) {
          spotifyLogger.error('Error updating status:', updateError);
        } else {
          setSpotifyConnected(connected);
          setSpotifyPremium(premium);
          spotifyLogger.debug('Status actualizado en DB:', { connected, premium });
        }
      } catch (err) {
        spotifyLogger.error('Error updating status:', err);
      }
    },
    [user]
  );

  // -------------------------------------------------------------------------
  // REFETCH
  // -------------------------------------------------------------------------
  const refetch = useCallback(async () => {
    if (user) {
      await fetchRole(user.id);
    }
  }, [user, fetchRole]);

  // -------------------------------------------------------------------------
  // PERMISOS (Según MASTER)
  // -------------------------------------------------------------------------
  const isPro = role === 'pro';
  const isFree = role === 'free';

  const permissions = {
    // PRO exclusivo
    canUseCamera: isPro,
    canRecord: isPro,
    canPublish: isPro,
    canSaveToVault: isPro,
    hasHistory: isPro,
    canControlSpotify: isPro,

    // Todos los usuarios
    canViewFeed: true,
    canSwitchAudioMode: true,
  };

  // -------------------------------------------------------------------------
  // VALUE
  // -------------------------------------------------------------------------
  const value: UserRoleContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    role,
    isPro,
    isFree,
    spotifyConnected,
    spotifyPremium,
    refetch,
    updateSpotifyStatus,
    permissions,
  };

  return <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================
export function useUserRoleContext() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRoleContext must be used within a UserRoleProvider');
  }
  return context;
}
