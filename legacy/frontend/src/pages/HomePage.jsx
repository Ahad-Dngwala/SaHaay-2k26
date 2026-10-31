import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, User, Shield, UserPlus, LogIn, Phone, ArrowRight, Zap, Globe, Smartphone } from 'lucide-react';
import api from '../config/api';
import toast from 'react-hot-toast';

export default function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedRole, setSelectedRole] = useState('user');

  const handleRegister = async (role) => {
    if (!phone || !name) {
      toast.error('Required fields missing');
      return;
    }
    setLoading(true);
    try {
      const endpoint = role === 'driver' ? '/api/driver/register' : '/api/auth/register';
      const payload = role === 'driver' ? { name, phone, vehicleNo } : { name, phone, role: 'user' };
      const response = await api.post(endpoint, payload);
      if (response.data.success) {
        toast.success('Account Ready!');
        await handleLogin(role);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (role) => {
    if (!phone) return toast.error('Phone required');
    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { phone, role });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('role', role);
        toast.success(`Welcome back, ${response.data.user.name}`);
        navigate(role === 'user' ? '/user' : role === 'driver' ? '/driver' : '/admin');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setIsRegistering(true);
        setSelectedRole(role);
        toast('Account not found. Let\'s set you up!', { icon: '✨' });
      } else {
        toast.error(error.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row items-center justify-center p-6 gap-12 overflow-hidden selection:bg-red-500/30">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Content */}
      <div className="max-w-xl flex-1 z-10 hidden lg:block">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Next-Gen Dispatch</span>
        </div>
        <h1 className="text-7xl font-black text-white leading-tight mb-6 tracking-tighter">
          Rescue<span className="text-red-600">Link</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 leading-relaxed font-medium">
          The world's fastest AI-driven ambulance dispatch ecosystem.
          Real-time tracking, intelligent routing, and zero-latency response.
        </p>

        <div className="grid grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-3xl">
            <Globe className="w-8 h-8 text-blue-500 mb-4" />
            <h3 className="font-bold text-lg">Smart Routing</h3>
            <p className="text-sm text-slate-500 mt-2">Dynamic traffic avoidance and authority notifications.</p>
          </div>
          <div className="glass-panel p-6 rounded-3xl">
            <Smartphone className="w-8 h-8 text-red-500 mb-4" />
            <h3 className="font-bold text-lg">Offline Fallback</h3>
            <p className="text-sm text-slate-500 mt-2">SMS-based dispatching for zero-connectivity zones.</p>
          </div>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-lg z-10 relative">
        <div className="premium-card p-10">
          <div className="text-center mb-10 lg:hidden">
            <h1 className="text-4xl font-black mb-2">RescueLink</h1>
            <p className="text-slate-400">Emergency Response Platform</p>
          </div>

          <div className="flex gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setIsRegistering(false)}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${!isRegistering ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsRegistering(true)}
              className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${isRegistering ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-6">
            {isRegistering && (
              <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 transition-colors group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedRole('user')}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold border transition-all ${selectedRole === 'user' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-black/20 border-white/10 text-slate-500'}`}
                    >
                      <User className="w-5 h-5" /> User
                    </button>
                    <button
                      onClick={() => setSelectedRole('driver')}
                      className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold border transition-all ${selectedRole === 'driver' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-black/20 border-white/10 text-slate-500'}`}
                    >
                      <Truck className="w-5 h-5" /> Driver
                    </button>
                  </div>
                </div>

                {selectedRole === 'driver' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Vehicle License No.</label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                      placeholder="DL-01-AB-1234"
                      className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-blue-500/50 transition-all font-black tracking-widest uppercase text-lg"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-red-500 transition-colors" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-500/50 transition-all font-black text-xl tracking-tighter"
                />
              </div>
            </div>

            <div className="pt-4">
              {isRegistering ? (
                <button
                  onClick={() => handleRegister(selectedRole)}
                  disabled={loading}
                  className={`w-full py-5 rounded-3xl font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${selectedRole === 'driver' ? 'bg-blue-600 shadow-blue-600/30' : 'bg-red-600 shadow-red-600/30'} shadow-2xl`}
                >
                  {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <>Get Started <ArrowRight className="w-6 h-6" /></>}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleLogin('user')}
                    disabled={loading}
                    className="py-5 bg-red-600/10 border border-red-500/50 rounded-3xl font-bold text-red-500 hover:bg-red-600 hover:text-white transition-all"
                  >
                    User Login
                  </button>
                  <button
                    onClick={() => handleLogin('driver')}
                    disabled={loading}
                    className="py-5 bg-blue-600/10 border border-blue-500/50 rounded-3xl font-bold text-blue-500 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    Driver Login
                  </button>
                </div>
              )}
            </div>

            {/* Admin Portal Link */}
            {!isRegistering && (
              <button
                onClick={() => handleLogin('admin')}
                className="w-full py-4 text-slate-500 flex items-center justify-center gap-2 hover:text-slate-300 transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Admin Control Portal</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-center mt-8 text-slate-600 text-xs font-medium">
          By continuing, you agree to the RescueLink Emergency Service Terms of Protocol.
        </p>
      </div>
    </div>
  );
}
