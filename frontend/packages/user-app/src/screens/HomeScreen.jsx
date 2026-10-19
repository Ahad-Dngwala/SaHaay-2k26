import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { useSelector, useDispatch } from 'react-redux';
import Button from '@emergency/shared/components/Button';
import GearoFlash from '../components/gearo/GearoFlash';
import VibrationGauge from '../components/gearo/VibrationGauge';
import EmergencyButton from '../components/emergency/EmergencyButton';
import useGearo from '../hooks/useGearo';
import { startMonitoring } from '../store/slices/gearoSlice';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const dispatch = useDispatch();
  const { isMonitoring, vibrationLevel, cancelAlert } = useGearo();
  const [showGearoStatus, setShowGearoStatus] = useState(false);
  
  const pulseAnim = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withRepeat(withSpring(pulseAnim.value), -1, true) }],
  }));

  useEffect(() => {
    dispatch(startMonitoring());
    const timer = setTimeout(() => setShowGearoStatus(true), 1000);
    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.title}>Emergency Dispatch</Text>
        <Text style={styles.subtitle}>Ready to save lives</Text>
      </View>

      {/* Main SOS Button */}
      <View style={styles.sosContainer}>
        <Animated.View style={[styles.sosButton, pulseStyle]}>
          <EmergencyButton />
        </Animated.View>
      </View>

      {/* Gearo Status */}
      {showGearoStatus && (
        <View style={styles.gearoSection}>
          <Card style={styles.gearoCard}>
            <Text style={styles.gearoTitle}>🛡️ Gearo Sensor Active</Text>
            <VibrationGauge value={vibrationLevel} max={4} />
            <Text style={styles.gearoStatus}>
              {isMonitoring ? 'Monitoring...' : 'Inactive'}
            </Text>
          </Card>
        </View>
      )}

      {/* Gearo Flash Overlay */}
      <GearoFlash visible={vibrationLevel > 2.5} onCancel={cancelAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 60,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
  },
  sosContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sosButton: {
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  gearoSection: {
    paddingHorizontal: 24,
  },
  gearoCard: {
    padding: 24,
  },
  gearoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  gearoStatus: {
    fontSize: 16,
    color: '#16a34a',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});
