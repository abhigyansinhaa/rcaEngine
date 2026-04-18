import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.deps import get_current_user
from app.config import settings
from app.jobs import run_analysis
from app.models import Analysis, Dataset, User
from app.schemas import AnalysisCreate, AnalysisOut
from app.storage import remove_artifact_dir

router = APIRouter(tags=["analyses"])
logger = logging.getLogger(__name__)


def _analysis_to_out(a: Analysis) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": a.id,
        "dataset_id": a.dataset_id,
        "target": a.target,
        "task_type": a.task_type,
        "status": a.status,
        "error": a.error,
        "created_at": a.created_at,
        "completed_at": a.completed_at,
        "metrics": json.loads(a.metrics_json) if a.metrics_json else None,
        "insights": json.loads(a.insights_json) if a.insights_json else None,
        "recommendations": json.loads(a.recommendations_json) if a.recommendations_json else None,
        "feature_importance": None,
        "shap_summary": json.loads(a.shap_json) if a.shap_json else None,
        "shap_summary_image_url": None,
        "report": json.loads(a.report_json) if getattr(a, "report_json", None) else None,
    }
    if a.shap_json:
        shap = json.loads(a.shap_json)
        base["feature_importance"] = [
            {
                "feature": r["feature"],
                "importance": r.get("xgb_importance", r["mean_abs_shap"]),
                "mean_abs_shap": r["mean_abs_shap"],
            }
            for r in shap
        ]
        base["shap_summary"] = shap
    if a.status == "completed" and a.id:
        base["shap_summary_image_url"] = f"/artifacts/{a.id}/shap_summary.png"
    return base


def _job_wrapper(analysis_id: int, test_size: float, max_rows: int | None) -> None:
    db = SessionLocal()
    try:
        run_analysis(db, analysis_id, test_size, max_rows)
    finally:
        db.close()


@router.post("/datasets/{dataset_id}/analyses", response_model=AnalysisOut, status_code=status.HTTP_201_CREATED)
def create_analysis(
    dataset_id: int,
    body: AnalysisCreate,
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Any:
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if ds is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    col_names = {c["name"] for c in json.loads(ds.columns_json)}
    if body.target not in col_names:
        raise HTTPException(status_code=400, detail=f"Target '{body.target}' is not a column in this dataset")

    analysis = Analysis(
        dataset_id=ds.id,
        target=body.target,
        status="queued",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    if settings.redis_url:
        try:
            from app.queue import enqueue_analysis

            enqueue_analysis(analysis.id, body.test_size, body.max_rows)
        except Exception:
            logger.exception("RQ enqueue failed; falling back to BackgroundTasks")
            background_tasks.add_task(_job_wrapper, analysis.id, body.test_size, body.max_rows)
    else:
        background_tasks.add_task(_job_wrapper, analysis.id, body.test_size, body.max_rows)
    return AnalysisOut.model_validate(_analysis_to_out(analysis))


@router.get("/analyses/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Any:
    a = db.get(Analysis, analysis_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    ds = db.get(Dataset, a.dataset_id)
    if ds is None or ds.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return AnalysisOut.model_validate(_analysis_to_out(a))


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    a = db.get(Analysis, analysis_id)
    if a is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    ds = db.get(Dataset, a.dataset_id)
    if ds is None or ds.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    remove_artifact_dir(analysis_id)
    db.delete(a)
    db.commit()
