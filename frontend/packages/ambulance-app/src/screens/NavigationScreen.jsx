import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import MapView from '../components/common/MapView';
import RoutePreview from '../components/navigation/RoutePreview';
import TurnByTurn from '../components/navigation/TurnByTurn';

const NavigationScreen = () => {
  const { currentMission } = useSelector((state) => state.mission);
  const { location } = useSelector((state) => state.driver);

  if (!currentMission) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <MapView destination={currentMission.destination} />
      <RoutePreview route={currentMission.route} />
      <TurnByTurn instructions={currentMission.navigationInstructions} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default NavigationScreen;
