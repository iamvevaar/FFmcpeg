import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import Home from './pages/Home.jsx';
import Manual from './pages/Manual.jsx';
import AI from './pages/AI.jsx';
import Settings from './pages/Settings.jsx';
import JobQueue from './components/JobQueue.jsx';
import useJobStore from './stores/useJobStore.js';

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettingsPage = location.pathname === '/settings';

  return (
    <div className="app-shell">
      <div className="main-content">
        <div className="app-topbar">
          <div className="topbar-drag-fill" />
          <button
            type="button"
            className={`topbar-btn${isSettingsPage ? ' active' : ''}`}
            onClick={() => navigate('/settings')}
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon size={16} />
            <span>Settings</span>
          </button>
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/manual" element={<Manual />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <JobQueue />
    </div>
  );
}

export default function App() {
  const { updateJob } = useJobStore();

  useEffect(() => {
    // Subscribe to FFmpeg progress events from main process
    const unsubscribe = window.ffmcp?.onProgress((data) => {
      const { jobId, type, percent, timemark } = data;
      if (type === 'progress') {
        updateJob(jobId, { status: 'running', progress: percent || 0, timemark: timemark || '' });
      }
    });
    return () => unsubscribe?.();
  }, [updateJob]);

  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
