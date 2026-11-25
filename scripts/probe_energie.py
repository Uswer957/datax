import json, urllib.request, zipfile, io, re
def get(u):
    req = urllib.request.Request(u, headers={"User-Agent": "datax-energie/1.0"})
    return urllib.request.urlopen(req, timeout=40).read()
o = json.loads(get("https://api.energy-charts.info/openapi.json"))
for p, v in o["paths"].items():
    ps = [x["name"] for m in v.values() for x in m.get("parameters", [])]
    print(p, ps)
for u in ["https://api.energy-charts.info/ren_share_daily_avg?country=de", "https://api.energy-charts.info/public_power?country=de", "https://api.energy-charts.info/price?bzn=DE-LU", "https://api.energy-charts.info/public_power?country=eu"]:
    j = json.loads(get(u))
    def sh(x, d=0):
        if isinstance(x, dict): return {k: sh(v, d+1) for k, v in x.items()}
        if isinstance(x, list): return [len(x), sh(x[0], d+1) if x else None, x[-1] if x and not isinstance(x[-1], (dict, list)) else None]
        return x
    print(u, json.dumps(sh(j))[:1500])
z = zipfile.ZipFile(io.BytesIO(get("https://public.eex-group.com/eex/eua-auction-report/emission-spot-primary-market-auction-report-2026-data.xlsx")))
print(z.namelist())
ss = z.read("xl/sharedStrings.xml").decode()[:1500] if "xl/sharedStrings.xml" in z.namelist() else ""
print(ss)
sh1 = z.read("xl/worksheets/sheet1.xml").decode()
print(len(sh1), sh1[:2500])
print(sh1[-2500:])
