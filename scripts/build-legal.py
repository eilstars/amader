"""Turns legal/*.md into plain pages in public/ (privacy.html, terms.html, health-data.html).

Run after editing a policy:  pip install markdown && python3 scripts/build-legal.py
The web export copies public/ as is, so the pages are served next to the app on Netlify.
Lines starting with "DRAFT" are notes for the lawyer and are left out of the page.
"""
import html
import pathlib
import re

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
STYLE = """
:root { color-scheme: light; --ink: #1D2B24; --muted: #56675E; --leaf: #1F7A5A; --deep: #145A41; --rice: #FBFAF6; --line: #D5DDD6; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--rice); color: var(--ink); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { color: var(--deep); font-size: 30px; line-height: 1.2; }
h2 { color: var(--deep); font-size: 21px; margin-top: 36px; }
a { color: var(--deep); }
table { width: 100%; border-collapse: collapse; font-size: 14px; display: block; overflow-x: auto; }
th, td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid var(--line); }
th { color: var(--muted); font-weight: 600; }
nav { font-size: 14px; color: var(--muted); margin-bottom: 8px; }
"""

def build(name: str, title: str) -> None:
    text = (ROOT / "legal" / f"{name}.md").read_text()
    text = "\n".join(line for line in text.splitlines() if not line.startswith("DRAFT"))
    body = markdown.markdown(text, extensions=["tables"])
    # Links between the pages are written as privacy.html etc. so they work both here and in the drafts.
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<style>{STYLE}</style>
</head>
<body>
<main>
<nav><a href="privacy.html">Privacy Policy</a> · <a href="health-data.html">Consumer Health Data</a> · <a href="terms.html">Terms</a></nav>
{body}
</main>
</body>
</html>
"""
    (ROOT / "public" / f"{name}.html").write_text(page)

build("privacy", "Amader Privacy Policy")
build("health-data", "Amader Consumer Health Data Privacy Policy")
build("terms", "Amader Terms of Use")
print("Built public/privacy.html, public/health-data.html, public/terms.html")
