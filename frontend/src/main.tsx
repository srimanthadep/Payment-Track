import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
