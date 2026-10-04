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

