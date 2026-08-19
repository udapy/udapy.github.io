#!/usr/bin/env python3
"""Local writing gate for site/_notes (GPTZero/Pangram-shaped, not a detector).

Exit 0 if the draft is bursty, specific, and free of the usual AI cadence.
This is not a substitute for pasting into GPTZero and Pangram before Pages.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

BANNED = [
    r"\bdelve\b",
    r"\btapestry\b",
    r"\blandscape\b",
    r"\brealm\b",
    r"\bpivotal\b",
    r"\bunderscore[sd]?\b",
    r"\bmultifaceted\b",
    r"in today's rapidly",
    r"in the world of",
    r"it(?:'s| is) important to note",
    r"it is worth noting",
    r"needless to say",
    r"^furthermore\b",
    r"^moreover\b",
    r"^additionally\b",
    r"^in conclusion\b",
    r"^to summarize\b",
    r"^in summary\b",
    r"\bleverage\b",
    r"\butilize\b",
    r"unlock the full potential",
    r"game-changer",
    r"cutting-edge",
    r"revolutionize",
    r"not only .+ but also",
]

CONTRACTIONS = re.compile(
    r"\b(?:don't|doesn't|isn't|aren't|wasn't|weren't|I'm|I've|I'd|I'll|"
    r"you're|you've|we're|we've|it's|that's|there's|can't|won't|wouldn't|"
    r"couldn't|shouldn't|let's|didn't|hasn't|haven't)\b",
    re.I,
)

HEADING_CONCLUSION = re.compile(r"^#{1,3}\s+conclusions?\b", re.I | re.M)


def strip_front_matter(text: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4 :]
    return text


def strip_noise(text: str) -> str:
    """Keep body prose. Tables, footnotes, and captions skew length stats."""
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"<figcaption>.*?</figcaption>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<figure[\s\S]*?</figure>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"^\[\^[^\]]+\]:.*(?:\n[ \t].*)*", " ", text, flags=re.M)
    text = re.sub(r"(?m)^\s*\|.*\|\s*$", " ", text)
    text = re.sub(r"\[\^[^\]]+\]", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+.*$", " ", text, flags=re.M)
    text = re.sub(r"(?m)^\s*[-*]\s+.*$", " ", text)
    text = re.sub(r"(?m)^\s*\d+\.\s+.*$", " ", text)
    text = re.sub(r"[#>`|_]", " ", text)
    return text


def sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text)
    out = []
    for p in parts:
        s = re.sub(r"\s+", " ", p).strip()
        if len(s.split()) >= 3:
            out.append(s)
    return out


def word_count(s: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", s))


def numbers(text: str) -> list[str]:
    return re.findall(
        r"\b\d+(?:\.\d+)?(?:\s*×\s*10[⁻\-]?\d+)?(?:e[+-]?\d+)?%?\b|10[⁻\-]?\d+",
        text,
    )


def check(path: Path) -> int:
    raw = path.read_text()
    body = strip_front_matter(raw)
    plain = strip_noise(body)
    sents = sentences(plain)
    lengths = [word_count(s) for s in sents]
    n = len(sents)
    fails: list[str] = []
    warns: list[str] = []

    if n < 25:
        fails.append(f"too short for a primer ({n} sentences). write the argument, don't outline it.")

    if HEADING_CONCLUSION.search(body):
        fails.append("heading 'Conclusion' — rename it. recap endings read as generated.")

    for pat in BANNED:
        cre = re.compile(pat, re.I | re.M)
        hits = cre.findall(body)
        if hits:
            fails.append(f"banned cadence {pat!r} ({len(hits)} hit(s))")

    short = sum(1 for L in lengths if L < 12)
    medium = sum(1 for L in lengths if 12 <= L <= 25)
    long = sum(1 for L in lengths if L > 25)
    if n:
        sp, mp, lp = 100 * short / n, 100 * medium / n, 100 * long / n
    else:
        sp = mp = lp = 0.0

    # GPTZero-era burstiness: fail if almost everything is medium.
    if n >= 20 and mp > 70:
        fails.append(f"low burstiness: {mp:.0f}% of sentences are 12–25 words (want mix, not a wall of medium)")
    if n >= 20 and sp < 12:
        fails.append(f"too few punches: {sp:.0f}% under 12 words (target ~20–35%)")
    if n >= 20 and lp < 14.5:
        fails.append(f"too few long sentences: {lp:.0f}% over 25 words (target ~15–30% of body prose)")

    run = 1
    for i in range(1, len(lengths)):
        if abs(lengths[i] - lengths[i - 1]) <= 3 and 14 <= lengths[i] <= 26:
            run += 1
            if run >= 3:
                fails.append(
                    f"three similar-length sentences in a row around: {sents[i][:80]!r}"
                )
                break
        else:
            run = 1

    if not CONTRACTIONS.search(plain):
        fails.append("no contractions — GPTZero/Pangram both see that as smoothed")

    nums = numbers(plain)
    if len(set(nums)) < 6:
        fails.append(f"only {len(set(nums))} distinct numbers; need ≥6 including a miss")

    if not re.search(r"\b(I|I'm|I've|I'd)\b", plain):
        warns.append("no first person I — primers on this site are usually first person")

    miss = re.search(
        r"\b(dead|fail(?:ed|ure)?|worse|miss|not good enough|didn't work|collapse)\b",
        plain,
        re.I,
    )
    if not miss:
        fails.append("no visible miss (dead/fail/worse/not good enough). success-only reads as generated.")

    # Parallel list smell: 3+ consecutive list items starting with the same POS-ish pattern.
    items = re.findall(r"^\s*[-*]\s+(\S+)", body, re.M)
    if len(items) >= 3:
        heads = [w.lower() for w in items]
        # If 3+ consecutive share the same capitalized participle/gerund template
        pass

    print(f"{path}")
    print(f"  sentences {n}  short {sp:.0f}%  medium {mp:.0f}%  long {lp:.0f}%")
    print(f"  distinct numbers {len(set(nums))}  contractions {'yes' if CONTRACTIONS.search(plain) else 'no'}")
    if lengths:
        print(f"  sentence length min/median/max {min(lengths)}/{sorted(lengths)[n//2]}/{max(lengths)}")
    for w in warns:
        print(f"  warn: {w}")
    for f in fails:
        print(f"  FAIL: {f}")
    if fails:
        return 1
    print("  PASS local gate. Still paste into GPTZero and Pangram before Pages.")
    return 0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("paths", nargs="+", type=Path)
    args = p.parse_args()
    code = 0
    for path in args.paths:
        code = max(code, check(path))
    sys.exit(code)


if __name__ == "__main__":
    main()
