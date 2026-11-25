import json, sys
sys.path.insert(0, "scripts")
import kacheln
out = []
for r in ("de", "eu"):
    try:
        s = kacheln.stress(r)
        out.append(r + " " + json.dumps({k: v for k, v in s.items() if k != "verlauf"}, ensure_ascii=False) + f" n={len(s['verlauf'])}")
    except Exception as e:
        out.append(f"{r} ERR {e}")
open("probe.txt", "w").write("\n".join(out) + "\n")
