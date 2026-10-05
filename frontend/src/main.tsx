import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Auto-recover from chunk load errors caused by newly deployed releases
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("New deployment detected via chunk preload error. Reloading app...", event);
    window.location.reload();
  });
}

// Register PWA service worker with auto-activation and polling
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("PWA update detected, activating new service worker...");
      updateSW(true);
    },
    onOfflineReady() {
      console.log("App ready for offline use");
    },
  });

  // Periodically check for SW updates
  setInterval(() => {
    updateSW();
  }, 60 * 1000);
}

// Force browser tab to load fresh favicon without relying on stale browser cache
if (typeof document !== "undefined") {
  const updateFavicon = () => {
    const faviconUrl = `/logo.png?v=${Date.now()}`;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  };
  updateFavicon();
}

// Globally prevent mouse wheel from increasing/decreasing numerical values on all number inputs
if (typeof window !== "undefined") {
  const disableNumberInputScroll = (e: WheelEvent) => {
    const target = e.target as HTMLElement | null;
    if (target instanceof HTMLInputElement && target.type === "number") {
      target.blur();
    } else if (
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.type === "number"
    ) {
      document.activeElement.blur();
    }
  };

  window.addEventListener("wheel", disableNumberInputScroll, {
    passive: true,
    capture: true,
  });
}

createRoot(document.getElementById("root")!).render(<App />);

