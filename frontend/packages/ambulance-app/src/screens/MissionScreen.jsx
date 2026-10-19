import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '../../../shared/components/Card';
import Button from '../../../shared/components/Button';
import MissionStatus from '../components/mission/MissionStatus';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDirections, faPhone, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons';

export default function MissionScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mission Details</Text>
        <MissionStatus status="active" />
      </View>

      <Card style={styles.missionCard}>
        <View style={styles.missionHeader}>
          <FontAwesomeIcon icon={faMapMarkedAlt} size={32} color="#2563eb" />
          <View style={styles.missionInfo}>
            <Text style={styles.missionTitle}>Road Accident</Text>
            <Text style={styles.missionId}>#EM-2026-001</Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>📍 Location</Text>
            <Text style={styles.value}>Sector 15, Gandhinagar</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>📏 Distance</Text>
            <Text style={styles.value}>2.4 km</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>⏱️ ETA</Text>
            <Text style={styles.value}>6 minutes</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button style={styles.startButton}>
            <FontAwesomeIcon icon={faDirections} size={20} color="white" />
            <Text style={styles.buttonText}>START NAVIGATION</Text>
          </Button>
          <Button variant="danger" style={styles.callButton}>
            <FontAwesomeIcon icon={faPhone} size={20} color="white" />
            <Text style={styles.buttonText}>CALL PATIENT</Text>
          </Button>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  missionCard: {
    margin: 24,
    flex: 1,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  missionId: {
    fontSize: 14,
    color: '#64748b',
  },
  details: {
    gap: 12,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 16,
    color: '#64748b',
    width: 100,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  startButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  callButton: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
