import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

import { toast } from "sonner";

// Register service worker for offline support.
// Defer past first load so the 2 MB precache doesn't compete with initial render.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const register = () => {
    const updateSW = registerSW({
      immediate: true,
    onNeedRefresh() {
      toast("New version available!", {
        description: "An update is ready.",
        action: {
          label: "Update",
          onClick: () => updateSW(true),
        },
        duration: Infinity,
      });
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
    });
  };
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
