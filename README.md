# ⛓ ChainIQ — Smart Supply Chain Optimizer

AI-powered e-commerce supply chain platform that predicts 
and prevents disruptions before they happen — shifting 
supply chain management from reactive to predictive.

## 🚀 Live Demo
[ChainIQ on Firebase](https://chainiq-db87b.web.app/)

## 🎯 Problem
Supply chain managers find out about delays after they 
happen. By then, the ripple effect has already caused 
stockouts, missed SLAs, and lost revenue.

## 💡 Solution
ChainIQ detects disruptions 24-48 hours in advance using 
8 real-time signals and acts on them automatically.

## ⭐ Three Core USPs

### 1. Predictive Decoupling
Triggers reroute recommendations 24-48h before a shipment 
reaches a high-risk node using live GDELT geopolitical 
scores and ETA-based weather forecasts.

### 2. Strategic Slotting
When a Star product arrives at a warehouse but the dock 
is blocked by a Dead Weight shipment, the system 
automatically reroutes the shipment to the nearest warehouse, not forming a queue — preventing cascade delays.

### 3. Budget Arbitrage
Every rerouting decision is financially gated. 
Auto-approves expedited routes only when cost of delay 
exceeds the expedite premium.

## 🔑 Key Features
- Live shipment map with real-time risk scoring
- ETA-based weather forecasting via Open-Meteo
- AI supplier ranking powered by Gemini 2.0
- Product Portfolio Matrix (Stars, Hidden Gems, 
  Volume Drivers, Dead Weight)
- Per-product AI strategy with supplier & route decisions
- Budget Command Center — real-time financial dashboard
- AI Email Composer — Gemini writes supplier emails
- Proactive supplier risk alerts
- Automated Decision Engine (runs every 30 seconds)

## 🛠 Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Maps:** React-Leaflet + OpenStreetMap
- **Weather:** Open-Meteo API (free, no key needed)
- **AI:** Google Gemini 2.0 Flash
- **Hosting:** Firebase Hosting (Google Cloud)

## ⚙ Setup
1. Clone the repo:
   git clone https://github.com/bansalchahek-ui/chainiq.git
2. Install dependencies:
   npm install
3. Add your Gemini API key in src/main.tsx:
   export const GEMINI_KEY = "YOUR_KEY_HERE"
   Get free key at: aistudio.google.com
4. Run locally:
   npm run dev
5. Open: http://localhost:5173
