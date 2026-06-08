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

  *Ahmedabad Metro Connect is a blazing fast, completely offline-capable Progressive Web App (PWA) designed to revolutionize how you navigate the city. Engineered with real-world heuristics, advanced pathfinding, and beautiful glassmorphism UI.*
</div>

<br />

> [!TIP]
> **Try it on your phone!** Add to Home Screen to install it as a native-feeling app that works 100% offline in underground tunnels!

## ✨ Signature Features

### 🧠 Hyper-Intelligent Route Pathfinding
- **Dijkstra-Powered Engine**: Under the hood runs a highly optimized shortest-path algorithm navigating a massive timetable dataset across all lines (Red, Blue, Purple, Green).
- **Time-Aware Routing**: It doesn't just tell you the stops; it computes the *exact minute* you will arrive based on real-time train schedules.

### 👥 "Sync with Friend" (Co-Commuting)
- **Intercept & Ride**: Enter your friend's journey details, and the engine will calculate the absolute best station for you to intercept their train. 
- **Time Synchronization**: Tells you the exact minute you must depart your origin to catch their specific train car at the interchange.
- **Smart Heuristics**: Prioritizes minimizing your personal travel time while maximizing the number of stops you get to ride together!

### 📊 Real-World Dynamic Crowding AI
- Tracks crowd density not just statically, but **dynamically** as the train progresses through its route.
- Custom logic for the massive **Old High Court** interchange spikes, bell-curve blue-line loading, and realistic terminal drop-offs.
- Know exactly if you'll get a seat before you even enter the station.

### 📱 True Offline PWA Experience
- Packaged with **Workbox Service Workers** to cache the entire schedule matrix.
- Whether you're in an underground tunnel with zero network or out of data, the app functions flawlessly.

### 🎨 State-of-the-Art UX/UI
- Built on **Tailwind CSS** & **Shadcn UI**.
- Fully responsive, mobile-first design with smooth micro-interactions, dark/light mode, and frosted glass components.
- Integrated **Leaflet Maps** for beautiful, interactive transit map visualization.

---

## 🚀 Quick Start Guide

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

Your app will be live at `http://localhost:5173`.

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
| **Icons** | Lucide React | Beautiful, consistent, and crisp vector icons. |
| **Routing** | React Router | Seamless client-side navigation. |
| **Maps** | Leaflet | Interactive, high-performance web mapping. |
| **Offline/PWA** | Vite PWA | Automated service worker generation and asset caching. |

---

## 🧠 Deep Dive: The Timetable Engine

The core of the app isn't just a static JSON file—it's a multi-layered matrix of:
- **`TrainSchedules`**: Over 200+ distinct train runs per day, mapped down to the minute.
- **In-Memory Caching**: A custom module-level caching layer ensures that calculating identical routes doesn't re-trigger heavy algorithmic operations, keeping the UI at 60fps at all times.
- **Directional Normalization**: Handles both forward and backward rail arrays cleanly so route extractions never drop connecting legs.

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
