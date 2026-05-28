from __future__ import annotations

import math
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .config import settings


@dataclass
class Cluster:
    id: int
    members: list[dict[str, Any]]
    representative: str
    representative_normalized: str
    marks_bucket: str | None
    unit: str | None


def _cluster_questions(rows: list[dict[str, Any]]) -> list[Cluster]:
    texts = [r.get("normalized", "") for r in rows]
    if not texts:
        return []

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")
    X = vectorizer.fit_transform(texts)
    sim = cosine_similarity(X)

    n = len(rows)
    parent = list(range(n))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    thr = settings.similarity_threshold
    for i in range(n):
        for j in range(i + 1, n):
            if sim[i, j] >= thr:
                union(i, j)

    groups: dict[int, list[int]] = defaultdict(list)
    for i in range(n):
        groups[find(i)].append(i)

    clusters: list[Cluster] = []
    cid = 0
    for _, idxs in groups.items():
        members = [rows[i] for i in idxs]
        # pick longest text as representative
        rep = max(members, key=lambda r: len(r.get("text", "")))
        clusters.append(
            Cluster(
                id=cid,
                members=members,
                representative=rep.get("text", ""),
                representative_normalized=rep.get("normalized", ""),
                marks_bucket=rep.get("marksBucket"),
                unit=rep.get("unit"),
            )
        )
        cid += 1
    return clusters


def _year_to_int(y: str) -> int | None:
    # accepts "2024-2025" or "2025"
    if not y:
        return None
    try:
        if "-" in y:
            return int(y.split("-")[0])
        return int(y)
    except Exception:
        return None


def build_predictions(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Input rows: extracted_questions docs filtered to subject+dept+sem+examType.
    Output: prediction payload stored in `predictions`.
    """
    clusters = _cluster_questions(rows)
    now = datetime.now(timezone.utc)

    # Frequency + recency per cluster
    out_items = []
    unit_counts = Counter()

    years_all = []
    for r in rows:
        yi = _year_to_int(r.get("academicYear", ""))
        if yi is not None:
            years_all.append(yi)
    latest_year = max(years_all) if years_all else None

    for c in clusters:
        years = []
        for m in c.members:
            yi = _year_to_int(m.get("academicYear", ""))
            if yi is not None:
                years.append(yi)
        years = sorted(set(years))

        freq = len(c.members)
        freq_years = len(years) or 1
        freq_score = min(1.0, math.log1p(freq) / math.log1p(8))

        # Trend: boost if asked often but not in last 1-2 years
        trend_boost = 0.0
        if latest_year is not None and years:
            last_asked = max(years)
            gap = latest_year - last_asked
            if gap >= 2 and freq >= 2:
                trend_boost = min(0.18, 0.06 * gap)

        # Marks bucket weight (prioritize 10-mark slightly)
        marks_w = 0.06 if c.marks_bucket == "10" else 0.03 if c.marks_bucket == "2" else 0.0

        score = min(1.0, 0.75 * freq_score + trend_boost + marks_w)
        conf = int(round(score * 100))

        unit = c.unit or "General"
        unit_counts[unit] += freq

        out_items.append(
            {
                "question": c.representative,
                "normalized": c.representative_normalized,
                "confidence": conf,
                "frequency": freq,
                "years": years,
                "marksBucket": c.marks_bucket,
                "unit": c.unit,
            }
        )

    out_items.sort(key=lambda x: (x["confidence"], x["frequency"]), reverse=True)

    top2 = [x for x in out_items if x.get("marksBucket") == "2"][:10]
    top10 = [x for x in out_items if x.get("marksBucket") == "10"][:10]
    repeated = [x for x in out_items if x.get("frequency", 0) >= 2][:20]

    unit_wise: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for x in out_items:
        unit_wise[x.get("unit") or "General"].append(x)
    for u in list(unit_wise.keys()):
        unit_wise[u] = unit_wise[u][:10]

    topics = [{"unit": u, "count": int(c)} for u, c in unit_counts.most_common(12)]

    return {
        "generatedAt": now.isoformat(),
        "counts": {
            "totalExtracted": len(rows),
            "clusters": len(clusters),
        },
        "predictedImportant": out_items[:25],
        "top2Mark": top2,
        "top10Mark": top10,
        "repeated": repeated,
        "unitWise": unit_wise,
        "topics": topics,
    }

