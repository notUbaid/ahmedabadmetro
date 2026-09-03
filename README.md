<div align="center">

# 🚇 AhmMetro

### The Real-Time Transit Companion for Ahmedabad & Gandhinagar

**Live Train Tracking • Route Planner • Official 53-Station Fare Matrix • Daily Commute • Works 100% Offline**

[![Live Web App](https://img.shields.io/badge/🚀_Web_App-www.ahmedabadmetro.site-0066CC?style=for-the-badge)](https://www.ahmedabadmetro.site)
[![Google Play](https://img.shields.io/badge/Google_Play-Get_it_on_Play_Store-34A853?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=ahmedabadmetro.site)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-blueviolet?style=for-the-badge)]()
[![Operational Stations](https://img.shields.io/badge/Stations-53_Operational-DC2626?style=for-the-badge)]()
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br />

*The modern, hyper-fast transit experience Ahmedabad deserved. Free, open-source, and installs directly on Android or works in any mobile browser.*

[**Explore Web App**](https://www.ahmedabadmetro.site) • [**Get on Google Play**](https://play.google.com/store/apps/details?id=ahmedabadmetro.site) • [**Report an Issue**](https://github.com/notUbaid/ahmedabadmetro/issues)

</div>

---

## ⚡ Why AhmMetro?

You are underground at Gheekanta or Kalupur station. Cellular reception drops to zero. Google Maps spins indefinitely, and the legacy transit portals fail to load.

**AhmMetro is built offline-first.** All 53 station geometries, Dijkstra pathfinding algorithms, train timetables, and the complete 53×53 official GMRC fare matrix live directly inside your browser cache or installed Android app.

| Feature | AhmMetro | Google Maps | Official GMRC Site |
|---|:---:|:---:|:---:|
| **Works Offline Underground** | ✅ 100% Full Functionality | ❌ Blank / Spins | ❌ Requires Active Connection |
| **Live Simulated Train Positions** | ✅ Real-Time Movement | ❌ Static Schedules | ❌ None |
| **Complete 53-Station Network** | ✅ Blue, Red, Green & Purple Lines | ⚠️ Incomplete Phase 2 | ⚠️ Clunky Dropdowns |
| **Instant Route Deep Linking** | ✅ `/?from=gnlu&to=thaltej` | ❌ Clunky Coordinates | ❌ None |
| **Official Fare Matrix Lookup** | ✅ Exact ₹5 to ₹40 Slabs ($O(1)$) | ❌ Approximate | ⚠️ Requires Form Submit |
| **Smart Daily Commute Card** | ✅ Proximity Popups (Home/Work) | ❌ None | ❌ None |
| **AI-Search Optimized (`/llms.txt`)** | ✅ First-Class ChatGPT/Claude Support | ❌ N/A | ❌ None |
| **Install via Google Play** | ✅ [Official Play Store App](https://play.google.com/store/apps/details?id=ahmedabadmetro.site) | N/A | ⚠️ Third-Party Clones |

---

## 🗺️ Network Overview

AhmMetro supports all **53 operational stations** across the **4 lines** of Ahmedabad Metro (Phase 1 + Phase 2):

```
🔵 Blue Line (East–West Corridor)
   Thaltej Gam ←→ Vastral Gam · 18 stations · ~45 min
   Underground stretch: Shahpur · Gheekanta · Kalupur · Kankaria East

🔴 Red Line (North–South Corridor)
   APMC ←→ Koteshwar Road · 14 stations · ~33 min
   Key hubs: Paldi · Gandhigram · Old High Court · Sabarmati · Motera Stadium

🟢 Green Line (Gandhinagar Extension)
   Koteshwar Road ←→ Mahatma Mandir · 19 stations · ~55 min
   Key hubs: Vishwakarma College · GNLU · Infocity · Sachivalaya · Akshardham

🟣 Purple Line (GIFT City Branch)
   GNLU ←→ GIFT City · 2 stations · ~6 min
   Connecting Gujarat International Finance Tec-City via PDPU / PDEU
```

### 🔄 Major Interchange Hubs
1. **Old High Court** (🔵 Blue Line $\leftrightarrow$ 🔴 Red Line): Primary east-west to north-south interchange.
2. **Koteshwar Road** (🔴 Red Line $\leftrightarrow$ 🟢 Green Line): Connects central Ahmedabad to Gandhinagar.
3. **GNLU** (🟢 Green Line $\leftrightarrow$ 🟣 Purple Line): Official junction for travelers heading to or from **GIFT City**. *(Note: Commuters from Gandhinagar transfer here to reach GIFT City).*

---

## 🌟 Core Features

### 🚆 Live Simulated Train Tracking
Simulates real-world train positions throughout the day using official GMRC operating timetables. Watch trains progress between stations, see exact time-to-arrival countdowns, and verify departure platforms before descending to the concourse.

### 🧭 Dijkstra-Powered Route Planning
* Computes shortest travel times and fewest interchanges.
* Accurately factors in line transfer walk times and platform headways.
* Provides step-by-step guidance: Boarding station, intermediate stops count, transfer directions, and alight station.
* Supports direct URL deep links (e.g. `https://www.ahmedabadmetro.site/?from=gnlu&to=thaltej`).

### 💰 Exact GMRC Fare Calculator
Integrated with the complete, verified 53×53 fare matrix extracted from official GMRC distance slabs:

| Distance Slab | Token Fare | Metro Smart Card (10% Off) |
|---|:---:|:---:|
| **0.0 – 2.5 km** | ₹5 | ₹4.50 |
| **2.5 – 7.5 km** | ₹10 | ₹9.00 |
| **7.5 – 12.5 km** | ₹15 | ₹13.50 |
| **12.5 – 17.5 km** | ₹20 | ₹18.00 |
| **17.5 – 22.5 km** | ₹25 | ₹22.50 |
| **22.5 – 27.5 km** | ₹30 | ₹27.00 |
| **27.5 – 32.5 km** | ₹35 | ₹31.50 |
| **32.5+ km** | ₹40 | ₹36.00 |

### 🏠 Daily Commute Assistant
* Set your **Home Station** and **Work Station** once.
* When you are within **3.5 km** of your station, the app detects your vicinity and presents a non-intrusive commute card with the next 3 trains, crowd level, and walking time.
* **Daily Frequency Guard**: Pops up once per day for going to work, and once per day for coming home, automatically refreshing the next morning.

### 👥 Co-Commute Journey Sync
Planning to meet colleagues or friends traveling from another corner of the city? Enter both origin stations and AhmMetro finds the optimal intercept station with synchronized arrival times and shareable journey links.

### 📊 Real-World Crowding Predictions
Dynamic crowd estimation tailored for Ahmedabad rush hours:
* **GIFT City Evening Commute**: Heavy crowding departing GIFT City through GNLU, sustained through the corridor until Old High Court.
* **GIFT City Morning Rush**: Moderate crowding from APMC, switching to Heavy from Old High Court through GNLU to GIFT City.
* Standard peak and off-peak load models across Blue and Red lines.

### 🔍 Offline Landmark Search
Indexes 3,500+ local landmarks, colleges, hospitals, and transit hubs across Ahmedabad and Gandhinagar (IIM-A, Gujarat University, Narendra Modi Stadium, Riverfront, Gandhinagar Sachivalaya, GIFT One). Instantly identifies the nearest metro station and walking distance.

---

## 📱 Installation & Platform Support

### 🛒 Google Play Store (Android)
Download the verified, native-wrapped Progressive Web App on Android:
👉 **[Download on Google Play Store](https://play.google.com/store/apps/details?id=ahmedabadmetro.site)**

### 🌐 Web & iOS PWA
Open [www.ahmedabadmetro.site](https://www.ahmedabadmetro.site) on Safari (iOS) or Chrome (Desktop/Android) and tap **"Add to Home Screen"**. It installs in seconds and takes less than 3 MB of storage.

---

## 🛠️ Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                        Browser                         │
├────────────────────────────────────────────────────────┤
│  React 18 + TypeScript 5.5 + Vite 5 (SWC)              │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Leaflet Map  │ │  Shadcn UI   │ │  Lucide Icons  │  │
│  │ GeoJSON Path │ │ Radix / CSS  │ │  i18n Context  │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Client-Side Transit Engine            │  │
│  │  • 53x53 Official Fare Matrix ($O(1)$)           │  │
│  │  • Graph Dijkstra Multi-Leg Pathfinding          │  │
│  │  • Dynamic Crowding Engine (GIFT City Peak)      │  │
│  │  • Timetable Interpolation (725+ Schedules)      │  │
│  │  • Haversine Landmark Spatial Search             │  │
│  └──────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────┤
│  Workbox Service Worker (PWA Offline Layer)            │
│  • App Shell & JSON Bundles (Pre-cached)               │
│  • OpenStreetMap Tiles (CacheFirst, 30-Day TTL)        │
│  • Google Play Digital Asset Links Verified            │
└────────────────────────────────────────────────────────┘
```

---

## 💻 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/notUbaid/ahmedabadmetro.git
cd ahmedabadmetro

# 2. Install dependencies
npm install

# 3. Start local development server (runs on port 5000)
npm run dev

# 4. Run automated test suites (Vitest)
npm test

# 5. Build production bundle
npm run build
```

---

## 🤖 AI Discoverability (`llms.txt`)

AhmMetro is fully indexed for AI-assisted search and conversational agents:
* **[`/llms.txt`](https://www.ahmedabadmetro.site/llms.txt)**: High-level system overview and route planner guidance for LLMs.
* **[`/llms-full.txt`](https://www.ahmedabadmetro.site/llms-full.txt)**: Complete dataset containing operational station registries, fare slabs, interchange policies, and timetable references.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the commuters of Ahmedabad and Gandhinagar**

*Disclaimer: AhmMetro is an independent community project and is not officially affiliated with Gujarat Metro Rail Corporation (GMRC) or MEGA.*

[**🌐 Open Web App**](https://www.ahmedabadmetro.site) • [**📱 Get on Google Play**](https://play.google.com/store/apps/details?id=ahmedabadmetro.site) • [**⭐ Star on GitHub**](https://github.com/notUbaid/ahmedabadmetro)

</div>
