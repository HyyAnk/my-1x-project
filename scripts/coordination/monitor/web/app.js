import { MonitorApp } from "./monitor/MonitorApp.js";

// Boot application reliably
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", () => {
    window.__app = new MonitorApp();
  });
} else {
  window.__app = new MonitorApp();
}
