import json, urllib.request
UA = "Mozilla/5.0"
out = []
syms = [".V1XI", ".VDAX", "V1X", ".VDAXNEW", ".V1X", "EXHE-DE", "EXX6-DE", "EXVM-DE", "IS0L-DE", "SXRQ-DE", "DBXG-DE", "X03G-DE", "EUNW-DE", "IUSN-DE", "EXHF-DE", "EXHC-DE", "EXHB-DE"]
u = "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=" + "%7C".join(syms) + "&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json"
q = json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read())
for x in q["FormattedQuoteResult"]["FormattedQuote"]:
    out.append(f"Q {x.get('symbol')} code={x.get('code')} name={x.get('name')} last={x.get('last')} t={x.get('last_time')}")
for s in syms:
    try:
        j = json.loads(urllib.request.urlopen(urllib.request.Request(f"https://ts-api.cnbc.com/harmony/app/bars/{s}/1D/20241101000000/20261126000000/adjusted/EST5EDT.json", headers={"User-Agent": UA}), timeout=30).read())
        b = (j.get("barData") or {}).get("priceBars") or []
        out.append(f"B {s} n={len(b)} last={b[-1]['tradeTime'] if b else None} {b[-1]['close'] if b else ''}")
    except Exception as e:
        out.append(f"B {s} ERR {e}")
open("probe.txt", "w").write("\n".join(out) + "\n")
