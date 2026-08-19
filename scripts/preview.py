#!/usr/bin/env python3
"""Render _notes to _preview without Ruby.

    uv run --with markdown python scripts/preview.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTES = ROOT / "_notes"
PREVIEW = ROOT / "_preview"
CSS_SRC = ROOT / "assets" / "css" / "site.css"
SITE_TITLE = "Uday"


def split_fm(text: str) -> tuple[dict, str]:
    meta: dict = {}
    if not text.startswith("---"):
        return meta, text
    end = text.find("\n---", 3)
    if end == -1:
        return meta, text
    raw = text[4:end]
    body = text[end + 4 :]
    key = None
    for line in raw.splitlines():
        if not line.strip():
            continue
        if key in ("tags", "glossary", "scripts") and line.startswith("  - "):
            if not isinstance(meta.get(key), list):
                meta[key] = []
            meta[key].append(line.strip()[2:].strip())
            continue
        if ":" in line and not line.startswith("    ") and not line.startswith("  -"):
            key, val = line.split(":", 1)
            key, val = key.strip(), val.strip().strip('"')
            if key in ("tags", "glossary", "scripts") and not val:
                meta[key] = []
            else:
                meta[key] = val
    return meta, body


def md_to_html(body: str) -> str:
    try:
        import markdown  # type: ignore
    except ImportError:
        sys.exit(
            "missing markdown. run: uv run --with markdown python scripts/preview.py"
        )
    return markdown.markdown(
        body,
        extensions=["extra", "sane_lists", "smarty"],
    )


def page(title: str, inner: str, scripts: list[str] | None = None, primer: bool = False) -> str:
    extra = ""
    if scripts:
        extra = "\n".join(f'  <script src="js/{s}"></script>' for s in scripts)
    chrome = ""
    if primer:
        chrome = """
  <div class="progress" id="progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>"""
        extra = '  <script src="js/ux.js"></script>\n' + extra
    else:
        extra = '  <script src="js/blackhole.js"></script>\n' + extra
    body_class = "primer-page" if primer else "home-page"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{title}</title>
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f6f3ed">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="site.css">
</head>
<body class="{body_class}">
  <a class="skip" href="#main">Skip to content</a>{chrome}
  <div class="wrap">
    <header>
      <nav class="site-nav" aria-label="Site">
        <a href="index.html">{SITE_TITLE}</a>
      </nav>
    </header>
    <main id="main">
    {inner}
    </main>
    <div id="fig-live" class="sr-only" aria-live="polite"></div>
    <footer class="site">{SITE_TITLE}</footer>
  </div>
{extra}
</body>
</html>
"""


def main() -> None:
    PREVIEW.mkdir(exist_ok=True)
    js_dir = PREVIEW / "js"
    js_dir.mkdir(exist_ok=True)
    (PREVIEW / "site.css").write_text(CSS_SRC.read_text())
    src_js = ROOT / "assets" / "js"
    if src_js.is_dir():
        for p in src_js.glob("*.js"):
            (js_dir / p.name).write_text(p.read_text())

    cards = []
    for path in sorted(NOTES.glob("*.md")):
        meta, body = split_fm(path.read_text())
        title = meta.get("title", path.stem)
        lead = meta.get("lead", "")
        author = meta.get("author", "")
        date = meta.get("date", "")
        tags = meta.get("tags", [])
        if isinstance(tags, str):
            tags = [tags] if tags else []
        tag_html = "".join(f'<span class="tag">{t}</span>' for t in tags)
        html = md_to_html(body)
        inner = f"""
      <header class="primer">
        <h1>{title}</h1>
        <p class="lead">{lead}</p>
        <div class="tags" aria-label="Topics">{tag_html}</div>
        <div class="byline">
          <div class="byline-name">{author}</div>
          <div class="byline-detail">{date}</div>
        </div>
      </header>
      <nav class="toc" id="toc" aria-label="On this page" hidden>
        <ul class="toc-list" id="toc-list"></ul>
      </nav>
      <article class="primer">
        {html}
      </article>
"""
        permalink = meta.get("permalink", "")
        if permalink == "/primer/":
            out_name = "primer.html"
        else:
            out_name = f"{path.stem}.html"
        (PREVIEW / out_name).write_text(
            page(
                title,
                inner,
                meta.get("scripts") if isinstance(meta.get("scripts"), list) else None,
                primer=True,
            )
        )
        cards.append((out_name, title, lead, date))

    lis = "\n".join(
        f'<li><a class="title" href="{u}">{t}</a>'
        f'<p class="dek">{d}</p><p class="meta">{dt}</p></li>'
        for u, t, d, dt in cards
    )
    home = f"""
    <section class="home-hero">
      <header class="home">
        <p class="kicker">कर्मसु कौशल्यम् · “skill in actions”</p>
        <h1>{SITE_TITLE}</h1>
        <p class="lead">Hey — I am Uday Ramesh Phalak. This space documents my applied research at the intersection of advanced AI, human-centric design, and my primary focus: AI safety. Building on early work in adversarial ML defense (2017–2019), the goal is the same: as the models get more capable, they should stay interpretable and actually safe.</p>
        <p class="home-focus">Alignment · interpretability · neurosymbolic models · generative UX</p>
      </header>
      <div class="home-bh" aria-hidden="true">
        <canvas id="cv-blackhole" width="420" height="420"></canvas>
      </div>
    </section>
    <p class="writing-label">Notes</p>
    <ul class="note-list">{lis}</ul>
"""
    (PREVIEW / "index.html").write_text(page(SITE_TITLE, home))
    print(PREVIEW / "index.html")
    for u, _, _, _ in cards:
        print(PREVIEW / u)


if __name__ == "__main__":
    main()
