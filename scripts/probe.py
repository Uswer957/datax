import json, subprocess, urllib.request, csv, io
out = []
def get(u, t=60):
    return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=t).read().decode()
for f in ["STLFSI4", "NFCI", "KCFSI"]:
    r = subprocess.run(["curl", "-sS", "--http1.1", "-m", "60", f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={f}"], capture_output=True, text=True)
    L = r.stdout.strip().splitlines(); out.append(f"F {f} n={len(L)} {L[:1]} {L[-3:]}")
for u in ["https://www.financialresearch.gov/financial-stress-index/data/fsi.csv", "https://www.financialresearch.gov/financial-stress-index/data/fsi_daily.csv"]:
    try:
        t = get(u); L = t.strip().splitlines(); out.append(f"O {u} n={len(L)} {L[:1]} {L[-2:]}")
    except Exception as e: out.append(f"O {u} ERR {e}")
for c in ["U2", "DE", "US", "GB", "CN", "JP", "FR", "IT"]:
    for fr in ["D", "W", "M"]:
        try:
            t = get(f"https://data-api.ecb.europa.eu/service/data/CISS/{fr}.{c}.Z0Z.4F.EC.SS_CIN.IDX?lastNObservations=3&format=csvdata")
            rows = list(csv.DictReader(io.StringIO(t)))
            out.append(f"C {fr}.{c} " + str([(r['TIME_PERIOD'], r['OBS_VALUE']) for r in rows]))
            break
        except Exception as e:
            out.append(f"C {fr}.{c} ERR {e}")
try:
    t = get("https://data-api.ecb.europa.eu/service/dataflow/ECB/CISS?format=sdmx-json"); out.append("flow ok " + t[:200])
except Exception as e: out.append(f"flow ERR {e}")
try:
    t = get("https://data-api.ecb.europa.eu/service/data/CISS?lastNObservations=1&format=csvdata&detail=serieskeysonly"); out.append("keys:\n" + "\n".join(r['KEY'] for r in csv.DictReader(io.StringIO(t))))
except Exception as e: out.append(f"keys ERR {e}")
open("probe.txt", "w").write("\n".join(out) + "\n")
