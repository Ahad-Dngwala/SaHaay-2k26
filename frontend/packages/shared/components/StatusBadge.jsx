import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatusBadge({ status, style }) {
  const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'sent':
        return { bg: '#16a34a', color: 'white' };
      case 'cancelled':
        return { bg: '#94a3b8', color: 'white' };
      case 'pending':
        return { bg: '#f59e0b', color: 'white' };
      default:
        return { bg: '#e2e8f0', color: '#64748b' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.color }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
