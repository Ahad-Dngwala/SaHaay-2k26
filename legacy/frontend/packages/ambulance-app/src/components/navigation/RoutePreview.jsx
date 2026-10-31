import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRoute, faClock, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

export default function RoutePreview({ 
  distance, 
  duration, 
  destination,
  entering = FadeInDown 
}) {
  return (
    <Animated.View entering={entering} style={styles.container}>
      <View style={styles.header}>
        <FontAwesomeIcon icon={faRoute} size={24} color="#2563eb" />
        <Text style={styles.title}>Route Preview</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detail}>
          <FontAwesomeIcon icon={faMapMarkerAlt} size={16} color="#10b981" />
          <Text style={styles.label}>Destination</Text>
          <Text style={styles.value}>{destination}</Text>
        </View>
        
        <View style={styles.detail}>
          <FontAwesomeIcon icon={faClock} size={16} color="#f59e0b" />
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>{distance}</Text>
        </View>

        <View style={styles.detail}>
          <FontAwesomeIcon icon={faClock} size={16} color="#16a34a" />
          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{duration}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  details: {
    gap: 12,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
});
