import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Download,
  Activity,
  Ambulance,
  Users,
  Radio,
  FileCheck2,
  Newspaper,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  LogOut,
  ExternalLink,
  Smartphone,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  Car,
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

type Page =
  | 'home'
  | 'download-citizen'
  | 'download-driver'
  | 'privacy'
  | 'terms'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-emergencies'
  | 'admin-fleet'
  | 'admin-drivers'
  | 'admin-citizens'
  | 'admin-updates'
  | 'admin-releases'
  | 'admin-audit';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('sahaay_admin_token'));

  // Admin login credentials
  const [adminEmail, setAdminEmail] = useState('admin@sahaay.gov.in');
  const [adminPassword, setAdminPassword] = useState('SaHaayAdmin2026!');
  const [loginError, setLoginError] = useState('');

  // Overview stats
  const [stats, setStats] = useState({
    activeEmergencies: 0,
    assignedMissions: 0,
    completedMissions: 0,
    totalAmbulances: 25,
    availableAmbulances: 25,
    busyAmbulances: 0,
    verifiedDrivers: 1,
    pendingDrivers: 1,
    registeredCitizens: 1,
  });

  // Data collections
  const [missions, setMissions] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [citizens, setCitizens] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [chainValid, setChainValid] = useState<boolean | null>(null);

  // New post CMS form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('GOVT_ALERT');
  const [newPriority, setNewPriority] = useState('NORMAL');
  const [newBody, setNewBody] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('https://gujhealth.gujarat.gov.in');
  const [newOfficialSource, setNewOfficialSource] = useState('Gujarat Health Directorate');
  const [newIsPinned, setNewIsPinned] = useState(false);

  // Fetch functions
  const fetchOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/overview`);
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.warn('Overview fetch error:', e);
    }
  };

  const fetchMissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/missions`);
      if (res.ok) setMissions(await res.json());
    } catch (e) {
      console.warn('Missions fetch error:', e);
    }
  };

  const fetchAmbulances = async () => {
    try {
      const res = await fetch(`${API_BASE}/ambulances`);
      if (res.ok) setAmbulances(await res.json());
    } catch (e) {
      console.warn('Ambulances fetch error:', e);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/drivers`);
      if (res.ok) setDrivers(await res.json());
    } catch (e) {
      console.warn('Drivers fetch error:', e);
    }
  };

  const fetchCitizens = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/citizens`);
      if (res.ok) setCitizens(await res.json());
    } catch (e) {
      console.warn('Citizens fetch error:', e);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/updates`);
      if (res.ok) setNews(await res.json());
    } catch (e) {
      console.warn('News fetch error:', e);
    }
  };

  const fetchReleases = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/releases`);
      if (res.ok) setReleases(await res.json());
    } catch (e) {
      console.warn('Releases fetch error:', e);
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit`);
      if (res.ok) setAuditLog(await res.json());
      const verifyRes = await fetch(`${API_BASE}/audit/verify`);
      if (verifyRes.ok) {
        const result = await verifyRes.json();
        setChainValid(result.valid);
      }
    } catch (e) {
      console.warn('Audit fetch error:', e);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchNews();
    fetchReleases();
    const interval = setInterval(() => {
      fetchOverview();
      if (page.startsWith('admin-')) {
        fetchMissions();
        fetchAmbulances();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [page]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAdminToken(data.token);
        localStorage.setItem('sahaay_admin_token', data.token);
        setPage('admin-dashboard');
        fetchOverview();
        fetchMissions();
        fetchDrivers();
      } else {
        setLoginError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Network error');
    }
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('sahaay_admin_token');
    setPage('home');
  };

  const handleVerifyDriver = async (driverId: string, approve: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/drivers/${driverId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      });
      if (res.ok) {
        fetchDrivers();
        fetchOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newBody) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          priority: newPriority,
          body: newBody,
          sourceUrl: newSourceUrl,
          officialSource: newOfficialSource,
          isPinned: newIsPinned,
        }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewBody('');
        fetchNews();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/updates/${id}`, { method: 'DELETE' });
      if (res.ok) fetchNews();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickAssign = async (missionId: string) => {
    try {
      await fetch(`${API_BASE}/missions/${missionId}/quick-assign`, { method: 'POST' });
      fetchMissions();
      fetchOverview();
    } catch (e) {
      console.error(e);
    }
  };

  // Nav helper
  const navigateTo = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (p === 'admin-emergencies') fetchMissions();
    if (p === 'admin-fleet') fetchAmbulances();
    if (p === 'admin-drivers') fetchDrivers();
    if (p === 'admin-citizens') fetchCitizens();
    if (p === 'admin-updates') fetchNews();
    if (p === 'admin-releases') fetchReleases();
    if (p === 'admin-audit') fetchAudit();
  };

  return (
    <div className="min-h-screen bg-[#080d15] text-slate-100 flex flex-col font-sans">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0d1422]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateTo('home')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#eb3824] to-[#f97316] flex items-center justify-center shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">SaHaay</span>
              <span className="text-[10px] bg-red-500/20 text-red-400 font-semibold px-2 py-0.5 rounded-full border border-red-500/30">
                108 MESH
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Offline-First Emergency Response Platform</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <button
            onClick={() => navigateTo('home')}
            className={`transition-colors ${page === 'home' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => navigateTo('download-citizen')}
            className={`transition-colors ${page === 'download-citizen' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            Citizen App APK
          </button>
          <button
            onClick={() => navigateTo('download-driver')}
            className={`transition-colors ${page === 'download-driver' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            Driver App APK
          </button>
          <button
            onClick={() => navigateTo('privacy')}
            className={`transition-colors ${page === 'privacy' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            Privacy
          </button>
        </nav>

        <div className="flex items-center space-x-3">
          {adminToken ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateTo('admin-dashboard')}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-all text-white"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Control Room</span>
              </button>
              <button
                onClick={handleAdminLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigateTo('admin-login')}
              className="bg-[#eb3824] hover:bg-[#d42c19] text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-red-500/20 flex items-center space-x-1.5 transition-all text-white"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main Viewport Content ────────────────────────────────────── */}
      <main className="flex-1">
        {/* PUBLIC HOME PAGE */}
        {page === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20 px-6 max-w-6xl mx-auto text-center">
              <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 mb-6 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Ahmedabad Emergency Medical Services Network Active</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
                Offline-First Emergency Response for <span className="text-[#eb3824]">Every Citizen</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                SaHaay eliminates dead zones. When cellular internet fails, SaHaay switches to peer dead-reckoning and
                compressed SMS tokens to ensure 108 ambulance dispatch arrives in minutes.
              </p>

              {/* Action Buttons */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => navigateTo('download-citizen')}
                  className="bg-[#eb3824] hover:bg-[#d42c19] text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-red-600/25 flex items-center space-x-2.5 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Citizen APK</span>
                </button>
                <button
                  onClick={() => navigateTo('download-driver')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white px-7 py-3.5 rounded-xl font-semibold text-sm flex items-center space-x-2.5 transition-all"
                >
                  <Ambulance className="w-4 h-4 text-emerald-400" />
                  <span>Download Driver APK</span>
                </button>
              </div>

              {/* Live Metric Badges */}
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5 text-left">
                  <div className="text-2xl font-black text-white">{stats.availableAmbulances}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Active 108 Ambulances</span>
                  </div>
                </div>
                <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5 text-left">
                  <div className="text-2xl font-black text-amber-400">{stats.activeEmergencies}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Pending Dispatches</span>
                  </div>
                </div>
                <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5 text-left">
                  <div className="text-2xl font-black text-sky-400">{stats.assignedMissions}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span>Missions En Route</span>
                  </div>
                </div>
                <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5 text-left">
                  <div className="text-2xl font-black text-purple-400">&lt; 5 min</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span>Avg Response Time</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Architecture Highlights */}
            <section className="py-16 px-6 bg-[#0c131f] border-t border-slate-800/80">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Three Components, One Synchronized Mission</h2>
                  <p className="text-slate-400 text-sm mt-2">
                    Single source-of-truth mission lifecycle connecting citizens, responders, and state control rooms.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Citizen Card */}
                  <div className="bg-[#131b2a] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between hover:border-red-500/40 transition-all">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-5">
                        <Smartphone className="w-6 h-6 text-[#eb3824]" />
                      </div>
                      <h3 className="text-lg font-bold text-white">SaHaay Citizen App</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Tactile 112 hotline & hold-to-confirm Red SOS. Automatic impact crash detection with 30-second
                        countdown. Approaching ambulance telemetry & official safety updates.
                      </p>
                    </div>
                    <button
                      onClick={() => navigateTo('download-citizen')}
                      className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white flex items-center justify-center space-x-2"
                    >
                      <span>Citizen APK Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Driver Card */}
                  <div className="bg-[#131b2a] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
                        <Ambulance className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">SaHaay Driver App</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Dedicated paramedic interface. Strict state license verification gate. Radar dome availability
                        toggle, atomic first-accept locking, and breakdown replacement dispatch.
                      </p>
                    </div>
                    <button
                      onClick={() => navigateTo('download-driver')}
                      className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white flex items-center justify-center space-x-2"
                    >
                      <span>Driver APK Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Admin Card */}
                  <div className="bg-[#131b2a] border border-slate-800/90 rounded-2xl p-6 flex flex-col justify-between hover:border-sky-500/40 transition-all">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mb-5">
                        <Activity className="w-6 h-6 text-sky-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">State Control Room</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Full situational awareness across Ahmedabad. Real-time emergency monitoring, fleet management,
                        driver credential verification, and tamper-evident SHA-256 audit logging.
                      </p>
                    </div>
                    <button
                      onClick={() => navigateTo('admin-login')}
                      className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white flex items-center justify-center space-x-2"
                    >
                      <span>Admin Control Room</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* CITIZEN APK DOWNLOAD PAGE */}
        {page === 'download-citizen' && (
          <div className="py-14 px-6 max-w-4xl mx-auto">
            <div className="bg-[#101826] border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#eb3824] flex items-center justify-center shadow-lg shadow-red-500/30">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white">SaHaay Citizen</h1>
                    <p className="text-sm text-slate-400 mt-1">Official Android Emergency App</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        v1.0.0 Stable
                      </span>
                      <span className="text-xs text-slate-500">Android 10 (API 29)+</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`${API_BASE}/downloads/SaHaay-Citizen.apk`}
                  download="SaHaay-Citizen.apk"
                  className="bg-[#eb3824] hover:bg-[#d42c19] text-white px-8 py-4 rounded-xl font-bold text-sm shadow-xl shadow-red-500/30 flex items-center justify-center space-x-2 transition-all self-start md:self-auto"
                >
                  <Download className="w-5 h-5" />
                  <span>Download APK (3.4 MB)</span>
                </a>
              </div>

              {/* Release Verification Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
                <div className="bg-[#141e30] p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Application ID</span>
                  <div className="text-sm font-mono font-semibold text-white mt-1">org.sahaay.citizen</div>
                </div>
                <div className="bg-[#141e30] p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Package Signature</span>
                  <div className="text-sm font-mono font-semibold text-emerald-400 mt-1">Signed with v2/v3 Scheme</div>
                </div>
                <div className="bg-[#141e30] p-4 rounded-xl border border-slate-800 md:col-span-2">
                  <span className="text-xs text-slate-400 font-medium">SHA-256 Checksum</span>
                  <div className="text-xs font-mono text-slate-300 mt-1 break-all bg-black/40 p-2.5 rounded-lg border border-slate-800">
                    42426839d481da96f7c8ec17814c810d21650ee409f9f5926ec33c393bc67978
                  </div>
                </div>
              </div>

              {/* Features & Changelog */}
              <div className="mt-8">
                <h3 className="text-base font-bold text-white mb-3">Release Highlights (v1.0.0)</h3>
                <ul className="space-y-2 text-xs md:text-sm text-slate-300">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong>Tactile Dual-Plate SOS:</strong> 112 Government emergency hotline + Red SOS hold-to-confirm
                      to prevent accidental pocket activations.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong>Automatic Crash Detection:</strong> Accelerometer impact spike trigger with safe 30-second
                      countdown before dispatch activation.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong>Ahmedabad Road Telemetry:</strong> High-precision map showing approaching ambulance,
                      driver name, vehicle number, and live ETA.
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>
                      <strong>Official News & Safety Advisories:</strong> State disaster warnings, waterlogging alerts,
                      and medical awareness bulletins.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Install Instructions */}
              <div className="mt-8 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <div className="font-semibold text-white flex items-center space-x-1.5 mb-2">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>Installation Instructions:</span>
                </div>
                <p>
                  1. Tap &apos;Download APK&apos; above. When prompted by your browser, tap &apos;Download anyway&apos;.
                </p>
                <p className="mt-1">
                  2. Open your Android notification bar or Downloads folder, and tap <code>SaHaay-Citizen.apk</code>.
                </p>
                <p className="mt-1">
                  3. If Android prompts &apos;Install unknown apps&apos;, allow permission for Chrome/Files, then complete
                  installation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DRIVER APK DOWNLOAD PAGE */}
        {page === 'download-driver' && (
          <div className="py-14 px-6 max-w-4xl mx-auto">
            <div className="bg-[#101826] border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Ambulance className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white">SaHaay Driver</h1>
                    <p className="text-sm text-slate-400 mt-1">Emergency Responder & Paramedic App</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        v1.0.0 Stable
                      </span>
                      <span className="text-xs text-slate-500">Android 10 (API 29)+</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`${API_BASE}/downloads/SaHaay-Driver.apk`}
                  download="SaHaay-Driver.apk"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all self-start md:self-auto"
                >
                  <Download className="w-5 h-5" />
                  <span>Download APK (3.5 MB)</span>
                </a>
              </div>

              {/* Verification Gate Notice */}
              <div className="mt-8 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl flex items-start space-x-3 text-xs md:text-sm text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-100 block mb-1">State Verification Gate Mandatory:</strong>
                  Driver accounts must be registered with a valid commercial emergency driving license and ambulance
                  registration. Unverified drivers cannot activate on-duty availability or receive emergency dispatch
                  offers until verified by state dispatch controllers.
                </div>
              </div>

              {/* Driver Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
                <div className="bg-[#141e30] p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Application ID</span>
                  <div className="text-sm font-mono font-semibold text-white mt-1">org.sahaay.driver</div>
                </div>
                <div className="bg-[#141e30] p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Verification Status</span>
                  <div className="text-sm font-mono font-semibold text-emerald-400 mt-1">Enforced by Server Gate</div>
                </div>
                <div className="bg-[#141e30] p-4 rounded-xl border border-slate-800 md:col-span-2">
                  <span className="text-xs text-slate-400 font-medium">SHA-256 Checksum</span>
                  <div className="text-xs font-mono text-slate-300 mt-1 break-all bg-black/40 p-2.5 rounded-lg border border-slate-800">
                    33827ecf5ef7fc491e075ad5ff7f6424e4d6a89c894fb2193b2a3fa41f2a3dc2
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRIVACY POLICY */}
        {page === 'privacy' && (
          <div className="py-14 px-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-extrabold text-white mb-6">SaHaay Privacy & Data Minimization Policy</h1>
            <div className="prose prose-invert text-slate-300 text-sm space-y-4">
              <p>
                SaHaay adheres strictly to data minimization standards established under India&apos;s Digital Personal Data
                Protection Act (DPDPA 2023).
              </p>
              <h3 className="text-lg font-bold text-white mt-6">1. Emergency Geolocation</h3>
              <p>
                Patient location is acquired strictly upon emergency activation (manual SOS or confirmed crash detection).
                Location coordinates are transmitted solely to the assigned 108 ambulance driver and state dispatch
                controllers.
              </p>
              <h3 className="text-lg font-bold text-white mt-6">2. Driver Telemetry</h3>
              <p>
                Ambulance location is broadcast only when the driver is on active duty. Drivers who toggle duty status off
                immediately cease location transmission.
              </p>
              <h3 className="text-lg font-bold text-white mt-6">3. Cryptographic Audit Trail</h3>
              <p>
                All mission transitions are signed into a tamper-evident SHA-256 hash chain for official medical response
                audits. Personal health details are never exposed to third parties.
              </p>
            </div>
          </div>
        )}

        {/* ADMIN LOGIN */}
        {page === 'admin-login' && (
          <div className="py-20 px-6 max-w-md mx-auto">
            <div className="bg-[#101826] border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#eb3824] to-[#f97316] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">State Control Room</h1>
                <p className="text-xs text-slate-400 mt-1">Authorized Medical Dispatch Personnel Only</p>
              </div>

              {loginError && (
                <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center space-x-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Official Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Authorization Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 bg-[#eb3824] hover:bg-[#d42c19] text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all"
                >
                  Authenticate Session
                </button>
              </form>

              <div className="mt-6 text-center text-[11px] text-slate-500">
                Default Credentials: <code>admin@sahaay.gov.in</code>
              </div>
            </div>
          </div>
        )}

        {/* AUTHENTICATED ADMIN DASHBOARD / CONTROL ROOM */}
        {page.startsWith('admin-') && page !== 'admin-login' && adminToken && (
          <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-65px)]">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-[#0a101b] border-r border-slate-800 p-4 shrink-0 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase px-3 py-2">Emergency Control</div>
              <button
                onClick={() => navigateTo('admin-dashboard')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-dashboard' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <Activity className="w-4 h-4" />
                <span>Overview & Metrics</span>
              </button>
              <button
                onClick={() => navigateTo('admin-emergencies')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-emergencies' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <Radio className="w-4 h-4" />
                <span>Live Emergencies</span>
              </button>
              <button
                onClick={() => navigateTo('admin-fleet')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-fleet' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <Ambulance className="w-4 h-4" />
                <span>Fleet Management</span>
              </button>

              <div className="text-[11px] font-bold text-slate-500 uppercase px-3 pt-5 pb-2">User & Authority</div>
              <button
                onClick={() => navigateTo('admin-drivers')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-drivers' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Driver Verification</span>
              </button>
              <button
                onClick={() => navigateTo('admin-citizens')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-citizens' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <Users className="w-4 h-4" />
                <span>Citizen Accounts</span>
              </button>

              <div className="text-[11px] font-bold text-slate-500 uppercase px-3 pt-5 pb-2">Publishing & Audit</div>
              <button
                onClick={() => navigateTo('admin-updates')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-updates' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <Newspaper className="w-4 h-4" />
                <span>News & Alerts CMS</span>
              </button>
              <button
                onClick={() => navigateTo('admin-releases')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-releases' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <Download className="w-4 h-4" />
                <span>APK Release Manager</span>
              </button>
              <button
                onClick={() => navigateTo('admin-audit')}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${page === 'admin-audit' ? 'bg-[#eb3824] text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>SHA-256 Audit Trail</span>
              </button>
            </aside>

            {/* Admin Content Area */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
              {/* ADMIN OVERVIEW */}
              {page === 'admin-dashboard' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Emergency Dispatch Control Room</h1>
                      <p className="text-xs text-slate-400 mt-1">Live telemetry across Ahmedabad Municipal Corporation (AMC)</p>
                    </div>
                    <button
                      onClick={fetchOverview}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all"
                      title="Refresh"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5">
                      <span className="text-xs text-slate-400">Active Emergencies</span>
                      <div className="text-3xl font-black text-amber-400 mt-1">{stats.activeEmergencies}</div>
                      <span className="text-[10px] text-slate-500">Searching / Dispatching</span>
                    </div>
                    <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5">
                      <span className="text-xs text-slate-400">En Route Units</span>
                      <div className="text-3xl font-black text-sky-400 mt-1">{stats.assignedMissions}</div>
                      <span className="text-[10px] text-slate-500">Approaching patient</span>
                    </div>
                    <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5">
                      <span className="text-xs text-slate-400">Available Ambulances</span>
                      <div className="text-3xl font-black text-emerald-400 mt-1">{stats.availableAmbulances}</div>
                      <span className="text-[10px] text-slate-500">Ready in Ahmedabad grid</span>
                    </div>
                    <div className="bg-[#101826] border border-slate-800 rounded-2xl p-5">
                      <span className="text-xs text-slate-400">Driver Verifications</span>
                      <div className="text-3xl font-black text-purple-400 mt-1">{stats.pendingDrivers} Pending</div>
                      <span className="text-[10px] text-slate-500">{stats.verifiedDrivers} Verified Active</span>
                    </div>
                  </div>

                  {/* Quick Shortcuts */}
                  <div className="bg-[#101826] border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-4">Command Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigateTo('admin-emergencies')}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Inspect Live Emergencies</span>
                      </button>
                      <button
                        onClick={() => navigateTo('admin-drivers')}
                        className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Review Driver Applications</span>
                      </button>
                      <button
                        onClick={() => navigateTo('admin-updates')}
                        className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2"
                      >
                        <Newspaper className="w-3.5 h-3.5" />
                        <span>Publish Citizen Alert</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* LIVE EMERGENCIES */}
              {page === 'admin-emergencies' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Live Emergency Missions</h1>
                      <p className="text-xs text-slate-400 mt-1">Real-time status of all citizen SOS alerts and crash events</p>
                    </div>
                    <button
                      onClick={fetchMissions}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {missions.length === 0 ? (
                    <div className="bg-[#101826] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                      <Radio className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm font-medium">No active emergencies at this moment.</p>
                      <p className="text-xs text-slate-500 mt-1">When citizens trigger SOS, missions will appear here instantly.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {missions.map((m) => (
                        <div key={m.id} className="bg-[#101826] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                                MID: {m.id}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  m.status === 'SEARCHING' || m.status === 'DISPATCHING'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : m.status === 'ASSIGNED' || m.status === 'ON_SCENE'
                                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {m.status}
                              </span>
                              {m.flags === 1 && (
                                <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full">
                                  CRASH DETECTED
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-2 space-y-1">
                              <div>
                                Patient Coordinates: <code>{m.patientLat?.toFixed(4)}, {m.patientLon?.toFixed(4)}</code>
                              </div>
                              {m.assignedAmbulanceId && (
                                <div className="text-emerald-400">
                                  Assigned Unit: <strong>{m.assignedAmbulanceId}</strong> ({m.assignedDriverName || 'Paramedic'})
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {(m.status === 'SEARCHING' || m.status === 'DISPATCHING') && (
                              <button
                                onClick={() => handleQuickAssign(m.id)}
                                className="bg-[#eb3824] hover:bg-[#d42c19] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                              >
                                Manual Assign
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FLEET MANAGEMENT */}
              {page === 'admin-fleet' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">108 Ambulance Fleet</h1>
                      <p className="text-xs text-slate-400 mt-1">Vehicle status, current coordinates, and operating zones across Ahmedabad</p>
                    </div>
                    <button onClick={fetchAmbulances} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ambulances.map((a) => (
                      <div key={a.id} className="bg-[#101826] border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">{a.id}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              a.status === 'AVAILABLE'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : a.status === 'OFFLINE'
                                ? 'bg-slate-700 text-slate-400'
                                : 'bg-sky-500/20 text-sky-400'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <div className="mt-3 text-xs text-slate-300">
                          <div className="font-semibold text-white">{a.driverName}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{a.vehicleNo}</div>
                          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Zone: {a.zone}</span>
                            <span>Speed: {a.speedKmh} km/h</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DRIVER VERIFICATION */}
              {page === 'admin-drivers' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Driver Credential Verification</h1>
                      <p className="text-xs text-slate-400 mt-1">Approve or reject paramedic commercial licenses before duty activation</p>
                    </div>
                    <button onClick={fetchDrivers} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {drivers.map((d) => (
                      <div key={d.id} className="bg-[#101826] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm">{d.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                d.isVerified
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {d.isVerified ? 'VERIFIED' : 'PENDING APPROVAL'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-2 space-y-0.5">
                            <div>Phone: <code>{d.phone}</code></div>
                            <div>Driving License: <code>{d.licenseNo}</code></div>
                            <div>Vehicle No: <code>{d.vehicleNo}</code> ({d.ambulanceType || 'BLS'})</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {!d.isVerified ? (
                            <>
                              <button
                                onClick={() => handleVerifyDriver(d.id, true)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                              >
                                Approve License
                              </button>
                              <button
                                onClick={() => handleVerifyDriver(d.id, false)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3.5 py-2 rounded-xl transition-all"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleVerifyDriver(d.id, false)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Revoke Verification
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CITIZEN ACCOUNTS */}
              {page === 'admin-citizens' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Registered Citizens</h1>
                      <p className="text-xs text-slate-400 mt-1">Citizen medical profiles and emergency contact rosters</p>
                    </div>
                    <button onClick={fetchCitizens} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {citizens.map((c) => (
                      <div key={c.id} className="bg-[#101826] border border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{c.name}</span>
                          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            Blood: {c.bloodGroup || 'O+'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                          <div>Phone: {c.phone}</div>
                          {c.medicalNotes && <div className="text-amber-300/80">Notes: {c.medicalNotes}</div>}
                          <div className="pt-2 text-slate-500">
                            Emergency Contacts: {c.emergencyContacts?.length || 0} configured
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NEWS & UPDATES CMS */}
              {page === 'admin-updates' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Government News & Alerts CMS</h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Published posts feed directly to Citizen Updates screen (Reference 04)
                    </p>
                  </div>

                  {/* Create New Post Form */}
                  <div className="bg-[#101826] border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Create Official Emergency Advisory</span>
                    </h3>
                    <form onSubmit={handleCreatePost} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Headline</label>
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="e.g. Flash Flood Alert in Navrangpura"
                            className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Category</label>
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="GOVT_ALERT">Government Alert</option>
                            <option value="ROAD_SAFETY">Road Safety</option>
                            <option value="DISASTER_PREP">Disaster Preparedness</option>
                            <option value="HEALTH_BULLETIN">Health Bulletin</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Priority</label>
                          <select
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value)}
                            className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="CRITICAL">Critical (Red Banner)</option>
                            <option value="HIGH">High</option>
                            <option value="NORMAL">Normal</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Body Text</label>
                        <textarea
                          value={newBody}
                          onChange={(e) => setNewBody(e.target.value)}
                          rows={3}
                          placeholder="Detailed instructions for citizens and emergency units..."
                          className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Official Source Name</label>
                          <input
                            type="text"
                            value={newOfficialSource}
                            onChange={(e) => setNewOfficialSource(e.target.value)}
                            className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Source URL</label>
                          <input
                            type="url"
                            value={newSourceUrl}
                            onChange={(e) => setNewSourceUrl(e.target.value)}
                            className="w-full bg-[#141e30] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newIsPinned}
                            onChange={(e) => setNewIsPinned(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-700"
                          />
                          <span>Pin to top of Citizen feed</span>
                        </label>
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Publish to Citizen Apps
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Existing Posts */}
                  <div className="space-y-3">
                    {news.map((item) => (
                      <div key={item.id} className="bg-[#101826] border border-slate-800 rounded-2xl p-5 flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{item.title}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                              {item.category}
                            </span>
                            {item.isPinned && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                PINNED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-2">{item.body}</p>
                          <div className="text-[10px] text-slate-500 mt-2 flex items-center space-x-3">
                            <span>Source: {item.officialSource}</span>
                            <span>•</span>
                            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                              Official Link
                            </a>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeletePost(item.id)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* APK RELEASE MANAGER */}
              {page === 'admin-releases' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">APK Release Management</h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Cryptographic checksums and public distribution downloads
                    </p>
                  </div>

                  <div className="space-y-4">
                    {releases.map((rel) => (
                      <div key={rel.id} className="bg-[#101826] border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rel.appType === 'citizen' ? 'bg-[#eb3824]' : 'bg-emerald-600'}`}>
                              {rel.appType === 'citizen' ? <Smartphone className="w-5 h-5 text-white" /> : <Ambulance className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-white capitalize">{rel.appType} APK</h3>
                              <p className="text-xs text-slate-400">{rel.fileName} • v{rel.versionName}</p>
                            </div>
                          </div>
                          <a
                            href={`${API_BASE}${rel.downloadUrl}`}
                            download={rel.fileName}
                            className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white px-4 py-2 rounded-xl flex items-center space-x-2"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download ({Math.round(rel.fileSize / 1024 / 1024 * 10) / 10} MB)</span>
                          </a>
                        </div>

                        <div className="mt-4 bg-black/40 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 break-all">
                          SHA-256: {rel.sha256}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHA-256 AUDIT LOG VIEWER */}
              {page === 'admin-audit' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Tamper-Evident SHA-256 Audit Trail</h1>
                      <p className="text-xs text-slate-400 mt-1">Cryptographic hash chain logging every mission transition</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {chainValid !== null && (
                        <span
                          className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center space-x-1.5 ${
                            chainValid
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {chainValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{chainValid ? 'Cryptographic Chain Valid' : 'Integrity Compromised'}</span>
                        </span>
                      )}
                      <button onClick={fetchAudit} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#101826] border border-slate-800 rounded-2xl p-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="pb-3 pl-2">#</th>
                          <th className="pb-3">Timestamp</th>
                          <th className="pb-3">Event</th>
                          <th className="pb-3">SHA-256 Hash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {auditLog.map((entry) => (
                          <tr key={entry.index} className="hover:bg-slate-900/50">
                            <td className="py-2.5 pl-2 font-mono text-slate-500">{entry.index}</td>
                            <td className="py-2.5 text-slate-400">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 font-bold text-white">{entry.event}</td>
                            <td className="py-2.5 font-mono text-xs text-slate-400">
                              {entry.hash.slice(0, 16)}...{entry.hash.slice(-8)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-[#090e17] border-t border-slate-800/80 px-6 py-6 text-center text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-6 mb-3">
          <button onClick={() => navigateTo('home')} className="hover:text-slate-300">Overview</button>
          <button onClick={() => navigateTo('download-citizen')} className="hover:text-slate-300">Citizen App APK</button>
          <button onClick={() => navigateTo('download-driver')} className="hover:text-slate-300">Driver App APK</button>
          <button onClick={() => navigateTo('privacy')} className="hover:text-slate-300">Privacy Policy</button>
        </div>
        <p>© 2026-2027 SaHaay Emergency Medical Services • Hack for Social Cause 2027</p>
      </footer>
    </div>
  );
}

