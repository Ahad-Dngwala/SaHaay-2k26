import Animated, {
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

export const createFlashAnimation = (node) => {
  return withRepeat(
    withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.3, { duration: 300 }),
      withTiming(1, { duration: 300 })
    ),
    -1,
    true
  );
};

export const createPulseAnimation = (node) => {
  return withRepeat(
    withTiming(1.1, { duration: 1000 }),
    -1,
    true
  );
};
