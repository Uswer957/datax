/* Märkte-Tab: eigene Kurslisten mit Mini-Trend, Anleihen & Verschuldung, Live-Kurse der Watchlist.
   Verlauf (3 Monate) kommt aus kacheln.json.markt (GitHub Action), Kurse live von CNBC (CORS erlaubt). */
(function () {
  const D = window.DataX;
  if (!D) return;
  const { $, txt, svgEl, nf } = D;

  let K = null, DATA = null;
  const live = {};

  const pnum = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(/[,%+]/g, "")); return isNaN(n) ? null : n; };
  const sgn = (v, d) => (v == null || isNaN(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "±") + nf(Math.abs(v), d));
  const cls = (v) => (v == null || Math.abs(v) < 1e-9 ? "fl" : v > 0 ? "up" : "dn");
  const jetzt = () => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());

  function spark(vals, w, h, col) {
    const v = vals.filter((x) => x != null);
    const svg = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true", class: "spk" });
    if (v.length < 2) return svg;
    const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1;
    const X = (i) => 1 + (i / (v.length - 1)) * (w - 4), Y = (x) => 2 + (1 - (x - lo) / r) * (h - 4);
    let d = ""; v.forEach((x, i) => { d += (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(x).toFixed(1); });
    svg.appendChild(svgEl("path", { d: d + `L${X(v.length - 1).toFixed(1)},${h}L${X(0).toFixed(1)},${h}Z`, fill: col, "fill-opacity": ".1", stroke: "none" }));
    svg.appendChild(svgEl("path", { d, fill: "none", stroke: col, "stroke-width": 1.4, "stroke-linejoin": "round" }));
    svg.appendChild(svgEl("circle", { cx: X(v.length - 1), cy: Y(v[v.length - 1]), r: 2, fill: col }));
    return svg;
  }
  const COL = { up: "#3fb950", dn: "#f85149", fl: "#9a9a9a" };

  // Eintrag aus Datei + Live-Kurs zusammenführen
  function merged(e) {
    const q = live[e.sym];
    const o = Object.assign({}, e);
    if (q && q.px != null) { o.px = q.px; if (q.chg != null) o.chg = q.chg; if (q.abs != null) o.abs = q.abs; o.live = true; }
    const vl = (e.verlauf || []).slice();
    if (o.live && vl.length) vl[vl.length - 1] = o.px; // letzter Punkt = aktueller Kurs
    o.vl = vl;
    o.p3 = vl.length > 1 && vl[0] ? (o.px / vl[0] - 1) * 100 : null;
    return o;
  }

  function quoteList(key, liste) {
    const box = $("q-" + key); if (!box) return;
    box.textContent = "";
    if (!liste || !liste.length) { box.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    const head = txt("div", "qr qh", "");
    ["", "3 Monate", "Kurs", "Tag", "3 M"].forEach((t, i) => head.appendChild(txt("span", i > 1 ? "r" : "", t)));
    box.appendChild(head);
    let anyLive = false;
    liste.forEach((e0) => {
      const e = merged(e0); anyLive = anyLive || e.live;
      const row = txt("div", "qr", "");
      row.appendChild(txt("span", "qn", e.name));
      const sp = txt("span", "qs", ""); sp.appendChild(spark(e.vl, 96, 24, COL[cls(e.p3)])); row.appendChild(sp);
      row.appendChild(txt("span", "qp r", nf(e.px, e.dez)));
      row.appendChild(txt("span", "qc r " + cls(e.chg), sgn(e.chg, 2) + " %"));
      row.appendChild(txt("span", "q3 r " + cls(e.p3), sgn(e.p3, 1) + " %"));
      row.title = e.name + (e.zeit ? " · Stand " + e.zeit.replace("T", " ") : "");
      box.appendChild(row);
    });
    const st = $("q-" + key + "-stand");
    if (st) st.textContent = anyLive ? "live · " + jetzt() : (K && K.markt && K.markt.stand) || "";
  }

  // ---------- Anleihen & Verschuldung ----------
  const LAND = ["Deutschland", "USA", "UK", "Frankreich", "Italien", "Japan", "China"];
  const FLAG = { Deutschland: "DE", USA: "US", UK: "GB", Frankreich: "FR", Italien: "IT", Japan: "JP", China: "CN" };
  function staaten() {
    const box = $("m-staaten"); if (!box) return;
    box.textContent = "";
    const m = (DATA && DATA.maerkte) || {};
    const debt = {}; (m.verschuldung || []).forEach((x) => { debt[x.land] = x; });
    const yFile = {}; (m.renditen || []).forEach((x) => { yFile[x.land] = pnum(x.rendite); });
    const yK = {}; ((K && K.markt && K.markt.gruppen && K.markt.gruppen.renditen) || []).forEach((e) => { yK[e.name] = merged(e); });
    const laender = LAND.filter((l) => debt[l] || yK[l] || yFile[l] != null);
    if (!laender.length) { box.appendChild(txt("p", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    const bund = yK.Deutschland ? yK.Deutschland.px : yFile.Deutschland;
    const yMax = Math.max(6, ...laender.map((l) => (yK[l] ? yK[l].px : yFile[l]) || 0));
    const dMax = Math.max(150, ...laender.map((l) => pnum(debt[l] && debt[l].quote) || 0));
    const leg = txt("div", "stt-leg", "");
    leg.appendChild(txt("span", "", "")).appendChild(txt("i", "b-y", ""));
    leg.lastChild.appendChild(document.createTextNode("Rendite 10 J."));
    const l2 = txt("span", "", ""); l2.appendChild(txt("i", "b-d", "")); l2.appendChild(document.createTextNode("Schulden in % des BIP")); leg.appendChild(l2);
    box.appendChild(leg);
    let anyLive = false;
    laender.forEach((l) => {
      const y = yK[l] ? yK[l].px : yFile[l];
      const e = yK[l];
      anyLive = anyLive || (e && e.live);
      const row = txt("div", "stt-r", "");
      const h = txt("div", "stt-h", "");
      h.appendChild(txt("span", "stt-l", l));
      h.appendChild(txt("span", "stt-c", FLAG[l] || ""));
      if (l !== "Deutschland" && y != null && bund != null) h.appendChild(txt("span", "stt-sp", "Spread zu Bund " + sgn(Math.round((y - bund) * 100), 0) + " bp"));
      row.appendChild(h);
      // Rendite
      const b1 = txt("div", "stt-b", "");
      b1.appendChild(txt("span", "stt-k", "Rendite"));
      const tr1 = txt("span", "stt-t", ""); const f1 = txt("i", "b-y", ""); f1.style.width = Math.max(0, Math.min(100, ((y || 0) / yMax) * 100)) + "%"; tr1.appendChild(f1); b1.appendChild(tr1);
      const v1 = txt("span", "stt-v", y == null ? "–" : nf(y, 2) + " %");
      b1.appendChild(v1);
      const bp = e && e.abs != null ? Math.round(e.abs * 100) : null;
      b1.appendChild(txt("span", "stt-d " + cls(bp), bp == null ? "" : sgn(bp, 0) + " bp"));
      const sp = txt("span", "stt-s", ""); if (e && e.vl && e.vl.length > 2) sp.appendChild(spark(e.vl, 70, 18, "#5b9cf5")); b1.appendChild(sp);
      row.appendChild(b1);
      // Verschuldung
      const dq = debt[l] ? pnum(debt[l].quote) : null;
      const b2 = txt("div", "stt-b", "");
      b2.appendChild(txt("span", "stt-k", "Schulden"));
      const tr2 = txt("span", "stt-t", ""); const f2 = txt("i", "b-d", ""); f2.style.width = Math.max(0, Math.min(100, ((dq || 0) / dMax) * 100)) + "%"; tr2.appendChild(f2); b2.appendChild(tr2);
      b2.appendChild(txt("span", "stt-v", dq == null ? "–" : nf(dq, 0) + " %"));
      const abs = debt[l] && debt[l].absolut && debt[l].absolut !== "–" ? debt[l].absolut : "";
      const ab = txt("span", "stt-a", abs); b2.appendChild(ab);
      row.appendChild(b2);
      box.appendChild(row);
    });
    $("m-staaten-stand").textContent = anyLive ? "live · " + jetzt() : (K && K.markt && K.markt.stand) || m.renditen_stand || "";
    $("m-staaten-src").textContent = "Renditen: " + (anyLive || Object.keys(yK).length ? "CNBC, 3-Monats-Linie" : (m.renditen_stand || "")) + " · Schulden: " + (m.verschuldung_quelle || "");
  }

  // ---------- Watchlist: Live-Kurse ----------
  // TradingView-Symbol → CNBC-Kandidaten
  function cnbcFor(tv) {
    const [ex, t] = String(tv || "").split(":");
    if (!t) return [];
    const X = { XETR: ["-DE"], FWB: ["-DE"], EURONEXT: ["-NL", "-FR"], SIX: ["-CH"], LSE: ["-GB"], TSE: ["-JP", "-T"], HKEX: ["-HK"], MIL: ["-IT"], BME: ["-ES"], KRX: ["-KR"], OMXSTO: ["-SE"], OMXCOP: ["-DK"] }[ex];
    if (/^(NASDAQ|NYSE|AMEX|NYSEARCA|BATS|CBOE)$/.test(ex)) return [t.replace("_", ".")];
    const tt = ex === "HKEX" ? t.replace(/^0+/, "") : t;
    return X ? X.map((s) => tt + s) : [];
  }
  function watchSyms() {
    const out = [];
    document.querySelectorAll("#m-watch li[data-sym]").forEach((li) => cnbcFor(li.dataset.sym).forEach((s) => out.push(s)));
    return out;
  }
  function watchQuotes() {
    document.querySelectorAll("#m-watch li[data-sym]").forEach((li) => {
      const box = li.querySelector(".wq"); if (!box) return;
      const c = cnbcFor(li.dataset.sym).find((s) => live[s] && live[s].px != null);
      box.textContent = "";
      if (!c) return;
      const q = live[c];
      box.appendChild(txt("span", "wq-p", nf(q.px, q.px >= 1000 ? 0 : 2) + (q.cur ? " " + q.cur : "")));
      box.appendChild(txt("span", "wq-c " + cls(q.chg), sgn(q.chg, 2) + " %"));
    });
  }

  // ---------- Live-Abruf ----------
  function marktSyms() {
    const g = (K && K.markt && K.markt.gruppen) || {};
    return Object.values(g).flat().map((e) => e.sym);
  }
  const CUR = { USD: "$", EUR: "€", GBp: "p", GBP: "£", CHF: "CHF", JPY: "¥", HKD: "HK$" };
  function loadLive() {
    const syms = Array.from(new Set(marktSyms().concat(watchSyms())));
    if (!syms.length) return;
    const chunks = []; for (let i = 0; i < syms.length; i += 30) chunks.push(syms.slice(i, i + 30));
    Promise.all(chunks.map((c) => fetch("https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=" + encodeURIComponent(c.join("|")) + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json")
      .then((r) => r.json()).then((j) => ((j.FormattedQuoteResult || {}).FormattedQuote || []).forEach((x) => {
        const px = pnum(x.last);
        if (px == null) return;
        live[x.symbol] = { px, chg: pnum(x.change_pct), abs: pnum(x.change), cur: CUR[x.currencyCode] || "" };
      })).catch(() => {}))).then(renderAll);
  }

  function renderAll() {
    const g = (K && K.markt && K.markt.gruppen) || null;
    ["indizes", "devisen", "rohstoffe", "krypto"].forEach((k) => quoteList(k, g ? g[k] : null));
    staaten();
    watchQuotes();
  }

  let first = true;
  document.addEventListener("datax:kacheln", (ev) => { K = ev.detail || {}; renderAll(); if (first) { first = false; loadLive(); } });
  document.addEventListener("datax:data", (ev) => { DATA = ev.detail; renderAll(); loadLive(); });
  setInterval(loadLive, 60 * 1000);
})();
