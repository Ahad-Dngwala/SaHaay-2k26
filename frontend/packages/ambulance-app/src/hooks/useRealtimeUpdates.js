import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { websocketService } from '../services/websocketService';
import { updateMission } from '../store/slices/missionSlice';

const useRealtimeUpdates = () => {
  const dispatch = useDispatch();
  const { currentMission } = useSelector((state) => state.mission);

  useEffect(() => {
    if (!currentMission) return;

    const handleMissionUpdate = (data) => {
      dispatch(updateMission(data));
    };

    websocketService.on('missionUpdate', handleMissionUpdate);

    return () => {
      websocketService.off('missionUpdate', handleMissionUpdate);
    };
  }, [currentMission, dispatch]);
};

export default useRealtimeUpdates;
