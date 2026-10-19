import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useDerivedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChartLine } from '@fortawesome/free-solid-svg-icons';

export default function VibrationGauge({ value, max = 4 }) {
  const normalizedValue = useDerivedValue(() => value / max);
  const gaugeColor = useDerivedValue(() => {
    'worklet';
    if (normalizedValue.value < 0.3) return '#10b981';
    if (normalizedValue.value < 0.7) return '#f59e0b';
    return '#dc2626';
  });

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(
      normalizedValue.value,
      [0, 1],
      [0, 200],
      Extrapolate.CLAMP
    ),
    backgroundColor: gaugeColor.value,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.value}>{value.toFixed(1)}g</Text>
      
      <View style={styles.gaugeContainer}>
        <Animated.View style={[styles.gaugeBar, animatedStyle]} />
        <View style={styles.gaugeBackground} />
      </View>

      <View style={styles.thresholds}>
        <View style={styles.threshold}>
          <View style={[styles.thresholdDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.thresholdLabel}>Safe</Text>
        </View>
        <View style={styles.threshold}>
          <View style={[styles.thresholdDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.thresholdLabel}>Warning</Text>
        </View>
        <View style={styles.threshold}>
          <View style={[styles.thresholdDot, { backgroundColor: '#dc2626' }]} />
          <Text style={styles.thresholdLabel}>🚨 Crash</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  gaugeContainer: {
    height: 20,
    width: 200,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  gaugeBar: {
    height: '100%',
    position: 'absolute',
    borderRadius: 10,
  },
  gaugeBackground: {
    height: '100%',
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
  },
  thresholds: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  threshold: {
    alignItems: 'center',
    gap: 4,
  },
  thresholdDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  thresholdLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});
