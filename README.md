<p align="center">
  <img src="public/icon.png" alt="Harbrr Logo" width="120" />
</p>

<h1 align="center">Harbrr ⚓</h1>

<p align="center">
  <b>Your ports. Your rules.</b><br/>
  A sleek Windows desktop app to monitor, manage, and kill network connections — no terminal needed.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/built%20with-Electron%20%2B%20React-61DAFB?style=flat-square" alt="Tech" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/version-1.0.0-orange?style=flat-square" alt="Version" />
</p>

---

## 🤔 Why Harbrr?

Ever been stuck with a `Port already in use` error? Tired of Googling `netstat` commands just to find and kill a rogue process? **Harbrr** gives you a clean, visual dashboard to see every active network connection on your machine — and kill any of them with one click.

No command line. No headaches. Just smooth sailing. ⛵

---

## Features

| Feature | Description |
|---|---|
| 📊 **Live Dashboard** | See all active network connections at a glance — ports, PIDs, protocols, and more |
| 🔪 **One-Click Kill** | Terminate any process hogging a port instantly |
| 🔍 **Port Checker** | Quickly look up what's running on a specific port |
| 🔄 **Auto-Refresh** | Set it and forget it — auto-refreshes connections at your chosen interval |
| 🌗 **Dark / Light Theme** | Because your eyes matter. Toggle between themes effortlessly |
| 💻 **System Info** | Quick overview of your machine's network details right in the sidebar |
| 🎯 **Detail Panel** | Click on any connection to see the full breakdown |
| ⚡ **Blazingly Fast** | Built with Vite + React for a snappy, native-like experience |

---

## Getting Started

### Prerequisites

- **Windows 10/11**
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Installation

```bash
# Clone the repo
git clone https://github.com/grvlab/Harbrr.git
cd Harbrr

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build for Production

```bash
npm run build
```

This will generate a Windows installer in the `release/` folder.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7 |
| **Desktop Shell** | Electron 40 |
| **Styling** | Custom CSS with theme support |
| **Build Tool** | electron-builder |
| **Platform** | Windows (NSIS installer) |

---

## 📁 Project Structure

```
Harbrr/
├── app/              # Electron main process
│   ├── main.js       # App entry point
│   └── preload.js    # Bridge between Electron & React
├── src/              # React frontend
│   ├── App.jsx       # Root component
│   ├── components/   # UI components
│   │   ├── Dashboard.jsx
│   │   ├── PortChecker.jsx
│   │   ├── Sidebar.jsx
│   │   ├── DetailPanel.jsx
│   │   └── ...
│   ├── hooks/        # Custom React hooks
│   ├── styles/       # CSS stylesheets
│   └── utils/        # Helper functions
├── public/           # Static assets
├── scripts/          # Build & launch scripts
└── package.json
```

---

## 🎮 Usage

1. **Launch Harbrr** — the dashboard loads automatically with all active connections
2. **Browse connections** — sort, filter, and explore what's using your ports
3. **Kill a process** — hit the kill button on any connection to free the port
4. **Check a port** — switch to Port Checker to look up a specific port
5. **Auto-refresh** — enable auto-refresh to keep the dashboard live

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -m 'feat: add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

Crafted by **[Gaurav Gupta](https://github.com/grvlab)**

---

<p align="center">
  <b>⚓ Harbrr — Because managing ports shouldn't feel like navigating a storm.</b>
</p>
