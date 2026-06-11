# AhmMetro

AhmMetro is a strictly typed, offline-capable Progressive Web Application (PWA) designed for navigating the Ahmedabad and Gandhinagar metro network. It functions as a local transit engine that processes official timetables, pathfinding algorithms, and dynamic crowding simulations entirely client-side.

## Features

- **Co-Commute Synchronization:** Calculates mathematical intercept stations for users originating from different stations, synchronizing departure times.
- **Client-Side Pathfinding:** Utilizes a Dijkstra-based algorithm optimized for the specific node graph of the Ahmedabad Metro (Red, Blue, Green, and Purple lines), including integrated bus networks.
- **Offline Search:** Implements a fallback local database of ~3,500 landmarks with Haversine distance calculation to guarantee search functionality when deep underground without network connectivity.
- **Dynamic Crowding Simulation:** Models expected passenger load based on current time, line segment, and historical choke points (e.g., Old High Court interchange influx, bell-curve loading on East-West corridors).
- **PWA Architecture:** Leverages Workbox for comprehensive asset and data caching, enabling a fully native-like offline experience on mobile devices.

## Architecture & Stack

The application is built upon a modern, performance-oriented frontend stack:

- **Core:** React 18
- **Language:** TypeScript 5.5
- **Build System:** Vite 5
- **Styling:** Tailwind CSS 3.4
- **Components:** Shadcn UI (Radix Primitives)
- **Maps:** Leaflet
- **Service Workers:** Vite PWA Plugin

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/notUbaid/ahmedabadmetro.git
   cd ahmedabadmetro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
