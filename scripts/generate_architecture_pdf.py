"""
Generate docs/ARCHITECTURE_AND_SCALABILITY.pdf from the Markdown source.

Dependencies (install once):
  pip install markdown xhtml2pdf

Mermaid diagrams appear as fenced code in the PDF; use the Markdown/HTML viewer for rendered diagrams.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "ARCHITECTURE_AND_SCALABILITY.md"
PDF_PATH = ROOT / "docs" / "ARCHITECTURE_AND_SCALABILITY.pdf"


def main() -> int:
    try:
        import markdown
        from xhtml2pdf import pisa
    except ImportError:
        print("Missing dependencies. Run: pip install markdown xhtml2pdf", file=sys.stderr)
        return 1

    if not MD_PATH.is_file():
        print(f"Not found: {MD_PATH}", file=sys.stderr)
        return 1

    md_text = MD_PATH.read_text(encoding="utf-8")
    body_html = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "nl2br", "sane_lists"],
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <style>
    @page {{ size: A4; margin: 18mm; }}
    body {{
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      color: #111;
    }}
    h1 {{ font-size: 18pt; margin-top: 0; }}
    h2 {{ font-size: 13pt; margin-top: 1.2em; border-bottom: 1px solid #ccc; padding-bottom: 0.2em; }}
    h3 {{ font-size: 11.5pt; margin-top: 1em; }}
    h4 {{ font-size: 10.5pt; margin-top: 0.8em; }}
    code, pre {{ font-family: Consolas, "Courier New", monospace; font-size: 9pt; }}
    pre {{
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-word;
    }}
    table {{ border-collapse: collapse; width: 100%; margin: 0.6em 0; font-size: 9.5pt; }}
    th, td {{ border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }}
    th {{ background: #eee; }}
    a {{ color: #2563eb; text-decoration: none; }}
    hr {{ border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }}
    ul, ol {{ margin: 0.4em 0 0.4em 1.2em; padding: 0; }}
  </style>
</head>
<body>
{body_html}
</body>
</html>
"""

    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PDF_PATH, "wb") as out:
        status = pisa.CreatePDF(html, dest=out, encoding="utf-8")
    if getattr(status, "err", 0):
        print("xhtml2pdf reported errors; PDF may be incomplete.", file=sys.stderr)
        return 1
    print(f"Wrote {PDF_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
