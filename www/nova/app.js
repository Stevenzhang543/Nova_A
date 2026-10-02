(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem("whitelists-theme");
  const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = saved || (systemDark ? "dark" : "light");

  const button = document.querySelector("[data-theme-toggle]");
  const sync = () => {
    if (!button) return;
    const dark = root.dataset.theme === "dark";
    button.textContent = dark ? "☼" : "◐";
    button.setAttribute("aria-label", dark ? "Use light theme" : "Use dark theme");
    button.setAttribute("title", dark ? "Use light theme" : "Use dark theme");
  };
  sync();

  button?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("whitelists-theme", root.dataset.theme);
    sync();
  });

  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
