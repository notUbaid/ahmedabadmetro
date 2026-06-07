import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for offline support
if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Show update notification (optional)
      if (confirm("New version available! Reload to update?")) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log("App ready to work offline");
    },
    onRegistered(registration) {
      console.log("Service Worker registered:", registration);
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
