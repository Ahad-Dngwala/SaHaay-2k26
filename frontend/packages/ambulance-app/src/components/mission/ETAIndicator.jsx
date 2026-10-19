import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function ETAIndicator({ etaMinutes = 10 }) {
  const [displayETA, setDisplayETA] = useState(etaMinutes);
  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.1, { duration: 1000 }),
      -1,
      true
    );

    const interval = setInterval(() => {
      setDisplayETA(prev => Math.max(0, prev - 1));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const getColor = () => {
    if (displayETA === 0) return '#dc2626';
    if (displayETA < 5) return '#f59e0b';
    return '#16a34a';
  };

  return (
    <AnimatedView style={[styles.container, { borderColor: getColor() }, pulseStyle]}>
      <FontAwesomeIcon icon={faClock} size={20} color={getColor()} />
      <Text style={[styles.time, { color: getColor() }]}>
        {displayETA}m
      </Text>
      <Text style={styles.label}>ETA</Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  time: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
});
