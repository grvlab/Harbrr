import React from 'react';
import { Icons } from './Icons';

export default function DetailPanel({ conn, onClose, onKill, onCopy }) {
  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h3>Connection Details</h3>
        <button className="action-btn" onClick={onClose}>
          <Icons.Close />
        </button>
      </div>

      <div className="detail-section">
        <h4>Process</h4>
        <div className="detail-row">
          <span className="label">Name</span>
          <span className="value">{conn.processName}</span>
        </div>
        <div className="detail-row">
          <span className="label">PID</span>
          <span className="value">{conn.pid}</span>
        </div>
        <div className="detail-row">
          <span className="label">Protocol</span>
          <span className="value">{conn.protocol}</span>
        </div>
      </div>

      <div className="detail-section">
        <h4>Local Endpoint</h4>
        <div className="detail-row">
          <span className="label">Address</span>
          <span className="value">{conn.localAddress}</span>
        </div>
        <div className="detail-row">
          <span className="label">Port</span>
          <span className="value">{conn.localPort}</span>
        </div>
      </div>

      <div className="detail-section">
        <h4>Remote Endpoint</h4>
        <div className="detail-row">
          <span className="label">Address</span>
          <span className="value">{conn.foreignAddress}</span>
        </div>
        <div className="detail-row">
          <span className="label">Port</span>
          <span className="value">{conn.foreignPort || '*'}</span>
        </div>
      </div>

      <div className="detail-section">
        <h4>State</h4>
        <div className="detail-row">
          <span className="label">Status</span>
          <span className="value">{conn.state || '-'}</span>
        </div>
      </div>

      <div className="detail-section" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={() => onCopy(`${conn.localAddress}:${conn.localPort}`)}
          style={{ flex: 1 }}
        >
          <Icons.Copy /> Copy Address
        </button>
        {conn.pid > 4 && (
          <button
            className="btn btn-danger"
            onClick={() => onKill(conn.pid, conn.processName)}
            style={{ flex: 1 }}
          >
            <Icons.Kill /> Kill Process
          </button>
        )}
      </div>
    </div>
  );
}
