import { useState, useEffect } from 'react';
import Geolocation from '@react-native-geolocation-service';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [tracking, setTracking] = useState(false);

  const startTracking = () => {
    setTracking(true);
    const watchId = Geolocation.watchPosition(
      (position) => setLocation(position.coords),
      (error) => console.log(error),
      { 
        enableHighAccuracy: true, 
        distanceFilter: 5,
        interval: 5000 
      }
    );
    return watchId;
  };

  const stopTracking = (watchId) => {
    setTracking(false);
    Geolocation.clearWatch(watchId);
  };

  useEffect(() => {
    let watchId;
    if (tracking) {
      watchId = startTracking();
    }
    return () => watchId && stopTracking(watchId);
  }, [tracking]);

  return { location, startTracking, stopTracking, tracking };
}
