/* Handy: Stand-Zeile aus der (unten fixierten) Tab-Leiste unter den Kopf spiegeln,
   bei Tab-Wechsel nach oben springen. Desktop unberührt. */
(function () {
  const mq = window.matchMedia("(max-width:720px)");
  const src = document.getElementById("updated");
  const top = document.querySelector(".top");
  if (!src || !top) return;
  const m = document.createElement("div");
  m.className = "updated-m";
  top.insertAdjacentElement("afterend", m);
  const sync = () => { m.textContent = src.textContent; };
  new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
  sync();
  document.querySelectorAll(".tabs [role=tab]").forEach((b) => b.addEventListener("click", () => {
    if (mq.matches) window.scrollTo(0, 0);
  }));
})();
