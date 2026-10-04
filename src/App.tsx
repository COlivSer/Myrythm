import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthScreen } from '@/components/AuthScreen';
import { BottomNav, type TabKey } from '@/components/BottomNav';
import { TodayScreen } from '@/screens/TodayScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { ToolkitScreen } from '@/screens/ToolkitScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { QuickCheckIn } from '@/components/QuickCheckIn';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function AppContent() {
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<TabKey>('today');
  const [toolkitCategory, setToolkitCategory] = useState<string | null>(null);
  const [showQuickCheckIn, setShowQuickCheckIn] = useState(false);

  useEffect(() => {
    if (tab !== 'toolkit') setToolkitCategory(null);
  }, [tab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'checkin') {
      setShowQuickCheckIn(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container">
      {tab === 'today' && (
        <TodayScreen
          onOpenToolkit={(cat) => { setToolkitCategory(cat); setTab('toolkit'); }}
          onLogged={() => {}}
        />
      )}
      {tab === 'calendar' && <CalendarScreen />}
      {tab === 'insights' && <InsightsScreen />}
      {tab === 'toolkit' && <ToolkitScreen initialCategory={toolkitCategory} />}
      {tab === 'settings' && <SettingsScreen />}
      <BottomNav active={tab} onChange={setTab} />

      {showQuickCheckIn && (
        <QuickCheckIn onComplete={() => setShowQuickCheckIn(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
