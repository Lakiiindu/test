import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: 'reports' | 'backup' | 'logs') => void;
}

export default function Header({ currentView, onViewChange }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_read', false);

        setUnreadCount(data?.length || 0);
      }
    };

    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'reports', label: 'Reports' },
    { id: 'backup', label: 'Backup & Restore' },
    { id: 'logs', label: 'Logs & Notifications' }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-700">Notifications:</span>
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {unreadCount}
              </span>
            </div>
          )}
        </div>

        <nav className="flex gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
