// TODO: useMission hook
import { useState, useEffect } from 'react';
import { missionAPI } from '../services/missionService';

export default function useMission() {
  const [missions, setMissions] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const available = await missionAPI.getAvailableMissions();
      const active = await missionAPI.getActiveMission();
      setMissions(available);
      setActiveMission(active || null);
    } catch (error) {
      console.log('Mission fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptMission = async (missionId) => {
    try {
      await missionAPI.acceptMission(missionId);
      await fetchMissions(); // Refresh
    } catch (error) {
      console.log('Accept failed:', error);
    }
  };

  useEffect(() => {
    fetchMissions();
    const interval = setInterval(fetchMissions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return {
    missions,
    activeMission,
    loading,
    acceptMission,
    refetch: fetchMissions,
  };
}
