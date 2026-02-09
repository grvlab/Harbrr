import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import DetailPanel from './DetailPanel';
import ConfirmModal from './ConfirmModal';

const COLUMNS = [
  { id: 'protocol', label: 'Protocol', field: 'protocol' },
  { id: 'localPort', label: 'Local Port', field: 'localPort' },
  { id: 'localAddress', label: 'Local Address', field: 'localAddress' },
  { id: 'foreignAddress', label: 'Remote Address', field: 'foreignAddress' },
  { id: 'foreignPort', label: 'Remote Port', field: 'foreignPort' },
  { id: 'state', label: 'State', field: 'state' },
  { id: 'pid', label: 'PID', field: 'pid' },
  { id: 'processName', label: 'Process', field: 'processName' },
];

const DEFAULT_VISIBLE = ['protocol', 'localPort', 'localAddress', 'foreignAddress', 'foreignPort', 'state', 'pid', 'processName'];

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function getProcessColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Dashboard({
  connections, loading, refreshing, onRefresh, onKill,
  autoRefresh, setAutoRefresh, autoRefreshInterval, setAutoRefreshInterval,
  addToast,
}) {
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [sortField, setSortField] = useState('localPort');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const [detailConn, setDetailConn] = useState(null);
  const [confirmKill, setConfirmKill] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem('pm-visible-cols');
      return saved ? JSON.parse(saved) : DEFAULT_VISIBLE;
    } catch { return DEFAULT_VISIBLE; }
  });
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const contextRef = useRef(null);
  const colPickerRef = useRef(null);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Close column picker on click outside
  useEffect(() => {
    const handler = (e) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) {
        setColPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleColumn = (colId) => {
    setVisibleCols(prev => {
      const next = prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId];
      if (next.length === 0) return prev; // prevent hiding all
      localStorage.setItem('pm-visible-cols', JSON.stringify(next));
      return next;
    });
  };

  const isColVisible = (colId) => visibleCols.includes(colId);

  const stats = useMemo(() => {
    const listening = connections.filter(c => c.state === 'LISTENING').length;
    const established = connections.filter(c => c.state === 'ESTABLISHED').length;
    const uniquePorts = new Set(connections.filter(c => c.state === 'LISTENING').map(c => c.localPort)).size;
    const uniqueProcesses = new Set(connections.map(c => c.pid)).size;
    return { total: connections.length, listening, established, uniquePorts, uniqueProcesses };
  }, [connections]);

  const filtered = useMemo(() => {
    let result = connections;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.localPort.includes(q) ||
        c.foreignPort.includes(q) ||
        c.processName.toLowerCase().includes(q) ||
        String(c.pid).includes(q) ||
        c.localAddress.toLowerCase().includes(q) ||
        c.foreignAddress.toLowerCase().includes(q)
      );
    }

    if (protocolFilter !== 'ALL') {
      result = result.filter(c => c.protocol === protocolFilter);
    }

    if (stateFilter !== 'ALL') {
      result = result.filter(c => c.state === stateFilter);
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'localPort' || sortField === 'foreignPort' || sortField === 'pid') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [connections, search, protocolFilter, stateFilter, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((_, i) => i)));
    }
  };

  const handleBulkKill = () => {
    const pids = new Set();
    selected.forEach(idx => {
      const conn = filtered[idx];
      if (conn && conn.pid > 0) pids.add(conn.pid);
    });
    if (pids.size > 0) {
      setConfirmKill({
        pids: [...pids],
        message: `Kill ${pids.size} process(es)? This will terminate all selected processes.`,
      });
    }
  };

  const handleContextMenu = (e, conn) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, conn });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard', 'success');
  };

  const exportCsv = () => {
    const activeCols = COLUMNS.filter(c => visibleCols.includes(c.id));
    const headers = activeCols.map(c => c.label);
    const rows = filtered.map(conn => activeCols.map(c => conn[c.field]));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ports-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Exported to CSV', 'success');
  };

  const getStateClass = (state) => {
    if (state === 'LISTENING') return 'listening';
    if (state === 'ESTABLISHED') return 'established';
    if (state === 'TIME_WAIT') return 'time_wait';
    if (state === 'CLOSE_WAIT') return 'close_wait';
    return 'other';
  };

  const SortHeader = ({ field, children }) => (
    <th
      className={sortField === field ? 'sorted' : ''}
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        <span className="sort-indicator">{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span>Scanning ports...</span>
      </div>
    );
  }

  return (
    <>
      {/* Header & Stats */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Network Connections</h1>
            <p className="page-subtitle">Monitor and manage active ports and processes</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {autoRefresh && (
              <div className="auto-refresh-indicator">
                <span className="dot" />
                Auto {autoRefreshInterval}s
              </div>
            )}
          </div>
        </div>

        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-icon blue"><Icons.Activity /></div>
            <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Icons.Server /></div>
            <div><div className="stat-value">{stats.listening}</div><div className="stat-label">Listening</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cyan"><Icons.Globe /></div>
            <div><div className="stat-value">{stats.established}</div><div className="stat-label">Established</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><Icons.Shield /></div>
            <div><div className="stat-value">{stats.uniquePorts}</div><div className="stat-label">Open Ports</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><Icons.Cpu /></div>
            <div><div className="stat-value">{stats.uniqueProcesses}</div><div className="stat-label">Processes</div></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search ports, processes, addresses, PIDs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {['ALL', 'TCP', 'UDP'].map(p => (
            <button
              key={p}
              className={`filter-btn ${protocolFilter === p ? 'active' : ''}`}
              onClick={() => setProtocolFilter(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="filter-group">
          {['ALL', 'LISTENING', 'ESTABLISHED', 'TIME_WAIT', 'CLOSE_WAIT'].map(s => (
            <button
              key={s}
              className={`filter-btn ${stateFilter === s ? 'active' : ''}`}
              onClick={() => setStateFilter(s)}
            >
              {s === 'ALL' ? 'All States' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <div className="col-picker-wrapper" ref={colPickerRef}>
            <button
              className="btn btn-secondary btn-icon tooltip-wrapper"
              onClick={() => setColPickerOpen(v => !v)}
            >
              <Icons.Filter />
              <span className="tooltip-text">Columns</span>
            </button>
            {colPickerOpen && (
              <div className="col-picker-dropdown">
                <div className="col-picker-title">Visible Columns</div>
                {COLUMNS.map(col => (
                  <label key={col.id} className="col-picker-item" onClick={() => toggleColumn(col.id)}>
                    <span className={`col-picker-check ${isColVisible(col.id) ? 'active' : ''}`}>
                      {isColVisible(col.id) && <Icons.Check />}
                    </span>
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            className={`btn btn-secondary btn-icon tooltip-wrapper`}
            onClick={() => setAutoRefresh(a => !a)}
            style={autoRefresh ? { borderColor: 'var(--success)', color: 'var(--success)' } : {}}
          >
            <Icons.Activity />
            <span className="tooltip-text">{autoRefresh ? 'Disable' : 'Enable'} auto-refresh</span>
          </button>
          <button
            className={`btn btn-secondary btn-icon tooltip-wrapper ${refreshing ? 'refresh-spin' : ''}`}
            onClick={onRefresh}
          >
            <Icons.Refresh />
            <span className="tooltip-text">Refresh</span>
          </button>
          <button className="btn btn-secondary btn-icon tooltip-wrapper" onClick={exportCsv}>
            <Icons.Download />
            <span className="tooltip-text">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bulk-actions">
          <span>{selected.size} selected</span>
          <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 12 }} onClick={handleBulkKill}>
            <Icons.Kill /> Kill Selected
          </button>
          <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Icons.Search />
            <p>No connections found matching your filters</p>
          </div>
        ) : (
          <table className="port-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <button
                    className={`checkbox ${selected.size === filtered.length && filtered.length > 0 ? 'checked' : ''}`}
                    onClick={selectAll}
                  >
                    {selected.size === filtered.length && filtered.length > 0 && <Icons.Check />}
                  </button>
                </th>
                {isColVisible('protocol') && <SortHeader field="protocol">Protocol</SortHeader>}
                {isColVisible('localPort') && <SortHeader field="localPort">Local Port</SortHeader>}
                {isColVisible('localAddress') && <SortHeader field="localAddress">Local Address</SortHeader>}
                {isColVisible('foreignAddress') && <SortHeader field="foreignAddress">Remote Address</SortHeader>}
                {isColVisible('foreignPort') && <SortHeader field="foreignPort">Remote Port</SortHeader>}
                {isColVisible('state') && <SortHeader field="state">State</SortHeader>}
                {isColVisible('pid') && <SortHeader field="pid">PID</SortHeader>}
                {isColVisible('processName') && <SortHeader field="processName">Process</SortHeader>}
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((conn, idx) => {
                const color = getProcessColor(conn.processName);
                return (
                  <tr
                    key={`${conn.protocol}-${conn.localAddress}-${conn.localPort}-${conn.foreignAddress}-${conn.foreignPort}-${conn.pid}`}
                    className={selected.has(idx) ? 'selected' : ''}
                    onContextMenu={(e) => handleContextMenu(e, conn)}
                    onDoubleClick={() => setDetailConn(conn)}
                  >
                    <td>
                      <button
                        className={`checkbox ${selected.has(idx) ? 'checked' : ''}`}
                        onClick={() => toggleSelect(idx)}
                      >
                        {selected.has(idx) && <Icons.Check />}
                      </button>
                    </td>
                    {isColVisible('protocol') && (
                      <td>
                        <span className={`protocol-badge ${conn.protocol.toLowerCase()}`}>
                          {conn.protocol}
                        </span>
                      </td>
                    )}
                    {isColVisible('localPort') && <td><span className="port-badge">{conn.localPort}</span></td>}
                    {isColVisible('localAddress') && <td><span className="mono">{conn.localAddress}</span></td>}
                    {isColVisible('foreignAddress') && <td><span className="mono">{conn.foreignAddress}</span></td>}
                    {isColVisible('foreignPort') && <td><span className="mono">{conn.foreignPort || '*'}</span></td>}
                    {isColVisible('state') && (
                      <td>
                        <span className={`state-badge ${getStateClass(conn.state)}`}>
                          <span className="dot" />
                          {conn.state || '-'}
                        </span>
                      </td>
                    )}
                    {isColVisible('pid') && <td><span className="mono">{conn.pid}</span></td>}
                    {isColVisible('processName') && (
                      <td>
                        <div className="process-name">
                          <div
                            className="process-icon"
                            style={{ background: color + '22', color }}
                          >
                            {conn.processName.slice(0, 2)}
                          </div>
                          <span style={{ fontSize: 12 }}>{conn.processName}</span>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="action-btns">
                        <button
                          className="action-btn tooltip-wrapper"
                          onClick={() => setDetailConn(conn)}
                        >
                          <Icons.Eye />
                          <span className="tooltip-text">Details</span>
                        </button>
                        <button
                          className="action-btn tooltip-wrapper"
                          onClick={() => copyToClipboard(`${conn.localAddress}:${conn.localPort}`)}
                        >
                          <Icons.Copy />
                          <span className="tooltip-text">Copy</span>
                        </button>
                        {conn.pid > 4 && (
                          <button
                            className="action-btn kill tooltip-wrapper"
                            onClick={() => setConfirmKill({
                              pids: [conn.pid],
                              message: `Kill process "${conn.processName}" (PID: ${conn.pid})? This may affect other connections using this process.`,
                            })}
                          >
                            <Icons.Kill />
                            <span className="tooltip-text">Kill</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      {detailConn && (
        <DetailPanel
          conn={detailConn}
          onClose={() => setDetailConn(null)}
          onKill={(pid, name) => {
            setDetailConn(null);
            setConfirmKill({
              pids: [pid],
              message: `Kill process "${name}" (PID: ${pid})?`,
            });
          }}
          onCopy={copyToClipboard}
        />
      )}

      {/* Confirm Kill Modal */}
      {confirmKill && (
        <ConfirmModal
          title="Kill Process"
          message={confirmKill.message}
          confirmLabel="Kill"
          danger
          onConfirm={async () => {
            for (const pid of confirmKill.pids) {
              const conn = connections.find(c => c.pid === pid);
              await onKill(pid, conn?.processName || 'Unknown');
            }
            setConfirmKill(null);
            setSelected(new Set());
          }}
          onCancel={() => setConfirmKill(null)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          ref={contextRef}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="context-menu-item" onClick={() => { setDetailConn(contextMenu.conn); setContextMenu(null); }}>
            <Icons.Eye /> View Details
          </button>
          <button className="context-menu-item" onClick={() => { copyToClipboard(`${contextMenu.conn.localAddress}:${contextMenu.conn.localPort}`); setContextMenu(null); }}>
            <Icons.Copy /> Copy Address
          </button>
          <button className="context-menu-item" onClick={() => { copyToClipboard(String(contextMenu.conn.pid)); setContextMenu(null); }}>
            <Icons.Copy /> Copy PID
          </button>
          <div className="context-menu-divider" />
          {contextMenu.conn.pid > 4 && (
            <button className="context-menu-item danger" onClick={() => {
              setConfirmKill({
                pids: [contextMenu.conn.pid],
                message: `Kill process "${contextMenu.conn.processName}" (PID: ${contextMenu.conn.pid})?`,
              });
              setContextMenu(null);
            }}>
              <Icons.Kill /> Kill Process
            </button>
          )}
        </div>
      )}
    </>
  );
}
