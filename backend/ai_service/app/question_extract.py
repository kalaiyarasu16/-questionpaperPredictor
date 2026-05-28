from __future__ import annotations

import re
from dataclasses import dataclass

from .pdf_extract import ExtractedLine
from .text_clean import canonical_question, guess_marks_from_line, normalize_text


QUESTION_START = re.compile(
    r"^\s*(\d{1,2}\s*[\)\.\-]|[a-zA-Z]\s*[\)\.\-]|\(\s*[a-zA-Z]\s*\)\s*|\(\s*\d+\s*\)\s*)\s+"
)


@dataclass
class ExtractedQuestion:
    text: str
    normalized: str
    marks: int | None
    marksBucket: str | None  # "2" | "10" | "other"
    part: str | None
    unit: str | None


def _bucket(marks: int | None) -> str | None:
    if marks is None:
        return None
    if marks <= 2:
        return "2"
    if marks >= 10:
        return "10"
    return "other"


def extract_questions(lines: list[ExtractedLine]) -> list[ExtractedQuestion]:
    out: list[ExtractedQuestion] = []
    buf: list[str] = []
    buf_part: str | None = None
    buf_unit: str | None = None
    buf_marks: int | None = None

    def flush():
        nonlocal buf, buf_part, buf_unit, buf_marks
        if not buf:
            return
        text = normalize_text(" ".join(buf))
        if len(text) < 8:
            buf = []
            return
        norm = canonical_question(text)
        m = buf_marks
        out.append(
            ExtractedQuestion(
                text=text,
                normalized=norm,
                marks=m,
                marksBucket=_bucket(m),
                part=buf_part,
                unit=buf_unit,
            )
        )
        buf = []
        buf_marks = None

    for l in lines:
        t = l.text
        if not t:
            continue

        is_start = bool(QUESTION_START.match(t))
        if is_start:
            flush()
            buf_part = l.part
            buf_unit = l.unit
            buf_marks = guess_marks_from_line(t)
            buf.append(t)
            continue

        # Continuation lines: append to current question if buffer is active
        if buf:
            if buf_marks is None:
                buf_marks = guess_marks_from_line(t)
            buf.append(t)

    flush()

    # Deduplicate exact normalized duplicates within one run
    seen = set()
    deduped: list[ExtractedQuestion] = []
    for q in out:
        if not q.normalized or q.normalized in seen:
            continue
        seen.add(q.normalized)
        deduped.append(q)
    return deduped

