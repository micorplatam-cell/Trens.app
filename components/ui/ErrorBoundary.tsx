// ============================================================================
// ERROR BOUNDARY - Captura errores y muestra UI de recuperación
// Previene pantallas negras por errores no manejados
// ============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // En web, limpiar localStorage corrupto y recargar
      try {
        // Solo limpiar datos de estado, no sesión de auth
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && !key.includes('supabase') && !key.includes('auth')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch {
        // Ignorar errores de localStorage
      }
      window.location.reload();
    } else {
      // En nativo, simplemente resetear el estado
      this.handleReset();
    }
  };

  handleGoHome = (): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
    } else {
      // En nativo, resetear y dejar que el router maneje
      this.handleReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Si hay fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de error por defecto
      return (
        <View className="flex-1 bg-black items-center justify-center px-6">
          {/* Icono de error */}
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)' }}
          >
            <AlertTriangle size={48} color="#DC2626" />
          </View>

          {/* Título */}
          <Text className="text-white text-2xl font-bold text-center mb-2">¡Algo salió mal!</Text>

          {/* Descripción */}
          <Text className="text-zinc-400 text-center text-sm mb-6">
            La app encontró un error inesperado. No te preocupes, tus datos están seguros.
          </Text>

          {/* Error details - Mostrar siempre para debugging */}
          {this.state.error && (
            <View className="bg-zinc-900 rounded-lg p-3 mb-6 w-full max-w-sm">
              <Text className="text-red-400 text-xs font-mono" numberOfLines={5}>
                {this.state.error.message || 'Error desconocido'}
              </Text>
              {this.state.error.stack && (
                <Text className="text-zinc-500 text-[10px] font-mono mt-2" numberOfLines={3}>
                  {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                </Text>
              )}
            </View>
          )}

          {/* Botones de acción */}
          <View className="flex-row gap-3 w-full max-w-sm">
            <TouchableOpacity
              onPress={this.handleReset}
              className="flex-1 py-4 rounded-xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: '#DC2626' }}
            >
              <RefreshCw size={18} color="#fff" />
              <Text className="text-white font-bold">Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={this.handleGoHome}
              className="flex-1 py-4 rounded-xl items-center justify-center flex-row gap-2"
              style={{ backgroundColor: '#27272a' }}
            >
              <Home size={18} color="#a1a1aa" />
              <Text className="text-zinc-400 font-bold">Inicio</Text>
            </TouchableOpacity>
          </View>

          {/* Botón de recarga completa */}
          <TouchableOpacity onPress={this.handleReload} className="mt-6">
            <Text className="text-zinc-500 text-sm underline">Recargar la aplicación</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
