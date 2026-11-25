#!/bin/bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
p(){ echo "=== $1"; rm -f /tmp/h /tmp/b; curl -s -m 60 -A "$UA" -H "Accept: */*" -D /tmp/h -o /tmp/b "$1"; echo "rc=$?"; head -1 /tmp/h 2>/dev/null; head -c 250 /tmp/b 2>/dev/null | tr '\n' ' '; echo; }
p "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2&cosd=2026-11-01"
p "https://fred.stlouisfed.org/data/BAMLH0A0HYM2.txt"
p "https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=BAMLH0A0HYM2"
p "https://api.db.nomics.com/v22/series/FRED/BAMLH0A0HYM2?observations=1"
p "https://ts-api.cnbc.com/harmony/app/bars/.VIX/1D/20261101000000/20261125000000/adjusted/EST5EDT.json"
p "https://ts-api.cnbc.com/harmony/app/bars/BRK.B/1D/20261101000000/20261125000000/adjusted/EST5EDT.json"
p "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=US10Y%7CUS2Y&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json"
echo "=== burst"
ok=0; bad=0
for s in $(head -150 scripts/sp500.txt | tr '-' '.'); do c=$(curl -s -m 20 -A "$UA" -o /dev/null -w "%{http_code}" "https://ts-api.cnbc.com/harmony/app/bars/$s/1D/20241101000000/20261125000000/adjusted/EST5EDT.json"); [[ $c == 200 ]] && ok=$((ok+1)) || { bad=$((bad+1)); echo "$s $c"; }; done
echo "ok=$ok bad=$bad"
