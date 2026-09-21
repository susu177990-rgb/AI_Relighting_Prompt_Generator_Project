import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";

const root = document.getElementById("root");

if (!root) throw new Error("Standalone root element is missing");

createRoot(root).render(createElement(StrictMode, null, createElement(Home)));
