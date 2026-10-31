import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Accelerometer } from 'react-native-sensors';
import { setAccidentDetected } from '../store/slices/gearoSlice';

const useGearo = () => {
  const dispatch = useDispatch();
  const { accidentDetected } = useSelector((state) => state.gearo);
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const subscription = Accelerometer.subscribe(({ x, y, z }) => {
      setAcceleration({ x, y, z });
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Detect high impact (adjust threshold as needed)
      if (magnitude > 50) {
        dispatch(setAccidentDetected(true));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return { accidentDetected, acceleration };
};

export default useGearo;
