(function () {
  "use strict";

  /* ---------- Börsenuhren ---------- */
  const EXCHANGES = [
    { id: "NYSE", name: "New York", tz: "America/New_York", s: [["09:30", "16:00"]] },
    { id: "LSE", name: "London", tz: "Europe/London", s: [["08:00", "16:30"]] },
    { id: "XETRA", name: "Frankfurt", tz: "Europe/Berlin", s: [["09:00", "17:30"]] },
    { id: "SSE", name: "Shanghai", tz: "Asia/Shanghai", s: [["09:30", "11:30"], ["13:00", "15:00"]] },
    { id: "HKEX", name: "Hongkong", tz: "Asia/Hong_Kong", s: [["09:30", "12:00"], ["13:00", "16:00"]] },
    { id: "TSE", name: "Tokio", tz: "Asia/Tokyo", s: [["09:00", "11:30"], ["12:30", "15:30"]] }
  ];
  const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  function partsIn(tz, d) {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    return { wd: g("weekday"), h: Number(g("hour")) % 24, m: Number(g("minute")) };
  }
  const clocksEl = document.getElementById("clocks");
  const clockEls = EXCHANGES.map((ex) => {
    const el = document.createElement("div");
    el.className = "clock";
    el.innerHTML = '<span class="ex"></span><span class="t"></span><span class="st"><span class="dot"></span><span class="lbl"></span></span>';
    el.querySelector(".ex").textContent = ex.id;
    el.title = ex.name;
    clocksEl.appendChild(el);
    return el;
  });
  function tick() {
    const d = new Date();
    document.getElementById("now").textContent =
      new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d) + " Stuttgart";
    EXCHANGES.forEach((ex, i) => {
      const p = partsIn(ex.tz, d);
      const now = p.h * 60 + p.m;
      const weekday = !["Sat", "Sun"].includes(p.wd);
      const open = weekday && ex.s.some(([a, b]) => now >= toMin(a) && now < toMin(b));
      let label = open ? "offen" : "geschlossen";
      if (open) {
        const end = ex.s.find(([a, b]) => now >= toMin(a) && now < toMin(b))[1];
        const left = toMin(end) - now;
        label = "offen · noch " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
      } else if (weekday) {
        const next = ex.s.find(([a]) => toMin(a) > now);
        if (next) { const inM = toMin(next[0]) - now; label = "öffnet in " + Math.floor(inM / 60) + ":" + String(inM % 60).padStart(2, "0"); }
      }
      const el = clockEls[i];
      el.classList.toggle("open", open);
      el.querySelector(".t").textContent = String(p.h).padStart(2, "0") + ":" + String(p.m).padStart(2, "0");
      el.querySelector(".lbl").textContent = label;
    });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Tabs ---------- */
  const TABS = ["maerkte", "politik", "konflikte", "energie", "sport", "sonstiges"];
  function show(name) {
    if (!TABS.includes(name)) name = "maerkte";
    TABS.forEach((t) => {
      document.getElementById("tab-" + t).setAttribute("aria-selected", String(t === name));
      document.getElementById("p-" + t).hidden = t !== name;
    });
  }
  TABS.forEach((t) => document.getElementById("tab-" + t).addEventListener("click", () => { location.hash = t; }));
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  show(location.hash.slice(1));

  /* ---------- TradingView-Widgets (live) ---------- */
  function widget(id, kind, config) {
    const box = document.getElementById(id);
    if (!box) return;
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    box.appendChild(inner);
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-" + kind + ".js";
    s.async = true;
    s.textContent = JSON.stringify(Object.assign({ colorTheme: "dark", isTransparent: false, backgroundColor: "#0c0c0c", locale: "de_DE" }, config));
    s.onerror = () => { box.innerHTML = '<p class="fallback">Live-Kurse konnten nicht geladen werden.</p>'; };
    box.appendChild(s);
  }
  const quotes = (title, symbols) => ({
    width: "100%", height: "100%", showSymbolLogo: false,
    symbolsGroups: [{ name: title, symbols: symbols.map(([s, d]) => ({ name: s, displayName: d })) }]
  });
  widget("w-tape", "ticker-tape", {
    displayMode: "adaptive", showSymbolLogo: false,
    symbols: [
      { proName: "FOREXCOM:SPXUSD", title: "S&P 500" }, { proName: "INDEX:DEU40", title: "DAX" },
      { proName: "FX:EURUSD", title: "EUR/USD" }, { proName: "TVC:UKOIL", title: "Brent" },
      { proName: "TVC:GOLD", title: "Gold" }, { proName: "TVC:SILVER", title: "Silber" },
      { proName: "OANDA:DE10YBEUR", title: "Bund" }, { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" }
    ]
  });
  widget("w-fx", "market-quotes", quotes("Devisen", [["FX:EURUSD", "EUR/USD"], ["FX:EURGBP", "EUR/GBP"], ["FX:EURCHF", "EUR/CHF"], ["FX:USDJPY", "USD/JPY"], ["FX_IDC:USDCNY", "USD/CNY"], ["FX_IDC:EURCNY", "EUR/CNY"]]));
  widget("w-cmd", "market-quotes", quotes("Rohstoffe", [["TVC:UKOIL", "Brent"], ["TVC:USOIL", "WTI"], ["TVC:GOLD", "Gold"], ["TVC:SILVER", "Silber"], ["TVC:PLATINUM", "Platin"], ["CAPITALCOM:COPPER", "Kupfer"]]));
  widget("w-bonds", "market-quotes", quotes("Anleihe-Kurse", [["OANDA:DE10YBEUR", "Bund 10J"], ["OANDA:USB10YUSD", "US T-Note 10J"], ["OANDA:UK10YBGBP", "UK Gilt 10J"]]));
  widget("w-idx", "market-quotes", quotes("Indizes", [["INDEX:DEU40", "DAX"], ["FOREXCOM:SPXUSD", "S&P 500"], ["FOREXCOM:NSXUSD", "Nasdaq 100"], ["INDEX:NKY", "Nikkei 225"], ["INDEX:HSI", "Hang Seng"], ["BITSTAMP:BTCUSD", "Bitcoin"], ["BITSTAMP:ETHUSD", "Ethereum"]]));
  widget("w-kmarkt", "market-quotes", quotes("Konflikt-Barometer", [["TVC:UKOIL", "Brent"], ["TVC:GOLD", "Gold"], ["XETR:RHM", "Rheinmetall"], ["XETR:HAG", "Hensoldt"], ["NYSE:LMT", "Lockheed Martin"], ["XETR:HLAG", "Hapag-Lloyd"], ["NYSE:FRO", "Frontline (Tanker)"]]));
  // Vollständiger Kalender erst beim Aufklappen laden
  document.getElementById("wk-full").addEventListener("toggle", function once() {
    if (!this.open) return;
    this.removeEventListener("toggle", once);
    widget("w-cal", "events", { width: "100%", height: "100%", importanceFilter: "0,1", countryFilter: "us,eu,de,cn,gb,jp" });
  });

  /* ---------- Inhalte von Claude (data.json) ---------- */
  let watchSig = "";
  function watchWidget(groups) {
    const valid = (groups || []).map((g) => ({
      name: g.markt,
      symbols: (g.titel || []).filter((t) => typeof t.symbol === "string" && /^[A-Z0-9_]+:[A-Z0-9._!-]+$/i.test(t.symbol))
        .map((t) => ({ name: t.symbol, displayName: t.name }))
    })).filter((g) => g.symbols.length);
    const sig = JSON.stringify(valid);
    if (!valid.length || sig === watchSig) return;
    watchSig = sig;
    $("w-watch").textContent = "";
    widget("w-watch", "market-quotes", { width: "100%", height: "100%", showSymbolLogo: false, symbolsGroups: valid });
  }
  function renderWatch(w) {
    const box = $("m-watch"); box.textContent = "";
    w = w || {};
    $("m-watch-stand").textContent = w.stand || "";
    const groups = w.maerkte || [];
    if (!groups.length) { box.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    groups.forEach((g) => {
      const sec = txt("section", "wgroup", "");
      const h = txt("h3", "", g.markt);
      if (g.gewicht) h.appendChild(txt("span", "w", g.gewicht));
      sec.appendChild(h);
      const ul = document.createElement("ul");
      (g.titel || []).forEach((t) => {
        const li = document.createElement("li");
        const n = txt("span", "n", t.name);
        if (t.symbol) n.appendChild(txt("span", "sym", String(t.symbol).split(":").pop()));
        li.appendChild(n);
        if (t.grund) li.appendChild(txt("span", "g", t.grund));
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      box.appendChild(sec);
    });
    watchWidget(groups);
  }
  const $ = (id) => document.getElementById(id);
  const txt = (tag, cls, t) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = t == null ? "" : String(t); return e; };
  const safeUrl = (u) => (typeof u === "string" && u.startsWith("https://") ? u : null);
  function srcLine(item) {
    const p = txt("span", "src", "");
    if (item.zeit) { p.appendChild(txt("time", "zeit", item.zeit)); if (item.quelle) p.appendChild(document.createTextNode(" · ")); }
    if (item.quelle) {
      const u = safeUrl(item.url);
      if (u) { const a = txt("a", "", item.quelle); a.href = u; a.target = "_blank"; a.rel = "noopener"; p.appendChild(a); }
      else p.textContent = item.quelle;
    }
    return p;
  }
  /* ---------- Medien-Ausrichtung ---------- */
  let BIAS = {};
  const biasKey = (n) => String(n || "").trim().toLowerCase();
  fetch("medien.json?v=1").then((r) => r.json()).then((m) => {
    Object.entries(m.medien || {}).forEach(([k, v]) => { BIAS[biasKey(k)] = v; });
    $("bias-note").textContent = "Medien-Ausrichtung: " + (m.hinweis || "");
    if (lastData) render(lastData);
  }).catch(() => {});
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  function leanWord(v, us) {
    if (v <= -1.25) return us ? "deutlich demokratisch" : "deutlich links";
    if (v < -0.4) return us ? "eher demokratisch" : "eher links";
    if (v <= 0.4) return "ausgewogen / Mitte";
    if (v < 1.25) return us ? "eher republikanisch" : "eher rechts";
    return us ? "deutlich republikanisch" : "deutlich rechts";
  }
  function leanIcon(v, us, small) {
    const w = small ? 22 : 30, h = 8;
    const wrap = txt("span", "lean", "");
    if (!small) wrap.appendChild(txt("span", "", us ? "D" : "L"));
    const svg = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true" });
    svg.appendChild(svgEl("rect", { x: 0, y: h / 2 - 1, width: w, height: 2, fill: "#3a3a3a", rx: 1 }));
    for (let i = 0; i < 5; i++) svg.appendChild(svgEl("rect", { x: (i * (w - 2)) / 4, y: h / 2 - 2, width: 2, height: 4, fill: "#3a3a3a" }));
    const cx = ((v + 2) / 4) * (w - 6) + 3;
    svg.appendChild(svgEl("circle", { cx, cy: h / 2, r: small ? 2.6 : 3.2, fill: "#f2f2f2" }));
    wrap.appendChild(svg);
    if (!small) wrap.appendChild(txt("span", "", "R"));
    wrap.title = leanWord(v, us);
    return wrap;
  }
  function newsList(id, items, us) {
    const ol = $(id); ol.textContent = "";
    if (!items || !items.length) { ol.appendChild(txt("li", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    items.forEach((it) => {
      const li = document.createElement("li");
      const h = txt("span", "h", "");
      let med = Array.isArray(it.medien) ? it.medien.filter((x) => typeof x === "string") : [];
      if (!med.length && it.quelle) {
        // Fallback: Quelle selbst (und Medium in Klammern, z. B. "Briefing (Fox News)") einordnen
        const q = String(it.quelle), cand = [q.replace(/\s*\(.*\)\s*/, "").trim()];
        (q.match(/\(([^)]+)\)/g) || []).forEach((m) => m.slice(1, -1).split(/[,/]/).forEach((x) => cand.push(x.trim())));
        med = cand.filter((n) => typeof BIAS[biasKey(n)] === "number");
      }
      const rated = med.map((n) => BIAS[biasKey(n)]).filter((v) => typeof v === "number");
      if (rated.length) {
        const avg = rated.reduce((a, b) => a + b, 0) / rated.length;
        const ic = leanIcon(avg, us);
        ic.title = "Berichterstattung " + leanWord(avg, us) + " (Ø aus " + rated.length + " eingestuften Medien)";
        h.appendChild(ic);
      }
      if (it.tag) h.appendChild(txt("span", "tag", it.tag));
      h.appendChild(document.createTextNode(it.titel || ""));
      li.appendChild(h);
      if (it.warum) li.appendChild(txt("span", "why", it.warum));
      if (med.length) {
        const m = txt("span", "medien", "");
        med.forEach((n) => {
          const e = txt("span", "", "");
          const v = BIAS[biasKey(n)];
          if (typeof v === "number") e.appendChild(leanIcon(v, us, true));
          e.appendChild(document.createTextNode(n));
          m.appendChild(e);
        });
        li.appendChild(m);
      }
      li.appendChild(srcLine(it));
      ol.appendChild(li);
    });
  }

  /* ---------- Parlamente & Karten ---------- */
  const PARTY = {
    "CDU/CSU": "#6e6e6e", "CDU": "#6e6e6e", "CSU": "#6e6e6e", "SPD": "#e3000f", "Grüne": "#46962b", "AfD": "#009ee0",
    "Linke": "#be3075", "Die Linke": "#be3075", "FDP": "#ffed00", "BSW": "#792351", "Freie Wähler": "#f39200", "FW": "#f39200",
    "SSW": "#003c8f", "fraktionslos": "#bdbdbd", "Fraktionslos": "#bdbdbd",
    "D": "#3b6fd8", "Demokraten": "#3b6fd8", "R": "#d8403b", "Republikaner": "#d8403b", "I": "#bdbdbd", "Unabhängige": "#bdbdbd", "offen": "#3a3a3a", "Offen": "#3a3a3a"
  };
  const pc = (p) => PARTY[p] || "#8c8c8c";
  function hemicycle(boxId, legId, parts) {
    const box = $(boxId), leg = $(legId); box.textContent = ""; leg.textContent = "";
    parts = (parts || []).filter((p) => p && p.sitze > 0);
    const total = parts.reduce((a, p) => a + p.sitze, 0);
    if (!total) { box.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    const rows = Math.max(3, Math.round(Math.sqrt(total / 3.3)));
    const R = 100, r0 = R * 0.38;
    const radii = Array.from({ length: rows }, (_, i) => r0 + ((R - r0) * i) / (rows - 1 || 1));
    const sumR = radii.reduce((a, b) => a + b, 0);
    let counts = radii.map((rr) => Math.round((total * rr) / sumR));
    let diff = total - counts.reduce((a, b) => a + b, 0);
    counts[counts.length - 1] += diff;
    const pts = [];
    radii.forEach((rr, i) => {
      const n = counts[i];
      for (let j = 0; j < n; j++) {
        const a = Math.PI - (n === 1 ? Math.PI / 2 : (Math.PI * j) / (n - 1));
        pts.push({ a, x: 105 + rr * Math.cos(a), y: 105 - rr * Math.sin(a) });
      }
    });
    pts.sort((p, q) => q.a - p.a);
    const dot = Math.min(4.2, ((R - r0) / rows) * 0.42 + 0.6, (Math.PI * r0) / Math.max(1, counts[0]) * 0.42);
    const svg = svgEl("svg", { viewBox: "0 0 210 112", role: "img" });
    let k = 0;
    parts.forEach((p) => {
      for (let i = 0; i < p.sitze && k < pts.length; i++, k++) svg.appendChild(svgEl("circle", { cx: pts[k].x.toFixed(2), cy: pts[k].y.toFixed(2), r: dot.toFixed(2), fill: pc(p.partei) }));
    });
    const t = svgEl("text", { x: 105, y: 102, "text-anchor": "middle", fill: "#f2f2f2", "font-size": "15", "font-family": "IBM Plex Mono, monospace" });
    t.textContent = String(total);
    svg.appendChild(t);
    svg.setAttribute("aria-label", parts.map((p) => p.partei + " " + p.sitze).join(", "));
    box.appendChild(svg);
    parts.forEach((p) => { const e = txt("span", "", ""); const i = document.createElement("i"); i.style.background = pc(p.partei); e.appendChild(i); e.appendChild(document.createTextNode(p.partei)); e.appendChild(txt("b", "", p.sitze)); leg.appendChild(e); });
  }
  let MAPS = null;
  const mapsReady = fetch("maps.json?v=1").then((r) => r.json()).then((m) => { MAPS = m; }).catch(() => {});
  // Koalition "SPD–Grüne–Linke (Minderheit)" -> Parteifarben in Reihenfolge
  function coalColors(l) {
    const parts = String(l.koalition || "").replace(/\(.*?\)/g, "").split(/[–—\/,]| - /)
      .map((x) => x.replace(/[„“"]/g, "").replace(/\b(allein|Minderheit)\b/gi, "").trim()).filter(Boolean);
    const cols = [];
    parts.forEach((x) => { const c = PARTY[x]; if (c && !cols.includes(c)) cols.push(c); });
    if (!cols.length) cols.push(pc(l.partei));
    return cols;
  }
  function drawMap(boxId, which, fillFor, titleFor, dashed, dotted) {
    const box = $(boxId); box.textContent = "";
    if (!MAPS || !MAPS[which]) return;
    const M = MAPS[which];
    const svg = svgEl("svg", { viewBox: `0 0 ${M.w} ${M.h}`, role: "img" });
    const defs = svgEl("defs", {}); svg.appendChild(defs);
    const pats = {};
    const paint = (f) => {
      if (!Array.isArray(f)) return f;
      if (f.length === 1) return f[0];
      const key = f.join("|");
      if (!pats[key]) {
        const id = boxId + "-pat-" + Object.keys(pats).length, w = 9;
        const pat = svgEl("pattern", { id, patternUnits: "userSpaceOnUse", width: w * f.length, height: w * f.length, patternTransform: "rotate(45)" });
        f.forEach((c, i) => pat.appendChild(svgEl("rect", { x: i * w, y: 0, width: w, height: w * f.length, fill: c })));
        defs.appendChild(pat); pats[key] = `url(#${id})`;
      }
      return pats[key];
    };
    Object.entries(M.states).forEach(([code, st]) => {
      const path = svgEl("path", { d: st.d, fill: paint(fillFor(code)) || "#2a2a2a" });
      if (dashed && dashed(code)) path.setAttribute("class", "gf");
      const tt = svgEl("title", {}); tt.textContent = titleFor(code, st.name); path.appendChild(tt);
      svg.appendChild(path);
      if (dotted && dotted(code)) {
        const did = boxId + "-dots";
        if (!defs.querySelector("#" + did)) {
          const pat = svgEl("pattern", { id: did, patternUnits: "userSpaceOnUse", width: 7, height: 7 });
          pat.appendChild(svgEl("circle", { cx: 3.5, cy: 3.5, r: 1.6, fill: "#b4b4b4" }));
          defs.appendChild(pat);
        }
        const ov = svgEl("path", { d: st.d, fill: `url(#${did})`, "pointer-events": "none" });
        svg.appendChild(ov);
      }
    });
    box.appendChild(svg);
  }
  function legendFrom(id, entries) {
    const leg = $(id); leg.textContent = "";
    entries.forEach(([label, color, n]) => { const e = txt("span", "", ""); const i = document.createElement("i"); i.style.background = color; e.appendChild(i); e.appendChild(document.createTextNode(label)); if (n != null) e.appendChild(txt("b", "", n)); leg.appendChild(e); });
  }
  function renderParl(P) {
    P = P || {};
    const de = P.deutschland || {}, us = P.usa || {};
    $("pd-stand").textContent = de.stand || ""; $("pu-stand").textContent = us.stand || "";
    hemicycle("pd-bt", "pd-bt-leg", (de.bundestag || {}).sitze);
    const L = de.laender || [];
    const byCode = {}; L.forEach((l) => { byCode[l.code] = l; });
    drawMap("pd-map", "de", (c) => byCode[c] && coalColors(byCode[c]), (c, n) => { const l = byCode[c]; return l ? `${n}: ${l.regierungschef} (${l.partei}), ${l.koalition}${l.hinweis ? " – " + l.hinweis : ""}` : n; }, null, (c) => byCode[c] && byCode[c].hinweis);
    const cnt = {}; L.forEach((l) => { const k = l.partei === "CDU" || l.partei === "CSU" ? "CDU/CSU" : l.partei; cnt[k] = (cnt[k] || 0) + 1; });
    const ents = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([p, n]) => [p, pc(p), n]);
    if (L.some((l) => coalColors(l).length > 1)) ents.push(["gestreift: Koalition in Parteifarben", "repeating-linear-gradient(45deg,#e3000f 0 3px,#46962b 3px 6px)", null]);
    if (L.some((l) => l.hinweis)) ents.push(["gepunktet: Regierungsbildung ausstehend", "radial-gradient(circle,#b4b4b4 1.2px,#3a3a3a 1.4px) 0 0/4px 4px", null]);
    legendFrom("pd-map-leg", ents);
    const tb = $("pd-laender").querySelector("tbody"); tb.textContent = "";
    L.forEach((l) => {
      const tr = document.createElement("tr");
      const td1 = txt("td", "", ""); const d = txt("span", "pdot", ""); { const cc = coalColors(l); d.style.background = cc.length > 1 ? "linear-gradient(90deg," + cc.map((c, i) => `${c} ${(i * 100 / cc.length).toFixed(1)}% ${((i + 1) * 100 / cc.length).toFixed(1)}%`).join(",") + ")" : cc[0]; } td1.appendChild(d); td1.appendChild(document.createTextNode(l.land));
      tr.appendChild(td1); tr.appendChild(txt("td", "", l.regierungschef + " (" + l.partei + ")"));
      tr.appendChild(txt("td", "", l.koalition + (l.hinweis ? " · " + l.hinweis : ""))); tb.appendChild(tr);
    });
    $("pd-src").textContent = de.quelle || "";
    hemicycle("pu-house", "pu-house-leg", (us.repraesentantenhaus || {}).sitze);
    hemicycle("pu-senate", "pu-senate-leg", (us.senat || {}).sitze);
    $("pu-note").textContent = us.kongress_hinweis || "";
    const G = us.gouverneure || {}, W = us.wechsel || {};
    drawMap("pu-map", "us", (c) => G[c] && pc(G[c]), (c, n) => n + ": Gouverneur " + (G[c] === "D" ? "Demokrat" : G[c] === "R" ? "Republikaner" : (G[c] || "?")) + (W[c] ? " – wechselt zu " + (W[c] === "D" ? "Demokraten" : "Republikanern") : ""), (c) => W[c]);
    const gc = { D: 0, R: 0 }; Object.values(G).forEach((v) => { gc[v] = (gc[v] || 0) + 1; });
    const ge = [["Demokraten", pc("D"), gc.D], ["Republikaner", pc("R"), gc.R]];
    if (Object.keys(W).length) ge.push(["gestrichelt: Wechsel " + (us.wechsel_ab || ""), "transparent", null]);
    legendFrom("pu-map-leg", ge);
    $("pu-map-note").textContent = us.gouverneure_hinweis || "";
    $("pu-src").textContent = us.quelle || "";
  }
  function rows(tableId, data, cols) {
    const tb = $(tableId).querySelector("tbody"); tb.textContent = "";
    if (!data || !data.length) { const tr = document.createElement("tr"); const td = txt("td", "empty", "Wird beim nächsten Lauf gefüllt."); td.colSpan = cols.length; tr.appendChild(td); tb.appendChild(tr); return; }
    data.forEach((r) => {
      const tr = document.createElement("tr");
      cols.forEach(([k, cls]) => tr.appendChild(txt("td", cls || "", r[k])));
      tb.appendChild(tr);
    });
  }

  /* Nächste Spiele / letzte Ergebnisse je Liga (data.json: sport.ligen[].spiele) */
  function gamesCard(L) {
    const sp = L.spiele || {};
    const card = document.createElement("article"); card.className = "card span2";
    card.appendChild(txt("h2", "", "Spiele · " + L.name));
    const cols = document.createElement("div"); cols.className = "games";
    function list(title, items, done) {
      const col = document.createElement("div");
      col.appendChild(txt("h3", "", title));
      if (!items || !items.length) { col.appendChild(txt("p", "empty", done ? "Wird beim nächsten Lauf gefüllt." : (sp.hinweis || "Wird beim nächsten Lauf gefüllt."))); return col; }
      const ul = document.createElement("ul"); ul.className = "gl";
      items.forEach((g) => {
        const li = document.createElement("li");
        li.appendChild(txt("span", "gd", (g.datum || "") + (g.zeit ? " " + g.zeit : "")));
        const m = document.createElement("span"); m.className = "gm";
        let hw = null;
        if (done && g.ergebnis) { const p = String(g.ergebnis).split(/[:\-–]/).map((x) => parseFloat(x)); if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) && p[0] !== p[1]) hw = p[0] > p[1]; }
        const home = txt("span", hw === true ? "w" : "", g.heim || "?"), away = txt("span", hw === false ? "w" : "", g.gast || "?");
        if (L.us) { m.appendChild(away); m.appendChild(document.createTextNode(" @ ")); m.appendChild(home); }
        else { m.appendChild(home); m.appendChild(document.createTextNode(" – ")); m.appendChild(away); }
        if (g.info) m.appendChild(txt("span", "gi", g.info));
        li.appendChild(m);
        let res = done ? (g.ergebnis || "") : "";
        if (done && L.us && g.ergebnis) { const p = String(g.ergebnis).split(":"); if (p.length === 2) res = p[1] + ":" + p[0]; }
        li.appendChild(txt("span", "gr", res));
        ul.appendChild(li);
      });
      col.appendChild(ul); return col;
    }
    cols.appendChild(list("Als Nächstes", sp.naechste, false));
    cols.appendChild(list("Letzte Ergebnisse", sp.letzte, true));
    card.appendChild(cols);
    if (sp.hinweis && sp.naechste && sp.naechste.length) card.appendChild(txt("p", "src", sp.hinweis));
    return card;
  }

  function renderSport(sport) {
    const nav = $("league-nav"), body = $("sport-body");
    const leagues = (sport && sport.ligen) || [];
    nav.textContent = ""; body.textContent = "";
    if (!leagues.length) { body.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    let active = 0;
    try { const s = Number(localStorage.getItem("liga")); if (s >= 0 && s < leagues.length) active = s; } catch (e) {}
    function draw() {
      body.textContent = "";
      [...nav.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === active)));
      const L = leagues[active];
      body.appendChild(gamesCard(L));
      const news = document.createElement("article"); news.className = "card";
      news.appendChild(txt("h2", "", "Schlagzeilen · " + L.name));
      const ol = document.createElement("ol"); ol.className = "news"; ol.id = "sport-news"; news.appendChild(ol);
      body.appendChild(news);
      newsList("sport-news", L.schlagzeilen);
      const tab = document.createElement("article"); tab.className = "card";
      tab.appendChild(txt("h2", "", L.us ? "Conference Standings" : "Tabelle"));
      const wrap = document.createElement("div"); wrap.className = "scroll conf"; tab.appendChild(wrap);
      (L.tabellen || []).forEach((t) => {
        if (t.titel) wrap.appendChild(txt("h3", "", t.titel));
        const table = document.createElement("table"); table.className = "tbl";
        const head = document.createElement("tr");
        (t.spalten || []).forEach((c, i) => head.appendChild(txt("th", i > 1 ? "r" : "", c)));
        const th = document.createElement("thead"); th.appendChild(head); table.appendChild(th);
        const tb = document.createElement("tbody");
        (t.zeilen || []).forEach((z) => { const tr = document.createElement("tr"); z.forEach((v, i) => tr.appendChild(txt("td", i > 1 ? "r" : (i === 0 ? "num" : ""), v))); tb.appendChild(tr); });
        table.appendChild(tb); wrap.appendChild(table);
      });
      if (!(L.tabellen || []).length) wrap.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt."));
      if (L.stand) tab.appendChild(txt("p", "src", "Stand: " + L.stand));
      body.appendChild(tab);
    }
    leagues.forEach((L, i) => {
      const b = txt("button", "", L.kurz || L.name);
      b.type = "button";
      b.addEventListener("click", () => { active = i; try { localStorage.setItem("liga", String(i)); } catch (e) {} draw(); });
      nav.appendChild(b);
    });
    draw();
  }


  /* ---------- Konflikte ---------- */
  const STUFE = { 3: ["Krieg", "#d64541"], 2: ["Bewaffneter Konflikt", "#a0522d"], 1: ["Angespannt", "#6b5a35"] };
  let WELT = null;
  const weltReady = fetch("welt.json?v=1").then((r) => r.json()).then((m) => { WELT = m; }).catch(() => {});
  let kActive = null;
  function stufeBadge(n) {
    const s = STUFE[n]; if (!s) return null;
    const b = txt("span", "stufe", s[0]); b.style.borderColor = s[1]; b.style.color = s[1] === "#6b5a35" ? "#b9a36a" : s[1];
    return b;
  }
  function renderKonflikte(K) {
    K = K || {};
    $("k-stand").textContent = K.stand || "";
    const liste = (K.liste || []).filter((c) => c && c.id);
    // Karte
    weltReady.then(() => {
      const box = $("k-map"); box.textContent = "";
      if (!WELT) return;
      const by = {}; (K.karte || []).forEach((e) => { if (e && e.code) by[e.code] = e; });
      const svg = svgEl("svg", { viewBox: `0 0 ${WELT.w} ${WELT.h}`, role: "img", "aria-label": "Weltkarte der Konflikte" });
      Object.entries(WELT.states).forEach(([code, st]) => {
        const e = by[code];
        const path = svgEl("path", { d: st.d, fill: e && STUFE[e.stufe] ? STUFE[e.stufe][1] : "#232323" });
        const tt = svgEl("title", {});
        tt.textContent = e ? st.name + ": " + (STUFE[e.stufe] ? STUFE[e.stufe][0] : "") + (e.hinweis ? " – " + e.hinweis : "") : st.name;
        path.appendChild(tt);
        if (e && e.konflikt && liste.some((c) => c.id === e.konflikt)) {
          path.classList.add("hit");
          path.addEventListener("click", () => { kActive = e.konflikt; drawLage(liste); $("k-lage-card").scrollIntoView({ behavior: "smooth", block: "start" }); });
        }
        svg.appendChild(path);
      });
      box.appendChild(svg);
      legendFrom("k-map-leg", [3, 2, 1].map((n) => [STUFE[n][0], STUFE[n][1], (K.karte || []).filter((e) => e.stufe === n).length || null]).concat([["Land anklicken: Lage", "transparent", null]]));
    });
    // Lage je Konflikt
    const nav = $("k-nav"); nav.textContent = "";
    if (!liste.some((c) => c.id === kActive)) {
      kActive = null;
      try { const s = localStorage.getItem("konflikt"); if (liste.some((c) => c.id === s)) kActive = s; } catch (e) {}
      if (!kActive && liste.length) kActive = liste[0].id;
    }
    liste.forEach((c) => {
      const b = txt("button", "", c.kurz || c.name); b.type = "button"; b.dataset.id = c.id;
      b.addEventListener("click", () => { kActive = c.id; try { localStorage.setItem("konflikt", c.id); } catch (e) {} drawLage(liste); });
      nav.appendChild(b);
    });
    drawLage(liste);
    // Front
    const F = K.front || {};
    $("k-front-stand").textContent = F.stand || "";
    $("k-front-lage").textContent = F.lage || "";
    newsList("k-front", F.punkte);
    const fs = $("k-front-src"); fs.textContent = "";
    (F.karten || []).forEach((k, i) => { const u = safeUrl(k.url); if (!u) return; if (fs.childNodes.length) fs.appendChild(document.createTextNode(" · ")); const a = txt("a", "", k.name); a.href = u; a.target = "_blank"; a.rel = "noopener"; fs.appendChild(a); });
    if (fs.childNodes.length) fs.insertBefore(document.createTextNode("Karten: "), fs.firstChild);
    newsList("k-dipl", K.diplomatie);
    newsList("k-ruest", K.ruestung);
    const M = K.markt || {};
    $("k-markt-lage").textContent = M.lage || "";
    rows("k-routen", M.routen, [["route"], ["status"]]);
    rows("k-hum", K.humanitaer, [["konflikt"], ["tote"], ["vertriebene"], ["zugang"]]);
    $("k-hum-src").textContent = K.humanitaer_quelle || "";
    // Radar
    const rl = $("k-radar"); rl.textContent = "";
    const R = K.radar || [];
    if (!R.length) rl.appendChild(txt("li", "empty", "Wird beim nächsten Lauf gefüllt."));
    R.forEach((r) => {
      const li = document.createElement("li");
      const h = txt("span", "h", "");
      const lv = txt("span", "lvl lvl-" + biasKey(r.stufe).replace(/[^a-zäöü]/g, ""), r.stufe || "");
      h.appendChild(lv); h.appendChild(document.createTextNode(r.ort || ""));
      li.appendChild(h);
      if (r.warum) li.appendChild(txt("span", "why", r.warum));
      if (r.quelle || r.zeit) li.appendChild(srcLine(r));
      rl.appendChild(li);
    });
  }
  function drawLage(liste) {
    const body = $("k-lage"); body.textContent = "";
    [...$("k-nav").children].forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === kActive)));
    const c = liste.find((x) => x.id === kActive);
    if (!c) { body.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    const head = txt("div", "k-head", "");
    head.appendChild(txt("h3", "", c.name));
    const sb = stufeBadge(c.stufe); if (sb) head.appendChild(sb);
    if (c.seit) head.appendChild(txt("span", "k-seit", "seit " + c.seit));
    body.appendChild(head);
    if (c.lage) body.appendChild(txt("p", "k-lage", c.lage));
    const ol = document.createElement("ol"); ol.className = "news"; ol.id = "k-lage-news"; body.appendChild(ol);
    newsList("k-lage-news", c.meldungen);
  }

  /* ---------- Mehr zum Thema (Klick auf Kachelüberschrift) ---------- */
  const dlg = $("mehr");
  function openMehr(h) {
    const key = h.dataset.mehr;
    const all = (lastData && lastData.mehr) || {};
    let e = all[key] || {};
    if (Array.isArray(e)) e = { meldungen: e };
    $("mehr-title").textContent = (h.querySelector("span") ? h.querySelector("span").textContent : h.textContent).replace(/\?$/, "");
    $("mehr-lage").textContent = e.lage || "";
    $("mehr-lage").hidden = !e.lage;
    newsList("mehr-list", e.meldungen, key === "usa");
    $("mehr-stand").textContent = lastData && lastData.aktualisiert ? "Gesammelt beim Lauf " + lastData.aktualisiert : "";
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  document.querySelectorAll("h2[data-mehr]").forEach((h) => {
    h.classList.add("mehr-h"); h.tabIndex = 0; h.setAttribute("role", "button");
    h.title = "Mehr zum Thema";
    h.addEventListener("click", () => openMehr(h));
    h.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openMehr(h); } });
  });
  $("mehr-x").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });


  /* ---------- Briefing, Notenbank-Uhr, Wirtschaftskalender (data.json) ---------- */
  const BER = "Europe/Berlin";
  const fmtDay = new Intl.DateTimeFormat("de-DE", { timeZone: BER, weekday: "short", day: "2-digit", month: "2-digit" });
  const fmtTime = new Intl.DateTimeFormat("de-DE", { timeZone: BER, hour: "2-digit", minute: "2-digit" });
  const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: BER }).format(d);
  function renderBriefing(b) {
    const box = $("briefing");
    const list = (b && b.saetze) || [];
    box.hidden = !list.length;
    const ol = $("br-list"); ol.textContent = "";
    list.forEach((x) => {
      const li = document.createElement("li");
      if (typeof x === "string") li.textContent = x;
      else {
        if (x.tag) li.appendChild(txt("span", "br-tag", x.tag));
        li.appendChild(document.createTextNode(x.text || ""));
      }
      ol.appendChild(li);
    });
    $("br-stand").textContent = (b && b.stand) || "";
  }

  let NB = [];
  function countdown(ms) {
    if (ms <= 0) return "jetzt";
    const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
    return d ? d + " T " + h + " Std" : h ? h + " Std " + mi + " Min" : mi + " Min";
  }
  function tickNB() {
    const now = Date.now();
    NB.forEach(({ t, el }) => { el.textContent = isNaN(t) ? "–" : (t - now < -6 * 3600e3 ? "entschieden" : "in " + countdown(t - now)); });
  }
  function renderNB(n) {
    const g = $("nb-grid"); g.textContent = ""; NB = [];
    const banken = (n && n.banken) || [];
    $("nb-stand").textContent = (n && n.stand) || "";
    if (!banken.length) { g.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    banken.forEach((b) => {
      const c = txt("div", "nb", "");
      const head = txt("div", "nb-h", "");
      head.appendChild(txt("span", "nb-k", b.kuerzel || b.name));
      head.appendChild(txt("span", "nb-z", b.zins || ""));
      c.appendChild(head);
      const t = Date.parse(b.termin);
      const cd = txt("div", "nb-cd", "");
      c.appendChild(cd); NB.push({ t, el: cd });
      const when = isNaN(t) ? (b.termin || "") : fmtDay.format(t) + ", " + fmtTime.format(t) + " Uhr" + (b.zeit_ca ? " (ca.)" : "");
      c.appendChild(txt("div", "nb-d", when));
      const sz = txt("div", "nb-sz", "");
      const top = Math.max(0, ...(b.szenarien || []).map((s) => +s.p || 0));
      (b.szenarien || []).forEach((s) => {
        const r = txt("div", "nb-r" + ((+s.p || 0) === top ? " top" : ""), "");
        r.appendChild(txt("span", "nb-w", s.was));
        const bar = txt("span", "nb-bar", ""); const fill = txt("i", "", ""); fill.style.width = Math.max(0, Math.min(100, +s.p || 0)) + "%"; bar.appendChild(fill);
        r.appendChild(bar);
        r.appendChild(txt("span", "nb-p", (Math.round((+s.p || 0) * 10) / 10).toLocaleString("de-DE") + " %"));
        sz.appendChild(r);
      });
      c.appendChild(sz);
      if (b.notiz) c.appendChild(txt("p", "nb-n", b.notiz));
      if (b.quelle) c.appendChild(srcLine({ quelle: b.quelle, url: b.url }));
      g.appendChild(c);
    });
    tickNB();
  }
  setInterval(tickNB, 30 * 1000);

  function renderWK(k) {
    const tb = $("wk").querySelector("tbody"); tb.textContent = "";
    $("wk-stand").textContent = (k && k.stand) || "";
    const list = ((k && k.termine) || []).slice().sort((a, b) => Date.parse(a.zeit) - Date.parse(b.zeit));
    if (!list.length) { const tr = document.createElement("tr"); const td = txt("td", "empty", "Wird beim nächsten Lauf gefüllt."); td.colSpan = 6; tr.appendChild(td); tb.appendChild(tr); return; }
    const today = dayKey(new Date());
    let last = "";
    list.forEach((e) => {
      const t = Date.parse(e.zeit);
      const dk = isNaN(t) ? "" : dayKey(t);
      if (dk !== last) {
        last = dk;
        const tr = txt("tr", "wk-day" + (dk === today ? " today" : ""), "");
        const td = txt("td", "", isNaN(t) ? "" : (dk === today ? "Heute · " : "") + fmtDay.format(t)); td.colSpan = 6; tr.appendChild(td); tb.appendChild(tr);
      }
      const done = e.ist != null && e.ist !== "";
      const tr = txt("tr", done ? "done" : (!isNaN(t) && t < Date.now() ? "due" : ""), "");
      tr.appendChild(txt("td", "date", isNaN(t) ? "" : fmtTime.format(t)));
      tr.appendChild(txt("td", "wk-l", e.land || ""));
      const w = txt("td", "wk-w", "");
      const imp = Math.max(1, Math.min(3, +e.wichtig || 1));
      w.appendChild(txt("span", "wk-imp", "●".repeat(imp) + "○".repeat(3 - imp)));
      w.appendChild(document.createTextNode(e.was || ""));
      if (e.lesart) w.appendChild(txt("span", "wk-les", e.lesart));
      tr.appendChild(w);
      tr.appendChild(txt("td", "r", e.prognose || "–"));
      tr.appendChild(txt("td", "r muted", e.vorher || "–"));
      const ist = txt("td", "r ist", done ? e.ist : "");
      if (done && e.abweichung) {
        const up = e.abweichung === "hoeher", dn = e.abweichung === "tiefer";
        ist.appendChild(txt("span", "wk-a", up ? " ▲" : dn ? " ▼" : " ="));
        ist.title = up ? "über Konsens" : dn ? "unter Konsens" : "wie erwartet";
      }
      tr.appendChild(ist);
      tb.appendChild(tr);
    });
  }

  let lastData = null;
  function render(d) {
    lastData = d;
    if (window.DataX) { window.DataX.data = d; document.dispatchEvent(new CustomEvent("datax:data", { detail: d })); }
    if (d.aktualisiert) $("updated").textContent = "Inhalte: " + d.aktualisiert;
    const m = d.maerkte || {};
    newsList("m-headlines", m.schlagzeilen);
    renderWatch(m.watchlist);
    renderBriefing(d.briefing);
    renderNB(m.notenbanken);
    renderWK(m.kalender);
    rows("m-debt", m.verschuldung, [["land"], ["quote", "r"], ["absolut", "r"]]);
    $("m-debt-src").textContent = m.verschuldung_quelle || "";
    rows("m-yields", m.renditen, [["land"], ["rendite", "r"]]);
    $("m-yields-src").textContent = m.renditen_stand || "";
    rows("m-corp", m.termine, [["datum", "date"], ["was"]]);
    const p = d.politik || {};
    newsList("p-welt", p.welt); newsList("p-usa", p.usa, true); newsList("p-de", p.deutschland);
    rows("p-termine", p.termine, [["datum", "date"], ["was"], ["art"]]);
    newsList("p-recht", p.recht);
    mapsReady.then(() => renderParl(p.parlamente));
    renderKonflikte(d.konflikte);
    renderSport(d.sport);
    const s = d.sonstiges || {};
    const en = s.englisch || {}, zh = s.chinesisch || {};
    $("en-word").textContent = en.wort || "–"; $("en-meta").textContent = [en.aussprache, en.wortart].filter(Boolean).join(" · ");
    $("en-def").textContent = en.bedeutung || ""; $("en-ex").textContent = en.beispiel || "";
    $("zh-word").textContent = zh.zeichen || "–"; $("zh-meta").textContent = [zh.pinyin, zh.wortart].filter(Boolean).join(" · ");
    $("zh-def").textContent = zh.bedeutung || ""; $("zh-ex").textContent = zh.beispiel || "";
    $("f-fun").textContent = s.funfact || "";
    const dl = $("f-wissen"); dl.textContent = "";
    (s.wissen || []).forEach((w) => { dl.appendChild(txt("dt", "", w.bereich)); dl.appendChild(txt("dd", "", w.fakt)); });
    const t = s.steuerrecht || {};
    $("t-q").textContent = t.frage || ""; $("t-a").textContent = t.antwort || ""; $("t-norm").textContent = t.norm || "";
  }

  /* ---------- Markt-Kacheln (kacheln.json, von GitHub Action) ---------- */
  // ?-Tooltips
  let openTip = null;
  function closeTip() { if (openTip) { openTip.tip.remove(); openTip.btn.setAttribute("aria-expanded", "false"); openTip = null; } }
  document.querySelectorAll(".info[data-tip]").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
    const show = () => {
      if (openTip && openTip.btn === btn) return;
      closeTip();
      const tip = txt("div", "tip", ""); tip.setAttribute("role", "tooltip");
      tip.appendChild(txt("b", "", btn.parentNode.firstChild.textContent));
      tip.appendChild(document.createTextNode(btn.dataset.tip));
      tip.addEventListener("click", (e) => e.stopPropagation());
      btn.parentNode.appendChild(tip); btn.setAttribute("aria-expanded", "true");
      openTip = { btn, tip };
    };
    btn.addEventListener("click", (e) => { e.stopPropagation(); if (openTip && openTip.btn === btn) closeTip(); else show(); });
    btn.addEventListener("mouseenter", show);
    btn.parentNode.addEventListener("mouseleave", () => { if (openTip && openTip.btn === btn) closeTip(); });
  });
  document.addEventListener("click", closeTip);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTip(); });
  document.querySelectorAll("#k-zins .ktabs button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#k-zins .ktabs button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    $("k-zins-us").hidden = b.dataset.k !== "us"; $("k-zins-ezb").hidden = b.dataset.k !== "ezb";
  }));

  const nf = (v, d) => (v == null || isNaN(v) ? "–" : Number(v).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d }));
  const sg = (v, d) => (v == null ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "±") + nf(Math.abs(v), d));
  const dDE = (iso) => (iso ? iso.slice(8, 10) + "." + iso.slice(5, 7) + "." + iso.slice(2, 4) : "");
  const GAIN = [63, 185, 80], LOSS = [248, 81, 73];
  const empty = (id) => { const b = $(id); b.textContent = ""; b.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); };

  // Linienchart: series [{pts:[[x,y]], color, dash, w}], x numerisch 0..n
  function lineChart(series, o) {
    const W = Math.max(280, Math.min(900, o.w || 560)), H = o.h || 200, L = 40, R = 10, T = 10, B = 22;
    const xs = series.flatMap((s) => s.pts.map((p) => p[0])), ys = series.flatMap((s) => s.pts.map((p) => p[1])).filter((v) => v != null);
    const x0 = o.xmin != null ? o.xmin : Math.min(...xs), x1 = o.xmax != null ? o.xmax : Math.max(...xs);
    let y0 = o.ymin != null ? o.ymin : Math.min(...ys), y1 = o.ymax != null ? o.ymax : Math.max(...ys);
    if (o.ymin == null) { const pad = (y1 - y0) * 0.12 || 0.5; y0 -= pad; y1 += pad; }
    const X = (v) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R), Y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    const ticks = o.yticks || niceTicks(y0, y1);
    ticks.forEach((v) => {
      svg.appendChild(svgEl("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: "#222", "stroke-width": 1 }));
      const t = svgEl("text", { x: L - 6, y: Y(v) + 3, "text-anchor": "end" }); t.textContent = (o.yfmt || ((x) => nf(x, 1)))(v); svg.appendChild(t);
    });
    if (o.zero && y0 < 0 && y1 > 0) svg.appendChild(svgEl("line", { x1: L, x2: W - R, y1: Y(0), y2: Y(0), stroke: "#555", "stroke-width": 1 }));
    (o.xlabels || []).forEach(([x, lab]) => { const t = svgEl("text", { x: X(x), y: H - 6, "text-anchor": "middle" }); t.textContent = lab; svg.appendChild(t); });
    series.forEach((s) => {
      let d = "", pen = false;
      s.pts.forEach(([x, y]) => { if (y == null) { pen = false; return; } d += (pen ? "L" : "M") + X(x).toFixed(1) + "," + Y(y).toFixed(1); pen = true; });
      svg.appendChild(svgEl("path", { d, fill: "none", stroke: s.color, "stroke-width": s.w || 1.6, "stroke-dasharray": s.dash ? "4 3" : "none", "stroke-linejoin": "round" }));
      if (s.dots) s.pts.forEach(([x, y]) => { if (y != null) svg.appendChild(svgEl("circle", { cx: X(x), cy: Y(y), r: 2.6, fill: s.color })); });
    });
    const box = txt("div", "chart", ""); box.appendChild(svg);
    if (o.label) svg.setAttribute("aria-label", o.label);
    return box;
  }
  function niceTicks(a, b) {
    const raw = (b - a) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), st = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) || raw;
    const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6)); return out;
  }
  const CW = () => Math.max(280, ($("k-zins-us").clientWidth || $("k-breadth-body").clientWidth || 560));
  const CWh = () => { const w = $("k-stress-body").clientWidth || 560; return w > 620 ? (w - 16) * 0.545 : w; };
  function legend(items) {
    const l = txt("div", "kleg", "");
    items.forEach(([lab, c, dash]) => { const e = txt("span", "", ""); const i = document.createElement("i"); i.style.borderTopColor = c; if (dash) i.className = "d"; e.appendChild(i); e.appendChild(document.createTextNode(lab)); l.appendChild(e); });
    return l;
  }
  function monthLabels(dates) {
    const out = []; let last = "";
    dates.forEach((d, i) => { const m = d.slice(0, 7); if (m !== last && i > 5) { if (Number(d.slice(5, 7)) % 2 === 1) out.push([i, ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][Number(d.slice(5, 7)) - 1]]); } last = m; });
    return out;
  }

  function renderSek(s) {
    const g = $("k-sek-grid"); g.textContent = "";
    if (!s || !s.liste) { empty("k-sek-grid"); return; }
    $("k-sek-stand").textContent = s.stand || "";
    s.liste.forEach((x) => {
      const t = txt("div", "t", ""), c = x.chg || 0, a = Math.min(1, Math.abs(c) / 2.5) * 0.55 + 0.06, rgb = c >= 0 ? GAIN : LOSS;
      t.style.background = `rgba(${rgb.join(",")},${a.toFixed(2)})`;
      t.title = `${x.name} (${x.sym}): ${nf(x.kurs, 2)} $, ${sg(x.chg, 2)} %`;
      t.appendChild(txt("div", "s", x.sym));
      t.appendChild(txt("div", "c " + (c >= 0 ? "up" : "dn"), sg(x.chg, 2) + "%"));
      t.appendChild(txt("div", "n", x.name));
      g.appendChild(t);
    });
    const p = s.spx || {};
    if (p.chg != null) {
      const t = txt("div", "t spx", ""); t.appendChild(txt("div", "s", "SPY")); t.appendChild(txt("div", "c " + (p.chg >= 0 ? "up" : "dn"), sg(p.chg, 2) + "%")); t.appendChild(txt("div", "n", "S&P 500 gesamt")); g.appendChild(t);
    }
    $("k-sek-src").textContent = `Handelstag ${dDE(p.datum)} · ${s.quelle || "CNBC"}`;
  }

  const LZX = { "1M": 1 / 12, "3M": 0.25, "6M": 0.5, "1J": 1, "2J": 2, "5J": 5, "10J": 10, "30J": 30 };
  const lzPos = (lz) => Math.log2(LZX[lz] * 12); // logarithmische Laufzeitachse
  const curvePts = (pts) => (pts || []).filter((p) => LZX[p.lz] != null).map((p) => [lzPos(p.lz), p.r]);
  function renderZins(u, e) {
    const us = $("k-zins-us"); us.textContent = "";
    if (!u || !u.punkte) empty("k-zins-us");
    else {
      $("k-zins-stand").textContent = u.stand || "";
      const st = txt("div", "kstat", "");
      const col = u.status === "invers" ? "var(--loss)" : u.status === "flach" ? "var(--warn)" : "var(--gain)";
      const b = txt("span", "badge", u.status || "–"); b.style.background = col; st.appendChild(b);
      const sp = txt("span", "", "2J-10J-Spread: "); sp.appendChild(txt("b", u.spread_2_10 >= 0 ? "up" : "dn", sg(u.spread_2_10, 0) + " bp")); st.appendChild(sp);
      st.appendChild(txt("span", "", "3M-10J: " + sg(u.spread_3m_10, 0) + " bp"));
      us.appendChild(st);
      const ser = [];
      if (u.vorjahr && u.vorjahr.punkte) ser.push({ pts: curvePts(u.vorjahr.punkte), color: "#555", dash: true, w: 1.2 });
      if (u.vormonat && u.vormonat.punkte) ser.push({ pts: curvePts(u.vormonat.punkte), color: "#9a9a9a", dash: true, w: 1.2 });
      ser.push({ pts: curvePts(u.punkte), color: "#5b9cf5", dots: true, w: 2 });
      us.appendChild(lineChart(ser, { w: CW(), h: 190, xlabels: Object.keys(LZX).map((k) => [lzPos(k), k]), yfmt: (v) => nf(v, 1) + "%", label: "US-Zinskurve" }));
      us.appendChild(legend([["Heute " + dDE(u.datum), "#5b9cf5"], ["Vor 1 Monat", "#9a9a9a", 1], ["Vor 1 Jahr", "#555", 1]]));
      const tb = document.createElement("table"); tb.className = "tbl compact";
      const hr = document.createElement("tr"); const br = document.createElement("tr");
      u.punkte.forEach((p) => { hr.appendChild(txt("th", "r", p.lz)); br.appendChild(txt("td", "r", nf(p.r, 2))); });
      const th = document.createElement("thead"); th.appendChild(hr); tb.appendChild(th); const tbd = document.createElement("tbody"); tbd.appendChild(br); tb.appendChild(tbd);
      const sc = txt("div", "scroll", ""); sc.appendChild(tb); us.appendChild(sc);
      if (u.spread_verlauf && u.spread_verlauf.length > 20) {
        us.appendChild(txt("h3", "sub", "2J-10J-Spread, 1 Jahr (bp)")).style.marginTop = "12px";
        const sv = u.spread_verlauf;
        us.appendChild(lineChart([{ pts: sv.map((x, i) => [i, x[1]]), color: "#d0d0d0", w: 1.4 }], { w: CW(), h: 120, zero: true, xlabels: monthLabels(sv.map((x) => x[0])), yfmt: (v) => nf(v, 0), label: "Spread-Verlauf" }));
      }
      us.appendChild(txt("p", "src", "Quelle: " + (u.quelle || "") + ", Stand " + dDE(u.datum)));
    }
    const ez = $("k-zins-ezb"); ez.textContent = "";
    if (!e || !e.zinsen) { empty("k-zins-ezb"); return; }
    const tb = document.createElement("table"); tb.className = "tbl";
    const th = document.createElement("thead"); const hr = document.createElement("tr");
    [["Satz"], ["Aktuell", "r"], ["Seit", "r"], ["Zuvor", "r"]].forEach(([t, c]) => hr.appendChild(txt("th", c || "", t))); th.appendChild(hr); tb.appendChild(th);
    const body = document.createElement("tbody");
    e.zinsen.forEach((z) => { const tr = document.createElement("tr"); tr.appendChild(txt("td", "", z.name)); tr.appendChild(txt("td", "r", nf(z.wert, 2) + " %")); tr.appendChild(txt("td", "r", z.vorher != null ? dDE(z.seit) : "–")); tr.appendChild(txt("td", "r", z.vorher != null ? nf(z.vorher, 2) + " %" : "–")); body.appendChild(tr); });
    if (e.estr) { const tr = document.createElement("tr"); tr.appendChild(txt("td", "", "€STR (Tagesgeld)")); tr.appendChild(txt("td", "r", nf(e.estr.wert, 3) + " %")); tr.appendChild(txt("td", "r", dDE(e.estr.datum))); tr.appendChild(txt("td", "r", "")); body.appendChild(tr); }
    tb.appendChild(body); ez.appendChild(tb);
    if (e.kurve && e.kurve.punkte) {
      ez.appendChild(txt("h3", "sub", "Zinskurve Euro-Staatsanleihen (AAA)")).style.marginTop = "14px";
      const ser = [{ pts: curvePts(e.kurve.punkte), color: "#5fd08a", dots: true, w: 2 }];
      if (u && u.punkte) ser.unshift({ pts: curvePts(u.punkte), color: "#5b9cf5", dash: true, w: 1.2 });
      ez.appendChild(lineChart(ser, { w: CW(), h: 170, xlabels: Object.keys(LZX).map((k) => [lzPos(k), k]), yfmt: (v) => nf(v, 1) + "%", label: "Euro-Zinskurve" }));
      ez.appendChild(legend([["Euro AAA " + dDE(e.kurve.datum), "#5fd08a"], ["USA zum Vergleich", "#5b9cf5", 1]]));
    }
    ez.appendChild(txt("p", "src", "Quelle: EZB Data Portal"));
  }

  function renderStress(s) {
    const b = $("k-stress-body"); b.textContent = "";
    if (!s || s.wert == null) { empty("k-stress-body"); return; }
    $("k-stress-stand").textContent = s.stand || "";
    const col = s.perzentil < 10 ? "var(--loss)" : s.perzentil < 30 ? "#f0883e" : s.perzentil < 70 ? "var(--warn)" : "var(--gain)";
    const w = txt("div", "stress", ""), a = txt("div", "", "");
    a.appendChild(txt("div", "note", "US Financial Stress"));
    const big = txt("div", "big", nf(s.wert, 2)); big.style.color = col; a.appendChild(big);
    const lv = txt("div", "slvl", s.stufe); lv.style.color = col; a.appendChild(lv);
    const g = txt("div", "gauge", ""); const mk = txt("span", "mk", ""); mk.style.left = Math.max(0, Math.min(100, s.perzentil)) + "%"; g.appendChild(mk); a.appendChild(g);
    const gl = txt("div", "gauge-l", ""); gl.appendChild(txt("span", "", "Hoher Stress")); gl.appendChild(txt("span", "", "Entspannt")); a.appendChild(gl);
    a.appendChild(txt("p", "note", `Perzentil ${s.perzentil} der letzten 2 Jahre (Spanne ${nf(s.min, 2)} – ${nf(s.max, 2)}, Median ${nf(s.median, 2)})`));
    w.appendChild(a);
    const r = txt("div", "", ""), k = s.komponenten || {};
    const tb = document.createElement("table"); tb.className = "tbl compact"; const body = document.createElement("tbody");
    [["HYG (Hochzins-ETF)", nf(k.HYG, 2) + " $"], ["TLT (US-Anleihen 20J+)", nf(k.TLT, 2) + " $"], ["VIX", nf(k.VIX, 2)], ["HY-Spread (" + dDE(k.HY_datum) + ")", nf(k.HY, 2) + " %"]]
      .forEach(([n, v]) => { const tr = document.createElement("tr"); tr.appendChild(txt("td", "", n)); tr.appendChild(txt("td", "r", v)); body.appendChild(tr); });
    tb.appendChild(body); r.appendChild(tb);
    if (s.verlauf && s.verlauf.length > 20) {
      const v = s.verlauf.slice(-252);
      r.appendChild(lineChart([{ pts: v.map((x, i) => [i, x[1]]), color: "#d0d0d0", w: 1.4 }], { w: CWh(), h: 130, xlabels: monthLabels(v.map((x) => x[0])), yfmt: (x) => nf(x, 1), label: "Verlauf 1 Jahr" }));
      r.appendChild(txt("p", "src", "Verlauf 1 Jahr · Kurse CNBC, HY-Spread FRED (ICE BofA, Vortag)"));
    }
    w.appendChild(r); b.appendChild(w);
  }

  const BCOL = { 20: "#5b9cf5", 50: "#f0a73a", 200: "#5fd08a" };
  function renderBreadth(s) {
    const b = $("k-breadth-body"); b.textContent = "";
    if (!s || !s.aktuell) { empty("k-breadth-body"); return; }
    $("k-breadth-stand").textContent = s.stand || "";
    [20, 50, 200].forEach((w) => {
      const v = s.aktuell[w], row = txt("div", "brow", "");
      const d = txt("span", "ldot", ""); d.style.background = BCOL[w]; row.appendChild(d);
      row.appendChild(txt("span", "", `Über ${w}-Tage-Linie`));
      const c = v >= 70 ? GAIN : v <= 30 ? LOSS : [227, 163, 58];
      const val = txt("span", "v", nf(v, 1) + " %"); val.style.color = `rgb(${c.join(",")})`; val.style.background = `rgba(${c.join(",")},.14)`; row.appendChild(val);
      b.appendChild(row);
    });
    const V = s.verlauf || {};
    if (V.d && V.d.length > 20) {
      const ser = [200, 50, 20].map((w) => ({ pts: (V[w] || []).map((y, i) => [i, y]), color: BCOL[w], w: 1.3 }));
      b.appendChild(lineChart(ser, { w: $("k-breadth-body").clientWidth || CW(), h: 180, ymin: 0, ymax: 100, yticks: [25, 50, 75, 100], yfmt: (x) => x + "%", xlabels: monthLabels(V.d), label: "Market-Breadth-Verlauf" }));
      b.appendChild(legend([["20 Tage", BCOL[20]], ["50 Tage", BCOL[50]], ["200 Tage", BCOL[200]]]));
    }
    b.appendChild(txt("p", "src", `${s.titel} S&P-500-Werte · Schlusskurse bis ${dDE(s.datum)} · CNBC`));
  }

  let lastK = null, rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (lastK) renderKacheln(lastK); }, 200); });
  function renderKacheln(k) {
    lastK = k;
    renderSek(k.sektoren); renderZins(k.us_kurve, k.ezb); renderStress(k.stress); renderBreadth(k.breadth);
  }
  // Live-Kurse direkt im Browser (CNBC erlaubt CORS); Datei-Stand bleibt Rückfallebene
  const LIVE_SYMS = ["XLK", "XLF", "XLV", "XLY", "XLC", "XLI", "XLP", "XLE", "XLU", "XLRE", "XLB", "SPY", "HYG", "TLT", ".VIX"];
  const pnum = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(/[,%+]/g, "")); return isNaN(n) ? null : n; };
  function applyLive(k, q) {
    const now = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(" ", " ");
    const S = k.sektoren && k.sektoren.liste ? JSON.parse(JSON.stringify(k.sektoren)) : null;
    if (S) {
      let n = 0;
      S.liste.concat([S.spx]).forEach((x) => { const z = q[x.sym]; if (z && z.chg != null) { x.chg = z.chg; x.kurs = z.px; x.datum = z.datum || x.datum; n++; } });
      if (n) { S.liste.sort((a, b) => (b.chg ?? -99) - (a.chg ?? -99)); S.stand = "live · " + now; S.quelle = "CNBC"; k.sektoren = S; }
    }
    const T = k.stress && k.stress.komponenten ? JSON.parse(JSON.stringify(k.stress)) : null;
    if (T && q.HYG && q.TLT && q[".VIX"] && q.HYG.px && q.TLT.px && q[".VIX"].px) {
      const K = T.komponenten; K.HYG = q.HYG.px; K.TLT = q.TLT.px; K.VIX = q[".VIX"].px;
      T.wert = (K.HYG / K.TLT) / (K.VIX * K.HY / 100);
      const hist = (T.verlauf || []).map((x) => x[1]);
      if (hist.length) {
        T.perzentil = Math.round((100 * hist.filter((v) => v < T.wert).length) / hist.length);
        T.stufe = T.perzentil < 10 ? "Hoher Stress" : T.perzentil < 30 ? "Erhöhter Stress" : T.perzentil < 70 ? "Moderat" : "Entspannt";
      }
      T.stand = "live · " + now; k.stress = T;
    }
    return k;
  }
  let fileK = null, liveQ = null;
  function loadLive() {
    const url = "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=" + encodeURIComponent(LIVE_SYMS.join("|")) + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json";
    fetch(url).then((r) => r.json()).then((j) => {
      const q = {};
      ((j.FormattedQuoteResult || {}).FormattedQuote || []).forEach((x) => {
        q[x.symbol] = { px: pnum(x.last), chg: pnum(x.change_pct), datum: String(x.last_time || "").slice(0, 10) || null };
      });
      liveQ = q;
      if (fileK) renderKacheln(applyLive(Object.assign({}, fileK), q));
    }).catch(() => {});
  }
  function loadK() {
    fetch("kacheln.json?ts=" + Date.now(), { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((k) => { fileK = k; renderKacheln(liveQ ? applyLive(Object.assign({}, k), liveQ) : k); })
      .catch(() => renderKacheln({}));
  }
  loadK();
  loadLive();
  setInterval(loadK, 5 * 60 * 1000);
  setInterval(loadLive, 60 * 1000);

  function load() {
    fetch("data.json?ts=" + Date.now(), { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(() => { $("updated").textContent = "Inhalte konnten nicht geladen werden"; });
  }
  // Helfer für energie.js
  window.DataX = { widget, txt, svgEl, newsList, lineChart, niceTicks, legend, monthLabels, rows, nf, sg, dDE, $, data: lastData };
  load();
  setInterval(load, 10 * 60 * 1000);
})();
