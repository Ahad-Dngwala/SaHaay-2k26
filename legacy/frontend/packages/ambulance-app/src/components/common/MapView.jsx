import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

const { width, height } = Dimensions.get('window');

export default function AmbulanceMapView({ 
  region, 
  markers = [], 
  onRegionChange,
  userLocation 
}) {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChange={onRegionChange}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={userLocation}
      >
        {/* Ambulance Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.pinColor || 'red'}
          >
            <FontAwesomeIcon icon={faMapMarkerAlt} size={32} color="#dc2626" />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height * 0.7,
  },
});
