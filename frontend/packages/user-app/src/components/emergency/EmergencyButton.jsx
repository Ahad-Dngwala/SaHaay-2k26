import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import { sendEmergency } from '../../store/slices/emergencySlice';
import { emergencyAPI } from '../../../api';
import Geolocation from 'react-native-geolocation-service';
import Button from '@emergency/shared/components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function EmergencyButton() {
  const [isPressed, setIsPressed] = useState(false);
  const dispatch = useDispatch();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handleEmergencyPress = async () => {
    // Press feedback animation
    scale.value = withSequence(
      withSpring(0.95),
      withSpring(1.1),
      withSpring(1)
    );
    rotation.value = withSpring(rotation.value + 360);

    // Get location first
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      // Dispatch emergency
      const result = await dispatch(sendEmergency({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now(),
      })).unwrap();

      Alert.alert(
        'Emergency Sent!',
        `Mission ID: ${result.missionId}\nHelp is on the way!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send emergency. Please try again.');
    }
  };

  return (
    <AnimatedView style={[styles.container, animatedStyle]}>
      <Button
        variant="danger"
        onPress={handleEmergencyPress}
        style={styles.button}
      >
        <FontAwesomeIcon icon={faExclamationCircle} size={24} color="white" />
        <Text style={styles.buttonText}>SOS EMERGENCY</Text>
        <FontAwesomeIcon icon={faExclamationCircle} size={24} color="white" />
      </Button>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 40,
    minWidth: 240,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
