// All backend API calls using axios
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const emergencyAPI = {
  // Trigger emergency SOS
  sendEmergency: async (payload) => api.post('/api/emergency', payload),

  // Get user's emergency history - uses GET /api/emergency/user/:phone
  getHistory: async (phone) => api.get(`/api/emergency/user/${phone}`),

  // Get emergency details
  getEmergency: async (emergencyId) => api.get(`/api/emergency/${emergencyId}`),

  // Update emergency status
  updateStatus: async (emergencyId, status) => 
    api.patch(`/api/emergency/${emergencyId}/status`, { status }),

  // Send message in emergency
  sendMessage: async (emergencyId, message) => 
    api.post(`/api/emergency/${emergencyId}/message`, { message }),
};

export const userAPI = {
  // Get current user (requires token)
  getCurrentUser: async () => api.get('/api/auth/me'),

  // Get user profile by phone
  getProfile: async (phone) => api.get(`/api/auth/profile/${phone}`),

  // Login user
  login: async (phone, role = 'user') => 
    api.post('/api/auth/login', { phone, role }),

  // Register user
  register: async (name, phone) => 
    api.post('/api/auth/register', { name, phone, role: 'user' }),
};

export default api;

