import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./mobile-fixes.css";
import "./app-details-v5.css";
import "./gallery-spacing.css";
import "./app-detail-loading.css";
import "./site-shell.css";
import "./app-details-desktop.css";
import "./app-details-desktop-actions.css";
import "./home-header-search.css";
import "./home-store-sections.css";
import "./legal-links.css";
import "./related-apps-layout.css";
import "./quality-improvements.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("No se pudo registrar el service worker:", error);
    });
  });
}
