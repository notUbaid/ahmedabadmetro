<div align="center">

# 🚇 AhmMetro

### The Ahmedabad Metro Companion That Works Underground

**Live Tracking • Route Planning • Fare Calculator • Works Offline**

[![Live App](https://img.shields.io/badge/🚀_Live_App-ahmmetro.vercel.app-0066CC?style=for-the-badge)](https://ahmmetro.vercel.app)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-blueviolet?style=for-the-badge)]()
[![Stations](https://img.shields.io/badge/Stations-53+-DC2626?style=for-the-badge)]()

<br />

*The metro app Ahmedabad deserved. Free, open-source, no download required.*

</div>

---

## ⚡ Why AhmMetro?

You're underground at Gheekanta station. No signal. Google Maps is useless. The official metro app hasn't been updated since 2023.

**AhmMetro works offline.** It was built for exactly this moment.

| Feature | AhmMetro | Google Maps | Official App |
|---------|:--------:|:-----------:|:------------:|
| Works offline underground | ✅ | ❌ | ❌ |
| Live train positions | ✅ | ❌ | ❌ |
| Exact metro fare | ✅ | ❌ | ⚠️ |
| All 53 stations | ✅ | ✅ | ⚠️ |
| No download needed | ✅ | ❌ | ❌ |
| Co-commute planning | ✅ | ❌ | ❌ |
| Crowd estimation | ✅ | ❌ | ❌ |

---

## 🗺️ What's Inside

### 🔴🔵🟢🟣 Full Network Coverage

AhmMetro covers all **4 metro lines** and **53 stations** across Ahmedabad and Gandhinagar:

```
🔵 Blue Line    Thaltej Gam ←→ Vastral Gam       18 stations  ~45 min
🔴 Red Line     APMC ←→ Koteshwar Road            15 stations  ~33 min
🟢 Green Line   Koteshwar Road ←→ Mahatma Mandir  20 stations  ~55 min
🟣 Purple Line  GNLU ←→ GIFT City                  3 stations   ~6 min
```

**Interchange Stations:** Old High Court (🔵↔🔴) · Koteshwar Road (🔴↔🟢) · GNLU (🟢↔🟣)

### 🚆 Live Train Tracking

Real-time simulated train positions based on official GMRC timetable data. See exactly where trains are on the map, when the next one arrives, and which platform to head to.

### 📍 Smart Route Planning

Dijkstra-based pathfinding engine that calculates the optimal route across all lines, including multi-interchange journeys. Tells you exactly which train to take, where to switch, and how long it'll take.

### 💰 Fare Calculator

Complete official fare matrices for all line combinations — Blue, Red, Blue↔Red cross-line. Fares range from ₹5 to ₹30.

### 👥 Co-Commute

Meeting a friend? Enter both starting stations and AhmMetro calculates the optimal intercept station with synchronized departure times. No other metro app does this.

### 📊 Crowd Simulation

Estimates passenger load by time of day, line segment, and historical patterns. Know if your train will be packed before you even leave home.

### 🔍 Offline Search

3,500+ landmarks indexed with Haversine distance calculation. Search for "Kankaria Lake" or "IIM Ahmedabad" and get the nearest metro station — even without internet.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
├─────────────────────────────────────────────┤
│  React 18 + TypeScript 5.5                  │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Leaflet  │ │  Shadcn  │ │  Recharts   │ │
│  │   Map    │ │   UI     │ │   Charts    │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
│  ┌──────────────────────────────────────┐   │
│  │     Client-Side Transit Engine       │   │
│  │  • Dijkstra pathfinding             │   │
│  │  • Timetable interpolation          │   │
│  │  • Fare matrix lookup              │   │
│  │  • Haversine distance search       │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Workbox Service Worker (Offline Cache)     │
│  • App shell + assets (precache)            │
│  • OSM tiles (CacheFirst, 30-day TTL)       │
│  • Geocoding (NetworkFirst, 7-day TTL)      │
└─────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 |
| **Language** | TypeScript 5.5 (strict mode) |
| **Build** | Vite 5 with SWC |
| **Styling** | Tailwind CSS 3.4 |
| **Components** | Shadcn UI (Radix Primitives) |
| **Maps** | Leaflet + OpenStreetMap |
| **Charts** | Recharts |
| **Offline** | Vite PWA Plugin + Workbox |
| **Hosting** | Vercel (Edge Network) |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/notUbaid/ahmedabadmetro.git
cd ahmedabadmetro

# Install
npm install

# Dev server (localhost:5000)
npm run dev

# Production build
npm run build
```

**Prerequisites:** Node.js v18+

---

## 📁 Project Structure

```
src/
├── components/
│   ├── MetroMap.tsx          # Main interactive map (Leaflet)
│   ├── RoutePlanner.tsx      # Route planning UI + pathfinding
│   ├── SearchBar.tsx         # Offline-capable station/landmark search
│   ├── BottomPanel.tsx       # Mobile bottom sheet navigation
│   ├── LiveTrainTrackingDialog.tsx
│   ├── FriendsJourneyViewer.tsx   # Co-commute feature
│   └── ui/                  # Shadcn UI primitives
├── data/
│   ├── metroData.ts          # All 53 stations with coordinates
│   ├── segmentTimings.ts     # Official timetable-based segment times
│   ├── fareData.ts           # Complete fare matrices
│   ├── timetable.ts          # Train schedule engine
│   └── localPlaces.ts        # 3,500+ landmark database
├── contexts/                 # React context providers
├── hooks/                    # Custom React hooks
└── pages/
    ├── Index.tsx              # Main app page
    └── NotFound.tsx           # 404 page
```

---

## 🤖 AI-Readable

AhmMetro provides structured data for AI assistants:

- [`/llms.txt`](https://ahmmetro.vercel.app/llms.txt) — Concise site description for LLMs
- [`/llms-full.txt`](https://ahmmetro.vercel.app/llms-full.txt) — Complete metro data reference
- JSON-LD structured data (WebApplication, FAQPage, ItemList schemas)

If you're building an AI that answers questions about Ahmedabad Metro, point it at our `llms-full.txt`.

---

## 📊 Metro Quick Reference

<details>
<summary><b>🕐 Timings</b></summary>

- **Hours:** 6:00 AM – 10:00 PM (daily, including holidays)
- **Peak frequency:** Every 5–7 min (8–11 AM, 5–8 PM)
- **Off-peak:** Every 10–15 min
- **First train:** 6:00 AM · **Last train:** ~9:15 PM

</details>

<details>
<summary><b>💰 Fares</b></summary>

| Stations | Fare |
|----------|------|
| 1–2 | ₹5 |
| 3–5 | ₹10 |
| 6–8 | ₹15 |
| 9–12 | ₹20 |
| 13–16 | ₹25 |
| 17+ | ₹30 |

Metro Smart Card available at all stations for discounted fares.

</details>

<details>
<summary><b>🔄 Interchange Guide</b></summary>

| Station | Lines | Use For |
|---------|-------|---------|
| **Old High Court** | 🔵 Blue ↔ 🔴 Red | East-West ↔ North-South |
| **Koteshwar Road** | 🔴 Red ↔ 🟢 Green | City ↔ Gandhinagar |
| **GNLU** | 🟢 Green ↔ 🟣 Purple | Gandhinagar ↔ GIFT City |

</details>

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, or data updates — open a PR.

```bash
# Fork → Clone → Branch → Commit → PR
git checkout -b feature/your-feature
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for Ahmedabad Metro commuters**

*Not affiliated with Gujarat Metro Rail Corporation (GMRC) or MEGA.*

[🚀 Open AhmMetro](https://ahmmetro.vercel.app) · [⭐ Star on GitHub](https://github.com/notUbaid/ahmedabadmetro)

</div>
