import React from 'react';
import { Icons } from './Icons';

export default function Sidebar({ page, setPage, systemInfo, connectionCount, theme, onToggleTheme }) {
  const formatBytes = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + ' GB';
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-label">Navigation</div>
        <button
          className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          <Icons.Dashboard />
          Dashboard
        </button>
        <button
          className={`nav-item ${page === 'checker' ? 'active' : ''}`}
          onClick={() => setPage('checker')}
        >
          <Icons.PortCheck />
          Port Checker
        </button>

        <div className="sidebar-label">Preferences</div>
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>

      {systemInfo && (
        <div className="sidebar-footer">
          <div className="system-info-mini">
            <span><Icons.Cpu /> {systemInfo.hostname}</span>
            <span style={{ paddingLeft: 24, fontSize: 10 }}>
              {systemInfo.cpus} cores / {formatBytes(systemInfo.totalMemory)} RAM
            </span>
            <span style={{ paddingLeft: 24, fontSize: 10 }}>
              Uptime: {formatUptime(systemInfo.uptime)}
            </span>
            <span style={{ paddingLeft: 24, fontSize: 10 }}>
              {connectionCount} active connections
            </span>
          </div>
          <div className="made-by">crafted by GG</div>
        </div>
      )}
    </div>
  );
}
