import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function AccidentDetected({ onCancel }) {
  const shake = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      { 
        translateX: shake.value * 8 
      }
    ],
  }));

  React.useEffect(() => {
    shake.value = withRepeat(
      withTiming(1, { duration: 100 }),
      6,
      false
    );
  }, []);

  return (
    <AnimatedView style={[styles.overlay, shakeStyle]}>
      <View style={styles.alert}>
        <FontAwesomeIcon icon={faExclamationTriangle} size={64} color="#dc2626" />
        <Text style={styles.title}>🚨 ACCIDENT DETECTED</Text>
        <Text style={styles.subtitle}>High vibration detected by Gearo</Text>
        <Text style={styles.instruction}>Tap CANCEL if you're safe</Text>
        
        <AnimatedView style={styles.cancelButton} onTouchEnd={onCancel}>
          <Text style={styles.cancelText}>CANCEL SOS</Text>
        </AnimatedView>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(220,38,38,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alert: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    maxWidth: 320,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
  },
  cancelText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
