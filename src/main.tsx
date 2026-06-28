import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

import { toast } from "sonner";

// Register service worker for offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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
}

createRoot(document.getElementById('root')!).render(<App />);
