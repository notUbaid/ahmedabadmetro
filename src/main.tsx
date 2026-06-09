import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (confirm('New version available! Reload to update?')) {
        updateSW(true);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
