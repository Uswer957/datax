/* Hell/Dunkel-Schalter + Logo lädt neu. Wird im <head> geladen, damit beim Start nichts aufblitzt. */
(function () {
  const root = document.documentElement;
  let t = "dark";
  try { t = localStorage.getItem("theme") === "light" ? "light" : "dark"; } catch (e) {}
  root.dataset.theme = t;
  const BG = { dark: "#000000", light: "#f4efe6" };
  function meta() {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", BG[root.dataset.theme]);
  }
  function label(btn) {
    const light = root.dataset.theme === "light";
    btn.setAttribute("aria-label", light ? "Dunklen Modus einschalten" : "Hellen Modus einschalten");
    btn.title = light ? "Dunkler Modus" : "Heller Modus";
  }
  window.DataXTheme = () => root.dataset.theme;
  document.addEventListener("DOMContentLoaded", () => {
    meta();
    const btn = document.getElementById("theme-btn");
    const logo = document.getElementById("logo");
    if (logo) logo.addEventListener("click", (e) => { e.preventDefault(); location.reload(); });
    if (!btn) return;
    label(btn);
    btn.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
      meta(); label(btn);
      document.dispatchEvent(new CustomEvent("datax:theme", { detail: root.dataset.theme }));
    });
  });
})();
