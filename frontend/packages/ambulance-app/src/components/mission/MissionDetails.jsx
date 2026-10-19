import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../common/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTruckMedical } from '@fortawesome/free-solid-svg-icons';

export default function MissionCard({ mission, onAccept, onReject }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesomeIcon icon={faTruckMedical} size={24} color="#16a34a" />
        <Text style={styles.title}>{mission.title}</Text>
      </View>
      <Text style={styles.location}>{mission.location}</Text>
      <Text style={styles.distance}>{mission.distance} - ETA: {mission.eta}</Text>
      
      <View style={styles.actions}>
        <Button onPress={() => onAccept(mission.id)} style={styles.accept}>
          ACCEPT
        </Button>
        <Button variant="danger" onPress={() => onReject(mission.id)} style={styles.reject}>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  location: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  accept: {
    flex: 2,
    backgroundColor: '#16a34a',
  },
  reject: {
    flex: 1,
  },
});
