import Geolocation from 'react-native-geolocation-service';

class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.callback = null;
  }

  startTracking(callback) {
    this.callback = callback;
    this.watchId = Geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
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
  }

  stopTracking() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export default new LocationTrackingService();
