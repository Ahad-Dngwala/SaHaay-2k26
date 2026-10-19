import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setEmergencyActive, setEmergencyLocation } from '../store/slices/emergencySlice';
import { Alert } from 'react-native';

const useEmergency = () => {
  const dispatch = useDispatch();
  const { isActive, location } = useSelector((state) => state.emergency);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerEmergency();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive]);

  const triggerEmergency = () => {
    dispatch(setEmergencyActive(false));
    // Trigger emergency call here
  };

  const cancelEmergency = () => {
    dispatch(setEmergencyActive(false));
    setCountdown(30);
  };

  return { isActive, countdown, cancelEmergency, triggerEmergency };
};

export default useEmergency;
