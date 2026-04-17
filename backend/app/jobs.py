"""Background analysis job: train, explain, persist."""

from __future__ import annotations

import json
import traceback
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy.orm import Session

from app.ml.explain import compute_explanations, shap_json_dump
from app.ml.insights import build_insights, insights_to_json
from app.ml.pipeline import train_model
from app.ml.recommend import build_recommendations
from app.models import Analysis, Dataset
from app.storage import analysis_artifact_dir, ensure_dirs


def _load_df(ds: Dataset) -> pd.DataFrame:
    if ds.file_format == "csv":
        return pd.read_csv(ds.storage_path, low_memory=False)
    return pd.read_parquet(ds.storage_path)


def run_analysis(db: Session, analysis_id: int, test_size: float, max_rows: int | None) -> None:
    ensure_dirs()
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        return

    dataset = db.get(Dataset, analysis.dataset_id)
    if dataset is None:
        analysis.status = "failed"
        analysis.error = "Dataset missing"
        analysis.completed_at = datetime.now(timezone.utc)
        db.commit()
        return

    analysis.status = "running"
    db.commit()

    try:
        df = _load_df(dataset)
        column_meta = json.loads(dataset.columns_json)

        result = train_model(df, analysis.target, test_size=test_size, max_rows=max_rows)
        art_dir = analysis_artifact_dir(analysis_id)
        shap_rows, plot_err = compute_explanations(
            result.model,
            result.X_test,
            result.feature_names,
            art_dir,
        )

        insights = build_insights(
            df,
            analysis.target,
            result.task_type,
            shap_rows,
            column_meta,
        )
        recs = build_recommendations(
            result.task_type,
            analysis.target,
            shap_rows,
            column_meta,
            result.metrics,
        )

        analysis.task_type = result.task_type
        analysis.metrics_json = json.dumps(result.metrics)
        analysis.insights_json = insights_to_json(insights)
        analysis.recommendations_json = json.dumps(recs)
        analysis.shap_json = shap_json_dump(shap_rows)
        analysis.artifacts_path = str(art_dir.resolve())
        if plot_err:
            analysis.error = f"SHAP plot warning: {plot_err}"
        else:
            analysis.error = None
        analysis.status = "completed"
        analysis.completed_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        analysis.status = "failed"
        analysis.error = f"{e!s}\n{traceback.format_exc()}"
        analysis.completed_at = datetime.now(timezone.utc)
        db.commit()
