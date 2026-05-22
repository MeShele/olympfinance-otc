import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Light-only build — clear any legacy dark class persisted from older
// builds before React mounts so the first paint is always light.
document.documentElement.classList.remove("dark");
try { localStorage.removeItem("corex-theme"); localStorage.removeItem("theme"); } catch {}

createRoot(document.getElementById("root")!).render(<App />);
