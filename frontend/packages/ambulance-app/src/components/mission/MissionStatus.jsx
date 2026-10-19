import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircle } from '@fortawesome/free-solid-svg-icons';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function MissionStatus({ status, style }) {
  const pulse = useSharedValue(1);
  
  const statusConfig = {
    pending: { color: '#f59e0b', icon: faCircle, label: 'PENDING' },
    active: { color: '#16a34a', icon: faCircle, label: 'ACTIVE' },
    completed: { color: '#10b981', icon: faCircle, label: 'DONE' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pulse.value) }],
  }));

  return (
    <AnimatedView style={[styles.container, { backgroundColor: config.color }, style, animatedStyle]}>
      <FontAwesomeIcon icon={config.icon} size={12} color="white" />
      <Text style={styles.text}>{config.label}</Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
