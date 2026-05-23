import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Light-only build — clear any legacy dark class persisted from older
// builds before React mounts so the first paint is always light.
document.documentElement.classList.remove("dark");
try { localStorage.removeItem("corex-theme"); localStorage.removeItem("theme"); } catch {}

// После прод-деплоя index.html обновляется, а chunk-файлы получают новые
// хэши. Если у юзера открыта вкладка со старым index.html, lazy `import()`
// упадёт 404 → "Importing a module script failed". Vite кидает событие
// `vite:preloadError` — ловим и форсим reload, чтобы юзер получил свежий
// index.html без ручного refresh.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
