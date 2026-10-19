import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';
import {
  AlertCircle, MapPin, Clock, Truck, X, RefreshCw,
  Check, MessageSquare, Send, Phone, Shield,
  Navigation, Zap, Smartphone, MoreVertical
} from 'lucide-react';
import api from '../config/api';
import { connectSocket, getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

const mapContainerStyle = {
  width: '100%',
  height: '100vh',
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#1d2c4d" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#8ec3b9" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#1a3646" }]
    },
    // ... custom dark mode styles for premium look
  ]
};

export default function UserEmergency() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const [driver, setDriver] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 🚑 AMBULANCE-GRADE GPS: Use watchPosition
    if (navigator.geolocation) {
      const geoOptions = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      };

      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          if (!isEditingLocation) {
            setLocation({ lat: latitude, lng: longitude });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          if (!location) setLocation(defaultCenter);
        },
        geoOptions
      );

      return () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      };
    } else {
      setLocation(defaultCenter);
    }
  }, [isEditingLocation]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    socketRef.current = connectSocket(token);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (emergency?.id || emergency?._id) {
      const emergencyId = emergency.id || emergency._id;
      const socket = socketRef.current;
      if (!socket) return;

      socket.emit('emergency:join', { emergencyId });

      socket.on(`track:${emergencyId}`, (data) => {
        setDriverLocation({ lat: parseFloat(data.lat), lng: parseFloat(data.lng) });
      });

      socket.on(`emergency:${emergencyId}:assigned`, (data) => {
        setDriver(data.driver);
        toast.success(`Ambulance assigned: ${data.driver.name}`, { icon: '🚑' });
        loadEmergencyDetails(emergencyId);
      });

      socket.on(`emergency:${emergencyId}:status`, (data) => {
        if (data.status === 'searching') {
          setDriver(null);
          setDriverLocation(null);
          toast('Finding a nearby ambulance...', { icon: '🔄' });
        }
        loadEmergencyDetails(emergencyId);
      });

      socket.on(`message:${emergencyId}`, (data) => {
        setMessages(prev => [...prev, data]);
      });

      return () => {
        socket.off(`track:${emergencyId}`);
        socket.off(`emergency:${emergencyId}:assigned`);
        socket.off(`emergency:${emergencyId}:status`);
        socket.off(`message:${emergencyId}`);
      };
    }
  }, [emergency]);

  useEffect(() => {
    if (showChat) scrollToBottom();
  }, [messages, showChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadEmergencyDetails = async (emergencyId) => {
    try {
      const response = await api.get(`/api/emergency/${emergencyId}`);
      if (response.data.success) {
        setEmergency(response.data.emergency);
        setDriver(response.data.emergency.assignedDriverId);
        setTimeline(response.data.timeline || []);
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Load emergency error:', error);
    }
  };

  const handleCreateEmergency = async () => {
    if (!location) {
      toast.error('Location not available');
      return;
    }

    try {
      toast.loading('Initiating Emergency Response...', { id: 'emergency-loading' });
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await api.post('/api/emergency', {
        phone: user.phone || '+1234567890',
        lat: location.lat,
        lng: location.lng,
      });

      if (response.data.success) {
        toast.dismiss('emergency-loading');
        toast.success('Emergency Signal Sent!', {
          icon: '🚨',
          style: { background: '#ef4444', color: '#fff' }
        });
        setEmergency(response.data.emergency);
        await loadEmergencyDetails(response.data.emergency.id || response.data.emergency._id);
      }
    } catch (error) {
      toast.dismiss('emergency-loading');
      toast.error(error.response?.data?.message || 'Failed to create emergency');
    }
  };

  const handleUpdateLocation = async () => {
    if (!tempLocation || !emergency) return;
    try {
      // Mock logic for updating location mid-emergency if supported by backend
      // For now, just update local state and set editing false
      setLocation(tempLocation);
      setIsEditingLocation(false);
      toast.success('Location updated for driver');
    } catch (error) {
      toast.error('Failed to update location');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !emergency) return;
    const emergencyId = emergency._id || emergency.id;
    try {
      await api.post(`/api/emergency/${emergencyId}/message`, {
        message: newMessage,
      });
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const generateSmsFallback = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const lat = location?.lat.toFixed(6);
    const lng = location?.lng.toFixed(6);
    const body = `EMERGENCY ALERT! Accident detected at ${lat}, ${lng}. Phone: ${user.phone}. Need immediate assistance!`;
    const smsUrl = `sms:+919999999999?body=${encodeURIComponent(body)}`;
    window.location.href = smsUrl;
  };

  if (!location) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900">
        <div className="relative">
          <RefreshCw className="w-16 h-16 animate-spin text-red-500" />
          <div className="absolute inset-0 animate-ping rounded-full bg-red-500/20"></div>
        </div>
        <p className="mt-8 text-xl font-medium text-slate-300 animate-pulse">Establishing Satellite Connection...</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Map Layer */}
      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={location}
          zoom={16}
          options={mapOptions}
          onLoad={(map) => (mapRef.current = map)}
        >
          {location && (
            <Marker
              position={location}
              draggable={isEditingLocation}
              onDragEnd={(e) => setTempLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
              icon={{
                path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 1.5,
              }}
            />
          )}

          {driverLocation && (
            <Marker
              position={driverLocation}
              icon={{
                path: 'M 12 2 C 7.03 2 3 6.03 3 11 C 3 16.55 12 22 12 22 C 12 22 21 16.55 21 11 C 21 6.03 16.97 2 12 2 Z',
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 1.8,
              }}
              label={{
                text: "🚑",
                fontSize: "20px"
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>

      {/* Header Overlay */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3 glass-panel p-2 pr-4 rounded-full">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center pulse-red">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">RescueLink</h1>
            <p className="text-[10px] text-red-500 font-bold">24/7 ACTIVE RESPONSE</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!emergency && (
            <button
              onClick={generateSmsFallback}
              className="glass-panel p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              title="SMS Fallback"
            >
              <Smartphone className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
            </button>
          )}
          <button className="glass-panel p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <MoreVertical className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Main UI Overlay */}
      <div className="absolute bottom-10 left-6 right-6 flex flex-col items-center gap-4 z-20 pointer-events-none">

        {/* Status Card */}
        {emergency && (
          <div className="w-full max-w-lg premium-card p-6 pointer-events-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest mb-2 inline-block">
                  {emergency.status}
                </span>
                <h2 className="text-2xl font-bold">Emergency Active</h2>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Response time: ~2 mins</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all relative border border-white/10"
                >
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900"></span>
                </button>
              </div>
            </div>

            {driver ? (
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Truck className="w-8 h-8 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Driver Assigned</p>
                  <h3 className="text-lg font-bold">{driver.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-slate-300">{driver.vehicleNo}</span>
                  </div>
                </div>
                <button className="p-3 rounded-xl bg-green-500 hover:bg-green-600 transition-colors">
                  <Phone className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 bg-white/5 rounded-2xl border border-white/5 animate-pulse">
                <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mb-2" />
                <p className="text-sm text-slate-400">Expanding search radius (1km)...</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsEditingLocation(!isEditingLocation)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
              >
                <MapPin className="w-5 h-5" />
                Edit Location
              </button>
              <button className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/30">
                <Shield className="w-5 h-5" />
                SOS Help
              </button>
            </div>
          </div>
        )}

        {/* Initial CTA */}
        {!emergency && (
          <div className="w-full max-w-lg pointer-events-auto">
            <div className="premium-card p-4 mb-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Navigation className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">Current Position</p>
                <p className="text-sm font-bold truncate">Delhi/NCR Region detected</p>
              </div>
              <button
                onClick={() => setIsEditingLocation(true)}
                className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
              >
                Edit
              </button>
            </div>

            <button
              onClick={handleCreateEmergency}
              className="w-full py-6 bg-red-600 hover:bg-red-700 text-white rounded-3xl font-black text-2xl uppercase tracking-tighter flex items-center justify-center gap-4 shadow-2xl shadow-red-600/40 transition-all hover:scale-[1.02] active:scale-[0.98] group"
            >
              <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                🚨
              </span>
              Emergency Help
            </button>
          </div>
        )}
      </div>

      {/* Location Selection Overlay */}
      {isEditingLocation && (
        <div className="absolute inset-x-0 bottom-0 glass-panel p-8 z-30 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Adjust Location</h3>
              <button onClick={() => setIsEditingLocation(false)} className="p-2 hover:bg-black/5 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-slate-500 mb-8 text-sm">Drag the marker on the map to pinpoint the exact location of the accident.</p>
            <button
              onClick={handleUpdateLocation}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/30"
            >
              Confirm New Location
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface Overlay */}
      {showChat && (
        <div className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Live Chat</p>
                  <h3 className="font-bold">Dispatch Control</h3>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                  <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                  <p>No messages yet. Send a note to the driver.</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-3xl ${m.from === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/10'
                      }`}>
                      <p className="text-sm">{m.message}</p>
                      <p className="text-[10px] opacity-50 mt-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  className="p-4 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
