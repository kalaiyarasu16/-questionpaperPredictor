from __future__ import annotations

from pymongo import MongoClient
from pymongo.database import Database

from .config import settings


_client: MongoClient | None = None
_db: Database | None = None


def get_db() -> Database:
    global _client, _db
    if _db is not None:
        return _db

    _client = MongoClient(settings.mongodb_uri)
    db = _client.get_default_database()
    if db is None:
        # Fallback when URI doesn't specify db name
        db = _client["questionbank"]

    _db = db
    return _db


def ensure_indexes() -> None:
    db = get_db()
    # `paper` collection is owned by the Node backend; we only read from it.
    db["extracted_questions"].create_index(
        [("subjectName", 1), ("department", 1), ("semester", 1), ("examType", 1), ("academicYear", 1)]
    )
    db["extracted_questions"].create_index([("normalized", 1)])
    db["predictions"].create_index([("subjectName", 1), ("department", 1), ("semester", 1), ("examType", 1)])
    db["predictions"].create_index([("generatedAt", -1)])

