# KILLER-DEMO-001 maker live case kdm-20261017T1205-11231345-7e75046d

Live decision under the arm in live/arm.json. Execution, if any, is documented under live/ (execution, ledger, funds after the fill, fill proof).

```
cd <bundle dir> && sha256sum -c SHA256SUMS
cd <repo> && npx ts-node -T --project tsconfig.src.json src/killerDemo/maker/cli.ts verify-bundle <bundle dir>
```
