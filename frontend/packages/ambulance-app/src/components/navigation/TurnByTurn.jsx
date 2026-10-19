import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRight, faArrowUp } from '@fortawesome/free-solid-svg-icons';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function TurnByTurn({ 
  currentInstruction, 
  distanceToNextTurn,
  nextTurn 
}) {
  const bounce = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(bounce.value) }],
  }));

  useEffect(() => {
    bounce.value = withSpring(1.05, undefined, () => {
      bounce.value = 1;
    });
  }, [currentInstruction]);

  const getDirectionIcon = () => {
    switch (nextTurn?.type) {
      case 'right': return faArrowRight;
      case 'left': return faArrowRight;
      case 'straight': return faArrowUp;
      default: return faArrowUp;
    }
  };

  return (
    <AnimatedView style={[styles.container, animatedStyle]}>
      <View style={styles.iconContainer}>
        <FontAwesomeIcon 
          icon={getDirectionIcon()} 
          size={32} 
          color="#2563eb" 
        />
      </View>
      
      <Text style={styles.instruction}>{currentInstruction}</Text>
      <Text style={styles.distance}>{distanceToNextTurn}</Text>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  distance: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
});
