from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from .config import settings
from .db import ensure_indexes, get_db
from .pdf_extract import extract_lines_from_pdf
from .question_extract import extract_questions
from .predictor import build_predictions
from .pdf_report import build_predictions_pdf


app = FastAPI(title="Question Paper AI Service", version="1.0.0")


@app.on_event("startup")
def _startup() -> None:
    ensure_indexes()


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True}


class AnalyzeBody(BaseModel):
    subjectName: str | None = None
    department: str | None = None
    semester: str | None = None
    examType: str | None = None  # Mid | Model | Semester


def _upload_abs(file_name: str) -> str:
    if settings.upload_dir_abs:
        return os.path.join(settings.upload_dir_abs, file_name)
    # fallback: assume service is run from backend/ai_service
    return os.path.abspath(os.path.join(os.getcwd(), "..", "uploads", file_name))


@app.post("/analyze-papers")
def analyze_papers(body: AnalyzeBody) -> dict[str, Any]:
    db = get_db()

    q: dict[str, Any] = {}
    if body.subjectName:
        q["subjectName"] = body.subjectName
    if body.department:
        q["department"] = body.department
    if body.semester:
        q["semester"] = body.semester
    if body.examType:
        q["examType"] = body.examType

    # Collection name matches existing Node/Mongoose project ("paper")
    papers = list(db["paper"].find(q))
    if not papers:
        raise HTTPException(status_code=404, detail="No papers found for given filters")

    extracted_total = 0
    inserted_total = 0
    failed_pdfs = 0
    failed_files: list[str] = []

    # For each paper: extract questions and upsert (paperId + normalized)
    for p in papers:
        file_name = p.get("fileName")
        if not file_name:
            continue
        file_abs = _upload_abs(file_name)
        try:
            lines = extract_lines_from_pdf(file_abs)
            qs = extract_questions(lines)
        except Exception:
            # Skip bad PDFs but continue remaining
            failed_pdfs += 1
            if len(failed_files) < 20:
                failed_files.append(file_name)
            continue

        extracted_total += len(qs)
        docs = []
        for qx in qs:
            docs.append(
                {
                    "paperId": p.get("_id"),
                    "subjectName": p.get("subjectName"),
                    "department": p.get("department"),
                    "semester": p.get("semester"),
                    "examType": p.get("examType"),
                    "academicYear": p.get("academicYear"),
                    "text": qx.text,
                    "normalized": qx.normalized,
                    "marks": qx.marks,
                    "marksBucket": qx.marksBucket,
                    "part": qx.part,
                    "unit": qx.unit,
                    "createdAt": datetime.now(timezone.utc),
                }
            )

        # naive insert-many with duplicate protection by normalized+paperId
        for d in docs:
            r = db["extracted_questions"].update_one(
                {"paperId": d["paperId"], "normalized": d["normalized"]},
                {"$setOnInsert": d},
                upsert=True,
            )
            if r.upserted_id is not None:
                inserted_total += 1

    # Build predictions for each distinct (subject, dept, sem, examType) combination.
    key_q = {}
    if body.subjectName:
        key_q["subjectName"] = body.subjectName
    if body.department:
        key_q["department"] = body.department
    if body.semester:
        key_q["semester"] = body.semester
    if body.examType:
        key_q["examType"] = body.examType

    extracted_rows = list(db["extracted_questions"].find(key_q))
    if not extracted_rows:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No extracted questions available after analysis",
                "hint": "Uploaded PDFs may be corrupted/empty or extraction rules didn't detect questions.",
                "failedPdfs": failed_pdfs,
                "failedFiles": failed_files,
            },
        )

    grouped: dict[tuple[Any, Any, Any, Any], list[dict[str, Any]]] = {}
    for row in extracted_rows:
        key = (
            row.get("subjectName"),
            row.get("department"),
            row.get("semester"),
            row.get("examType"),
        )
        grouped.setdefault(key, []).append(row)

    latest_generated_at: datetime | None = None
    prediction_count = 0
    sample_key: dict[str, Any] | None = None

    for (subject, department, semester, exam_type), rows in grouped.items():
        if not subject:
            # Skip invalid rows without subject key.
            continue
        payload = build_predictions(rows)

        db["predictions"].update_one(
            {"subjectName": subject, "department": department, "semester": semester, "examType": exam_type},
            {
                "$set": {
                    "subjectName": subject,
                    "department": department,
                    "semester": semester,
                    "examType": exam_type,
                    "generatedAt": payload["generatedAt"],
                    "payload": payload,
                }
            },
            upsert=True,
        )
        prediction_count += 1
        sample_key = {
            "subjectName": subject,
            "department": department,
            "semester": semester,
            "examType": exam_type,
        }
        generated_at_str = payload.get("generatedAt")
        if generated_at_str:
            try:
                generated_at_dt = datetime.fromisoformat(generated_at_str.replace("Z", "+00:00"))
                if latest_generated_at is None or generated_at_dt > latest_generated_at:
                    latest_generated_at = generated_at_dt
            except Exception:
                pass

    if prediction_count == 0:
        raise HTTPException(status_code=400, detail="No valid prediction keys found from extracted questions")

    return {
        "ok": True,
        "papersAnalyzed": len(papers),
        "questionsExtracted": extracted_total,
        "questionsInserted": inserted_total,
        "failedPdfs": failed_pdfs,
        "predictionGroupsGenerated": prediction_count,
        "samplePredictionKey": sample_key,
        "generatedAt": (
            latest_generated_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            if latest_generated_at
            else datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        ),
    }


def _load_prediction(subject: str, department: str | None, semester: str | None, exam_type: str | None) -> dict[str, Any]:
    db = get_db()
    q: dict[str, Any] = {"subjectName": subject}
    if department:
        q["department"] = department
    if semester:
        q["semester"] = semester
    if exam_type:
        q["examType"] = exam_type

    doc = db["predictions"].find(q).sort([("generatedAt", -1)]).limit(1)
    doc = list(doc)
    if not doc:
        raise HTTPException(status_code=404, detail="No predictions yet. Ask admin to run analysis.")
    return doc[0]["payload"]


@app.get("/predict/{subject}")
def predict(subject: str, department: str | None = None, semester: str | None = None, examType: str | None = None):
    payload = _load_prediction(subject, department, semester, examType)
    return payload


@app.get("/repeated/{subject}")
def repeated(subject: str, department: str | None = None, semester: str | None = None, examType: str | None = None):
    payload = _load_prediction(subject, department, semester, examType)
    return {
        "generatedAt": payload.get("generatedAt"),
        "repeated": payload.get("repeated", []),
    }


@app.get("/topics/{subject}")
def topics(subject: str, department: str | None = None, semester: str | None = None, examType: str | None = None):
    payload = _load_prediction(subject, department, semester, examType)
    return {
        "generatedAt": payload.get("generatedAt"),
        "topics": payload.get("topics", []),
    }


@app.get("/predict/{subject}/export.pdf")
def export_pdf(subject: str, department: str | None = None, semester: str | None = None, examType: str | None = None):
    payload = _load_prediction(subject, department, semester, examType)
    pdf = build_predictions_pdf(subject, payload)
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{subject}_predictions.pdf"'})


@app.delete("/ai-data/{subject}")
def delete_ai_data(subject: str) -> dict[str, Any]:
    db = get_db()
    r1 = db["extracted_questions"].delete_many({"subjectName": subject})
    r2 = db["predictions"].delete_many({"subjectName": subject})
    return {"ok": True, "deleted": {"extracted_questions": r1.deleted_count, "predictions": r2.deleted_count}}

