from __future__ import annotations

import re


_WS = re.compile(r"\s+")
_NON_PRINT = re.compile(r"[^\x09\x0a\x0d\x20-\x7e]")


def normalize_text(s: str) -> str:
    s = s or ""
    s = s.replace("\u00a0", " ")
    s = _NON_PRINT.sub(" ", s)
    s = s.strip()
    s = _WS.sub(" ", s)
    return s


def canonical_question(s: str) -> str:
    s = normalize_text(s).lower()
    # Remove leading numbering like "1.", "1)", "(a)", "a)"
    s = re.sub(r"^\(?\s*(\d+|[a-zA-Z])\s*[\)\.\-:]+\s*", "", s)
    # Remove repeated punctuation
    s = re.sub(r"[·•]", " ", s)
    s = re.sub(r"\s*[\(\[]\s*(\d+\s*marks?)\s*[\)\]]\s*$", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def guess_marks_from_line(line: str) -> int | None:
    m = re.search(r"(\d{1,2})\s*marks?", line, flags=re.I)
    if not m:
        return None
    try:
        return int(m.group(1))
    except Exception:
        return None


def detect_part(line: str) -> str | None:
    if re.search(r"\bpart\s*a\b", line, flags=re.I):
        return "Part A"
    if re.search(r"\bpart\s*b\b", line, flags=re.I):
        return "Part B"
    return None


def detect_unit(line: str) -> str | None:
    m = re.search(r"\bunit\s*([ivx]+|\d+)\b", line, flags=re.I)
    if not m:
        return None
    return f"UNIT {m.group(1).upper()}"

