const { spawn } = require('child_process');
const path = require('path');

// Remove ELECTRON_RUN_AS_NODE to ensure Electron runs as a real Electron app
// (VS Code and other Electron-based editors set this, breaking require('electron'))
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronPath = require('electron');
const args = ['.'];

if (process.env.NODE_ENV === 'development') {
  args.push('--dev');
}

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  env,
  cwd: path.join(__dirname, '..'),
});

child.on('close', (code) => {
  process.exit(code);
});
