import React from 'react';
import { Icons } from './Icons';

export default function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-title">
        <Icons.Network />
        Harbrr
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn help" onClick={() => window.portManager.openGuide()} title="User Guide">
          <Icons.HelpCircle />
        </button>
        <button className="titlebar-btn" onClick={() => window.windowControls.minimize()}>
          <Icons.Minimize />
        </button>
        <button className="titlebar-btn" onClick={() => window.windowControls.maximize()}>
          <Icons.Maximize />
        </button>
        <button className="titlebar-btn close" onClick={() => window.windowControls.close()}>
          <Icons.Close />
        </button>
      </div>
    </div>
  );
}
