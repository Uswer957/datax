#!/usr/bin/env python3
"""Füllt kacheln.json für die Markt-Kacheln von DataX.

Läuft als GitHub Action (siehe .github/workflows/kacheln.yml), nur Standardbibliothek.
Quellen: Yahoo Finance (Kurse), FRED (High-Yield-Spread, Fallback US-Kurve),
US Treasury (Zinskurve), EZB Data Portal (Leitzinsen, €STR, Euro-AAA-Kurve).
Schlägt eine Quelle fehl, bleibt der alte Stand des jeweiligen Abschnitts erhalten.
"""
import csv
import datetime as dt
import io
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "kacheln.json")
BERLIN = ZoneInfo("Europe/Berlin")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

SEKTOREN = [
    ("XLK", "Technologie"), ("XLF", "Finanzen"), ("XLV", "Gesundheit"), ("XLY", "Zykl. Konsum"),
    ("XLC", "Kommunikation"), ("XLI", "Industrie"), ("XLP", "Basiskonsum"), ("XLE", "Energie"),
    ("XLU", "Versorger"), ("XLRE", "Immobilien"), ("XLB", "Grundstoffe"),
]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def get(url, tries=3, timeout=40):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"{url}: {last}")


def yahoo(sym, rng="1y"):
    """Tagesschlusskurse + aktueller Kurs (Yahoo; von GitHub-Runnern oft 429)."""
    last = None
    for h in ("query1", "query2"):
        try:
            j = json.loads(get(f"https://{h}.finance.yahoo.com/v8/finance/chart/{sym}?range={rng}&interval=1d&includePrePost=false", tries=1))
            res = j["chart"]["result"][0]
            meta = res["meta"]
            ts = res.get("timestamp") or []
            cl = res["indicators"]["quote"][0].get("close") or []
            tz = ZoneInfo(meta.get("exchangeTimezoneName") or "America/New_York")
            rows = [(dt.datetime.fromtimestamp(t, tz).date().isoformat(), c) for t, c in zip(ts, cl) if c is not None]
            px = meta.get("regularMarketPrice")
            mdate = dt.datetime.fromtimestamp(meta["regularMarketTime"], tz).date().isoformat() if meta.get("regularMarketTime") else None
            return {"rows": rows, "px": px, "pxdate": mdate}
        except Exception as e:  # noqa: BLE001
            last = e
    raise RuntimeError(f"Yahoo {sym}: {last}")


CNBC_SYM = {"^VIX": ".VIX"}


def num(v):
    try:
        return float(str(v).replace(",", "").replace("%", "").replace("+", ""))
    except (TypeError, ValueError):
        return None


