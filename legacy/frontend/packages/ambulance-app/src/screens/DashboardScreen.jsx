import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import Card from '@emergency/shared/components/Card';
import Button from '@emergency/shared/components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faTruckMedical } from '@fortawesome/free-solid-svg-icons';

const missions = [
  {
    id: '1',
    title: 'High Priority - Road Accident',
    location: 'Sector 15, Gandhinagar',
    distance: '2.4 km',
    eta: '6 min',
    priority: 'critical',
  },
];

export default function DashboardScreen() {
  const renderMission = ({ item }) => (
    <Card style={styles.missionCard}>
      <View style={styles.missionHeader}>
        <FontAwesomeIcon 
          icon={faTruckMedical} 
          size={24} 
          color={item.priority === 'critical' ? '#dc2626' : '#f59e0b'} 
        />
        <Text style={[
          styles.missionTitle,
          item.priority === 'critical' && styles.criticalTitle
        ]}>
          {item.title}
        </Text>
      </View>
      
      <View style={styles.missionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📍 Location:</Text>
          <Text style={styles.detailValue}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📏 Distance:</Text>
          <Text style={styles.detailValue}>{item.distance}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>⏱️ ETA:</Text>
          <Text style={styles.detailValue}>{item.eta}</Text>
        </View>
      </View>

      <View style={styles.missionActions}>
        <Button style={styles.acceptButton}>
          <Text style={styles.acceptText}>ACCEPT MISSION</Text>
        </Button>
        <Button variant="danger" style={styles.rejectButton}>
          <Text style={styles.rejectText}>REJECT</Text>
        </Button>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ambulance Dashboard</Text>
        <View style={missions.length > 0 ? styles.badgeActive : styles.badgeIdle}>
          <FontAwesomeIcon icon={faBell} size={16} color="white" />
          <Text style={styles.badgeText}>{missions.length}</Text>
        </View>
      </View>

      <FlatList
        data={missions}
        renderItem={renderMission}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card style={styles.emptyState}>
            <FontAwesomeIcon icon={faTruckMedical} size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Active Missions</Text>
            <Text style={styles.emptySubtitle}>Ready for dispatch</Text>
          </Card>
        }
      />
    </View>
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
  badgeActive: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIdle: {
    backgroundColor: '#94a3b8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 24,
    gap: 16,
  },
  missionCard: {
    gap: 16,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  criticalTitle: {
    color: '#dc2626',
  },
  missionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  missionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#16a34a',
  },
  acceptText: {
    color: 'white',
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
  },
  rejectText: {
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
});
