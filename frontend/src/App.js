import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import Nutrition from './pages/Nutrition';
import Progress from './pages/Progress';
import NotesPage from './pages/NotesPage';
import Settings from './pages/Settings';
import PakistaniRecipes from './pages/PakistaniRecipes';
import './App.css';

const TABS = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'workout', label: 'Workout', icon: '💪' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'recipes', label: 'Recipes', icon: '🍛' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
    scheduleReminders();
  }, []);

  const scheduleReminders = () => {
    // Daily reminders via local notifications
    const checkAndNotify = () => {
      const now = new Date();
      const h = now.getHours();
      const lastNotif = localStorage.getItem('last_notif_day');
      const today = now.toDateString();
      if (lastNotif === today) return;
      if (h >= 7 && h < 8) {
        notify('💪 Workout Time!', "Don't forget today's workout!");
        localStorage.setItem('last_notif_day', today);
      }
      if (h >= 8 && h < 9) {
        notify('🏃 Cardio Reminder', 'Get your daily cardio in today!');
      }
    };
    setInterval(checkAndNotify, 60000);
  };

  const notify = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const pages = { dashboard: Dashboard, workout: Workout, nutrition: Nutrition, recipes: PakistaniRecipes, progress: Progress, notes: NotesPage, settings: Settings };
  const Page = pages[tab];

  return (
    <div className="app">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1A2035', color: '#fff', border: '1px solid #00C896' } }} />
      <div className="page-content">
        <Page onNavigate={setTab} />
      </div>
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