def cnbc_quotes(syms):
    """Aktuelle Kurse (CNBC, Echtzeit bzw. leicht verzögert)."""
    cs = [CNBC_SYM.get(s, s.replace("-", ".")) for s in syms]
    url = ("https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols="
           + "%7C".join(cs) + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json")
    q = json.loads(get(url))["FormattedQuoteResult"]["FormattedQuote"]
    by = {x.get("symbol"): x for x in q}
    out = {}
    for s, c in zip(syms, cs):
        x = by.get(c) or {}
        lt = x.get("last_time") or ""
        out[s] = {"px": num(x.get("last")), "prev": num(x.get("previous_day_closing")),
                  "chg": num(x.get("change_pct")), "pxdate": lt[:10] or None, "zeit": lt}
    return out


def cnbc_bars(sym, tage):
    cs = CNBC_SYM.get(sym, sym.replace("-", "."))
    end = dt.date.today() + dt.timedelta(days=1)
    start = end - dt.timedelta(days=int(tage * 1.5) + 10)
    j = json.loads(get(f"https://ts-api.cnbc.com/harmony/app/bars/{cs}/1D/{start:%Y%m%d}000000/{end:%Y%m%d}000000/adjusted/EST5EDT.json", tries=2))
    bars = (j.get("barData") or {}).get("priceBars") or []
    rows = []
    for b in bars:
        t, c = str(b.get("tradeTime") or ""), num(b.get("close"))
        if len(t) >= 8 and c:
            rows.append((f"{t[:4]}-{t[4:6]}-{t[6:8]}", c))
    if not rows:
        raise RuntimeError(f"CNBC {cs}: leer")
    return sorted(rows)


QUELLEN = []


def kurse(sym, rng="1y", quote=True):
    tage = {"5d": 10, "1y": 370, "2y": 740}.get(rng, 740)
    try:
        rows = cnbc_bars(sym, tage)
        px = pxdate = None
        if quote:
            q = cnbc_quotes([sym])[sym]
            px, pxdate = q["px"], q["pxdate"]
        QUELLEN.append("CNBC")
        return {"rows": rows, "px": px, "pxdate": pxdate}
    except Exception as e:  # noqa: BLE001
        log("CNBC", sym, e)
    r = yahoo(sym, rng)
    QUELLEN.append("Yahoo")
    return r


def tageswechsel(y):
    """Kurs, Änderung ggü. Vortagesschluss in %, Datum."""
    rows = y["rows"]
    px, mdate = y.get("px"), y.get("pxdate")
    if px is None:
        mdate, px = rows[-1]
    if mdate is None:
        mdate = rows[-1][0]
    prev = [c for d, c in rows if d < mdate]
    if not prev:
        return px, None, mdate
    return px, (px / prev[-1] - 1) * 100, mdate


def now_str():
    return dt.datetime.now(BERLIN).strftime("%d.%m., %H:%M")


# ---------------- Sektoren ----------------
def sektoren():
    syms = [x for x, _ in SEKTOREN] + ["SPY"]
    names = dict(SEKTOREN + [("SPY", "S&P 500")])
    q = cnbc_quotes(syms)
    out = []
    for sym in syms:
        x = q[sym]
        chg = x["chg"]
        if chg is None and x["px"] and x["prev"]:
            chg = (x["px"] / x["prev"] - 1) * 100
        out.append({"sym": sym, "name": names[sym], "kurs": x["px"], "chg": None if chg is None else round(chg, 2), "datum": x["pxdate"]})
    if all(o["chg"] is None for o in out):
        raise RuntimeError("keine Kurse")
    spx = out.pop()
    out.sort(key=lambda x: -(x["chg"] if x["chg"] is not None else -99))
    return {"stand": now_str(), "liste": out, "spx": spx, "quelle": "CNBC"}


# ---------------- FRED ----------------
def fred(ids, start):
    # FRED antwortet GitHub-Runnern nur per curl/HTTP 1.1 und ohne cosd zuverlässig
    import subprocess
    txt = ""
    for i in range(3):
        r = subprocess.run(["curl", "-sS", "--http1.1", "-m", "90",
                            f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={','.join(ids)}"],
                           capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.startswith("observation_date"):
            txt = r.stdout
            break
        log("FRED", r.returncode, r.stderr[:200])
        time.sleep(5 * (i + 1))
    if not txt:
        raise RuntimeError("FRED nicht erreichbar")
    rd = csv.reader(io.StringIO(txt))
    head = next(rd)
    out = {i: [] for i in ids}
    for row in rd:
        for k, v in zip(head[1:], row[1:]):
            if k in out and v not in ("", ".") and row[0] >= start:
                out[k].append((row[0], float(v)))
    return out


# ---------------- Stress ----------------
def stress():
    start = (dt.date.today() - dt.timedelta(days=760)).isoformat()
    hy = fred(["BAMLH0A0HYM2"], start)["BAMLH0A0HYM2"]
    ys = {s: kurse(s, "2y") for s in ("HYG", "TLT", "^VIX")}
    ser = {s: dict(y["rows"]) for s, y in ys.items()}
    hyd = dict(hy)
    dates = sorted(set(ser["HYG"]) & set(ser["TLT"]) & set(ser["^VIX"]))
    verlauf, last_hy = [], None
    hy_dates = sorted(hyd)
    j = 0
    for d in dates:
        while j < len(hy_dates) and hy_dates[j] <= d:
            last_hy = hyd[hy_dates[j]]
            j += 1
        if last_hy is None:
            continue
        v = (ser["HYG"][d] / ser["TLT"][d]) / (ser["^VIX"][d] * last_hy / 100)
        verlauf.append((d, v))
    # aktueller Wert mit letzten Kursen
    cur = {s: tageswechsel(y)[0] for s, y in ys.items()}
    hy_now = hy[-1][1]
    wert = (cur["HYG"] / cur["TLT"]) / (cur["^VIX"] * hy_now / 100)
    hist = [v for _, v in verlauf]
    pct = 100 * sum(1 for v in hist if v < wert) / max(1, len(hist))
    if pct < 10:
        stufe = "Hoher Stress"
    elif pct < 30:
        stufe = "Erhöhter Stress"
    elif pct < 70:
        stufe = "Moderat"
    else:
        stufe = "Entspannt"
    last_year = [(d, round(v, 3)) for d, v in verlauf]
    return {
        "stand": now_str(), "wert": round(wert, 3), "perzentil": round(pct), "stufe": stufe,
        "min": round(min(hist), 3), "max": round(max(hist), 3), "median": round(sorted(hist)[len(hist) // 2], 3),
        "komponenten": {"HYG": round(cur["HYG"], 2), "TLT": round(cur["TLT"], 2), "VIX": round(cur["^VIX"], 2),
                         "HY": round(hy_now, 2), "HY_datum": hy[-1][0]},
        "verlauf": last_year,
    }


# ---------------- Breadth ----------------
def sp500():
    try:
        txt = get("https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv")
        syms = [r["Symbol"].strip().replace(".", "-") for r in csv.DictReader(io.StringIO(txt)) if r.get("Symbol")]
        if len(syms) > 450:
            return syms
    except Exception as e:  # noqa: BLE001
        log("Konstituenten:", e)
    with open(os.path.join(ROOT, "scripts", "sp500.txt")) as f:
        return [s.strip() for s in f if s.strip()]


def breadth():
    syms = sp500()
    log("Breadth über", len(syms), "Titel")
    kurse("AAPL", "5d", quote=False)  # schneller Abbruch, wenn keine Kursquelle erreichbar

    def one(s):
        try:
            return kurse(s, "2y", quote=False)["rows"]
        except Exception as e:  # noqa: BLE001
            log("  fehlt", s, e)
            return None

    with ThreadPoolExecutor(max_workers=6) as ex:
        data = [r for r in ex.map(one, syms) if r and len(r) > 30]
    if len(data) < 0.8 * len(syms):
        raise RuntimeError(f"nur {len(data)} von {len(syms)} Titeln geladen")
    # gemeinsamer Kalender: Handelstage, die in den meisten Reihen vorkommen
    cnt = {}
    for rows in data:
        for d, _ in rows:
            cnt[d] = cnt.get(d, 0) + 1
    cal = sorted(d for d, c in cnt.items() if c >= 0.5 * len(data))
    wins = (20, 50, 200)
    above = {w: [0] * len(cal) for w in wins}
    total = {w: [0] * len(cal) for w in wins}
    for rows in data:
        m = dict(rows)
        closes, last = [], None
        for d in cal:  # vorwärts auffüllen
            last = m.get(d, last)
            closes.append(last)
        csum, run = [], 0.0
        first = next((i for i, c in enumerate(closes) if c is not None), None)
        if first is None:
            continue
        for i, c in enumerate(closes):
            run += c if c is not None else 0.0
            csum.append(run)
        for w in wins:
            for i in range(first + w - 1, len(cal)):
                lo = csum[i - w] if i - w >= 0 else 0.0
                sma = (csum[i] - lo) / w
                total[w][i] += 1
                if closes[i] > sma:
                    above[w][i] += 1
    n = 252
    pct = {w: [round(100 * a / t, 1) if t else None for a, t in zip(above[w], total[w])] for w in wins}
    start = max(0, len(cal) - n)
    return {
        "stand": now_str(), "datum": cal[-1], "titel": len(data),
        "aktuell": {str(w): pct[w][-1] for w in wins},
        "verlauf": {"d": cal[start:], **{str(w): pct[w][start:] for w in wins}},
    }


# ---------------- US-Zinskurve ----------------
LZ = [("1M", ["1 Mo"], "DGS1MO"), ("3M", ["3 Mo"], "DGS3MO"), ("6M", ["6 Mo"], "DGS6MO"), ("1J", ["1 Yr"], "DGS1"),
      ("2J", ["2 Yr"], "DGS2"), ("5J", ["5 Yr"], "DGS5"), ("10J", ["10 Yr"], "DGS10"), ("30J", ["30 Yr"], "DGS30")]


def treasury_year(y):
    url = ("https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/"
           f"{y}/all?type=daily_treasury_yield_curve&field_tdr_date_value={y}&page&_format=csv")
    out = {}
    for r in csv.DictReader(io.StringIO(get(url))):
        m, d, yy = r["Date"].split("/")
        iso = f"{yy}-{m}-{d}"
        pts = []
        for lab, cols, _ in LZ:
            v = next((r[c] for c in cols if r.get(c)), None)
            pts.append({"lz": lab, "r": float(v) if v else None})
        out[iso] = pts
    return out


def kurve_aus(serie, ziel):
    """Letzter Tag <= ziel."""
    ds = [d for d in sorted(serie) if d <= ziel]
    return (ds[-1], serie[ds[-1]]) if ds else (None, None)


def us_kurve():
    today = dt.date.today()
    serie = {}
    try:
        for y in (today.year - 1, today.year):
            serie.update(treasury_year(y))
        quelle = "U.S. Treasury"
    except Exception as e:  # noqa: BLE001
        log("Treasury:", e, "→ FRED")
        f = fred([x[2] for x in LZ], (today - dt.timedelta(days=400)).isoformat())
        maps = {k: dict(v) for k, v in f.items()}
        for d in sorted(set().union(*[set(m) for m in maps.values()])):
            serie[d] = [{"lz": lab, "r": maps[fid].get(d)} for lab, _, fid in LZ]
        quelle = "FRED"
    last = max(serie)
    pts = serie[last]
    dm, vm = kurve_aus(serie, (dt.date.fromisoformat(last) - dt.timedelta(days=30)).isoformat())
    dj, vj = kurve_aus(serie, (dt.date.fromisoformat(last) - dt.timedelta(days=365)).isoformat())
    r = {p["lz"]: p["r"] for p in pts}
    spread = round((r["10J"] - r["2J"]) * 100) if r.get("10J") is not None and r.get("2J") is not None else None
    s3m = round((r["10J"] - r["3M"]) * 100) if r.get("10J") is not None and r.get("3M") is not None else None
    status = None if spread is None else ("invers" if spread < 0 else "flach" if spread < 25 else "normal")
    # Verlauf 2J-10J-Spread (1 Jahr)
    sp = []
    for d in sorted(serie)[-252:]:
        rr = {p["lz"]: p["r"] for p in serie[d]}
        if rr.get("10J") is not None and rr.get("2J") is not None:
            sp.append((d, round((rr["10J"] - rr["2J"]) * 100)))
    return {"stand": now_str(), "datum": last, "quelle": quelle, "punkte": pts,
            "vormonat": {"datum": dm, "punkte": vm}, "vorjahr": {"datum": dj, "punkte": vj},
            "spread_2_10": spread, "spread_3m_10": s3m, "status": status, "spread_verlauf": sp}


# ---------------- EZB ----------------
def ecb(key, params="lastNObservations=1"):
    txt = get(f"https://data-api.ecb.europa.eu/service/data/{key}?{params}&format=csvdata")
    return [(r["KEY"], r["TIME_PERIOD"], float(r["OBS_VALUE"])) for r in csv.DictReader(io.StringIO(txt)) if r.get("OBS_VALUE")]


def ezb():
    zinsen = []
    start = (dt.date.today() - dt.timedelta(days=900)).isoformat()
    for code, name in (("DFR", "Einlagefazilität"), ("MRR_FR", "Hauptrefinanzierung"), ("MLFR", "Spitzenrefinanzierung")):
        rows = sorted((d, v) for _, d, v in ecb(f"FM/B.U2.EUR.4F.KR.{code}.LEV", f"startPeriod={start}"))
        cur = rows[-1][1]
        seit, vorher = None, None
        for d, v in reversed(rows):
            if v != cur:
                vorher = v
                break
            seit = d
        zinsen.append({"name": name, "code": code, "wert": cur, "seit": seit, "vorher": vorher})
    estr = None
    try:
        k, d, v = ecb("EST/B.EU000A2X2A25.WT")[-1]
        estr = {"wert": round(v, 3), "datum": d}
    except Exception as e:  # noqa: BLE001
        log("€STR:", e)
    kurve = None
    try:
        lz = [("3M", "SR_3M"), ("6M", "SR_6M"), ("1J", "SR_1Y"), ("2J", "SR_2Y"), ("5J", "SR_5Y"), ("10J", "SR_10Y"), ("30J", "SR_30Y")]
        rows = ecb("YC/B.U2.EUR.4F.G_N_A.SV_C_YM." + "+".join(c for _, c in lz))
        by = {k.split(".")[-1]: (d, v) for k, d, v in rows}
        kurve = {"datum": max(d for d, _ in by.values()), "punkte": [{"lz": l, "r": round(by[c][1], 3) if c in by else None} for l, c in lz]}
    except Exception as e:  # noqa: BLE001
        log("Euro-Kurve:", e)
    return {"stand": now_str(), "zinsen": zinsen, "estr": estr, "kurve": kurve}


def main():
    try:
        with open(OUT) as f:
            alt = json.load(f)
    except Exception:  # noqa: BLE001
        alt = {}
    full = os.environ.get("FULL") == "1" or dt.datetime.now(dt.timezone.utc).minute < 30 or "breadth" not in alt
    jobs = [("sektoren", sektoren), ("stress", stress), ("us_kurve", us_kurve), ("ezb", ezb)]
    if full:
        jobs.append(("breadth", breadth))
    neu = dict(alt)
    fehler = {}
    for name, fn in jobs:
        t = time.time()
        try:
            neu[name] = fn()
            log(f"{name}: ok ({time.time() - t:.1f}s)")
        except Exception as e:  # noqa: BLE001
            fehler[name] = str(e)[:300]
            log(f"{name}: FEHLER {e}")
    neu["aktualisiert"] = now_str()
    neu["fehler"] = fehler
    with open(OUT, "w") as f:
        json.dump(neu, f, ensure_ascii=False, separators=(",", ":"))
    if len(fehler) == len(jobs):
        sys.exit(1)


if __name__ == "__main__":
    main()
