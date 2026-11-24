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
    s.textContent = JSON.stringify(Object.assign({ colorTheme: "dark", isTransparent: false, backgroundColor: "#121922", locale: "de_DE" }, config));
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
  function newsList(id, items) {
    const ol = $(id); ol.textContent = "";
    if (!items || !items.length) { ol.appendChild(txt("li", "empty", "Wird beim nächsten Lauf gefüllt.")); return; }
    items.forEach((it) => {
      const li = document.createElement("li");
      const h = txt("span", "h", "");
      if (it.tag) h.appendChild(txt("span", "tag", it.tag));
      h.appendChild(document.createTextNode(it.titel || ""));
      li.appendChild(h);
      if (it.warum) li.appendChild(txt("span", "why", it.warum));
      li.appendChild(srcLine(it));
      ol.appendChild(li);
    });
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

  function render(d) {
    if (d.aktualisiert) $("updated").textContent = "Inhalte: " + d.aktualisiert;
    const m = d.maerkte || {};
    newsList("m-headlines", m.schlagzeilen);
    rows("m-debt", m.verschuldung, [["land"], ["quote", "r"], ["absolut", "r"]]);
    $("m-debt-src").textContent = m.verschuldung_quelle || "";
    rows("m-yields", m.renditen, [["land"], ["rendite", "r"]]);
    $("m-yields-src").textContent = m.renditen_stand || "";
    rows("m-corp", m.termine, [["datum", "date"], ["was"]]);
    const p = d.politik || {};
    newsList("p-welt", p.welt); newsList("p-usa", p.usa); newsList("p-de", p.deutschland);
    rows("p-termine", p.termine, [["datum", "date"], ["was"], ["art"]]);
    newsList("p-recht", p.recht);
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
