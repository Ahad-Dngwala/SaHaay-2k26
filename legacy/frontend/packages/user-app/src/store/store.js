// All backend API calls in ONE file with comments
const API_BASE = 'http://localhost:3000/api'; // Change to your backend

export const emergencyAPI = {
  // Trigger emergency SOS via SMS
  sendEmergency: async (payload) => fetch(`${API_BASE}/emergency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),

  // Cancel emergency within 30s Gearo window
  cancelEmergency: async (missionId) => fetch(`${API_BASE}/emergency/${missionId}/cancel`, {
    method: 'POST'
  }),

  // Get user's emergency history
  getHistory: async () => fetch(`${API_BASE}/emergency/history`),

  // Gearo auto-accident detection trigger
  gearoAccident: async (data) => fetch(`${API_BASE}/emergency/gearo-accident`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
};

export const userAPI = {
  // Fetch current user profile
  getProfile: async () => fetch(`${API_BASE}/user/profile`),

  // Update user emergency contacts
  updateProfile: async (data) => fetch(`${API_BASE}/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
};
