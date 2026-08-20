# Plan: /mandates/ — Verifiable Liquidity Mandates & Controlled Liquidity Pilot

Ziel: eigene Seite fuer die v6.0-Primaerstory (docs/POSITIONING.md v6.0 ist die
Inhaltsquelle, wortgetreu). Die Audiences-Primaerkarte und die Landing zielen
danach hierher statt auf /institutional/.

Sektionen (bestehende Bausteine: SectionHeader, Surface, Reveal, Chip, CtaLink):
1. Hero: Verifiable Liquidity Mandates + Kernaussage + Pilot-Badge
2. Problem: die 5 Delegationsluecken (kein Key mit Blankovollmacht ...)
3. Was EIN Mandat bindet: die Bindungsliste aus POSITIONING v6
4. Ablauf: Mandate -> Policy (hash-pinned) -> AWAITING_ARM -> menschliches ARM
   -> genau 1 Submit -> Settlement -> Receipt -> unabhaengige Verifikation
5. Beweis: EVM-MICRO-001, zwei echte Mainnet-Trades, Etherscan-Links (oeffentliche
   Chain-Fakten), beide Verifier ACCEPT; Honesty-Box mit den Nicht-Claims
6. Pilotangebot: die 7 Punkte + CTA (zielt auf /institutional/ + /assurance/;
   KEIN erfundener Kontaktkanal - es existiert keiner auf der Site)
7. Was COSMO nicht ist: Negativliste

Nebenaenderungen:
- Audiences-Karte href /institutional/ -> /mandates/
- Navigation: Eintrag "Mandates"
- layout.tsx SITE_TITLE/DESCRIPTION auf v6 (Root-Default trug noch v5)

Claim-Disziplin: nur POSITIONING-v6-Wortlaut; Case-Bundles sind NICHT
publiziert -> kein "published evidence"-Claim fuer EVM-MICRO-001, nur
On-Chain-Fakten + Verifier-Ergebnis. Keine Garantien, kein Best-Execution.
