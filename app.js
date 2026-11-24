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
  const TABS = ["maerkte", "politik", "sport", "sonstiges"];
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
  widget("w-cal", "events", { width: "100%", height: "100%", importanceFilter: "0,1", countryFilter: "us,eu,de,cn,gb,jp" });

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
      const med = Array.isArray(it.medien) ? it.medien.filter((x) => typeof x === "string") : [];
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

  /* ---------- Mehr zum Thema (Klick auf Kachelüberschrift) ---------- */
  const dlg = $("mehr");
  function openMehr(h) {
    const key = h.dataset.mehr;
    const all = (lastData && lastData.mehr) || {};
    let e = all[key] || {};
    if (Array.isArray(e)) e = { meldungen: e };
    $("mehr-title").textContent = h.querySelector("span") ? h.querySelector("span").textContent : h.textContent;
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

  let lastData = null;
  function render(d) {
    lastData = d;
    if (d.aktualisiert) $("updated").textContent = "Inhalte: " + d.aktualisiert;
    const m = d.maerkte || {};
    newsList("m-headlines", m.schlagzeilen);
    renderWatch(m.watchlist);
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

  function load() {
    fetch("data.json?ts=" + Date.now(), { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(() => { $("updated").textContent = "Inhalte konnten nicht geladen werden"; });
  }
  load();
  setInterval(load, 10 * 60 * 1000);
})();
