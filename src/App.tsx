import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import ReportsView from './components/ReportsView';
import BackupView from './components/BackupView';
import LogsView from './components/LogsView';

type View = 'reports' | 'backup' | 'logs';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('reports');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
      setLoading(false);
    };

    getSession();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} onViewChange={setCurrentView} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentView === 'reports' && <ReportsView userId={userId} />}
        {currentView === 'backup' && <BackupView userId={userId} />}
        {currentView === 'logs' && <LogsView userId={userId} />}
      </main>
    </div>
  );
}
