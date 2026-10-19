import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from './Button';
import StatusBadge from '../../../../shared/components/StatusBadge';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTruckMedical, faClock } from '@fortawesome/free-solid-svg-icons';

export default function MissionCard({ mission, onAccept, onReject }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesomeIcon icon={faTruckMedical} size={28} color="#16a34a" />
        <View style={styles.info}>
          <Text style={styles.title}>{mission.title}</Text>
          <StatusBadge status={mission.status} />
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detail}>
          <FontAwesomeIcon icon={faClock} size={16} color="#f59e0b" />
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>{mission.distance}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.label}>ETA</Text>
          <Text style={styles.value}>{mission.eta}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button onPress={() => onAccept(mission)} style={styles.acceptBtn}>
          ACCEPT
        </Button>
        <Button variant="danger" onPress={() => onReject(mission)} style={styles.rejectBtn}>
          REJECT
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detail: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#16a34a',
  },
  rejectBtn: {
    flex: 1,
  },
});
