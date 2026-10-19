import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../shared/components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

export default function CancelConfirmScreen({ navigation, route }) {
  const { missionId } = route.params || {};

  const handleCancel = () => {
    // Cancel emergency API call
    navigation.navigate('Home');
  };

  const handleContinue = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <FontAwesomeIcon icon={faExclamationCircle} size={64} color="#f59e0b" />
        <Text style={styles.title}>Confirm Cancel</Text>
        <Text style={styles.subtitle}>Mission #{missionId}</Text>
        
        <Text style={styles.message}>
          Are you completely safe?{'\n'}
          Canceling will stop ambulance dispatch.
        </Text>

        <View style={styles.buttons}>
          <Button 
            variant="danger" 
            onPress={handleCancel}
            style={styles.button}
          >
            YES - I'M SAFE
          </Button>
          <Button onPress={handleContinue} style={styles.button}>
            NO - CONTINUE HELP
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  button: {
    height: 56,
  },
});
