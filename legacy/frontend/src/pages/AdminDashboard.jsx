import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Truck, AlertCircle, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../config/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [emergencies, setEmergencies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeEmergencies: 0,
    availableDrivers: 0,
    avgResponseTime: 0,
    successRate: 0,
  });
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load Metrics
      const statsRes = await api.get('/api/emergency/admin/stats');
      if (statsRes.data.success) {
        setMetrics(statsRes.data.metrics);
      }

      // Load Recent Emergencies
      const emergenciesRes = await api.get('/api/emergency/admin/all');
      if (emergenciesRes.data.success) {
        setEmergencies(emergenciesRes.data.emergencies);
      }

      // Load All Drivers
      const driversRes = await api.get('/api/driver/admin/all');
      if (driversRes.data.success) {
        setDrivers(driversRes.data.drivers);
      }
      setLoading(false);
    } catch (error) {
      console.error('Load dashboard error:', error);
      setLoading(false);
    }
  };

  const loadEmergencyTimeline = async (emergencyId) => {
    try {
      const response = await api.get(`/api/emergency/${emergencyId}/timeline`);
      if (response.data.success) {
        setTimeline(response.data.timeline || []);
      }
    } catch (error) {
      console.error('Load timeline error:', error);
    }
  };

  const handleViewEmergency = async (emergency) => {
    setSelectedEmergency(emergency);
    await loadEmergencyTimeline(emergency._id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-8 h-8 text-red-600" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Real-time Emergency Management</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Emergencies</p>
                <p className="text-3xl font-bold text-red-600">{metrics.activeEmergencies}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-red-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Drivers</p>
                <p className="text-3xl font-bold text-green-600">{metrics.availableDrivers}</p>
              </div>
              <Truck className="w-12 h-12 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-blue-600">
                  {metrics.avgResponseTime}s
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {metrics.successRate}%
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Emergencies */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Live Emergencies</h2>
                <button
                  onClick={loadDashboardData}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {emergencies.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active emergencies</p>
                ) : (
                  emergencies.map((emergency) => (
                    <div
                      key={emergency._id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewEmergency(emergency)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Emergency #{emergency._id.slice(-6)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {emergency.userPhone}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${emergency.status === 'searching'
                              ? 'bg-yellow-100 text-yellow-800'
                              : emergency.status === 'assigned'
                                ? 'bg-blue-100 text-blue-800'
                                : emergency.status === 'enroute'
                                  ? 'bg-purple-100 text-purple-800'
                                  : emergency.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {emergency.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(emergency.createdAt).toLocaleString()}
                      </p>
                      {emergency.assignedDriverId && (
                        <p className="text-xs text-blue-600 mt-1">
                          Driver assigned: {emergency.assignedDriverId.name || 'N/A'}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Driver Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Driver Status</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {drivers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No drivers registered</p>
                ) : (
                  drivers.map((driver) => (
                    <div key={driver._id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-semibold text-gray-900">{driver.name}</p>
                          <p className="text-xs text-gray-600">{driver.vehicleNo}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${driver.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : driver.status === 'busy'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {driver.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Rating: {driver.rating?.toFixed(1) || 'N/A'} ⭐
                      </p>
                      {driver.lat && driver.lng && (
                        <p className="text-xs text-gray-500">
                          Location: {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Timeline Modal */}
        {selectedEmergency && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Emergency Timeline
                  </h2>
                  <button
                    onClick={() => setSelectedEmergency(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{event.type}</p>
                        <p className="text-sm text-gray-600">{event.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
