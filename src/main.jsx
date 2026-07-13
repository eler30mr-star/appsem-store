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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
