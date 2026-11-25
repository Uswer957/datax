"""Energie-Kacheln für DataX: schreibt energie.json (nur Standardbibliothek).

Quellen (alle frei, von GitHub-Runnern erreichbar):
- Energy-Charts (Fraunhofer ISE): Strommix DE/EU, Erneuerbaren-Anteil, Day-Ahead-Preise je Gebotszone
- FRED (St. Louis Fed): Brent, WTI, Henry Hub (täglich)
- U.S. EIA Weekly Petroleum Status Report: US-Lagerbestände
- EEX: Ergebnisse der EU-Primärauktionen für CO2-Zertifikate (EUA)
Jede Quelle ist einzeln abgesichert; fällt eine aus, bleibt der alte Stand aus energie.json erhalten.
"""
import csv
import datetime as dt
import io
import json
import os
import re
import subprocess
import sys
import urllib.request
import zipfile
from zoneinfo import ZoneInfo

BER = ZoneInfo("Europe/Berlin")
NOW = dt.datetime.now(BER)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "energie.json")
EC = "https://api.energy-charts.info"


def get(url, timeout=60):
    req = urllib.request.Request(url, headers={"User-Agent": "datax-energie/1.0 (+https://github.com/uswer957/datax)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def curl(url):
    # FRED/EIA: nur per curl --http1.1 ohne eigenen User-Agent zuverlässig (siehe kacheln.py)
    return subprocess.run(["curl", "-sL", "--http1.1", "-m", "60", url], capture_output=True, check=True).stdout


def ecj(path):
    return json.loads(get(EC + path))


def stamp():
    return NOW.strftime("%d.%m. %H:%M")


def r1(v, d=1):
    return None if v is None else round(v, d)


# ---------- Strommix ----------
GROUPS = [
    ("Wind", "ee", ["Wind onshore", "Wind offshore"]),
    ("Solar", "ee", ["Solar"]),
    ("Biomasse", "ee", ["Biomass"]),
    ("Wasser", "ee", ["Hydro Run-of-River", "Hydro water reservoir", "Geothermal"]),
    ("Kernkraft", "nuk", ["Nuclear"]),
    ("Braunkohle", "fos", ["Fossil brown coal / lignite"]),
    ("Steinkohle", "fos", ["Fossil hard coal", "Fossil coal-derived gas"]),
    ("Erdgas", "fos", ["Fossil gas"]),
    ("Öl & Sonstige", "fos", ["Fossil oil", "Others", "Waste"]),
]


def mix(country):
    j = ecj(f"/public_power?country={country}&start={(NOW - dt.timedelta(days=1)).date()}&end={NOW.date() + dt.timedelta(days=1)}")
    ts = j["unix_seconds"]
    types = {p["name"]: p["data"] for p in j["production_types"]}
    # letzter Zeitpunkt, an dem die großen Erzeuger gemeldet haben
    ref = types.get("Solar") or types.get("Wind onshore") or next(iter(types.values()))
    last = max((i for i, v in enumerate(ref) if v is not None), default=None)
    if last is None:
        raise ValueError("keine Daten")
    t_end = ts[last]
    idx = [i for i in range(last + 1) if ts[i] > t_end - 86400]

    def avg(names, only_last=False):
        tot, n = 0.0, 0
        for nm in names:
            arr = types.get(nm)
            if not arr:
                continue
            rng = [last] if only_last else idx
            vals = [arr[i] for i in rng if arr[i] is not None]
            if vals:
                tot += sum(vals) / len(vals)
                n += 1
        return tot if n else 0.0

    out = []
    for name, art, names in GROUPS:
        out.append({"name": name, "art": art, "gw24": r1(avg(names) / 1000, 2), "gw_jetzt": r1(avg(names, True) / 1000, 2)})
    tot24 = sum(x["gw24"] for x in out) or 1
    totj = sum(x["gw_jetzt"] for x in out) or 1
    for x in out:
        x["anteil24"] = r1(100 * x["gw24"] / tot24)
        x["anteil_jetzt"] = r1(100 * x["gw_jetzt"] / totj)
    ee24 = sum(x["anteil24"] for x in out if x["art"] == "ee")
    eej = sum(x["anteil_jetzt"] for x in out if x["art"] == "ee")
    last_dt = dt.datetime.fromtimestamp(t_end, BER)
    return {
        "stand": last_dt.strftime("%d.%m. %H:%M"),
        "quellen": out,
        "ee_anteil_24h": r1(ee24),
        "ee_anteil_jetzt": r1(eej),
        "last_gw": r1(avg(["Load"], True) / 1000, 1) if "Load" in types else None,
    }


def ren_daily(country):
    j = ecj(f"/ren_share_daily_avg?country={country}")
    pts = []
    for d, v in zip(j["days"], j["data"]):
        if v is None:
            continue
        dd, mm, yy = d.split(".")
        pts.append([f"{yy}-{mm}-{dd}", r1(v)])
    year = str(NOW.year)
    ytd = [v for d, v in pts if d.startswith(year)]
    out = {"verlauf": pts, "ytd": r1(sum(ytd) / len(ytd)) if ytd else None, "jahr": NOW.year}
    try:
        p = ecj(f"/ren_share_daily_avg?country={country}&year={NOW.year - 1}")
        vals = [v for v in p["data"] if v is not None]
        out["vorjahr"] = r1(sum(vals) / len(vals)) if vals else None
    except Exception as e:  # noqa: BLE001
        print("vorjahr", country, e, file=sys.stderr)
    return out


# ---------- Strompreise ----------
ZONEN = [
    ("DE-LU", "Deutschland"), ("FR", "Frankreich"), ("NL", "Niederlande"), ("BE", "Belgien"), ("AT", "Österreich"),
    ("CH", "Schweiz"), ("PL", "Polen"), ("CZ", "Tschechien"), ("DK1", "Dänemark West"), ("SE3", "Schweden (Stockholm)"),
    ("NO2", "Norwegen Süd"), ("IT-North", "Italien Nord"), ("ES", "Spanien"), ("HU", "Ungarn"),
]


def day_avgs(j):
    by = {}
    for t, p in zip(j["unix_seconds"], j["price"]):
        if p is None:
            continue
        d = dt.datetime.fromtimestamp(t, BER).date().isoformat()
        by.setdefault(d, []).append(p)
    return {d: sum(v) / len(v) for d, v in by.items()}


def preise():
    heute, morgen = NOW.date(), NOW.date() + dt.timedelta(days=1)
    zonen = []
    for code, land in ZONEN:
        try:
            j = ecj(f"/price?bzn={code}&start={heute - dt.timedelta(days=1)}&end={morgen + dt.timedelta(days=1)}")
            a = day_avgs(j)
            zonen.append({"code": code, "land": land, "gestern": r1(a.get(str(heute - dt.timedelta(days=1))), 2),
                          "heute": r1(a.get(str(heute)), 2), "morgen": r1(a.get(str(morgen)), 2)})
        except Exception as e:  # noqa: BLE001
            print("preis", code, e, file=sys.stderr)
    de = {}
    try:
        j = ecj(f"/price?bzn=DE-LU&start={heute}&end={morgen + dt.timedelta(days=1)}")
        kurve = []
        for t, p in zip(j["unix_seconds"], j["price"]):
            if p is None:
                continue
            x = dt.datetime.fromtimestamp(t, BER)
            kurve.append([x.strftime("%Y-%m-%d %H:%M"), r1(p, 2)])
        de["kurve"] = kurve
        h = ecj(f"/price?bzn=DE-LU&start={heute - dt.timedelta(days=90)}&end={morgen + dt.timedelta(days=1)}")
        de["tage"] = [[d, r1(v, 2)] for d, v in sorted(day_avgs(h).items())]
    except Exception as e:  # noqa: BLE001
        print("preis DE", e, file=sys.stderr)
    return {"stand": stamp(), "einheit": "€/MWh", "zonen": zonen, "de": de}


# ---------- Öl & Gas (FRED, EIA) ----------
def fred(series, days=400):
    txt = curl(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}").decode("utf-8", "replace")
    if not txt.lstrip().lower().startswith(("observation_date", "date")):
        raise ValueError("FRED liefert kein CSV")
    cut = (NOW.date() - dt.timedelta(days=days)).isoformat()
    pts = []
    for row in csv.reader(io.StringIO(txt)):
        if len(row) < 2 or row[0] < cut:
            continue
        try:
            pts.append([row[0], float(row[1])])
        except ValueError:
            pass
    if not pts:
        raise ValueError("leer")
    return pts


def eia():
    txt = curl("https://ir.eia.gov/wpsr/table1.csv").decode("utf-8", "replace")
    rows = list(csv.reader(io.StringIO(txt)))
    hdr = rows[0]

    def iso(s):
        m, d, y = s.split("/")
        return f"20{y[-2:]}-{int(m):02d}-{int(d):02d}"

    want = {
        "Crude Oil": "rohoel_gesamt", "Commercial (Excluding SPR)": "rohoel", "Strategic Petroleum Reserve (SPR)": "spr",
        "Total Motor Gasoline": "benzin", "Distillate Fuel Oil": "destillate",
    }
    out = {"woche": iso(hdr[1]), "einheit": "Mio. Barrel", "posten": []}
    seen = set()
    for r in rows[1:]:
        k = r[0].strip()
        if k in want and k not in seen:
            seen.add(k)
            f = lambda i: float(r[i]) if i < len(r) and r[i] not in ("", "NA") else None  # noqa: E731
            out["posten"].append({"key": want[k], "wert": f(1), "vorwoche": f(2), "vorjahr": f(5)})
    if not out["posten"]:
        raise ValueError("EIA leer")
    return out


# ---------- CO2 (EEX-Auktionen) ----------
def xlsx_rows(blob):
    z = zipfile.ZipFile(io.BytesIO(blob))
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf-8"), re.S):
            ss.append("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S)).strip())
    sheet = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    for row in re.findall(r"<row[^>]*>(.*?)</row>", sheet, re.S):
        cells = {}
        for ref, attrs, body in re.findall(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', row, re.S):
            v = re.search(r"<v>(.*?)</v>", body or "")
            if not v:
                t = re.search(r"<t[^>]*>(.*?)</t>", body or "")
                cells[ref] = t.group(1) if t else None
                continue
            val = v.group(1)
            if 't="s"' in attrs:
                val = ss[int(val)]
            cells[ref] = val
        yield cells


def eua():
    pts = {}
    for y in (NOW.year - 1, NOW.year):
        try:
            blob = get(f"https://public.eex-group.com/eex/eua-auction-report/emission-spot-primary-market-auction-report-{y}-data.xlsx")
        except Exception as e:  # noqa: BLE001
            print("eex", y, e, file=sys.stderr)
            continue
        cols = None
        for c in xlsx_rows(blob):
            vals = {k: (v or "").strip() for k, v in c.items()}
            if cols is None:
                if "Date" in vals.values() and any("Auction Price" in v for v in vals.values()):
                    cols = {v: k for k, v in vals.items()}
                continue
            d = vals.get(cols.get("Date"), "")
            con = vals.get(cols.get("Contract"), "")
            name = vals.get(cols.get("Auction Name"), "")
            pr = vals.get(cols.get(next((k for k in cols if k.startswith("Auction Price")), ""), ""), "")
            if not d or not pr or "EUAA" in con or "EUAA" in name:
                continue
            try:
                if re.fullmatch(r"\d+(\.\d+)?", d):
                    day = (dt.date(1899, 12, 30) + dt.timedelta(days=int(float(d)))).isoformat()
                else:
                    m = re.match(r"(\d{1,2})[./](\d{1,2})[./](\d{4})", d) or None
                    day = f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}" if m else d[:10]
                pts[day] = float(pr)
            except (ValueError, AttributeError):
                continue
    if not pts:
        raise ValueError("keine EUA-Auktionen")
    cut = (NOW.date() - dt.timedelta(days=370)).isoformat()
    ser = [[d, round(v, 2)] for d, v in sorted(pts.items()) if d >= cut]
    return {"verlauf": ser, "wert": ser[-1][1], "datum": ser[-1][0], "quelle": "EEX-Primärauktion (EU)"}


def main():
    try:
        old = json.load(open(OUT, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        old = {}
    out = dict(old)
    out["stand"] = stamp()
    errs = []

    def step(key, fn):
        try:
            out[key] = fn()
        except Exception as e:  # noqa: BLE001
            errs.append(f"{key}: {e}")
            print("FEHLER", key, e, file=sys.stderr)

    step("strom_de", lambda: dict(mix("de"), ee=ren_daily("de")))
    step("strom_eu", lambda: dict(mix("eu"), ee=ren_daily("eu")))
    step("preise", preise)

    def oel():
        o = {"stand": stamp()}
        for k, s in (("brent", "DCOILBRENTEU"), ("wti", "DCOILWTICO"), ("henryhub", "DHHNGSP")):
            try:
                pts = fred(s)
                o[k] = {"verlauf": pts, "wert": pts[-1][1], "datum": pts[-1][0]}
            except Exception as e:  # noqa: BLE001
                errs.append(f"{k}: {e}")
                if (old.get("oel") or {}).get(k):
                    o[k] = old["oel"][k]
        try:
            o["lager"] = eia()
        except Exception as e:  # noqa: BLE001
            errs.append(f"eia: {e}")
            if (old.get("oel") or {}).get("lager"):
                o["lager"] = old["oel"]["lager"]
        return o

    step("oel", oel)
    step("co2", eua)
    out["fehler"] = errs
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("ok", stamp(), "Fehler:", errs)
    for k in ("strom_de", "strom_eu"):
        s = out.get(k) or {}
        print(k, s.get("stand"), s.get("ee_anteil_24h"), s.get("ee_anteil_jetzt"), (s.get("ee") or {}).get("ytd"), (s.get("ee") or {}).get("vorjahr"))
    print("preise", [(z["code"], z["heute"], z["morgen"]) for z in (out.get("preise") or {}).get("zonen", [])])
    print("oel", {k: (v.get("wert"), v.get("datum")) for k, v in (out.get("oel") or {}).items() if isinstance(v, dict) and "wert" in v})
    print("lager", (out.get("oel") or {}).get("lager"))
    print("co2", {k: v for k, v in (out.get("co2") or {}).items() if k != "verlauf"}, len((out.get("co2") or {}).get("verlauf", [])))


if __name__ == "__main__":
    main()
