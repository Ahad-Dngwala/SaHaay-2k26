import { useState, useEffect, useRef } from 'react';

export default function useCancelTimer(initialTime = 30) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef();

  const startTimer = () => {
    setIsRunning(true);
    setTimeLeft(initialTime);
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(initialTime);
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return { timeLeft, isRunning, startTimer, cancelTimer };
}
