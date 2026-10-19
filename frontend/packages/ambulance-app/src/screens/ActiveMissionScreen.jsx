import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@emergency/shared/components/Card';
import Button from '@emergency/shared/components/Button';
import StatusBadge from '@emergency/shared/components/StatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkedAlt, faClock, faCheck } from '@fortawesome/free-solid-svg-icons';

export default function ActiveMissionScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Mission</Text>
        <StatusBadge status="ACTIVE" />
      </View>

      <Card style={styles.missionCard}>
        <View style={styles.missionHeader}>
          <FontAwesomeIcon icon={faMapMarkedAlt} size={32} color="#2563eb" />
          <View>
            <Text style={styles.missionTitle}>Road Accident</Text>
            <Text style={styles.missionId}>#EM-2026-001</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <FontAwesomeIcon icon={faClock} size={20} color="#f59e0b" />
            <Text style={styles.statLabel}>ETA</Text>
            <Text style={styles.statValue}>6 min</Text>
          </View>
          <View style={styles.stat}>
            <FontAwesomeIcon icon={faClock} size={20} color="#10b981" />
            <Text style={styles.statLabel}>Response</Text>
            <Text style={styles.statValue}>2.4 km</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button style={styles.completeButton}>
            <FontAwesomeIcon icon={faCheck} size={20} color="white" />
            <Text style={styles.completeText}>MARK COMPLETE</Text>
          </Button>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  missionCard: {
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
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  actions: {
    paddingTop: 16,
  },
  completeButton: {
    backgroundColor: '#16a34a',
  },
  completeText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
});
