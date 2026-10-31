// Ambulance mission service
const API_BASE = 'http://localhost:3000/api';

export const missionAPI = {
  // Get available missions
  getAvailableMissions: async () => {
    const response = await fetch(`${API_BASE}/missions/available`);
    return response.json();
  },

  // Accept mission
  acceptMission: async (missionId) => {
    const response = await fetch(`${API_BASE}/missions/${missionId}/accept`, {
      method: 'POST',
    });
    return response.json();
  },

  // Complete mission
  completeMission: async (missionId) => {
    const response = await fetch(`${API_BASE}/missions/${missionId}/complete`, {
      method: 'POST',
    });
    return response.json();
  },

  // Get active mission
  getActiveMission: async () => {
    const response = await fetch(`${API_BASE}/missions/active`);
    return response.json();
  },
};
