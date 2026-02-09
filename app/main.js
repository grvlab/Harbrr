const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const EXEC_OPTS = { encoding: 'utf-8', shell: 'cmd.exe', windowsHide: true };

let mainWindow;
let tray;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Port Manager');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Quit', click: () => { tray.destroy(); tray = null; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

// Parse netstat output into structured data
function parseNetstatOutput(output) {
  const lines = output.trim().split('\n').slice(4); // Skip header lines
  const connections = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;

    const protocol = parts[0];
    const localAddress = parts[1];
    const foreignAddress = parts[2];
    let state = '';
    let pid = '';

    if (protocol === 'TCP') {
      state = parts[3] || '';
      pid = parts[4] || '';
    } else {
      // UDP has no state
      state = '*';
      pid = parts[3] || '';
    }

    const [localAddr, localPort] = splitAddress(localAddress);
    const [foreignAddr, foreignPort] = splitAddress(foreignAddress);

    if (pid && !isNaN(parseInt(pid))) {
      connections.push({
        protocol,
        localAddress: localAddr,
        localPort: localPort,
        foreignAddress: foreignAddr,
        foreignPort: foreignPort,
        state,
        pid: parseInt(pid),
        processName: '',
      });
    }
  }

  return connections;
}

function splitAddress(addr) {
  const lastColon = addr.lastIndexOf(':');
  if (lastColon === -1) return [addr, ''];
  return [addr.substring(0, lastColon), addr.substring(lastColon + 1)];
}

// Get process names for PIDs using tasklist (works on all Windows versions)
function getProcessNames(pids) {
  const nameMap = {};

  try {
    const output = execSync('tasklist /fo csv /nh', { ...EXEC_OPTS, timeout: 10000 });
    const lines = output.trim().split('\n');
    for (const line of lines) {
      const match = line.match(/"([^"]+)","(\d+)"/);
      if (match) {
        nameMap[parseInt(match[2])] = match[1];
      }
    }
  } catch (e) {
    // Fallback: use PowerShell
    try {
      const psCmd = 'powershell -Command "Get-Process | Select-Object Id,ProcessName | ConvertTo-Csv -NoTypeInformation"';
      const output = execSync(psCmd, { ...EXEC_OPTS, timeout: 15000 });
      const lines = output.trim().split('\n').slice(1);
      for (const line of lines) {
        const match = line.match(/"(\d+)","([^"]+)"/);
        if (match) {
          nameMap[parseInt(match[1])] = match[2] + '.exe';
        }
      }
    } catch (e2) {
      // ignore
    }
  }

  return nameMap;
}

// IPC Handlers
ipcMain.handle('get-connections', async () => {
  try {
    const output = execSync('netstat -ano', { ...EXEC_OPTS, timeout: 15000 });
    const connections = parseNetstatOutput(output);
    const pids = connections.map(c => c.pid).filter(p => p > 0);
    const nameMap = getProcessNames(pids);

    for (const conn of connections) {
      conn.processName = nameMap[conn.pid] || 'Unknown';
    }

    return { success: true, data: connections };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('kill-process', async (_, pid) => {
  try {
    execSync(`taskkill /PID ${parseInt(pid)} /F`, { ...EXEC_OPTS, timeout: 5000 });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-port', async (_, port) => {
  try {
    const output = execSync('netstat -ano', { ...EXEC_OPTS, timeout: 15000 });
    const connections = parseNetstatOutput(output);
    const found = connections.filter(c => c.localPort === String(port));

    if (found.length > 0) {
      const pids = found.map(c => c.pid).filter(p => p > 0);
      const nameMap = getProcessNames(pids);
      for (const conn of found) {
        conn.processName = nameMap[conn.pid] || 'Unknown';
      }
      return { success: true, inUse: true, data: found };
    }

    return { success: true, inUse: false, data: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-system-info', async () => {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
  };
});

ipcMain.handle('open-external', async (_, url) => {
  shell.openExternal(url);
});

ipcMain.handle('open-guide', async () => {
  let guidePath;
  if (isDev) {
    guidePath = path.join(__dirname, '..', 'public', 'guide.html');
  } else {
    guidePath = path.join(app.getAppPath(), 'public', 'guide.html');
    guidePath = guidePath.replace('app.asar', 'app.asar.unpacked');
  }
  shell.openExternal('file://' + guidePath);
});

// Window controls
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return mainWindow.isMaximized();
});
ipcMain.handle('window-close', () => mainWindow.close());
ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized());

app.whenReady().then(() => {
  createWindow();
  // createTray(); // Uncomment if you want system tray support
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
