import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { User, Camera } from 'lucide-react-native';

const PREMIUM = {
  fireRed: '#DC2626',
  fireOrange: '#F97316',
  fireYellow: '#FBBF24',
};

interface PremiumAvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  animatedBorder?: boolean;
  onPress?: () => void;
  showEditIcon?: boolean;
  isPro?: boolean;
}

const SIZES = {
  sm: { container: 40, icon: 18, text: 14, editIcon: 12, editBg: 18 },
  md: { container: 56, icon: 24, text: 18, editIcon: 14, editBg: 22 },
  lg: { container: 80, icon: 32, text: 24, editIcon: 16, editBg: 28 },
  xl: { container: 120, icon: 48, text: 36, editIcon: 20, editBg: 36 },
};

export function PremiumAvatar({
  uri,
  name,
  size = 'md',
  showBorder = false,
  animatedBorder = false,
  onPress,
  showEditIcon = false,
  isPro = false,
}: PremiumAvatarProps) {
  const config = SIZES[size];
  const rotateValue = useSharedValue(0);
  const glowOpacity = useSharedValue(0.4);

  React.useEffect(() => {
    if (animatedBorder) {
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1500 }),
          withTiming(0.3, { duration: 1500 })
        ),
        -1,
        true
      );
    }
  }, [animatedBorder]);

  const borderStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const getInitials = () => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container onPress={onPress} activeOpacity={0.8} className="relative">
      {/* Animated glow */}
      {(animatedBorder || isPro) && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -6,
              left: -6,
              right: -6,
              bottom: -6,
              borderRadius: config.container / 2 + 6,
              backgroundColor: PREMIUM.fireRed,
            },
            glowStyle,
          ]}
          className="blur-xl"
        />
      )}

      {/* Animated border */}
      {(showBorder || animatedBorder) && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -3,
              left: -3,
              right: -3,
              bottom: -3,
              borderRadius: config.container / 2 + 3,
              overflow: 'hidden',
            },
            animatedBorder ? borderStyle : undefined,
          ]}
        >
          <LinearGradient
            colors={[PREMIUM.fireRed, PREMIUM.fireOrange, PREMIUM.fireYellow, PREMIUM.fireRed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}

      {/* Avatar container */}
      <View
        style={{
          width: config.container,
          height: config.container,
          borderRadius: config.container / 2,
          overflow: 'hidden',
          backgroundColor: '#18181B',
        }}
        className="items-center justify-center border-2 border-black"
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: config.container, height: config.container }}
            contentFit="cover"
            transition={200}
          />
        ) : name ? (
          <LinearGradient
            colors={['#3F3F46', '#27272A']}
            className="flex-1 w-full items-center justify-center"
          >
            <Text
              style={{ fontSize: config.text }}
              className="text-white font-bold"
            >
              {getInitials()}
            </Text>
          </LinearGradient>
        ) : (
          <User size={config.icon} color="#52525B" />
        )}
      </View>

      {/* Edit icon overlay */}
      {showEditIcon && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: config.editBg,
            height: config.editBg,
            borderRadius: config.editBg / 2,
          }}
          className="bg-red-600 items-center justify-center border-2 border-black"
        >
          <Camera size={config.editIcon} color="white" />
        </View>
      )}

      {/* Pro badge */}
      {isPro && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            paddingHorizontal: 4,
            paddingVertical: 2,
          }}
          className="bg-red-600 rounded-full"
        >
          <Text className="text-white text-[8px] font-bold">PRO</Text>
        </View>
      )}
    </Container>
  );
}
