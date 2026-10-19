import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { getCurrentLocation } from '../../services/locationService';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function LocationDisplay() {
  const [location, setLocation] = useState(null);
  const bounce = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(bounce.value) }],
  }));

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const coords = await getCurrentLocation();
        setLocation({
          lat: coords.latitude.toFixed(6),
          lng: coords.longitude.toFixed(6),
        });
        bounce.value = withSpring(1.05, undefined, () => {
          bounce.value = 1;
        });
      } catch (error) {
        console.log('Location error:', error);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatedView style={[styles.container, animatedStyle]}>
      <FontAwesomeIcon icon={faMapMarkerAlt} size={24} color="#10b981" />
      <Text style={styles.title}>Live Location</Text>
      {location ? (
        <>
          <Text style={styles.lat}>{location.lat}</Text>
          <Text style={styles.lng}>{location.lng}</Text>
        </>
      ) : (
        <Text style={styles.loading}>Getting location...</Text>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  lat: {
    fontSize: 14,
    color: '#2563eb',
    fontFamily: 'monospace',
  },
  lng: {
    fontSize: 14,
    color: '#2563eb',
    fontFamily: 'monospace',
  },
  loading: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
