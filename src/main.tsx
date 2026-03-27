import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason);
  event.preventDefault();
});

// Detect Capacitor native shell and apply compact type scale
// so text density matches native apps like WhatsApp on the same screen.
try {
  const cap = (window as any)?.Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    document.documentElement.classList.add('native-app');
  }
} catch { /* ignore */ }

// Defer mount to next frame — lets the browser paint the splash screen
// before the heavy JS bundle parse blocks the main thread
const mount = () => {
  createRoot(document.getElementById("root")!).render(<App />);
};

if (typeof requestAnimationFrame === 'function') {
  requestAnimationFrame(() => setTimeout(mount, 0));
} else {
  mount();
}
