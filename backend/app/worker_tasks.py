"""RQ worker entrypoints (importable by `rq worker`)."""

from __future__ import annotations

from app.db import SessionLocal
from app.jobs import run_analysis


def run_analysis_task(analysis_id: int, test_size: float, max_rows: int | None) -> None:
    db = SessionLocal()
    try:
        run_analysis(db, analysis_id, test_size, max_rows)
    finally:
        db.close()
