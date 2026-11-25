#!/bin/bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
for u in "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2&cosd=2026-11-01" "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2"; do
 for o in "--http1.1" "--http2" ""; do echo "=== $o $u"; curl -sS $o -m 60 -A "$UA" -o /tmp/b -w "%{http_code} %{time_total}\n" "$u"; head -c 200 /tmp/b; echo; done; done
curl -sS --http1.1 -m 60 -o /tmp/b -w "%{http_code}\n" "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2" ; head -c 200 /tmp/b
python3 - <<'P'
import urllib.request,time
t=time.time()
try:
  r=urllib.request.urlopen(urllib.request.Request("https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2&cosd=2026-11-01",headers={"User-Agent":"Mozilla/5.0"}),timeout=60); print(r.status, r.read()[:200])
except Exception as e: print("py",e, time.time()-t)
P
