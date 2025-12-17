// ============================================================================
// USE VOICE INPUT - Hook para entrada de voz con Gemini transcription
// Usa expo-av para grabar y Gemini para transcribir
// ============================================================================

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { File } from 'expo-file-system/next';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  /**
   * Inicia la grabación de audio
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Pedir permisos
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de micrófono denegado');
        return;
      }

      // Configurar modo de audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Crear y empezar grabación
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);

      console.warn('🎤 Grabación iniciada');
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
      setError('Error al iniciar grabación');
    }
  }, []);

  /**
   * Detiene la grabación y transcribe con Gemini
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      console.warn('🎤 Deteniendo grabación...');
      setIsRecording(false);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setError('No se pudo obtener el archivo de audio');
        return null;
      }

      console.warn('🎤 Audio guardado en:', uri);

      // Transcribir con Gemini
      setIsTranscribing(true);
      const transcription = await transcribeWithGemini(uri);
      setIsTranscribing(false);

      if (transcription) {
        console.warn('🎤 Transcripción:', transcription);
        return transcription;
      } else {
        setError('No se pudo transcribir el audio');
        return null;
      }
    } catch (err) {
      console.error('Error al detener grabación:', err);
      setError('Error al procesar audio');
      setIsRecording(false);
      setIsTranscribing(false);
      return null;
    }
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  };
}

/**
 * Transcribe audio usando Gemini 2.0 Flash
 * Gemini puede procesar audio directamente
 */
async function transcribeWithGemini(audioUri: string): Promise<string | null> {
  try {
    // Leer el archivo de audio como base64 usando la nueva API
    const file = new File(audioUri);
    const base64Audio = await file.base64();

    // Determinar el mime type
    const mimeType = audioUri.endsWith('.m4a') ? 'audio/mp4' : 'audio/webm';

    // Llamar a Gemini con el audio
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: 'Transcribe este audio en español. Solo devuelve el texto transcrito, sin explicaciones adicionales. Si no puedes entender el audio, responde "NO_AUDIO".',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Gemini transcription error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text && text !== 'NO_AUDIO') {
      return text.trim();
    }

    return null;
  } catch (err) {
    console.error('Error transcribiendo con Gemini:', err);
    return null;
  }
}
