import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// ══════════════════════════════════════════════
// CHAINIQ SETUP — 2 minutes to get running
// ══════════════════════════════════════════════
// 1. GEMINI KEY (free):
//    → Go to aistudio.google.com
//    → Click "Get API Key" → Create key
//    → Paste below replacing YOUR_GEMINI_KEY_HERE
//
// 2. Run:
//    npm install
//    npm run dev
//    Open http://localhost:5173
// ══════════════════════════════════════════════


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
