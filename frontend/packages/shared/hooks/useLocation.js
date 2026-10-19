import { useState, useEffect } from 'react';
import Geolocation from 'react-native-geolocation-service';

export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        setLocation(position.coords);
        setError(null);
      },
      (error) => setError(error.message),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    return () => Geolocation.clearWatch(watchId);
  }, []);

  return { location, error };
}
