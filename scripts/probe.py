import json, subprocess, urllib.request
UA = "Mozilla/5.0"
out = []
syms = [".V2TX", "V2X", ".VSTOXX", ".STOXX50E", ".STOXX", "IHYG-GB", "IHYG", "IEGA-GB", "IBGL-GB", "HYLD-GB", "SHYG-GB", "EUNW-DE", "IS0R-DE",
        ".JNIV", ".VHSI", ".VXFXI", "VXFXI", ".HSI", ".N225", "EWJ", "AAXJ", "EMB", "HYEM", "EMHY", "BNDX", "IGOV", "FXI", "JNK", "IHY", "BWX", "EMLC", "VWOB",
        "DE10Y-DE", "DE30Y-DE", "JP10Y-JP", "CN10Y-CN", ".VIX", "VSTOXX"]
u = "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=" + "%7C".join(syms) + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json"
q = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read())
for x in q["FormattedQuoteResult"]["FormattedQuote"]:
    out.append(f"Q {x.get('symbol')} code={x.get('code')} name={x.get('name')} last={x.get('last')} chg={x.get('change_pct')} t={x.get('last_time')}")
for s in [".V2TX", ".VHSI", ".JNIV", "IHYG-GB", "IEGA-GB", "HYEM", "EMB", "AAXJ", "IHY", ".VXFXI", "VXFXI"]:
    try:
        j = json.loads(urllib.request.urlopen(urllib.request.Request(f"https://ts-api.cnbc.com/harmony/app/bars/{s}/1D/20241101000000/20261126000000/adjusted/EST5EDT.json", headers={"User-Agent": UA}), timeout=30).read())
        b = (j.get("barData") or {}).get("priceBars") or []
        out.append(f"B {s} n={len(b)} first={b[0]['tradeTime'] if b else None} last={b[-1]['tradeTime'] if b else None} {b[-1]['close'] if b else ''}")
    except Exception as e:
        out.append(f"B {s} ERR {e}")
for f in ["BAMLHE00EHYIOAS", "BAMLEMRACRPIASIAOAS", "BAMLEMHBHYCRPIOAS", "BAMLEMHYAOAS", "BAMLEMRAHYCRPIASIAOAS", "BAMLEMCBPIOAS", "BAMLEMHBHYCRPIASIAOAS", "BAMLEMNSNFCRPIOAS"]:
    r = subprocess.run(["curl", "-sS", "--http1.1", "-m", "60", f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={f}"], capture_output=True, text=True)
    lines = r.stdout.strip().splitlines()
    out.append(f"F {f} rc={r.returncode} n={len(lines)} head={lines[:1]} last={lines[-2:] if lines else ''} err={r.stderr[:80]}")
open("probe.txt", "w").write("\n".join(out) + "\n")
