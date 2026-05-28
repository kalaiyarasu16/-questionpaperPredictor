from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterable

import pdfplumber

from .text_clean import normalize_text, detect_part, detect_unit


@dataclass
class ExtractedLine:
    text: str
    part: str | None = None
    unit: str | None = None


def extract_lines_from_pdf(file_abs: str) -> list[ExtractedLine]:
    if not os.path.exists(file_abs):
        raise FileNotFoundError(f"Missing PDF: {file_abs}")

    lines: list[ExtractedLine] = []
    current_part: str | None = None
    current_unit: str | None = None

    with pdfplumber.open(file_abs) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ""
            for raw in txt.splitlines():
                t = normalize_text(raw)
                if not t:
                    continue

                p = detect_part(t)
                if p:
                    current_part = p
                    continue

                u = detect_unit(t)
                if u:
                    current_unit = u
                    continue

                lines.append(ExtractedLine(text=t, part=current_part, unit=current_unit))

    return lines


def iter_line_text(lines: Iterable[ExtractedLine]) -> Iterable[str]:
    for l in lines:
        if l.text:
            yield l.text

