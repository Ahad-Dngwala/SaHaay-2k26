/**
 * mobile-app/src/App.tsx
 * SaHaay Unified Emergency Mobile App — clean routing with no fake device chrome.
 * Removed: RoleSwitcherPill, FloatingCapsuleNav, fake status-bar, phone bezel wrapper.
 * Each screen fills 100dvh directly; modals overlay on top of whatever screen is active.
 */

import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { CitizenSosScreen } from './screens/citizen/CitizenSosScreen';
import { CitizenTrackingScreen } from './screens/citizen/CitizenTrackingScreen';
import { DriverDispatchScreen } from './screens/driver/DriverDispatchScreen';
import { CrashCountdownModal } from './components/citizen/CrashCountdownModal';
import { CallModal } from './components/citizen/CallModal';
import { MessageModal } from './components/citizen/MessageModal';
import { ReportBreakdownModal } from './components/driver/ReportBreakdownModal';

type View = 'sos' | 'tracking' | 'driver';

const AppContent: React.FC = () => {
  const [view, setView] = useState<View>('sos');

  const onNavigate = (v: View) => setView(v);

  return (
    <div style={{ width: '100%', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {view === 'sos'      && <CitizenSosScreen      onNavigate={onNavigate} />}
      {view === 'tracking' && <CitizenTrackingScreen  onNavigate={onNavigate} />}
      {view === 'driver'   && <DriverDispatchScreen   onNavigate={onNavigate} />}

      {/* Modals overlay on top of any active screen */}
      <CrashCountdownModal />
      <CallModal />
      <MessageModal />
      <ReportBreakdownModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
