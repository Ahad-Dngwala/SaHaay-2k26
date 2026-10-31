import React from 'react';
import { View, StyleSheet } from 'react-native';
import Button from '../common/Button';

const AcceptRejectButtons = ({ onAccept, onReject }) => {
  return (
    <View style={styles.container}>
      <Button
        title="Accept"
        onPress={onAccept}
        style={styles.acceptBtn}
      />
      <Button
        title="Reject"
        onPress={onReject}
        style={styles.rejectBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#f44336',
  },
});

export default AcceptRejectButtons;
