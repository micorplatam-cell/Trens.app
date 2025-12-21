// =============================================================================
// FULLSCREEN VIDEO EDITOR - Editor minimalista a pantalla completa
// Combina edición de video + Spotify en overlay semitransparente
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
  Dimensions,
} from 'react-native';
import {
  X,
  Play,
  Pause,
  Scissors,
  Music,
  VolumeX,
  RotateCcw,
  Share2,
  Eye,
  Lock,
} from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import spotify from '../../services/spotify/spotify';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TIPOS
// ============================================================================
interface VideoData {
  uri: string;
  duration: number;
}

interface SpotifyMetadata {
  enabled: boolean;
  trackUri: string;
  positionMs: number;
  trackName: string;
  artist: string;
  albumArt?: string;
}

interface FullscreenVideoEditorProps {
  visible: boolean;
  videoData: VideoData | null;
  spotifyMetadata: SpotifyMetadata | null;
  onClose: () => void;
  onSave: (data: {
    videoTrimStart: number;
    videoTrimEnd: number;
    spotifyEnabled: boolean;
    spotifyStartMs: number;
    isPublic: boolean;
  }) => void;
  saving: boolean;
}

// ============================================================================
// HELPER
// ============================================================================
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function FullscreenVideoEditor({
  visible,
  videoData,
  spotifyMetadata,
  onClose,
  onSave,
  saving,
}: FullscreenVideoEditorProps) {
  // Video state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoTrimStart, setVideoTrimStart] = useState(0); // percentage 0-100
  const [videoTrimEnd, setVideoTrimEnd] = useState(100); // percentage 0-100

  // Spotify state
  const [spotifyEnabled, setSpotifyEnabled] = useState(!!spotifyMetadata);
  const [spotifyStartMs, setSpotifyStartMs] = useState(spotifyMetadata?.positionMs || 0);
  const [spotifyCurrentMs, setSpotifyCurrentMs] = useState(spotifyMetadata?.positionMs || 0);
  const spotifyDurationMs = 240000; // default 4min

  // UI state
  const [isPublic, setIsPublic] = useState(true);

  // Refs for timeline
  const timelineWidth = useRef(SCREEN_WIDTH - 80);
  const videoTimelineRef = useRef<View>(null);
  const spotifyTimelineRef = useRef<View>(null);

  // Current values ref for PanResponders
  const currentValuesRef = useRef({
    videoTrimStart: 0,
    videoTrimEnd: 100,
    spotifyStartMs: 0,
    currentVideoTime: 0,
    spotifyCurrentMs: 0,
    videoDurationMs: 30000,
  });

  // Video Player
  const videoPlayer = useVideoPlayer(videoData?.uri || '', (player) => {
    player.loop = true;
    player.play();
  });

  // Update refs
  useEffect(() => {
    currentValuesRef.current = {
      videoTrimStart,
      videoTrimEnd,
      spotifyStartMs,
      currentVideoTime,
      spotifyCurrentMs,
      videoDurationMs: (videoData?.duration || 30) * 1000,
    };
  }, [videoTrimStart, videoTrimEnd, spotifyStartMs, currentVideoTime, spotifyCurrentMs, videoData]);

  // Sync video and spotify playback
  useEffect(() => {
    if (!visible || !videoData) return;

    const interval = setInterval(async () => {
      if (isPlaying) {
        // Update video time (simulated - would come from video player in real impl)
        setCurrentVideoTime((prev) => {
          const videoDurationMs = (videoData.duration || 30) * 1000;
          const trimStartMs = (videoTrimStart / 100) * videoDurationMs;
          const trimEndMs = (videoTrimEnd / 100) * videoDurationMs;
          const next = prev + 100;
          if (next >= trimEndMs) return trimStartMs;
          return next;
        });

        // Update spotify time
        if (spotifyEnabled && spotifyMetadata) {
          setSpotifyCurrentMs((prev) => {
            const next = prev + 100;
            if (next >= spotifyDurationMs) return spotifyStartMs;
            return next;
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [visible, isPlaying, videoData, videoTrimStart, videoTrimEnd, spotifyEnabled, spotifyStartMs, spotifyDurationMs, spotifyMetadata]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setVideoTrimStart(0);
      setVideoTrimEnd(100);
      setSpotifyEnabled(!!spotifyMetadata);
      setSpotifyStartMs(spotifyMetadata?.positionMs || 0);
      setSpotifyCurrentMs(spotifyMetadata?.positionMs || 0);
      setCurrentVideoTime(0);
      setIsPlaying(true);
    }
  }, [visible, spotifyMetadata]);

  // Toggle play/pause
  const togglePlayback = useCallback(async () => {
    if (isPlaying) {
      videoPlayer.pause();
      if (spotifyEnabled) await spotify.pause();
    } else {
      videoPlayer.play();
      if (spotifyEnabled && spotifyMetadata) {
        await spotify.play(spotifyMetadata.trackUri, spotifyCurrentMs);
      }
    }
    setIsPlaying(!isPlaying);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isPlaying, spotifyEnabled, spotifyMetadata, spotifyCurrentMs, videoPlayer]);

  // PanResponder for Video Trim Start
  const videoTrimStartPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!videoTimelineRef.current) return;
        videoTimelineRef.current.measure((_x, _y, width, _h, pageX) => {
          const relativeX = evt.nativeEvent.pageX - pageX;
          const percentage = Math.max(0, Math.min(currentValuesRef.current.videoTrimEnd - 10, (relativeX / width) * 100));
          setVideoTrimStart(percentage);
        });
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  // PanResponder for Video Trim End
  const videoTrimEndPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!videoTimelineRef.current) return;
        videoTimelineRef.current.measure((_x, _y, width, _h, pageX) => {
          const relativeX = evt.nativeEvent.pageX - pageX;
          const percentage = Math.max(currentValuesRef.current.videoTrimStart + 10, Math.min(100, (relativeX / width) * 100));
          setVideoTrimEnd(percentage);
        });
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  // PanResponder for Spotify Trim
  const spotifyTrimPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: async () => {
        if (isPlaying) {
          await spotify.pause();
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!spotifyTimelineRef.current) return;
        spotifyTimelineRef.current.measure((_x, _y, width, _h, pageX) => {
          const relativeX = evt.nativeEvent.pageX - pageX;
          const percentage = Math.max(0, Math.min(100, (relativeX / width) * 100));
          const newMs = Math.floor((percentage / 100) * spotifyDurationMs);
          setSpotifyStartMs(newMs);
          setSpotifyCurrentMs(newMs);
        });
      },
      onPanResponderRelease: async () => {
        if (spotifyMetadata && spotifyEnabled) {
          await spotify.play(spotifyMetadata.trackUri, spotifyStartMs);
          setIsPlaying(true);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  // Handle save
  const handleSave = useCallback(() => {
    onSave({
      videoTrimStart,
      videoTrimEnd,
      spotifyEnabled,
      spotifyStartMs,
      isPublic,
    });
  }, [videoTrimStart, videoTrimEnd, spotifyEnabled, spotifyStartMs, isPublic, onSave]);

  if (!videoData) return null;

  const videoDurationMs = (videoData.duration || 30) * 1000;
  const videoTrimStartMs = (videoTrimStart / 100) * videoDurationMs;
  const videoTrimEndMs = (videoTrimEnd / 100) * videoDurationMs;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent>
      <View className="flex-1 bg-black">
        {/* FULLSCREEN VIDEO */}
        <VideoView
          player={videoPlayer}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          nativeControls={false}
        />

        {/* SEMI-TRANSPARENT OVERLAY */}
        <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          {/* TOP BAR - Close & Public/Private */}
          <View className="flex-row items-center justify-between px-4 pt-14">
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <X color="#FFFFFF" size={22} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsPublic(!isPublic)}
              className="flex-row items-center px-3 py-2 rounded-full"
              style={{ backgroundColor: isPublic ? 'rgba(220,38,38,0.8)' : 'rgba(0,0,0,0.6)' }}
            >
              {isPublic ? <Eye color="#FFF" size={16} /> : <Lock color="#FFF" size={16} />}
              <Text className="text-white text-xs font-bold ml-2">
                {isPublic ? 'PÚBLICO' : 'BÓVEDA'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CENTER - PLAY/PAUSE */}
          <View className="flex-1 items-center justify-center">
            <TouchableOpacity
              onPress={togglePlayback}
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              {isPlaying ? (
                <Pause color="#FFFFFF" size={28} />
              ) : (
                <Play color="#FFFFFF" size={28} fill="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* BOTTOM CONTROLS - Timelines */}
          <View className="px-4 pb-8" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            {/* VIDEO TRIM TIMELINE */}
            <View className="mb-4 pt-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Scissors color="#DC2626" size={14} />
                  <Text className="text-white text-xs font-bold ml-2">VIDEO</Text>
                </View>
                <Text className="text-zinc-400 text-xs font-mono">
                  {formatSeconds(videoTrimStartMs / 1000)} - {formatSeconds(videoTrimEndMs / 1000)}
                </Text>
              </View>

              <View
                ref={videoTimelineRef}
                className="relative h-10"
                onLayout={(e) => {
                  timelineWidth.current = e.nativeEvent.layout.width;
                }}
              >
                {/* Base track */}
                <View className="absolute left-0 right-0 top-4 h-2 bg-zinc-700 rounded-full" />

                {/* Selected range */}
                <View
                  className="absolute top-4 h-2 bg-red-500"
                  style={{
                    left: `${videoTrimStart}%`,
                    right: `${100 - videoTrimEnd}%`,
                  }}
                />

                {/* Current position indicator */}
                <View
                  className="absolute top-3 w-1 h-4 bg-white rounded-full"
                  style={{
                    left: `${(currentVideoTime / videoDurationMs) * 100}%`,
                  }}
                />

                {/* Start handle */}
                <View
                  {...videoTrimStartPanResponder.panHandlers}
                  className="absolute items-center"
                  style={{
                    left: `${videoTrimStart}%`,
                    marginLeft: -12,
                    top: 0,
                    width: 24,
                    height: 24,
                    zIndex: 10,
                  }}
                >
                  <View className="w-6 h-6 rounded-md bg-red-500 items-center justify-center border border-red-300">
                    <Text className="text-white text-xs font-bold">‹</Text>
                  </View>
                </View>

                {/* End handle */}
                <View
                  {...videoTrimEndPanResponder.panHandlers}
                  className="absolute items-center"
                  style={{
                    left: `${videoTrimEnd}%`,
                    marginLeft: -12,
                    top: 0,
                    width: 24,
                    height: 24,
                    zIndex: 10,
                  }}
                >
                  <View className="w-6 h-6 rounded-md bg-red-500 items-center justify-center border border-red-300">
                    <Text className="text-white text-xs font-bold">›</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* SPOTIFY TIMELINE - Only if connected */}
            {spotifyMetadata && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <TouchableOpacity
                    onPress={() => setSpotifyEnabled(!spotifyEnabled)}
                    className="flex-row items-center"
                  >
                    {spotifyEnabled ? (
                      <Music color="#1DB954" size={14} />
                    ) : (
                      <VolumeX color="#71717A" size={14} />
                    )}
                    <Text
                      className={`text-xs font-bold ml-2 ${spotifyEnabled ? 'text-green-500' : 'text-zinc-500'}`}
                    >
                      SPOTIFY
                    </Text>
                    <View
                      className={`ml-2 w-8 h-4 rounded-full items-center ${spotifyEnabled ? 'bg-green-600' : 'bg-zinc-700'}`}
                      style={{ justifyContent: spotifyEnabled ? 'flex-end' : 'flex-start', paddingHorizontal: 2 }}
                    >
                      <View className="w-3 h-3 bg-white rounded-full" />
                    </View>
                  </TouchableOpacity>
                  {spotifyEnabled && (
                    <Text className="text-zinc-400 text-xs font-mono">
                      {formatTime(spotifyStartMs)}
                    </Text>
                  )}
                </View>

                {spotifyEnabled && (
                  <>
                    {/* Song info */}
                    <Text className="text-white text-xs mb-2" numberOfLines={1}>
                      {spotifyMetadata.trackName} • {spotifyMetadata.artist}
                    </Text>

                    <View
                      ref={spotifyTimelineRef}
                      className="relative h-10"
                    >
                      {/* Base track */}
                      <View className="absolute left-0 right-0 top-4 h-2 bg-zinc-700 rounded-full" />

                      {/* Played portion */}
                      <View
                        className="absolute top-4 h-2 bg-green-500 rounded-l-full"
                        style={{
                          left: `${(spotifyStartMs / spotifyDurationMs) * 100}%`,
                          width: `${((spotifyCurrentMs - spotifyStartMs) / spotifyDurationMs) * 100}%`,
                        }}
                      />

                      {/* Trim marker with scissors */}
                      <View
                        {...spotifyTrimPanResponder.panHandlers}
                        className="absolute items-center"
                        style={{
                          left: `${(spotifyStartMs / spotifyDurationMs) * 100}%`,
                          marginLeft: -12,
                          top: 0,
                          width: 24,
                          height: 24,
                          zIndex: 20,
                        }}
                      >
                        <View className="w-6 h-6 rounded-full bg-green-500 items-center justify-center border border-green-300">
                          <Scissors color="#FFFFFF" size={12} />
                        </View>
                      </View>

                      {/* Current position */}
                      <View
                        className="absolute top-3 w-1 h-4 bg-white rounded-full"
                        style={{
                          left: `${(spotifyCurrentMs / spotifyDurationMs) * 100}%`,
                        }}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            {/* ACTION BUTTONS */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 rounded-xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <RotateCcw color="#FFFFFF" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-[3] py-3 rounded-xl flex-row items-center justify-center bg-savage-red"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 color="#FFFFFF" size={20} />
                    <Text className="text-white font-bold text-base ml-2">
                      {isPublic ? 'COMPARTIR' : 'GUARDAR'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default FullscreenVideoEditor;
