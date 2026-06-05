#!/usr/bin/env python3
"""Render COSMO Whitepaper v3 DRAFT to PDF via WeasyPrint."""
import re
import sys
from pathlib import Path

import markdown
from weasyprint import HTML, CSS

WP_DIR = Path("/root/workspace/meine-website/cosmo-clawagent/whitepaper")
MD_FILE = WP_DIR / "COSMO_Whitepaper_v3_DRAFT.md"
PDF_FILE = WP_DIR / "COSMO_Whitepaper_v3_DRAFT.pdf"

CSS_STYLES = r"""
@page {
    size: A4;
    margin: 22mm 20mm 24mm 20mm;
    @bottom-left {
        content: "COSMO Whitepaper v3 \00B7  DRAFT";
        font-family: Inter, Helvetica, sans-serif;
        font-size: 8.5pt;
        color: #6b5b8a;
        padding-top: 4mm;
    }
    @bottom-center {
        content: "Page " counter(page) " / " counter(pages);
        font-family: Inter, Helvetica, sans-serif;
        font-size: 8.5pt;
        color: #6b5b8a;
        padding-top: 4mm;
    }
    @bottom-right {
        content: "heros.cloud";
        font-family: Inter, Helvetica, sans-serif;
        font-size: 8.5pt;
        color: #6b5b8a;
        padding-top: 4mm;
    }
}

@page cover {
    margin: 0;
    @bottom-left { content: none; }
    @bottom-center { content: none; }
    @bottom-right { content: none; }
}

* {
    box-sizing: border-box;
}

html {
    font-family: Inter, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1a1426;
}

body {
    margin: 0;
    padding: 0;
    text-align: justify;
    hyphens: auto;
}

.cover {
    page: cover;
    page-break-after: always;
    background: linear-gradient(160deg, #0f0a1f 0%, #1a0f2e 100%);
    height: 297mm;
    width: 210mm;
    position: relative;
    color: #eae3ff;
    padding: 28mm 22mm;
    page-break-inside: avoid;
}

.cover .brand {
    font-family: Inter, Helvetica, sans-serif;
    font-size: 22pt;
    font-weight: 600;
    letter-spacing: 0.4em;
    color: #b794f4;
    margin: 0;
    padding-left: 2px;
}

.cover .brand-sub {
    font-size: 9pt;
    letter-spacing: 0.3em;
    color: #7a6299;
    margin-top: 6mm;
    text-transform: uppercase;
}

.cover .hero {
    position: absolute;
    top: 110mm;
    left: 22mm;
    right: 22mm;
}

.cover .hero h1 {
    font-size: 30pt;
    font-weight: 600;
    line-height: 1.18;
    color: #f4eaff;
    margin: 0 0 10mm 0;
    letter-spacing: -0.005em;
}

.cover .hero .accent {
    width: 28mm;
    height: 2px;
    background: linear-gradient(90deg, #8b5cf6, #c084fc);
    margin-bottom: 6mm;
}

.cover .hero p {
    font-size: 12pt;
    color: #c8b8e6;
    line-height: 1.5;
    max-width: 130mm;
    margin: 0;
}

.cover .stamp {
    position: absolute;
    top: 30mm;
    right: 24mm;
    transform: rotate(-12deg);
    border: 2.5px solid #ef4444;
    color: #ef4444;
    font-family: Inter, Helvetica, sans-serif;
    font-weight: 700;
    font-size: 28pt;
    letter-spacing: 0.18em;
    padding: 4mm 8mm 3mm 10mm;
    text-transform: uppercase;
    background: rgba(239, 68, 68, 0.06);
}

.cover .version-block {
    position: absolute;
    bottom: 26mm;
    left: 22mm;
    border-left: 2px solid #8b5cf6;
    padding-left: 6mm;
    color: #c8b8e6;
    font-size: 9.5pt;
    line-height: 1.7;
}

.cover .version-block .ver {
    color: #f4eaff;
    font-weight: 600;
    letter-spacing: 0.04em;
    font-size: 10.5pt;
}

.cover .footnote {
    position: absolute;
    bottom: 14mm;
    left: 22mm;
    right: 22mm;
    color: #5d4d7a;
    font-size: 8pt;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

main { padding: 0; }

main h1 { display: none; }

h2 {
    font-size: 16pt;
    font-weight: 600;
    color: #4c1d95;
    margin: 9mm 0 4mm 0;
    line-height: 1.25;
    page-break-after: avoid;
    border-bottom: 1px solid #e6dcfa;
    padding-bottom: 2mm;
}

h2:first-of-type { margin-top: 0; }

h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #5b21b6;
    margin: 6mm 0 2mm 0;
    line-height: 1.3;
    page-break-after: avoid;
}

p {
    margin: 0 0 3mm 0;
    orphans: 3;
    widows: 3;
}

strong { color: #2d1b4e; font-weight: 600; }
em     { color: #4c1d95; }

ul, ol { margin: 2mm 0 3mm 6mm; padding: 0; }
li     { margin-bottom: 1.5mm; }

a { color: #6d28d9; text-decoration: none; }

table {
    width: 100%;
    border-collapse: collapse;
    margin: 3mm 0 4mm 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
}

th {
    background: #4c1d95;
    color: #f4eaff;
    text-align: left;
    padding: 2.5mm 3mm;
    font-weight: 600;
    font-size: 9.5pt;
    letter-spacing: 0.02em;
}

td {
    padding: 2.5mm 3mm;
    border-bottom: 1px solid #e6dcfa;
    vertical-align: top;
}

tr:nth-child(even) td { background: #faf7ff; }

pre, code {
    font-family: "Menlo", "Consolas", monospace;
    font-size: 8.5pt;
}

pre {
    background: #f5f0ff;
    border-left: 3px solid #8b5cf6;
    padding: 4mm 5mm;
    margin: 3mm 0;
    line-height: 1.45;
    color: #2d1b4e;
    page-break-inside: avoid;
    white-space: pre;
    overflow: visible;
}

code {
    background: #efe8ff;
    color: #4c1d95;
    padding: 0.4mm 1mm;
    border-radius: 1.2mm;
}

pre code {
    background: transparent;
    color: inherit;
    padding: 0;
}

blockquote {
    border-left: 3px solid #c084fc;
    margin: 3mm 0 3mm 0;
    padding: 0 0 0 5mm;
    color: #4c1d95;
    font-style: italic;
}

hr {
    border: none;
    border-top: 1px solid #d6c5f5;
    margin: 6mm 0;
}

.tail {
    margin-top: 8mm;
    color: #6b5b8a;
    font-size: 8.5pt;
    text-align: center;
    letter-spacing: 0.04em;
}

h2 + p, h3 + p { margin-top: 1mm; }
"""

