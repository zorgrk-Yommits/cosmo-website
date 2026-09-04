#!/usr/bin/env bash
# Setzt payment_url in src/data/intelligence-offer.json, sichert out/, baut neu
# (build IST deploy auf heros.cloud) und prueft, dass die Order-CTA auf den Link zeigt.
# Aufruf: scripts/set-intelligence-payment-url.sh https://buy.stripe.com/...            (Single Brief, payment_url)
#         scripts/set-intelligence-payment-url.sh --monthly https://buy.stripe.com/...  (Monthly Edition, monthly_payment_url)
set -euo pipefail
cd "$(dirname "$0")/.."
FIELD=payment_url
if [ "${1:-}" = "--monthly" ]; then FIELD=monthly_payment_url; shift; fi
URL="${1:-}"
[[ "$URL" =~ ^https://[^[:space:]\"]+$ ]] || { echo "Aufruf: $0 [--monthly] https://..."; exit 1; }
node -e '
const fs=require("fs");const p="src/data/intelligence-offer.json";
const o=JSON.parse(fs.readFileSync(p,"utf8"));o[process.argv[2]]=process.argv[1];
fs.writeFileSync(p,JSON.stringify(o,null,2)+"\n");' "$URL" "$FIELD"
[ -d out.pre-intel-payment ] || cp -r out out.pre-intel-payment  # nur EIN out.pre-* Snapshot behalten
npm run build >/tmp/intel-payment-build.log 2>&1 || { tail -30 /tmp/intel-payment-build.log; echo "BUILD FAILED, out/ ggf. aus out.pre-intel-payment zurueck"; exit 1; }
grep -q "href=\"$URL\"" out/intelligence/index.html && echo "OK: CTA zeigt auf $URL" || { echo "FEHLER: URL nicht in out/intelligence/index.html"; exit 1; }
curl -s https://heros.cloud/intelligence/ | grep -q "href=\"$URL\"" && echo "OK: live auf heros.cloud" || echo "WARNUNG: live noch nicht sichtbar (Cache/PM2?)"
echo "Naechster Schritt: git add src/data/intelligence-offer.json scripts/set-intelligence-payment-url.sh && git commit"
