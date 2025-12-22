// ============================================================================
// SPOTIFY SERVICE - TRENS
// Control remoto de Spotify Premium
// ============================================================================

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Completar el flujo de autenticación web
WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const SPOTIFY_CLIENT_ID = 'b0c64eb73f1a4f5bab9509ba19f37217';
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
].join(' ');

const STORAGE_KEY = '@trens_spotify_token';

// Discovery document for Spotify
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// ============================================================================
// TIPOS
// ============================================================================
export interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
  positionMs: number;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  deviceId: string | null;
  deviceName: string | null;
  hasActiveDevice: boolean;
  shuffleState: boolean;
  repeatState: 'off' | 'track' | 'context';
}

/**
 * Metadata de Spotify para guardar en videos (según MASTER)
 * Solo metadata, NO audio - 100% legal
 */
export interface SpotifyVideoMetadata {
  enabled: boolean;
  trackUri: string;
  positionMs: number;
  trackName: string;
  artist: string;
  albumArt?: string;
}

/**
 * Playlist de Spotify
 */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  trackCount: number;
  owner: string;
}

/**
 * Track simplificado para listas
 */
export interface SpotifyPlaylistTrack {
  uri: string;
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
  addedAt: string;
}

/**
 * Rol del usuario para control de Spotify
 */
