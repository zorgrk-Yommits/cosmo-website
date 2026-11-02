#!/usr/bin/env bash
# STOCK-TOKEN P4 live: K1 posts the RFQ 0,005 AAPL -> USDG under Rene's GO text. One RFQ per call. Only after the runner is up.
cd /root/w-kd-rh-p3s2 || exit 1
set -a; . /root/w-kd-rh-p3s2/.env; set +a
npx ts-node -T --project tsconfig.src.json src/killerDemo/customer/customer.ts post --policy customer-policy.v2.aapl.json --dir /root/logs/killer-demo-robinhood/customer-aapl --go "GO Kunde P4 Live Stock-Token, 0,005 AAPL gegen USDG, 1 Fill (Zeitfenster Rene 02.11. 18:53 MEZ: jetzt, 19:00-20:00 MEZ)"
