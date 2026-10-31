import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import {
  AlertCircle, MapPin, Clock, Check, X, Navigation,
  RefreshCw, Truck, Radio, MessageSquare,
  Phone, Shield, Zap, AlertTriangle, LogOut
} from 'lucide-react';
import api from '../config/api';
import { connectSocket } from '../utils/socket';
import toast from 'react-hot-toast';

const mapContainerStyle = {
  width: '100%',
  height: '100vh',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] }
  ]
};

export default function DriverApp() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [driver, setDriver] = useState(null);
  const [emergency, setEmergency] = useState(null);
  const [directions, setDirections] = useState(null);
  const [status, setStatus] = useState('offline');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const locationIntervalRef = useRef(null);

  useEffect(() => {
    loadDriverProfile();
    startLocationTracking();
    const token = localStorage.getItem('token');
    socketRef.current = connectSocket(token);

    return () => {
      if (locationIntervalRef.current) navigator.geolocation.clearWatch(locationIntervalRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!driver || !socketRef.current) return;
    const socket = socketRef.current;
    const driverId = driver.id || driver._id;

    socket.emit('driver:join', { driverId });

    socket.on(`driver:${driverId}:request`, (data) => {
      setActiveRequest(data);
      setShowRequestModal(true);
    });

    socket.on('emergency:assigned', (data) => {
      if (activeRequest?.emergencyId === data.emergencyId) {
        setShowRequestModal(false);
        setActiveRequest(null);
      }
    });

    socket.on(`message:${emergency?._id || emergency?.id}`, (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      socket.off(`driver:${driverId}:request`);
      socket.off('emergency:assigned');
      socket.off(`message:${emergency?._id || emergency?.id}`);
    };
  }, [driver, activeRequest, emergency]);

  useEffect(() => {
    if (showChat) scrollToBottom();
  }, [messages, showChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadDriverProfile = async () => {
    try {
      const response = await api.get('/api/driver/me');
      if (response.data.success) {
        setDriver(response.data.driver);
        setStatus(response.data.driver.status);

        // If busy, fetch active emergency
        if (response.data.driver.status === 'busy') {
          const assignmentsResponse = await api.get('/api/driver/me/assignments');
          const active = assignmentsResponse.data.assignments.find(a => a.status === 'accepted');
          if (active && active.emergencyId) {
            setEmergency(active.emergencyId);
            loadRoute(location || defaultCenter, { lat: active.emergencyId.lat, lng: active.emergencyId.lng });
            // Load messages
            const details = await api.get(`/api/emergency/${active.emergencyId._id}`);
            setMessages(details.data.messages || []);
          }
        }
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      navigate('/');
    }
  };

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      locationIntervalRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setLocation(newLoc);
          updateBackendLocation(newLoc);
        },
        null,
        { enableHighAccuracy: true }
      );
    }
  };

  const updateBackendLocation = async (loc) => {
    try {
      await api.post('/api/driver/location', {
        lat: loc.lat,
        lng: loc.lng,
        emergencyId: emergency?._id || emergency?.id
      });
      if (socketRef.current && driver) {
        socketRef.current.emit('location', {
          driverId: driver._id || driver.id,
          lat: loc.lat,
          lng: loc.lng,
          emergencyId: emergency?._id || emergency?.id
        });
      }
    } catch (e) { }
  };

  const handleAccept = async (emergencyId) => {
    try {
      toast.loading('Accepting request...', { id: 'accepting' });
      const response = await api.post('/api/driver/accept', { emergencyId });
      if (response.data.success) {
        toast.dismiss('accepting');
        setEmergency(response.data.emergency);
        setStatus('busy');
        setShowRequestModal(false);
        loadRoute(location, { lat: response.data.emergency.lat, lng: response.data.emergency.lng });
      }
    } catch (e) {
      toast.dismiss('accepting');
      toast.error('Could not accept request');
    }
  };

  const loadRoute = async (origin, destination) => {
    if (!window.google) return;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') setDirections(result);
      }
    );
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!emergency) return;
      const id = emergency._id || emergency.id;
      await api.patch(`/api/emergency/${id}/status`, { status: newStatus });
      toast.success(`Status: ${newStatus.toUpperCase()}`);
      if (newStatus === 'completed') {
        setEmergency(null);
        setDirections(null);
        setStatus('available');
      } else {
        const updated = { ...emergency, status: newStatus };
        setEmergency(updated);
      }
    } catch (e) {
      toast.error('Status update failed');
    }
  };

  const handleTransfer = async () => {
    if (!transferReason.trim()) return toast.error('Reason required');
    try {
      await api.post('/api/emergency/transfer', {
        emergencyId: emergency._id || emergency.id,
        reason: transferReason
      });
      toast.success('Emergency transferred');
      setEmergency(null);
      setDirections(null);
      setShowTransferModal(false);
      setTransferReason('');
      setStatus('available');
    } catch (e) {
      toast.error('Transfer failed');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !emergency) return;
    try {
      const eId = emergency._id || emergency.id;
      await api.post(`/api/emergency/${eId}/message`, { message: newMessage });
      setNewMessage('');
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  if (loading) return (
    <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
      <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="relative h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
      <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={location || defaultCenter}
          zoom={15}
          options={mapOptions}
        >
          {location && <Marker position={location} icon={{ path: 'M 12 2 C 7.03 2 3 6.03 3 11 C 3 16.55 12 22 12 22 C 12 22 21 16.55 21 11 C 21 6.03 16.97 2 12 2 Z', fillColor: '#3b82f6', fillOpacity: 1, strokeWeight: 2, strokeColor: '#ffffff', scale: 1.5 }} />}
          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
        </GoogleMap>
      </LoadScript>

      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
        <div className="glass-panel p-3 px-5 rounded-full flex items-center gap-4 pointer-events-auto">
          <div className={`w-3 h-3 rounded-full ${status === 'available' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">{driver.name}</h2>
            <p className="text-[10px] text-slate-400">{driver.vehicleNo} • {status.toUpperCase()}</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="glass-panel p-3 rounded-2xl hover:bg-white/10 transition-colors pointer-events-auto">
          <LogOut className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {emergency ? (
        <div className="absolute bottom-10 left-6 right-6 z-30 pointer-events-none">
          <div className="max-w-xl mx-auto premium-card p-6 pointer-events-auto border-t-4 border-blue-500">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase mb-2 inline-block">Active Mission</span>
                <h3 className="text-xl font-bold">Accident Response</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowChat(true)} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </button>
                <button onClick={() => setShowTransferModal(true)} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                <p className="text-sm font-bold capitalize">{emergency.status}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Response</p>
                <p className="text-sm font-bold">Priority 1</p>
              </div>
            </div>

            <div className="space-y-3">
              {emergency.status === 'assigned' && (
                <button onClick={() => handleStatusUpdate('reached')} className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all">
                  <Check className="w-6 h-6" /> Mark as Reached Location
                </button>
              )}
              {emergency.status === 'reached' && (
                <button onClick={() => handleStatusUpdate('enroute')} className="w-full py-4 bg-orange-500 hover:bg-orange-600 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all">
                  <Truck className="w-6 h-6" /> Enroute to Hospital
                </button>
              )}
              {emergency.status === 'enroute' && (
                <button onClick={() => handleStatusUpdate('hospital')} className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all">
                  <Shield className="w-6 h-6" /> Reached Hospital
                </button>
              )}
              {emergency.status === 'hospital' && (
                <button onClick={() => handleStatusUpdate('completed')} className="w-full py-4 bg-slate-700 hover:bg-slate-800 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all">
                  <Check className="w-6 h-6" /> Complete Mission
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-10 left-6 right-6 z-30 pointer-events-none">
          <div className="max-w-xl mx-auto bg-slate-900/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 pointer-events-auto text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-3xl mx-auto flex items-center justify-center mb-6">
              <Radio className={`w-10 h-10 ${status === 'available' ? 'text-blue-500 animate-pulse' : 'text-slate-600'}`} />
            </div>
            <h3 className="text-2xl font-black mb-2">Scanning for Signals</h3>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setStatus('available')} className={`flex-1 py-4 rounded-3xl font-bold transition-all ${status === 'available' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-white/5 border border-white/10 text-slate-400'}`}>Go Online</button>
              <button onClick={() => setStatus('offline')} className={`flex-1 py-4 rounded-3xl font-bold transition-all ${status === 'offline' ? 'bg-slate-700 text-white shadow-xl' : 'bg-white/5 border border-white/10 text-slate-400'}`}>Offline</button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 rounded-[32px] p-8 border border-white/10">
            <h3 className="text-xl font-bold mb-2">Transfer Emergency</h3>
            <textarea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Enter transfer reason..." className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500/50 transition-colors mb-6 mt-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowTransferModal(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleTransfer} className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/20">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showRequestModal && activeRequest && (
        <div className="absolute inset-0 z-[110] bg-red-600/20 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-slate-900 rounded-[48px] p-10 border-2 border-red-500 shadow-2xl pulse-red">
            <div className="w-24 h-24 bg-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-14 h-14 text-white animate-bounce" />
            </div>
            <h2 className="text-4xl font-black text-center mb-2 tracking-tighter uppercase">Emergency</h2>
            <p className="text-center text-slate-400 mb-8 font-medium">Critical Accident Detected • {activeRequest.distance}m away</p>
            <div className="flex gap-4">
              <button onClick={() => setShowRequestModal(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-slate-400">Skip</button>
              <button onClick={() => handleAccept(activeRequest.emergencyId)} className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-red-600/40">ACCEPT</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface Overlay */}
      {showChat && (
        <div className="absolute inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 h-full shadow-2xl flex flex-col border-l border-white/10 slide-in-from-right animate-in duration-500">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Live Chat</p>
                  <h3 className="font-bold">Patient Coordination</h3>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.from === 'driver' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-3xl ${m.from === 'driver' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/10'}`}>
                    <p className="text-sm">{m.message}</p>
                    <p className="text-[10px] opacity-50 mt-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Send a message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <button onClick={sendMessage} className="p-4 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                  <Navigation className="w-6 h-6 rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