COVER_HTML = """
<section class="cover">
  <div class="brand">COSMO</div>
  <div class="brand-sub">Native Execution Layer</div>

  <div class="stamp">DRAFT</div>

  <div class="hero">
    <div class="accent"></div>
    <h1>The Native Execution Layer for the SupraOS Agent Economy</h1>
    <p>A specialized TRANSACT-class capability for cross-chain RFQ settlement, anchored to Supra L1 by audited Move modules and a $COSMO-staked operator council.</p>
  </div>

  <div class="version-block">
    <div class="ver">Whitepaper v3.0 &mdash; DRAFT</div>
    April 2026<br/>
    Supersedes v1.4, v2.1<br/>
    heros.cloud
  </div>

  <div class="footnote">$COSMO Team &middot; Whoever has the best workflows wins</div>
</section>
"""


def md_to_body_html(md_path: Path) -> str:
    text = md_path.read_text(encoding="utf-8")
    # Strip the H1 and the immediate hero/version block at the top so we
    # don't duplicate the cover content inside the body.
    lines = text.splitlines()
    out, skip = [], True
    for line in lines:
        if skip:
            if line.strip().startswith("## "):
                skip = False
                out.append(line)
            continue
        out.append(line)
    body_md = "\n".join(out)
    html = markdown.markdown(
        body_md,
        extensions=["extra", "sane_lists", "tables", "fenced_code"],
    )
    return html


def main() -> int:
    body = md_to_body_html(MD_FILE)
    full = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>COSMO Whitepaper v3 DRAFT</title></head>
<body>
{COVER_HTML}
<main>
{body}
</main>
</body>
</html>"""

    html_path = WP_DIR / "_build.html"
    html_path.write_text(full, encoding="utf-8")
    HTML(string=full, base_url=str(WP_DIR)).write_pdf(
        str(PDF_FILE),
        stylesheets=[CSS(string=CSS_STYLES)],
    )
    print(f"OK  ->  {PDF_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
