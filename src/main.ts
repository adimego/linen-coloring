import "@fontsource/fraunces/latin-600.css";
import "@fontsource/nunito/latin-500.css";
import "@fontsource/nunito/latin-700.css";
import "./style.css";
import { applyStoredTheme } from "./settings.ts";
import { App } from "./app.ts";

applyStoredTheme();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Missing #app");

try {
  new App(root);
} catch (error) {
  console.error(error);
  root.className = "app is-gallery";
  root.innerHTML = `
    <main class="empty">
      <h1>Linen</h1>
      <p>Something went wrong opening your coloring book. Reload to try again.</p>
    </main>
  `;
}
