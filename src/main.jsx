import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./ui/world-chrome.css";
import "./ui/loading-screen.css";
import "./ui/world-cursor.css";
import "./ui/detail-view.css";
import "./ui/legacy-project.css";

createRoot(document.getElementById("root")).render(
  <App />,
);
