# Plan: heros.cloud auf Release-Symlink umstellen

Stand 08.10.2026. Offener Punkt aus dem Renderer-Fix (10.06.): In-Place-`next build` in das
live servierte `out/` erzeugt ein kurzes 404-Fenster, und jeder Build (auch ein Test-Build)
geht sofort live.

## Ziel

- `npm run build` ist NICHT mehr das Deployment. Live geht nur, was `scripts/deploy.sh` umschaltet.
- Umschalten ist atomar (`rename(2)` auf einen Symlink), kein 404-Fenster.
- Rollback = ein Befehl, Sekunden.

## Vorab verifiziert (08.10., Testport 4399)

serve 14.2.6 hinter Symlink-Root: liefert aus, folgt einem atomaren Symlink-Wechsel pro Request
ohne Neustart, 404 fuer unbekannte Routen bleibt.

## Layout

```
/root/workspace/meine-website/cosmo-releases/
  releases/<YYYYmmdd-HHMMSS>-<sha>[-dirty]/   # Kopie von out/
  current -> releases/<...>                   # das, was PM2 ausliefert
```

Ausserhalb des Repos: kein ESLint-Scan, kein .gitignore-Bedarf.

## scripts/deploy.sh

1. `npm run build` (schreibt `out/`, nicht mehr live).
2. Smoke auf `out/`: `index.html`, `404.html`, `demo/index.html`, `market/work/index.html` vorhanden.
3. `cp -a out releases/<id>`; Git-SHA und Dirty-Flag in `releases/<id>/.release`.
4. FALLE 2 (Stale-Chunks): `cp -an current/_next/static/. releases/<id>/_next/static/`.
5. Probe: neues Release auf Testport servieren, Kernrouten muessen 200 liefern, Bogus-Route 404.
6. Atomarer Wechsel: `ln -sfn releases/<id> current.tmp && mv -Tf current.tmp current`.
7. Live-Check gegen `https://heros.cloud/<route>/`.
8. Aufraeumen: die letzten 5 Releases behalten.

`scripts/deploy.sh --rollback` setzt `current` auf das vorige Release (gleicher atomarer Wechsel).

## Einmaliger Cutover (braucht GO, ca. 1-2 s Neustart)

1. Erstes Release aus dem aktuellen `out/` anlegen (identischer Inhalt, kein Build).
2. `pm2 delete cosmo-clawagent && pm2 start serve --name cosmo-clawagent -- <releases>/current -l 3001 && pm2 save`
   (OHNE `-s`, siehe cosmo-website-serve-config).
3. Pruefen: `pm2 describe` (Args), Kernrouten 200 auf :3001 und heros.cloud, Bogus-Route 404.
4. Rollback des Cutovers: PM2 wieder auf `.../cosmo-clawagent/out` starten.

## Danach

- `out.pre-*`-Snapshots (11 Stueck, je ca. 36 MB) entfallen, die Releases ersetzen sie; alle loeschen.
- Memory `cosmo-website-build-is-deploy` / `cosmo-website-serve-config` nachziehen.