export type SpotifyUserRole = 'pro' | 'free';

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================================================
// SPOTIFY SERVICE CLASS
// ============================================================================
class SpotifyService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private isConnected: boolean = false;

  // Evitar mostrar alertas repetidas
  private lastAlertTime: number = 0;
  private readonly ALERT_COOLDOWN = 5000; // 5 segundos entre alertas

  // --------------------------------------------------------------------------
  // ESTADO
  // --------------------------------------------------------------------------

  /**
   * Verificar si está conectado y con token válido (sin recargar)
   */
  isTokenValid(): boolean {
    return this.isConnected && !!this.accessToken && this.expiresAt > Date.now();
  }

  /**
   * Verificar si necesita re-autenticación (tokens inválidos/revocados)
   */
  needsReauth(): boolean {
    return !this.isConnected && !this.refreshToken;
  }

  /**
   * Obtener estado de conexión para UI
   */
  getConnectionStatus(): { connected: boolean; needsReauth: boolean } {
    return {
      connected: this.isConnected,
      needsReauth: this.needsReauth(),
    };
  }

  // --------------------------------------------------------------------------
  // AUTENTICACIÓN
  // --------------------------------------------------------------------------

  /**
   * Obtener la URL de redirección para la autenticación
   */
  getRedirectUri(): string {
    // Usar el proxy de Expo para desarrollo (más confiable)
    const uri = AuthSession.makeRedirectUri({
      native: 'trensdev://spotify-callback',
    });
    console.warn('🎵 Spotify: Generated Redirect URI:', uri);
    return uri;
  }

  /**
   * Iniciar el flujo de autenticación OAuth
   */
  async authenticate(): Promise<boolean> {
    try {
      const redirectUri = this.getRedirectUri();

      console.warn('🎵 Spotify: Usando Redirect URI:', redirectUri);

      const request = new AuthSession.AuthRequest({
        clientId: SPOTIFY_CLIENT_ID,
        scopes: SPOTIFY_SCOPES.split(' '),
        redirectUri,
        usePKCE: true,
        responseType: AuthSession.ResponseType.Code,
      });

      // Ejecutar prompt de autenticación
      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        // Intercambiar código por tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: SPOTIFY_CLIENT_ID,
            code: result.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier!,
            },
          },
          discovery
        );

        this.accessToken = tokenResult.accessToken;
        this.refreshToken = tokenResult.refreshToken || null;
        this.expiresAt = Date.now() + (tokenResult.expiresIn || 3600) * 1000;
        this.isConnected = true;

        // Guardar tokens
        await this.saveTokens();

        console.warn('🎵 Spotify: Conectado exitosamente');
        return true;
      }

      console.warn('🎵 Spotify: Autenticación cancelada o fallida');
      return false;
    } catch (error) {
      console.error('🎵 Spotify: Error de autenticación:', error);
      return false;
    }
  }

  /**
   * Cargar tokens guardados
   * Si ya está conectado y el token es válido, no recarga
   */
  async loadStoredTokens(): Promise<boolean> {
    try {
      // Si ya está conectado y el token no ha expirado, no recargar
      if (this.isConnected && this.accessToken && this.expiresAt > Date.now()) {
        console.log('🎵 loadStoredTokens: Ya conectado con token válido');
        return true;
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('🎵 loadStoredTokens: stored=', stored ? 'EXISTS' : 'NULL');

      if (stored) {
        const tokens: StoredToken = JSON.parse(stored);
        const now = Date.now();
        const expiresIn = tokens.expiresAt - now;
        console.log(
          '🎵 loadStoredTokens: expiresAt=',
          tokens.expiresAt,
          'now=',
          now,
          'expiresIn=',
          Math.floor(expiresIn / 1000),
          'seg'
        );

        // Verificar si el token aún es válido
        if (tokens.expiresAt > Date.now()) {
          this.accessToken = tokens.accessToken;
          this.refreshToken = tokens.refreshToken;
          this.expiresAt = tokens.expiresAt;
          // Solo loguear si no estaba conectado antes
          if (!this.isConnected) {
            console.log('🎵 Spotify: Token cargado');
          }
          this.isConnected = true;
          return true;
        } else if (tokens.refreshToken) {
          // Token expirado - asignar refresh token ANTES de refrescar
          this.refreshToken = tokens.refreshToken;
          console.log('🎵 loadStoredTokens: Token expirado, intentando refrescar...');
          return await this.refreshAccessToken();
        } else {
          console.log('🎵 loadStoredTokens: Token expirado y sin refresh token');
        }
      }
      return false;
    } catch (error) {
      console.error('🎵 Spotify: Error cargando tokens:', error);
      return false;
    }
  }

  /**
   * Guardar tokens en almacenamiento
   */
  private async saveTokens(): Promise<void> {
    try {
      const tokens: StoredToken = {
        accessToken: this.accessToken!,
        refreshToken: this.refreshToken || '',
        expiresAt: this.expiresAt,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('🎵 Spotify: Error guardando tokens:', error);
    }
  }

  /**
   * Refrescar el access token
   * Usa un flag para evitar múltiples refreshes concurrentes
   */
  private isRefreshing = false;

  async refreshAccessToken(): Promise<boolean> {
    console.log('🎵 refreshAccessToken: Iniciando...');

    if (!this.refreshToken) {
      console.log('🎵 refreshAccessToken: No hay refresh token');
      return false;
    }

    // Evitar múltiples refreshes concurrentes
    if (this.isRefreshing) {
      console.log('🎵 refreshAccessToken: Ya hay un refresh en curso, esperando...');
      // Esperar a que termine el refresh en curso
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.isConnected && !!this.accessToken;
    }

    this.isRefreshing = true;

    try {
      console.log('🎵 refreshAccessToken: Llamando a AuthSession.refreshAsync...');
      const result = await AuthSession.refreshAsync(
        {
          clientId: SPOTIFY_CLIENT_ID,
          refreshToken: this.refreshToken,
        },
        discovery
      );

      console.log('🎵 refreshAccessToken: ✅ Token refrescado exitosamente');
      this.accessToken = result.accessToken;
      this.refreshToken = result.refreshToken || this.refreshToken;
      this.expiresAt = Date.now() + (result.expiresIn || 3600) * 1000;
      this.isConnected = true;

      await this.saveTokens();
      return true;
    } catch (error: any) {
      console.error('🎵 refreshAccessToken: ❌ Error:', error?.message || error);
      // Si el refresh token fue revocado, limpiar todo y forzar re-login
      const errorMessage = error?.message || '';
      if (errorMessage.includes('revoked') || errorMessage.includes('invalid')) {
        console.warn('🎵 Spotify: Token revocado - necesita re-autenticación');
        await this.disconnect();
      }
      this.isConnected = false;
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Desconectar de Spotify
   */
  async disconnect(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.isConnected = false;
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.warn('🎵 Spotify: Desconectado');
  }

  // --------------------------------------------------------------------------
  // API CALLS
  // --------------------------------------------------------------------------

  /**
   * Hacer una llamada a la API de Spotify
   */
  private async apiCall<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: object
  ): Promise<T | null> {
    // Verificar y refrescar token si es necesario
    if (this.expiresAt < Date.now() + 60000) {
      await this.refreshAccessToken();
    }

    if (!this.accessToken) {
      // No mostrar error - puede que aún no se haya cargado el token
      return null;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      // 204 = No Content (éxito pero sin respuesta)
      // 202 = Accepted (comando aceptado)
      if (response.status === 204 || response.status === 202) {
        return null;
      }

      // Si no hay contenido, retornar null
      const text = await response.text();
      if (!text || text.length === 0) {
        return null;
      }

      // Intentar parsear JSON
      try {
        const data = JSON.parse(text);

        if (!response.ok) {
          // Manejar errores específicos con alertas para el usuario
          const reason = data?.error?.reason;
          const now = Date.now();

          if (reason === 'NO_ACTIVE_DEVICE') {
            // No hay dispositivo activo - solo log, play() intentará activar uno
            console.log('🎵 Spotify: No hay dispositivo activo');
            return null;
          }
          if (reason === 'PREMIUM_REQUIRED') {
            if (now - this.lastAlertTime > this.ALERT_COOLDOWN) {
              this.lastAlertTime = now;
              Alert.alert(
                '⭐ SPOTIFY PREMIUM',
                'Se requiere Spotify Premium para controlar la reproducción desde TRENS.',
                [{ text: 'OK', style: 'default' }]
              );
            }
            return null;
          }

          // Silenciar errores comunes de "Restriction violated"
          // (ocurre cuando no hay dispositivo activo o no hay reproducción)
          if (reason === 'UNKNOWN' && data.error?.message?.includes('Restriction violated')) {
            // No mostrar error - es esperado cuando Spotify no está activo
            return null;
          }

          // Silenciar 404 "Not found" - ocurre cuando no hay dispositivo/reproducción activa
          if (data.error?.status === 404 || data.error?.message === 'Not found.') {
            return null;
          }

          // Solo mostrar error para otros casos
          console.error('🎵 Spotify API Error:', data);
          return null;
        }

        return data;
      } catch (e) {
        // Si no es JSON válido, retornar null silenciosamente
        // Esto es normal para algunas respuestas de Spotify
        return null;
      }
    } catch (error) {
      console.error('🎵 Spotify: Error en llamada API:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // CONTROL DE REPRODUCCIÓN
  // --------------------------------------------------------------------------

  /**
   * Obtener el estado actual de reproducción
   */
  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    const data = await this.apiCall<any>('/me/player');

    if (!data) {
      return {
        isPlaying: false,
        track: null,
        deviceId: null,
        deviceName: null,
        hasActiveDevice: false,
        shuffleState: false,
        repeatState: 'off',
      };
    }

    return {
      isPlaying: data.is_playing,
      track: data.item
        ? {
            uri: data.item.uri,
            name: data.item.name,
            artist: data.item.artists.map((a: any) => a.name).join(', '),
            album: data.item.album.name,
            albumArt: data.item.album.images[0]?.url || '',
            durationMs: data.item.duration_ms,
            positionMs: data.progress_ms,
          }
        : null,
      deviceId: data.device?.id || null,
      deviceName: data.device?.name || null,
      hasActiveDevice: !!data.device,
      shuffleState: data.shuffle_state,
      repeatState: data.repeat_state,
    };
  }

  /**
   * Obtener la canción actual
   */
  async getCurrentTrack(): Promise<SpotifyTrack | null> {
    const state = await this.getPlaybackState();
    return state?.track || null;
  }

  /**
   * Reproducir una canción específica
   * @param trackUri - URI del track a reproducir
   * @param positionMs - Posición en ms donde empezar
   * @param contextUri - URI del contexto (playlist, album) para habilitar next/prev
   * @param trackUris - Array de URIs para reproducir en secuencia (para Liked Songs)
   */
  async play(
    trackUri?: string,
    positionMs?: number,
    contextUri?: string,
    trackUris?: string[]
  ): Promise<boolean> {
    try {
      console.log('🎵 Spotify play() called:', {
        trackUri,
        positionMs,
        contextUri,
        trackUrisCount: trackUris?.length,
      });

      // Verificar si hay dispositivo activo
      const state = await this.getPlaybackState();
      let deviceId = state?.deviceId;

      console.log('🎵 Spotify play() - deviceId inicial:', deviceId);

      if (!deviceId) {
        // Buscar un dispositivo disponible
        const devices = await this.getDevices();
        console.log(
          '🎵 Spotify play() - dispositivos encontrados:',
          devices.length,
          devices.map((d) => d.name)
        );

        const availableDevice = devices.find((d) => !d.is_restricted) || devices[0];

        if (!availableDevice) {
          console.warn('🎵 Spotify play(): No hay dispositivos disponibles');
          return false;
        }

        deviceId = availableDevice.id as string;
        console.log('🎵 Spotify play() - usando dispositivo:', availableDevice.name);

        // Transferir reproducción al dispositivo
        await this.transferPlayback(deviceId);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const body: any = {};

      if (contextUri) {
        // Reproducir dentro de un contexto (playlist/album)
        body.context_uri = contextUri;
        if (trackUri) {
          body.offset = { uri: trackUri };
        }
      } else if (trackUris && trackUris.length > 0) {
        // Limitar a máximo 50 tracks para evitar límites de API
        // Centrado en la canción seleccionada
        const currentIndex = trackUri ? trackUris.indexOf(trackUri) : 0;
        const startIndex = Math.max(0, currentIndex - 25);
        const endIndex = Math.min(trackUris.length, startIndex + 50);
        const limitedUris = trackUris.slice(startIndex, endIndex);
        const newOffset = currentIndex - startIndex;

        body.uris = limitedUris;
        body.offset = { position: newOffset };
        console.log(
          '🎵 Spotify play() - tracks limitados:',
          limitedUris.length,
          'offset:',
          newOffset
        );
      } else if (trackUri) {
        // Reproducir solo un track (sin contexto - next/prev no funcionará)
        body.uris = [trackUri];
      }

      if (positionMs !== undefined) {
        body.position_ms = positionMs;
      }

      const endpoint = `/me/player/play?device_id=${deviceId}`;
      console.log(
        '🎵 Spotify play() - enviando request:',
        endpoint,
        JSON.stringify(body).substring(0, 200)
      );

      await this.apiCall(endpoint, 'PUT', Object.keys(body).length > 0 ? body : undefined);
      console.log('🎵 Spotify play() - SUCCESS');
      return true;
    } catch (error) {
      console.error('🎵 Spotify play() - ERROR:', error);
      return false;
    }
  }

  /**
   * Reproducir con contexto de playlist/liked songs
   * Esto habilita next/prev correctamente
   * Desactiva shuffle y repeat para reproducir en orden sin loop
   */
  async playWithContext(
    trackUri: string,
    trackUris: string[],
    positionMs?: number
  ): Promise<boolean> {
    // Primero reproducir
    const result = await this.play(trackUri, positionMs, undefined, trackUris);
    // Desactivar shuffle y repeat después de iniciar reproducción (no bloquear si falla)
    this.setShuffle(false).catch(() => {});
    this.setRepeat('off').catch(() => {});
    return result;
  }

  /**
   * Pausar la reproducción
   */
  async pause(): Promise<boolean> {
    await this.apiCall('/me/player/pause', 'PUT');
    return true;
  }

  /**
   * Alternar play/pause
   */
  async togglePlayPause(): Promise<boolean> {
    const state = await this.getPlaybackState();
    if (state?.isPlaying) {
      return await this.pause();
    } else {
      return await this.play();
    }
  }

  /**
   * Siguiente canción
   */
  async next(): Promise<boolean> {
    try {
      const state = await this.getPlaybackState();

      if (!state?.hasActiveDevice) {
        console.log('🎵 Spotify next(): No hay dispositivo activo');
        return false;
      }

      // Si está en repeat one, cambiar a repeat context
      if (state.repeatState === 'track') {
        await this.apiCall('/me/player/repeat?state=context', 'PUT');
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const endpoint = state.deviceId
        ? `/me/player/next?device_id=${state.deviceId}`
        : '/me/player/next';

      await this.apiCall(endpoint, 'POST');
      return true;
    } catch (error) {
      console.error('🎵 Spotify next() error:', error);
      return false;
    }
  }

  /**
   * Obtener la cola de reproducción
   */
  async getQueue(): Promise<SpotifyTrack[] | null> {
    try {
      const data = await this.apiCall<{ queue: any[] }>('/me/player/queue');
      if (!data?.queue) return null;

      return data.queue.map((item: any) => ({
        uri: item.uri,
        name: item.name,
        artist: item.artists?.map((a: any) => a.name).join(', ') || '',
        album: item.album?.name || '',
        albumArt: item.album?.images?.[0]?.url || '',
        durationMs: item.duration_ms,
        positionMs: 0,
      }));
    } catch (error) {
      console.warn('🎵 Spotify getQueue() error:', error);
      return null;
    }
  }

  /**
   * Canción anterior
   */
  async previous(): Promise<boolean> {
    try {
      console.log('🎵 Spotify previous(): Obteniendo estado actual...');
      const state = await this.getPlaybackState();

      if (!state?.hasActiveDevice) {
        console.log('🎵 Spotify previous(): No hay dispositivo activo');
        return false;
      }

      const endpoint = state.deviceId
        ? `/me/player/previous?device_id=${state.deviceId}`
        : '/me/player/previous';

      await this.apiCall(endpoint, 'POST');
      console.log('🎵 Spotify previous(): Comando enviado');
      return true;
    } catch (error) {
      console.error('🎵 Spotify previous() error:', error);
      return false;
    }
  }

  /**
   * Buscar posición en la canción
   */
  async seek(positionMs: number): Promise<boolean> {
    const position = Math.floor(positionMs);
    await this.apiCall(`/me/player/seek?position_ms=${position}`, 'PUT');
    return true;
  }

  /**
   * Establecer volumen (0-100)
   */
  async setVolume(volumePercent: number): Promise<boolean> {
    const volume = Math.max(0, Math.min(100, Math.round(volumePercent)));
    await this.apiCall(`/me/player/volume?volume_percent=${volume}`, 'PUT');
    return true;
  }

  /**
   * Activar/desactivar shuffle
   */
  async setShuffle(state: boolean): Promise<boolean> {
    try {
      await this.apiCall(`/me/player/shuffle?state=${state}`, 'PUT');
      return true;
    } catch (error) {
      console.warn('🎵 Spotify setShuffle error:', error);
      return false;
    }
  }

  /**
   * Establecer modo de repetición
   * @param state - 'off' | 'track' | 'context'
   */
  async setRepeat(state: 'off' | 'track' | 'context'): Promise<boolean> {
    try {
      await this.apiCall(`/me/player/repeat?state=${state}`, 'PUT');
      return true;
    } catch (error) {
      console.warn('🎵 Spotify setRepeat error:', error);
      return false;
    }
  }

  /**
   * Obtener dispositivos disponibles
   */
  async getDevices(): Promise<any[]> {
    const data = await this.apiCall<{ devices: any[] }>('/me/player/devices');
    return data?.devices || [];
  }

  /**
   * Transferir reproducción a un dispositivo
   */
  async transferPlayback(deviceId: string, play: boolean = true): Promise<boolean> {
    await this.apiCall('/me/player', 'PUT', {
      device_ids: [deviceId],
      play,
    });
    return true;
  }

  // =========================================================================
  // 🎬 VIDEO SYNC - Para sincronizar feed con Spotify
  // =========================================================================

  /**
   * Sincronizar reproducción con un video del feed
   * @param trackUri - URI de la canción de Spotify
   * @param positionMs - Posición donde empezar (capturada durante grabación)
   */
  async syncWithVideo(trackUri: string, positionMs: number): Promise<boolean> {
    console.log('🎵 syncWithVideo called:', { trackUri, positionMs });

    // Verificar que tenemos token válido antes de intentar
    if (!this.isTokenValid()) {
      console.log('🎵 syncWithVideo: Token no válido, intentando cargar...');
      // Intentar cargar token desde storage
      const loaded = await this.loadStoredTokens();
      if (!loaded) {
        console.log('🎵 syncWithVideo: No se pudo cargar token');
        return false;
      }
    }

    try {
      // Primero verificar si hay un dispositivo activo
      const devices = await this.getDevices();
      console.log('🎵 syncWithVideo: Dispositivos encontrados:', devices.length);
      const activeDevice = devices.find((d) => d.is_active) || devices[0];

      if (!activeDevice) {
        console.log('🎵 syncWithVideo: No hay dispositivo activo');
        // No mostrar alerta - play() intentará activar un dispositivo automáticamente
        return false;
      }

      // Transferir a dispositivo si no está activo
      if (!devices.find((d) => d.is_active)) {
        console.log('🎵 syncWithVideo: Transfiriendo playback a:', activeDevice.name);
        await this.transferPlayback(activeDevice.id, false);
      }

      // Iniciar reproducción en la canción y posición específica
      console.log('🎵 syncWithVideo: Iniciando reproducción...');
      await this.play(trackUri, positionMs);
      console.log('🎵 syncWithVideo: ✅ Reproducción iniciada');
      return true;
    } catch (error) {
      console.error('🎵 syncWithVideo error:', error);
      // Silenciar errores de sync - no es crítico
      return false;
    }
  }

  /**
   * Pausar para swipe del feed
   */
  async pauseForSwipe(): Promise<void> {
    try {
      await this.pause();
    } catch (e) {
      // Ignorar error si ya está pausado
    }
  }

  // =========================================================================
  // 📹 GRABACIÓN PRO - Capturar metadata durante grabación
  // =========================================================================

  /**
   * Capturar metadata de Spotify durante grabación (SOLO PRO)
   * Retorna la metadata para guardar con el video
   * NO graba audio - solo metadata (100% legal según MASTER)
   */
  async captureMetadataForRecording(): Promise<SpotifyVideoMetadata | null> {
    try {
      const state = await this.getPlaybackState();

      if (!state || !state.track || !state.isPlaying) {
        // No hay música reproduciéndose
        return null;
      }

      return {
        enabled: true,
        trackUri: state.track.uri,
        positionMs: state.track.positionMs,
        trackName: state.track.name,
        artist: state.track.artist,
        albumArt: state.track.albumArt,
      };
    } catch (error) {
      console.error('🎵 Error capturando metadata:', error);
      return null;
    }
  }

  /**
   * Crear metadata vacía (para videos sin música)
   */
  createEmptyMetadata(): SpotifyVideoMetadata {
    return {
      enabled: false,
      trackUri: '',
      positionMs: 0,
      trackName: '',
      artist: '',
    };
  }

  // =========================================================================
  // 🎮 CONTROL BASADO EN ROL (PRO vs FREE)
  // =========================================================================

  /**
   * Reproducir con control de rol
   * PRO: control completo
   * FREE: solo auto-play (sin control manual)
   */
  async playWithRole(
    role: SpotifyUserRole,
    trackUri?: string,
    positionMs?: number
  ): Promise<boolean> {
    // Ambos roles pueden hacer auto-play
    return await this.play(trackUri, positionMs);
  }

  /**
   * Pausar con control de rol
   * PRO: puede pausar
   * FREE: NO puede pausar (solo swipe del feed pausa)
   */
  async pauseWithRole(role: SpotifyUserRole): Promise<boolean> {
    if (role !== 'pro') {
      console.warn('🎵 Spotify: Control de pausa solo disponible para PRO');
      return false;
    }
    return await this.pause();
  }

  /**
   * Toggle play/pause con control de rol
   */
  async toggleWithRole(role: SpotifyUserRole): Promise<boolean> {
    if (role !== 'pro') {
      console.warn('🎵 Spotify: Control solo disponible para PRO');
      return false;
    }
    return await this.togglePlayPause();
  }

  /**
   * Siguiente canción con control de rol
   */
  async nextWithRole(role: SpotifyUserRole): Promise<boolean> {
    if (role !== 'pro') {
      Alert.alert(
        '⭐ FUNCIÓN PRO',
        'Cambia a PRO para controlar la música.\n\nCon PRO puedes pausar, saltar canciones y tener control total de Spotify.',
        [{ text: 'ENTENDIDO', style: 'default' }]
      );
      return false;
    }
    return await this.next();
  }

  /**
   * Canción anterior con control de rol
   */
  async previousWithRole(role: SpotifyUserRole): Promise<boolean> {
    if (role !== 'pro') {
      return false;
    }
    return await this.previous();
  }

  /**
   * Seek con control de rol
   */
  async seekWithRole(role: SpotifyUserRole, positionMs: number): Promise<boolean> {
    if (role !== 'pro') {
      return false;
    }
    return await this.seek(positionMs);
  }

  /**
   * Verificar si el usuario puede controlar Spotify
   */
  canControl(role: SpotifyUserRole): boolean {
    return role === 'pro';
  }

  /**
   * Obtener mensaje CTA para FREE
   */
  getFreeCTA(): string {
    return 'Conecta Spotify Premium para escuchar la música del entrenamiento';
  }

  /**
   * Obtener mensaje de upgrade para controles
   */
  getUpgradeCTA(): string {
    return 'Cambia a PRO para controlar la música';
  }

  // =========================================================================
  // 📚 PLAYLISTS - Navegar y reproducir desde playlists
  // =========================================================================

  /**
   * Obtener las playlists del usuario
   */
  async getMyPlaylists(limit: number = 50, offset: number = 0): Promise<SpotifyPlaylist[]> {
    const data = await this.apiCall<any>(`/me/playlists?limit=${limit}&offset=${offset}`);

    if (!data?.items) return [];

    return data.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      imageUrl: item.images?.[0]?.url || null,
      trackCount: item.tracks?.total || 0,
      owner: item.owner?.display_name || 'Unknown',
    }));
  }

  /**
   * Obtener los tracks de una playlist
   */
  async getPlaylistTracks(
    playlistId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SpotifyPlaylistTrack[]> {
    const data = await this.apiCall<any>(
      `/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}&fields=items(added_at,track(id,uri,name,duration_ms,album(name,images),artists(name)))`
    );

    if (!data?.items) return [];

    return data.items
      .filter((item: any) => item.track) // Filtrar tracks eliminados
      .map((item: any) => ({
        uri: item.track.uri,
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        album: item.track.album?.name || 'Unknown',
        albumArt: item.track.album?.images?.[0]?.url || null,
        durationMs: item.track.duration_ms || 0,
        addedAt: item.added_at,
      }));
  }

  /**
   * Obtener los "Liked Songs" del usuario
   */
  async getLikedSongs(limit: number = 50, offset: number = 0): Promise<SpotifyPlaylistTrack[]> {
    const data = await this.apiCall<any>(`/me/tracks?limit=${limit}&offset=${offset}`);

    if (!data?.items) return [];

    return data.items
      .filter((item: any) => item.track)
      .map((item: any) => ({
        uri: item.track.uri,
        id: item.track.id,
        name: item.track.name,
        artist: item.track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
        album: item.track.album?.name || 'Unknown',
        albumArt: item.track.album?.images?.[0]?.url || null,
        durationMs: item.track.duration_ms || 0,
        addedAt: item.added_at,
      }));
  }

  /**
   * Reproducir un track específico
   */
  async playTrack(trackUri: string): Promise<boolean> {
    return await this.play(trackUri, 0);
  }

  /**
   * Reproducir una playlist completa desde el inicio
   */
  async playPlaylist(playlistId: string): Promise<boolean> {
    const contextUri = `spotify:playlist:${playlistId}`;
    await this.apiCall('/me/player/play', 'PUT', {
      context_uri: contextUri,
    });
    return true;
  }

  /**
   * Reproducir una playlist desde un track específico
   */
  async playPlaylistFromTrack(playlistId: string, trackUri: string): Promise<boolean> {
    const contextUri = `spotify:playlist:${playlistId}`;
    await this.apiCall('/me/player/play', 'PUT', {
      context_uri: contextUri,
      offset: { uri: trackUri },
    });
    return true;
  }

  /**
   * Buscar tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<SpotifyPlaylistTrack[]> {
    if (!query.trim()) return [];

    const data = await this.apiCall<any>(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
    );

    if (!data?.tracks?.items) return [];

    return data.tracks.items.map((track: any) => ({
      uri: track.uri,
      id: track.id,
      name: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
      album: track.album?.name || 'Unknown',
      albumArt: track.album?.images?.[0]?.url || null,
      durationMs: track.duration_ms || 0,
      addedAt: '',
    }));
  }
}

// Exportar instancia única
export const spotify = new SpotifyService();
export default spotify;
