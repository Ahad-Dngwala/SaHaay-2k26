import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Button from '../../../shared/components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function AccidentAlertScreen({ navigation }) {
  const [countdown, setCountdown] = useState(30);
  const flash = useSharedValue(1);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
    transform: [{ scale: flash.value }],
  }));

  useEffect(() => {
    flash.value = withRepeat(
      withTiming(0.8, { duration: 500 }),
      -1,
      true
    );

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto send emergency
          navigation.navigate('Emergency');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const cancelAlert = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <AnimatedView style={[styles.alertBox, flashStyle]}>
        <FontAwesomeIcon icon={faExclamationTriangle} size={80} color="#dc2626" />
        <Text style={styles.title}>ACCIDENT DETECTED</Text>
        <Text style={styles.subtitle}>Gearo sensor triggered</Text>
        
        <Text style={styles.countdown}>
          {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
        </Text>
        
        <Text style={styles.warning}>SOS will be sent automatically</Text>
        
        <Button variant="danger" onPress={cancelAlert} style={styles.cancelButton}>
          CANCEL ALERT (Safe)
        </Button>
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  alertBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    gap: 24,
    minWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#1e293b',
    textAlign: 'center',
  },
  countdown: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#dc2626',
    marginVertical: 12,
  },
  warning: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  cancelButton: {
    width: '100%',
  },
});
