(() => {
  let installPrompt = null;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = () =>
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

  function updateInstallState() {
    const installed = isStandalone();
    const canInstall = !installed && (Boolean(installPrompt) || isIOS());
    document.body.classList.toggle("pwa-installed", installed);
    document.body.classList.toggle("pwa-installable", canInstall);
  }

  function showInstallHelp() {
    const text = isIOS()
      ? "Tippe in Safari auf Teilen und danach auf „Zum Home-Bildschirm“."
      : "Öffne das Browser-Menü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.";
    const modal = document.createElement("div");
    modal.className = "pwa-install-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "installTitle");
    modal.innerHTML = `<div class="pwa-install-card"><img class="pwa-install-icon" src="icons/icon-192.png" alt=""><h2 id="installTitle">Rechenrakete installieren</h2><p>${text}</p><button class="primary" type="button" data-close-install>Verstanden</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector("[data-close-install]").focus();
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target.closest("[data-close-install]")) modal.remove();
    });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallState();
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    updateInstallState();
    if (typeof toast === "function") toast("Rechenrakete wurde installiert!");
  });

  document.addEventListener("click", async event => {
    if (!event.target.closest("[data-install-app]")) return;
    if (!installPrompt) {
      showInstallHelp();
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    updateInstallState();
  });

  function updateOnlineState() {
    document.body.classList.toggle("is-offline", !navigator.onLine);
    if (!navigator.onLine && typeof toast === "function") toast("Offline-Modus: Deine Welt bleibt spielbar.");
  }

  window.addEventListener("online", updateOnlineState);
  window.addEventListener("offline", updateOnlineState);
  updateOnlineState();
  updateInstallState();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
  }
})();
