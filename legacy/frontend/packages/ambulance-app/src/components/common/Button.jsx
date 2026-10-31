import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated'; // Native motion animations

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function Button({ children, onPress, variant = 'primary', style, ...props }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.95;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  return (
    <AnimatedTouchable
      style={[styles.button, 
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        style, animatedStyle
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={0.8}
      {...props}
    >
      <Text style={styles.text}>{children}</Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: { backgroundColor: '#2563eb' },
  danger: { backgroundColor: '#dc2626' },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
