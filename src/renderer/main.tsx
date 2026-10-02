import React from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./redesign.css";
import App from "./App";
import { installDesktopApiAdapter } from "./desktop-api";

await installDesktopApiAdapter();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
