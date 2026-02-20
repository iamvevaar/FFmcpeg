import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Home from './pages/Home.jsx';
import Manual from './pages/Manual.jsx';
import AI from './pages/AI.jsx';
import Settings from './pages/Settings.jsx';
import JobQueue from './components/JobQueue.jsx';
import useJobStore from './stores/useJobStore.js';

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
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <div className="titlebar-drag" />
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
    </HashRouter>
  );
}
