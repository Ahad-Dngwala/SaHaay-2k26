import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Geolocation from 'react-native-geolocation-service';
import { updateLocation } from '../store/slices/driverSlice';

const useLocationTracking = () => {
  const dispatch = useDispatch();
  const watchIdRef = useRef(null);
  const { isTracking } = useSelector((state) => state.driver);

  useEffect(() => {
    if (!isTracking) return;

    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        dispatch(
          updateLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })
        );
      },
      (error) => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isTracking, dispatch]);
};

export default useLocationTracking;
