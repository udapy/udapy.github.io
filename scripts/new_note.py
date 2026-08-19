#!/usr/bin/env python3
"""Create a dated note from templates/primer.md."""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "templates" / "primer.md"
NOTES = ROOT / "_notes"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("slug")
    p.add_argument("title")
    p.add_argument("--author", default="Uday Phalak")
    args = p.parse_args()

    today = dt.date.today().isoformat()
    text = TEMPLATE.read_text()
    text = text.replace("TITLE — specific, outcome-first", args.title)
    text = text.replace("YYYY-MM-DD", today)
    text = text.replace("author: Uday Phalak", f"author: {args.author}")
    NOTES.mkdir(exist_ok=True)
    dest = NOTES / f"{args.slug}.md"
    if dest.exists():
        raise SystemExit(f"already exists: {dest}")
    dest.write_text(text)
    print(dest)


if __name__ == "__main__":
    main()
