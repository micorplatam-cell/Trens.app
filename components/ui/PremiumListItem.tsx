import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
// Linear gradient available if needed
import Animated, { FadeInRight } from 'react-native-reanimated';
import { ChevronRight, LucideIcon } from 'lucide-react-native';

// Colors used inline

interface PremiumListItemProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  value?: string | number;
  valueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  showDivider?: boolean;
  iconColor?: string;
  iconBgColor?: string;
  rightContent?: React.ReactNode;
  delay?: number;
  danger?: boolean;
}

export function PremiumListItem({
  icon: Icon,
  title,
  subtitle,
  value,
  valueColor,
  onPress,
  showChevron = true,
  showDivider = true,
  iconColor = '#DC2626',
  iconBgColor,
  rightContent,
  delay = 0,
  danger = false,
}: PremiumListItemProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(400)}>
      <Container onPress={onPress} activeOpacity={0.7} className="flex-row items-center py-4 px-4">
        {/* Icon */}
        {Icon && (
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-4"
            style={{
              backgroundColor:
                iconBgColor || (danger ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.1)'),
            }}
          >
            <Icon size={20} color={danger ? '#EF4444' : iconColor} />
          </View>
        )}

        {/* Text content */}
        <View className="flex-1">
          <Text
            className={`font-semibold ${danger ? 'text-red-500' : 'text-white'}`}
            style={{ fontSize: 15 }}
          >
            {title}
          </Text>
          {subtitle && <Text className="text-zinc-500 text-sm mt-0.5">{subtitle}</Text>}
        </View>

        {/* Right content */}
        {rightContent}

        {/* Value */}
        {value !== undefined && (
          <Text
            className="font-mono font-semibold mr-2"
            style={{ color: valueColor || '#A1A1AA', fontSize: 14 }}
          >
            {value}
          </Text>
        )}

        {/* Chevron */}
        {onPress && showChevron && <ChevronRight size={20} color="#52525B" />}
      </Container>

      {/* Divider */}
      {showDivider && (
        <View
          className="h-px mx-4"
          style={{
            backgroundColor: 'rgba(39, 39, 42, 0.5)',
            marginLeft: Icon ? 72 : 16,
          }}
        />
      )}
    </Animated.View>
  );
}

interface PremiumListSectionProps {
  title?: string;
  children: React.ReactNode;
  showBackground?: boolean;
}

export function PremiumListSection({
  title,
  children,
  showBackground = true,
}: PremiumListSectionProps) {
  return (
    <View className="mb-6">
      {/* Section title */}
      {title && (
        <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider px-4 mb-2">
          {title}
        </Text>
      )}

      {/* Section content */}
      <View
        className={`overflow-hidden ${showBackground ? 'bg-zinc-900/50 border border-zinc-800/30 rounded-2xl' : ''}`}
      >
        {children}
      </View>
    </View>
  );
}
