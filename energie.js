/* DataX · Energie-Tab
   Zahlen: energie.json (GitHub Action, scripts/energie.py) und live im Browser (GIE AGSI+, TradingView).
   Texte, Tabellen und News: data.json → energie (geplante Aufgabe „DataX aktualisieren“). */
(function () {
  "use strict";
  const X = window.DataX;
  if (!X) return;
  const { txt, newsList, lineChart, legend, monthLabels, rows, nf, sg, dDE, $ } = X;

  const C = { fg: "#f2f2f2", mu: "#8c8c8c", dim: "#5a5a5a", up: "rgb(63,185,80)", dn: "rgb(248,81,73)" };
  const MIXF = {
    "Wind": "#5b9bd5", "Solar": "#e6c14a", "Biomasse": "#7fb069", "Wasser": "#2f6f9f", "Kernkraft": "#b48ead",
    "Braunkohle": "#8a6a48", "Steinkohle": "#5f5f5f", "Erdgas": "#d9822b", "Öl & Sonstige": "#9a9a9a"
  };
  const wOf = (id) => Math.max(280, ($(id) && $(id).clientWidth) || 560);
  const kpi = (box, label, value, unit, delta) => {
    const k = txt("div", "e-kpi", "");
    const v = txt("div", "v", value); if (unit) v.appendChild(txt("small", "", unit));
    if (delta) v.appendChild(txt("span", "d " + (delta.cls || ""), delta.t));
    k.appendChild(v); k.appendChild(txt("div", "l", label)); box.appendChild(k);
  };
  const emptyBox = (id) => { const b = $(id); if (!b) return; b.textContent = ""; b.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); };
  const roll = (arr, n) => arr.map((p, i) => { const s = arr.slice(Math.max(0, i - n + 1), i + 1).map((x) => x[1]).filter((v) => v != null); return [p[0], s.length ? s.reduce((a, b) => a + b, 0) / s.length : null]; });
  function tabs(boxId, onPick) {
    const bs = document.querySelectorAll("#" + boxId + " button");
    bs.forEach((b) => b.addEventListener("click", () => { bs.forEach((x) => x.setAttribute("aria-selected", String(x === b))); onPick(b.dataset.k); }));
  }

  /* ---------- Live-Kurse (TradingView) ---------- */
  X.widget("w-energy", "market-quotes", {
    width: "100%", height: "100%", showSymbolLogo: false,
    symbolsGroups: [{ name: "Energie", symbols: [
      { name: "TVC:UKOIL", displayName: "Brent ($/bbl)" }, { name: "TVC:USOIL", displayName: "WTI ($/bbl)" },
      { name: "CAPITALCOM:NATURALGAS", displayName: "Erdgas Henry Hub ($/MMBtu)" },
      { name: "CAPITALCOM:GASOLINE", displayName: "Benzin RBOB ($/gal)" }, { name: "CAPITALCOM:HEATINGOIL", displayName: "Heizöl ($/gal)" }
    ] }]
  });

  let E = {}, D = {}, GAS = null, mixKey = "de", preisKey = "kurve";

  /* ---------- Öl ---------- */
  function renderOel() {
    const o = E.oel || {}, t = D.oel || {};
    $("e-oel-stand").textContent = o.brent ? "Schlusskurse bis " + dDE(o.brent.datum) : "";
    const box = $("e-oel-chart"); box.textContent = "";
    if (o.brent && o.brent.verlauf) {
      const cut = new Date(Date.now() - 366 * 864e5).toISOString().slice(0, 10);
      const b = o.brent.verlauf.filter((p) => p[0] >= cut), w = o.wti && o.wti.verlauf ? o.wti.verlauf.filter((p) => p[0] >= cut) : [];
      const dates = b.map((p) => p[0]), wm = Object.fromEntries(w);
      box.appendChild(lineChart([
        { pts: dates.map((d, i) => [i, wm[d] != null ? wm[d] : null]), color: C.mu, w: 1.3 },
        { pts: b.map((p, i) => [i, p[1]]), color: C.fg }
      ], { w: wOf("e-oel-chart"), h: 210, xlabels: monthLabels(dates), yfmt: (v) => nf(v, 0) + " $", label: "Brent und WTI, letztes Jahr" }));
      box.appendChild(legend([["Brent " + nf(o.brent.wert, 2) + " $", C.fg], ["WTI " + nf(o.wti && o.wti.wert, 2) + " $", C.mu]]));
    } else emptyBox("e-oel-chart");
    $("e-oel-lage").textContent = t.lage || ""; $("e-oel-lage").hidden = !t.lage;
    const pc = (v) => (v == null ? "" : nf(v, 1) + " %"), mb = (v) => (v == null ? "" : nf(v, 1));
    rows("e-foerder", (t.foerderung || []).map((r) => ({ land: r.land, m: mb(r.mbd), a: pc(r.anteil) })), [["land"], ["m", "r"], ["a", "r"]]);
    rows("e-verbrauch", (t.verbrauch || []).map((r) => ({ land: r.land, m: mb(r.mbd), a: pc(r.anteil) })), [["land"], ["m", "r"], ["a", "r"]]);
    $("e-oel-src").textContent = t.quelle || "";
  }

  function renderOpec() {
    const t = (D.oel || {}).opec || {};
    $("e-opec-stand").textContent = t.stand || "";
    $("e-opec-lage").textContent = t.lage || ""; $("e-opec-lage").hidden = !t.lage;
    const q = (t.quoten || []).map((r) => ({ land: r.land, q: r.quote == null ? "" : nf(r.quote, 0) + " kb/d" }));
    if (t.summe != null) q.push({ land: "Summe", q: nf(t.summe, 0) + " kb/d" });
    rows("e-quoten", q, [["land"], ["q", "r"]]);
    const L = (E.oel || {}).lager;
    const NM = { rohoel: "Rohöl kommerziell", spr: "Rohöl SPR", benzin: "Benzin", destillate: "Diesel/Heizöl" };
    if (L && L.posten) {
      $("e-lager-stand").textContent = "Woche bis " + dDE(L.woche);
      const tb = $("e-lager").querySelector("tbody"); tb.textContent = "";
      L.posten.filter((p) => NM[p.key]).forEach((p) => {
        const tr = document.createElement("tr");
        tr.appendChild(txt("td", "", NM[p.key])); tr.appendChild(txt("td", "r", nf(p.wert, 1)));
        [p.vorwoche, p.vorjahr].forEach((ref) => { const d = p.wert != null && ref != null ? p.wert - ref : null; tr.appendChild(txt("td", "r " + (d > 0 ? "e-up" : d < 0 ? "e-dn" : ""), sg(d, 1))); });
        tb.appendChild(tr);
      });
    } else rows("e-lager", [], [["a"], ["b"], ["c"], ["d"]]);
  }

  /* ---------- Gas ---------- */
  function gauge(box, name, row, prev) {
    const g = txt("div", "e-gauge", "");
    g.appendChild(txt("div", "l", name));
    const full = row ? parseFloat(row.full) : null, tr = row ? parseFloat(row.trend) : null;
    g.appendChild(txt("div", "v", full == null || isNaN(full) ? "–" : nf(full, 1) + " %"));
    const track = txt("div", "track", ""), fill = txt("div", "fill", "");
    fill.style.width = Math.max(0, Math.min(100, full || 0)) + "%"; track.appendChild(fill);
    const pv = prev ? parseFloat(prev.full) : null;
    if (pv != null && !isNaN(pv)) { const m = txt("div", "vj", ""); m.style.left = "calc(" + pv + "% - 1px)"; m.title = "Vorjahr: " + nf(pv, 1) + " %"; track.appendChild(m); }
    g.appendChild(track);
    const bits = [];
    if (tr != null && !isNaN(tr)) bits.push(sg(tr, 2) + " %-Pkt./Tag");
    if (pv != null && !isNaN(pv)) bits.push("Vorjahr " + nf(pv, 1) + " %");
    if (row && row.gasInStorage) bits.push(nf(parseFloat(row.gasInStorage), 0) + " TWh");
    g.appendChild(txt("div", "m", bits.join(" · ")));
    box.appendChild(g);
  }
  function renderGas() {
    const t = D.gas || {}, box = $("e-speicher"); box.textContent = "";
    const fb = t.speicher || {};
    if (GAS && GAS.eu && GAS.eu.length) {
      const eu = GAS.eu, de = GAS.de || [];
      const last = eu[0], day = last.gasDayStart, yago = String(Number(day.slice(0, 4)) - 1) + day.slice(4);
      gauge(box, "EU", last, eu.find((r) => r.gasDayStart === yago));
      gauge(box, "Deutschland", de[0], de.find((r) => r.gasDayStart === yago));
      $("e-gas-stand").textContent = "Gastag " + dDE(day) + " · live";
      const asc = eu.slice().reverse(), map = Object.fromEntries(asc.map((r) => [r.gasDayStart, parseFloat(r.full)]));
      const cut = new Date(Date.parse(day) - 365 * 864e5).toISOString().slice(0, 10);
      const cur = asc.filter((r) => r.gasDayStart > cut), dates = cur.map((r) => r.gasDayStart);
      const prevPts = dates.map((d, i) => [i, map[String(Number(d.slice(0, 4)) - 1) + d.slice(4)] ?? null]);
      const c = $("e-gas-chart"); c.textContent = "";
      c.appendChild(lineChart([{ pts: prevPts, color: C.dim, dash: true, w: 1.2 }, { pts: cur.map((r, i) => [i, parseFloat(r.full)]), color: C.fg }],
        { w: wOf("e-gas-chart"), h: 150, ymin: 0, ymax: 100, yticks: [0, 25, 50, 75, 100], yfmt: (v) => v + " %", xlabels: monthLabels(dates), label: "Füllstand EU-Gasspeicher, letztes Jahr" }));
      c.appendChild(legend([["EU-Füllstand", C.fg], ["Vorjahr", C.dim, true]]));
    } else {
      gauge(box, "EU", fb.eu != null ? { full: fb.eu } : null, fb.eu_vj != null ? { full: fb.eu_vj } : null);
      gauge(box, "Deutschland", fb.de != null ? { full: fb.de } : null, fb.de_vj != null ? { full: fb.de_vj } : null);
      $("e-gas-stand").textContent = fb.datum ? "Stand " + fb.datum : "";
      $("e-gas-chart").textContent = "";
    }
    const p = $("e-gas-preise"); p.textContent = "";
    if (t.ttf && t.ttf.wert != null) kpi(p, "TTF Europa" + (t.ttf.datum ? " · " + t.ttf.datum : ""), nf(t.ttf.wert, 2), "€/MWh", t.ttf.veraenderung != null ? { t: sg(t.ttf.veraenderung, 1) + " %", cls: t.ttf.veraenderung > 0 ? "e-up" : "e-dn" } : null);
    const hh = (E.oel || {}).henryhub;
    if (hh) kpi(p, "Henry Hub USA · " + dDE(hh.datum), nf(hh.wert, 2), "$/MMBtu");
    $("e-gas-lage").textContent = t.lage || ""; $("e-gas-lage").hidden = !t.lage;
    rows("e-lng", (t.lng || []).map((r) => ({ h: r.herkunft, a: r.anteil == null ? "" : nf(r.anteil, 0) + " %" })), [["h"], ["a", "r"]]);
    $("e-lng").hidden = !(t.lng && t.lng.length);
    $("e-gas-src").textContent = "Speicher: GIE AGSI+" + (t.quelle ? " · " + t.quelle : "");
  }
  function loadGas() {
    const get = (q) => fetch("https://agsi.gie.eu/api?" + q).then((r) => r.json()).then((j) => j.data || []);
    Promise.all([get("type=eu&size=760"), get("country=de&size=400")])
      .then(([eu, de]) => { if (eu.length) { GAS = { eu, de }; renderGas(); } })
      .catch(() => {});
  }

  /* ---------- Strommix ---------- */
  function renderMix() {
    const s = E[mixKey === "de" ? "strom_de" : "strom_eu"];
    const k = $("e-mix-kpis"), bar = $("e-mix-bar"), leg = $("e-mix-leg"), ch = $("e-mix-chart");
    [k, bar, leg, ch].forEach((b) => { b.textContent = ""; });
    if (!s) { emptyBox("e-mix-kpis"); return; }
    $("e-mix-stand").textContent = "Stand " + (s.stand || "");
    const ee = s.ee || {};
    kpi(k, "Erneuerbare jetzt", nf(s.ee_anteil_jetzt, 1), "%");
    kpi(k, "letzte 24 Std.", nf(s.ee_anteil_24h, 1), "%");
    if (ee.ytd != null) kpi(k, "Ø " + ee.jahr + " bisher", nf(ee.ytd, 1), "%");
    if (ee.vorjahr != null) kpi(k, "Ø " + (ee.jahr - 1), nf(ee.vorjahr, 1), "%");
    if (s.last_gw != null) kpi(k, "Verbrauch jetzt", nf(s.last_gw, 1), "GW");
    (s.quellen || []).forEach((q) => {
      if (!q.anteil24) return;
      const sp = document.createElement("span"); sp.style.width = q.anteil24 + "%"; sp.style.background = MIXF[q.name] || C.mu;
      sp.title = q.name + ": " + nf(q.anteil24, 1) + " % (Ø " + nf(q.gw24, 1) + " GW)"; bar.appendChild(sp);
      const e = txt("span", "", ""); const i = document.createElement("i"); i.className = "sw"; i.style.background = MIXF[q.name] || C.mu;
      e.appendChild(i); e.appendChild(document.createTextNode(q.name)); e.appendChild(txt("b", "", nf(q.anteil24, 1) + " %")); leg.appendChild(e);
    });
    if (ee.verlauf && ee.verlauf.length) {
      const r = roll(ee.verlauf, 7), dates = r.map((p) => p[0]);
      ch.appendChild(lineChart([{ pts: ee.verlauf.map((p, i) => [i, p[1]]), color: "#3a3a3a", w: 1 }, { pts: r.map((p, i) => [i, p[1]]), color: C.up, w: 1.8 }],
        { w: wOf("e-mix-chart"), h: 170, ymin: 0, ymax: 100, yticks: [0, 25, 50, 75, 100], yfmt: (v) => v + " %", xlabels: monthLabels(dates), label: "Täglicher Erneuerbaren-Anteil, letztes Jahr" }));
      ch.appendChild(legend([["Erneuerbaren-Anteil, 7-Tage-Schnitt", C.up], ["Tageswert", "#3a3a3a"]]));
    }
    $("e-mix-src").textContent = "Quelle: Energy-Charts (Fraunhofer ISE), CC BY 4.0" + ((D.strom || {}).quelle ? " · Jahresvergleich: " + D.strom.quelle : "");
  }
  function renderWelt() {
    const box = $("e-welt"); box.textContent = ""; box.className = "e-welt";
    const L = (D.strom || {}).welt || [];
    if (!L.length) { box.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    L.forEach((r) => {
      const row = txt("div", "row", "");
      row.appendChild(txt("span", "", r.name + (r.jahr ? " (" + r.jahr + ")" : "")));
      const t = txt("div", "t", ""), a = document.createElement("span"); a.style.width = Math.min(100, r.ee || 0) + "%"; a.style.background = C.up; t.appendChild(a);
      if (r.nuklear) { const n = document.createElement("span"); n.style.width = r.nuklear + "%"; n.style.background = MIXF.Kernkraft; n.title = "Kernkraft " + nf(r.nuklear, 1) + " %"; t.appendChild(n); }
      row.appendChild(t); row.appendChild(txt("span", "p", nf(r.ee, 1) + " %"));
      row.title = r.hinweis || ""; box.appendChild(row);
    });
  }

  /* ---------- Strompreise ---------- */
  function renderPreise() {
    const P = E.preise;
    const ch = $("e-preis-chart"); ch.textContent = "";
    if (!P) { emptyBox("e-preis-chart"); rows("e-zonen", [], [["a"], ["b"], ["c"], ["d"]]); return; }
    $("e-preis-stand").textContent = "Stand " + P.stand;
    const de = P.de || {};
    if (preisKey === "kurve" && de.kurve && de.kurve.length) {
      const pts = de.kurve, labs = [];
      pts.forEach((p, i) => { const h = p[0].slice(11, 16); if (h === "00:00" || h === "12:00") labs.push([i, (h === "00:00" ? dDE(p[0].slice(0, 10)).slice(0, 6) : "12 Uhr")]); });
      ch.appendChild(lineChart([{ pts: pts.map((p, i) => [i, p[1]]), color: C.fg, w: 1.4 }], { w: wOf("e-preis-chart"), h: 190, zero: true, xlabels: labs, yfmt: (v) => nf(v, 0), label: "Day-Ahead-Preis Deutschland" }));
      const vals = pts.map((p) => p[1]), mn = Math.min(...vals), mx = Math.max(...vals);
      ch.appendChild(legend([["€/MWh · Tief " + nf(mn, 0) + " · Hoch " + nf(mx, 0), C.fg]]));
    } else if (de.tage && de.tage.length) {
      const t = de.tage, dates = t.map((p) => p[0]), labs = [];
      dates.forEach((d, i) => { if (d.slice(8) === "01") labs.push([i, ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][Number(d.slice(5, 7)) - 1]]); });
      ch.appendChild(lineChart([{ pts: t.map((p, i) => [i, p[1]]), color: C.fg }], { w: wOf("e-preis-chart"), h: 190, zero: true, xlabels: labs, yfmt: (v) => nf(v, 0), label: "Tagesmittel Deutschland, 90 Tage" }));
      ch.appendChild(legend([["Tagesmittel €/MWh", C.fg]]));
    } else emptyBox("e-preis-chart");
    const z = (P.zonen || []).slice().sort((a, b) => (b.heute ?? -1e9) - (a.heute ?? -1e9));
    const tb = $("e-zonen").querySelector("tbody"); tb.textContent = "";
    z.forEach((r) => {
      const tr = document.createElement("tr"); if (r.code === "DE-LU") tr.className = "de";
      tr.appendChild(txt("td", "", r.land));
      ["gestern", "heute", "morgen"].forEach((k) => tr.appendChild(txt("td", "r", r[k] == null ? "–" : nf(r[k], 0))));
      tb.appendChild(tr);
    });
  }

  /* ---------- Routen, Klima, CO2, News ---------- */
  function renderRouten() {
    const t = D.routen || {};
    $("e-routen-stand").textContent = t.stand || "";
    const tb = $("e-routen").querySelector("tbody"); tb.textContent = "";
    const L = t.liste || [];
    if (!L.length) { rows("e-routen", [], [["a"], ["b"], ["c"]]); return; }
    L.forEach((r) => {
      const tr = document.createElement("tr");
      tr.appendChild(txt("td", "", r.route)); tr.appendChild(txt("td", "r", r.normal || ""));
      const td = txt("td", "", ""); const d = txt("span", "e-lage-dot " + (r.status || ""), ""); td.appendChild(d); td.appendChild(document.createTextNode(r.lage || ""));
      tr.appendChild(td); tb.appendChild(tr);
    });
    $("e-routen-src").textContent = t.quelle || "";
  }
  function renderKlima() {
    const t = D.klima || {};
    $("e-klima-stand").textContent = t.stand || "";
    $("e-klima-lage").textContent = t.lage || ""; $("e-klima-lage").hidden = !t.lage;
    const tb = $("e-ziele").querySelector("tbody"); tb.textContent = "";
    const L = t.ziele || [];
    if (!L.length) { rows("e-ziele", [], [["a"], ["b"], ["c"], ["d"], ["e"]]); }
    const KW = { ok: "auf Kurs", knapp: "knapp daneben", nein: "verfehlt" };
    L.forEach((r) => {
      const tr = document.createElement("tr");
      tr.appendChild(txt("td", "", r.land)); tr.appendChild(txt("td", "", r.ziel || "")); tr.appendChild(txt("td", "", r.stand || ""));
      tr.appendChild(txt("td", "r", r.netto_null || ""));
      const td = document.createElement("td"); if (r.kurs) { const b = txt("span", "e-kurs " + r.kurs, KW[r.kurs] || r.kurs); if (r.hinweis) b.title = r.hinweis; td.appendChild(b); }
      tr.appendChild(td); tb.appendChild(tr);
    });
    $("e-klima-src").textContent = t.quelle || "";
  }
  function renderCo2() {
    const c = E.co2, k = $("e-co2-kpis"), ch = $("e-co2-chart"); k.textContent = ""; ch.textContent = "";
    const m = D.eua || {};
    if (c && c.verlauf && c.verlauf.length) {
      const v = c.verlauf, ref = v.find((p) => p[0] >= new Date(Date.parse(c.datum) - 30 * 864e5).toISOString().slice(0, 10));
      const d = ref ? (100 * (c.wert - ref[1])) / ref[1] : null;
      kpi(k, "EUA-Auktion · " + dDE(c.datum), nf(c.wert, 2), "€/t", d != null ? { t: sg(d, 1) + " % / 30 T.", cls: d > 0 ? "e-up" : "e-dn" } : null);
      $("e-co2-stand").textContent = "EEX";
      const dates = v.map((p) => p[0]);
      ch.appendChild(lineChart([{ pts: v.map((p, i) => [i, p[1]]), color: C.fg, w: 1.4 }], { w: wOf("e-co2-chart"), h: 140, xlabels: monthLabels(dates), yfmt: (x) => nf(x, 0) + " €", label: "EUA-Auktionspreis, letztes Jahr" }));
    }
    if (m.wert != null) kpi(k, "Terminmarkt Dez." + (m.datum ? " · " + m.datum : ""), nf(m.wert, 2), "€/t");
    if (!k.childNodes.length) emptyBox("e-co2-kpis");
    rows("e-termine", (D.termine || []).map((r) => ({ d: r.datum, w: r.was })), [["d", "date"], ["w"]]);
  }

  function renderAll() {
    D = (X.data && X.data.energie) || {};
    try { renderOel(); } catch (e) { console.error(e); }
    try { renderOpec(); } catch (e) { console.error(e); }
    try { renderGas(); } catch (e) { console.error(e); }
    try { renderMix(); renderWelt(); } catch (e) { console.error(e); }
    try { renderPreise(); } catch (e) { console.error(e); }
    try { renderRouten(); renderKlima(); renderCo2(); } catch (e) { console.error(e); }
    newsList("e-news", D.news);
  }

  tabs("e-mix-tabs", (k) => { mixKey = k; renderMix(); });
  tabs("e-preis-tabs", (k) => { preisKey = k; renderPreise(); });
  document.addEventListener("datax:data", renderAll);
  // Diagramme brauchen die echte Breite: beim Öffnen des Tabs und bei Größenänderung neu zeichnen
  window.addEventListener("hashchange", () => { if (location.hash === "#energie") setTimeout(renderAll, 30); });
  let rz = 0; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(renderAll, 200); });

  function loadE() {
    fetch("energie.json?ts=" + Date.now(), { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((j) => { E = j || {}; renderAll(); })
      .catch(() => renderAll());
  }
  loadE(); loadGas();
  setInterval(loadE, 10 * 60 * 1000);
  setInterval(loadGas, 60 * 60 * 1000);
})();
