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
  { id: 'dashboard', label: 'Home', icon: 'HM' },
  { id: 'workout', label: 'Workout', icon: 'WK' },
  { id: 'nutrition', label: 'Nutrition', icon: 'NT' },
  { id: 'recipes', label: 'Recipes', icon: 'RC' },
  { id: 'progress', label: 'Progress', icon: 'PG' },
  { id: 'notes', label: 'Notes', icon: 'NT' },
  { id: 'settings', label: 'Settings', icon: 'ST' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
    scheduleReminders();
  }, []);

  const scheduleReminders = () => {
    const checkAndNotify = () => {
      const now = new Date();
      const h = now.getHours();
      const lastNotif = localStorage.getItem('last_notif_day');
      const today = now.toDateString();
      if (lastNotif === today) return;
      if (h >= 7 && h < 8) {
        notify('Workout Time', "Don't forget today's workout.");
        localStorage.setItem('last_notif_day', today);
      }
      if (h >= 8 && h < 9) {
        notify('Cardio Reminder', 'Get your daily cardio in today.');
      }
    };
    setInterval(checkAndNotify, 60000);
  };

  const notify = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  const navigate = (id) => {
    setTab(id);
    setSidebarOpen(false);
  };

  const pages = {
    dashboard: Dashboard,
    workout: Workout,
    nutrition: Nutrition,
    recipes: PakistaniRecipes,
    progress: Progress,
    notes: NotesPage,
    settings: Settings,
  };
  const Page = pages[tab];
  const currentTab = TABS.find(t => t.id === tab);

  return (
    <div className="app">
      <Toaster position="top-center" toastOptions={{ style: { background: '#FFFFFF', color: '#0F172A', border: '1px solid #DDE6F0', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', fontFamily: "'Plus Jakarta Sans', sans-serif" } }} />

      {/* Top bar */}
      <div className="top-bar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        <div className="top-bar-logo">Fit<span>Track</span></div>
        <div className="top-bar-page">{currentTab?.label}</div>
      </div>

      {/* Sidebar overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-text">Fit<span>Track</span></div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`sidebar-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => navigate(t.id)}
            >
              <span className="sidebar-item-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>FitTrack · Track your gains</span>
        </div>
      </div>

      <div className="page-content">
        <Page onNavigate={navigate} />
      </div>
    </div>
  );
}
