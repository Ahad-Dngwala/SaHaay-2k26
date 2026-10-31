import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import Card from '@emergency/shared/components/Card';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faCheckCircle, 
  faTimesCircle, 
  faClock 
} from '@fortawesome/free-solid-svg-icons';

const historyData = [
  {
    id: '1',
    missionId: 'EM-2026-001',
    date: 'Jan 10, 2026',
    status: 'completed',
    responseTime: '7 min',
  },
  {
    id: '2',
    missionId: 'EM-2026-002',
    date: 'Jan 5, 2026',
    status: 'cancelled',
    responseTime: 'N/A',
  },
];

export default function HistoryScreen() {
  const renderHistoryItem = ({ item }) => (
    <Card style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.missionId}>#{item.missionId}</Text>
        <View style={styles.statusContainer}>
          {item.status === 'completed' && (
            <FontAwesomeIcon icon={faCheckCircle} size={20} color="#16a34a" />
          )}
          {item.status === 'cancelled' && (
            <FontAwesomeIcon icon={faTimesCircle} size={20} color="#94a3b8" />
          )}
          <Text style={[
            styles.statusText,
            item.status === 'completed' && { color: '#16a34a' }
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.responseTime}>Response: {item.responseTime}</Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency History</Text>
      
      <FlatList
        data={historyData}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
  },
  list: {
    gap: 16,
  },
  historyItem: {
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  responseTime: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
});
