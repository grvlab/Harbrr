import React, { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PortChecker from './components/PortChecker';
import Toast from './components/Toast';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5);
  const [toasts, setToasts] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('pm-theme') || 'dark');
  const intervalRef = useRef(null);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pm-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const fetchConnections = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setRefreshing(true);
      const result = await window.portManager.getConnections();
      if (result.success) {
        setConnections(result.data);
      } else {
        addToast('Failed to fetch connections: ' + result.error, 'error');
      }
    } catch (err) {
      addToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  const killProcess = useCallback(async (pid, processName) => {
    try {
      const result = await window.portManager.killProcess(pid);
      if (result.success) {
        addToast(`Killed process ${processName} (PID: ${pid})`, 'success');
        setTimeout(() => fetchConnections(), 500);
      } else {
        addToast(`Failed to kill process: ${result.error}`, 'error');
      }
    } catch (err) {
      addToast('Error: ' + err.message, 'error');
    }
  }, [addToast, fetchConnections]);

  useEffect(() => {
    fetchConnections(true);
    window.portManager.getSystemInfo().then(setSystemInfo);
  }, [fetchConnections]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchConnections(), autoRefreshInterval * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, autoRefreshInterval, fetchConnections]);

  return (
    <div className="app-layout">
      <TitleBar />
      <div className="app-content">
        <Sidebar
          page={page}
          setPage={setPage}
          systemInfo={systemInfo}
          connectionCount={connections.length}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="main-content">
          {page === 'dashboard' && (
            <Dashboard
              connections={connections}
              loading={loading}
              refreshing={refreshing}
              onRefresh={() => fetchConnections()}
              onKill={killProcess}
              autoRefresh={autoRefresh}
              setAutoRefresh={setAutoRefresh}
              autoRefreshInterval={autoRefreshInterval}
              setAutoRefreshInterval={setAutoRefreshInterval}
              addToast={addToast}
            />
          )}
          {page === 'checker' && (
            <PortChecker addToast={addToast} onKill={killProcess} />
          )}
        </main>
      </div>
      <Toast toasts={toasts} />
    </div>
  );
}
