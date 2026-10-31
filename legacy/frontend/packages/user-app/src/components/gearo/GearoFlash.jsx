import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const { width, height } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);

export default function GearoFlash({ visible, onCancel }) {
  const flashOpacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    if (visible) {
      flashOpacity.value = withRepeat(
        withSequence(
          withSpring(1),
          withSpring(0.3),
          withSpring(1)
        ),
        -1,
        true
      );
      scale.value = withRepeat(withSpring(1.05), -1, true);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <AnimatedView style={[styles.flashContainer, flashStyle]}>
        <FontAwesomeIcon icon={faExclamationTriangle} size={100} color="white" />
        
        <Text style={styles.title}>🚨 ACCIDENT DETECTED 🚨</Text>
        <Text style={styles.subtitle}>Automatic SOS in 30 seconds</Text>
        <Text style={styles.timer}>⏱️ 00:27</Text>
        
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
          <Text style={styles.cancelText}>CANCEL ALERT</Text>
        </TouchableOpacity>
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  flashContainer: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    backgroundColor: '#dc2626',
    borderRadius: 24,
    alignItems: 'center',
    padding: 48,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 12,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
