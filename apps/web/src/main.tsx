import React from "react";
import ReactDOM from "react-dom/client";
import { injectTransitionStyles } from "@studio/shared";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";

// Ensure shared transition motion styles are injected into document head
injectTransitionStyles();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
