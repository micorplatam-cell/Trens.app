// ============================================================================
// TRENS: TIPOS COMUNES DE VIDEO Y MEDIA
// Tipos compartidos entre componentes PRO, Editor y Feed
// ============================================================================

// ============================================================================
// VIDEO
// ============================================================================

export interface VideoData {
  uri: string;
  duration: number;
  timestamp?: Date;
}

export interface VideoRecord {
  id: string;
  user_id?: string;
  exercise_id?: string;
  video_url?: string;
  videoUrl?: string; // Alias para compatibilidad
  thumbnail_url?: string;
  weight?: number;
  reps?: number;
  date?: string;
  is_public?: boolean;
  spotify?: SpotifyVideoMetadata | null;
  created_at?: string;
}

// ============================================================================
// SPOTIFY METADATA
// Metadata de Spotify para vincular a videos (según MASTER)
// Solo metadata, NO audio - 100% legal
// ============================================================================

export interface SpotifyVideoMetadata {
  enabled: boolean;
  trackUri: string;
  positionMs: number;
  trackName: string;
  artist: string;
  albumArt?: string;
  durationMs?: number;
}

// ============================================================================
// FEED VIDEO
// Estructura completa de video en el feed público
// ============================================================================

export interface FeedVideo {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string;
  exercise_name: string | null;
  weight_kg: number | null;
  reps: number | null;
  free_text: string | null;
  spotify: SpotifyVideoMetadata | null;
  created_at: string;
  // Usuario
  user_display_name: string;
  user_avatar_url: string | null;
  // Métricas
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

// ============================================================================
// PRO VIDEO
// Video creado por usuario PRO
// ============================================================================

export interface ProVideo {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  cloudflare_video_id?: string;
  exercise_name?: string;
  exercise_id?: string;
  weight_kg?: number;
  reps?: number;
  free_text?: string;
  is_public: boolean;
  spotify?: SpotifyVideoMetadata | null;
  views_count?: number;
  likes_count?: number;
  shares_count?: number;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// VIDEO EDITOR
// Props y datos para el editor de video fullscreen
// ============================================================================

export interface VideoEditorResult {
  videoTrimStart: number; // Porcentaje 0-100
  videoTrimEnd: number; // Porcentaje 0-100
  spotifyTrack: SpotifyVideoMetadata | null;
  isPublic: boolean;
}

// ============================================================================
// SPOTIFY TRACK (Para búsqueda/selección)
// ============================================================================

export interface SpotifyTrackItem {
  uri: string;
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
}
