import React, { useState } from 'react';
import { Icons } from './Icons';

export default function PortChecker({ addToast, onKill }) {
  const [port, setPort] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkPort = async () => {
    const portNum = parseInt(port);
    if (!portNum || portNum < 1 || portNum > 65535) {
      addToast('Enter a valid port number (1-65535)', 'error');
      return;
    }

    setChecking(true);
    try {
      const res = await window.portManager.checkPort(portNum);
      if (res.success) {
        setResult({ inUse: res.inUse, data: res.data, port: portNum });
      } else {
        addToast('Check failed: ' + res.error, 'error');
      }
    } catch (err) {
      addToast('Error: ' + err.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') checkPort();
  };

  return (
    <div className="port-checker">
      <div className="page-header" style={{ padding: 0, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Port Checker</h1>
          <p className="page-subtitle">Check if a specific port is in use and see which process is using it</p>
        </div>
      </div>

      <div className="checker-input-group">
        <input
          type="number"
          className="checker-input"
          placeholder="Enter port number (1-65535)"
          value={port}
          onChange={e => setPort(e.target.value)}
          onKeyDown={handleKeyDown}
          min="1"
          max="65535"
        />
        <button className="btn btn-primary" onClick={checkPort} disabled={checking} style={{ padding: '12px 24px' }}>
          {checking ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><Icons.Search /> Check</>}
        </button>
      </div>

      {result && (
        <div className={`checker-result ${result.inUse ? 'in-use' : 'free'}`}>
          <h3>
            {result.inUse
              ? `Port ${result.port} is in use`
              : `Port ${result.port} is available`
            }
          </h3>
          {result.inUse ? (
            <div>
              <p style={{ marginBottom: 12 }}>
                {result.data.length} connection(s) found on this port:
              </p>
              {result.data.map((conn, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 6,
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{conn.processName}</strong>
                    <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>PID: {conn.pid}</span>
                    <span style={{ marginLeft: 8 }}>
                      <span className={`protocol-badge ${conn.protocol.toLowerCase()}`}>{conn.protocol}</span>
                    </span>
                    <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>{conn.state}</span>
                  </div>
                  {conn.pid > 4 && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => onKill(conn.pid, conn.processName)}
                    >
                      Kill
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No processes are currently using this port. It's safe to use.</p>
          )}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Common Ports</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[80, 443, 3000, 3001, 4200, 5000, 5173, 5432, 6379, 8000, 8080, 8443, 27017].map(p => (
            <button
              key={p}
              className="filter-btn"
              onClick={() => { setPort(String(p)); setResult(null); }}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
