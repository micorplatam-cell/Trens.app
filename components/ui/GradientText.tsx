// ============================================================================
// GRADIENT TEXT COMPONENT
// Text with gradient effect - web uses CSS, native uses solid color fallback
// ============================================================================

import React from 'react';
import { Text, TextStyle, Platform, View } from 'react-native';

interface GradientTextProps {
  children: string;
  colors?: string[];
  style?: TextStyle;
  className?: string;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  colors = ['#DC2626', '#F97316', '#FBBF24'],
  style,
  className = '',
}) => {
  // On web, use CSS gradient text
  if (Platform.OS === 'web') {
    const webStyle = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(', ')})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    } as any;

    return (
      <Text style={[webStyle, style]} className={className}>
        {children}
      </Text>
    );
  }

  // On native, fallback to first color (gradient text requires MaskedView)
  return (
    <Text style={[{ color: colors[0] }, style]} className={className}>
      {children}
    </Text>
  );
};

export default GradientText;
