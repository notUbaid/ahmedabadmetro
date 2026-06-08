<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/train.svg" alt="Ahmedabad Metro Logo" width="120" height="120">
  
  # 🚇 Ahmedabad Metro Connect
  **The Next-Generation Transit Companion for the Modern Commuter**

  <p align="center">
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://ui.shadcn.com/"><img src="https://img.shields.io/badge/Shadcn%2FUI-Latest-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Shadcn UI" /></a>
    <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
  </p>
</div>

---

## 🌟 What is Ahmedabad Metro Connect?
Ahmedabad Metro Connect is a blazing-fast, strictly typed, and entirely offline-capable Progressive Web App (PWA) built specifically for the residents, daily commuters, and tourists of Ahmedabad and Gandhinagar. 

Unlike generic transit apps that give basic static estimates, this app acts as a **hyper-intelligent transit engine**. It processes the official minute-by-minute train timetable, maps dynamic fare brackets, understands underground network loss, and orchestrates co-commuting logistics (syncing your ride with a friend's) all entirely within your browser.

## 🎯 Who is this for?
- **The Daily Commuter:** Who needs to know *exactly* when to leave their house to catch the 08:14 AM train and exactly what their commute will cost with a Smart Card discount.
- **Friends & Groups:** Who want to travel together but live on different ends of the city. The app calculates the exact mathematical intercept point for your trains.
- **Tourists & Newcomers:** Who don't know the stations but know the landmarks. Our global search engine maps any hospital, mall, or monument to the nearest metro station.
- **Underground Riders:** Who frequently lose internet access while riding. Since it's a PWA, the entire engine works 100% offline.

---

## ✨ Features Breakdown

### 🤝 "Travel Together" (Co-Commute Synchronization)
Ever tried coordinating a metro ride with a friend starting from a different station? It usually involves guesswork and missed trains. 
- **The Solution:** Your friend shares their trip link. You click it. The app instantly calculates the **perfect intercept station** based on your current location. 
- **Precision Timing:** It doesn't just tell you where to meet; it tells you exactly what time you need to board *your* train so that you step onto the interchange platform at the exact minute their train arrives.

### 🧠 Hyper-Intelligent Route Pathfinding
- **Dijkstra-Powered Engine:** Under the hood runs a highly optimized shortest-path algorithm navigating a massive timetable dataset across all lines (Red, Blue, Purple, Green).
- **Bus Network Integration:** Seamlessly integrates the GNLU to GIFT City/PDPU connecting bus routes into the metro algorithm.

### 🔍 Universal Search with Offline Fallback
- **Global Reach:** Type in *"Alpha One Mall"* or *"Apollo Hospital"*. The app uses the Pelias and Nominatim global geocoding APIs to find the exact coordinates, then uses the Haversine formula to instantly map it to the nearest Metro Station.
- **The "Tunnel-Proof" Fallback:** If you have zero internet, the app dynamically lazy-loads a highly compressed offline database of over 3,500 local Ahmedabad landmarks, guaranteeing search functionality deep underground.

### 💵 Exact Fare Matrix & Metro Card Logistics
- Uses the official, exact `32x32` multidimensional matrix for inter-line and intra-line fare calculations. 
- Toggle the "Metro Card" switch in the UI to instantly apply the official 10% Smart Card discount across all your routing results.

### 📊 Real-World Dynamic Crowding AI
- Tracks crowd density not just statically, but **dynamically** as the train progresses through its route.
- Custom logic accounts for the massive Old High Court interchange spikes, bell-curve blue-line loading, and realistic terminal drop-offs. Know exactly if you'll get a seat before you swipe your card.

### 📱 True Offline PWA Experience
- Packaged with **Workbox Service Workers** to cache the entire application shell, interactive maps, and timetable matrices.
- Add it to your iOS or Android home screen for a completely native, app-like experience devoid of browser borders or tap-highlight flashes.

---

## 📖 How to Use the App (Daily Commute Scenario)

**1. Finding Your Route:**
Open the app. You don't need to know station names—just type your destination (e.g., "Gujarat University"). The search engine will instantly locate it and inform you that "Commerce Six Road" is your nearest station.

**2. Planning the Departure:**
Click "Plan Journey". Instead of just showing you a line on a map, the app gives you a dropdown of the actual, real-world train departures for the next hour. Select the 09:15 AM train.

**3. Navigating the Ride:**
The route breaks down your trip step-by-step. 
*"Board the Blue Line towards Vastral Gam at 09:15 AM. Ride 4 stations. Alight at Old High Court at 09:26 AM. Wait 4 minutes. Board the Red Line towards APMC at 09:30 AM."* 

**4. Sharing with a Friend:**
Meeting someone on the way? Click "Share this Ride" at the bottom of your route. Send the copied link to your friend. When they open it, the app will ask for their location and tell them exactly when to leave to intercept your specific train car!

---

## 🚀 Quick Start & Setup

Want to run this beast locally? It takes less than a minute.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) and npm installed.

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/notUbaid/ahmedabadmetro.git

# 2. Navigate into the project directory
cd ahmedabadmetro

# 3. Install dependencies
npm install

# 4. Start the blazing-fast Vite dev server
npm run dev
```

Your app will be live at `http://localhost:5000`.

---

## 🏗️ Architecture & Stack

This project was built with a no-compromise approach to modern web development:

| Layer | Technology | Description |
|---|---|---|
| **Core Framework** | React 18 | Declarative, component-based UI rendering. |
| **Language** | TypeScript | Strict type-safety across the entire codebase. |
| **Build Tool** | Vite 5 | Lightning fast HMR and optimized production bundling. |
| **Styling** | Tailwind CSS | Utility-first styling for rapid UI development. |
| **Components** | Shadcn UI | Accessible, unstyled, and highly customizable radix components. |
| **Routing** | React Router | Seamless client-side navigation. |
| **Maps** | Leaflet | Interactive, high-performance web mapping. |
| **Offline/PWA** | Vite PWA | Automated service worker generation and asset caching. |

---

## 🤝 Contributing

We welcome contributions! Whether it's a bug fix, new feature, or performance optimization.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ⚡ and ❤️ for the commuters of Ahmedabad.</p>
</div>
