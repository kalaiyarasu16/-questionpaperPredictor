from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_predictions_pdf(subject: str, payload: dict[str, Any]) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=f"Predictions - {subject}")
    styles = getSampleStyleSheet()

    story = []
    story.append(Paragraph(f"<b>Predicted Important Questions</b> — {subject}", styles["Title"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Generated: {payload.get('generatedAt','')}", styles["Normal"]))
    story.append(Spacer(1, 12))

    items = payload.get("predictedImportant") or []
    for i, it in enumerate(items[:25], start=1):
        q = it.get("question", "")
        c = it.get("confidence", 0)
        story.append(Paragraph(f"{i}. {q} — <b>{c}%</b>", styles["BodyText"]))
        story.append(Spacer(1, 6))

    doc.build(story)
    return buf.getvalue()

