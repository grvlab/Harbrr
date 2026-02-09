const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('portManager', {
  getConnections: () => ipcRenderer.invoke('get-connections'),
  killProcess: (pid) => ipcRenderer.invoke('kill-process', pid),
  checkPort: (port) => ipcRenderer.invoke('check-port', port),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openGuide: () => ipcRenderer.invoke('open-guide'),
});

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});
