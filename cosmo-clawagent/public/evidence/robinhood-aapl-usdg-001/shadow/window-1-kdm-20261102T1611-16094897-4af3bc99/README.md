# KILLER-DEMO-001 maker shadow case kdm-20261102T1611-16094897-4af3bc99

Shadow only: no quote, no signature for SupraFX, no capital moved.

```
cd <bundle dir> && sha256sum -c SHA256SUMS
cd <repo> && npx ts-node -T --project tsconfig.src.json src/killerDemo/maker/cli.ts verify-bundle <bundle dir>
```
