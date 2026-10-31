import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';

const ProfileScreen = () => {
  const { driverId, driverName, phoneNumber } = useSelector(
    (state) => state.driver
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile information will be displayed here */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
});

export default ProfileScreen;
