import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPwaUpdate } from "./lib/pwaUpdate";

// Initialize PWA auto-updater and background lifecycle listeners
initPwaUpdate();

createRoot(document.getElementById('root')!).render(<App />);
