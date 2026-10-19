import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import Card from '@emergency/shared/components/Button';
import Button from '@emergency/shared/components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faMapMarkerAlt, 
  faPhone, 
  faClock, 
  faCheckCircle 
} from '@fortawesome/free-solid-svg-icons';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function EmergencyScreen() {
  const { isActive, missionId, status } = useSelector(state => state.emergency);
  const [activeMission, setActiveMission] = useState(isActive);
  const fadeAnim = useSharedValue(0);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: withSpring(fadeAnim.value),
  }));

  React.useEffect(() => {
    fadeAnim.value = withSpring(1);
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <AnimatedView style={[styles.header, fadeStyle]}>
        <Text style={styles.title}>Emergency Status</Text>
        <Text style={styles.subtitle}>Your safety is our priority</Text>
      </AnimatedView>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <FontAwesomeIcon icon={faMapMarkerAlt} size={32} color="#2563eb" />
          <Text style={styles.statTitle}>Location Shared</Text>
          <Text style={styles.statValue}>Live GPS Tracking</Text>
        </Card>

        <Card style={styles.statCard}>
          <FontAwesomeIcon icon={faPhone} size={32} color="#16a34a" />
          <Text style={styles.statTitle}>Ambulance Dispatched</Text>
          <Text style={styles.statValue}>ETA: 8-12 minutes</Text>
        </Card>

        <Card style={styles.statCard}>
          <FontAwesomeIcon icon={faClock} size={32} color="#f59e0b" />
          <Text style={styles.statTitle}>Mission Active</Text>
          <Text style={styles.statValue}>#{missionId || 'N/A'}</Text>
        </Card>
      </View>

      {activeMission && (
        <View style={styles.actionSection}>
          <Button variant="danger" style={styles.actionButton}>
            <Text style={styles.actionText}>CANCEL EMERGENCY</Text>
          </Button>
          <Text style={styles.warning}>
            🚨 Only cancel if you're safe
          </Text>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Emergency Contacts</Text>
        <View style={styles.contactRow}>
          <View style={styles.contact}>
            <FontAwesomeIcon icon={faPhone} size={20} color="#dc2626" />
            <Text style={styles.contactText}>Emergency: 108</Text>
          </View>
          <View style={styles.contact}>
            <FontAwesomeIcon icon={faPhone} size={20} color="#16a34a" />
            <Text style={styles.contactText}>Ambulance: 102</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  statsContainer: {
    padding: 24,
    gap: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  actionSection: {
    padding: 24,
    alignItems: 'center',
  },
  actionButton: {
    width: '100%',
  },
  actionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warning: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 12,
    textAlign: 'center',
  },
  infoSection: {
    padding: 24,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'space-around',
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    flex: 1,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
});
