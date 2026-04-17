"""Root-cause style insights from SHAP-ranked features."""

from __future__ import annotations

import json
from typing import Any, Literal

import numpy as np
import pandas as pd

TaskType = Literal["classification", "regression"]


def _base_column_name(feature: str) -> str:
    """Map one-hot column like 'city_NYC' or 'city_x0' back to prefix before first underscore after dummy prefix."""
    if "_" in feature:
        parts = feature.split("_", 1)
        return parts[0]
    return feature


def aggregate_shap_by_column(
    shap_rows: list[dict[str, Any]],
    top_k: int = 10,
) -> list[dict[str, Any]]:
    """Sum mean_abs_shap for dummy columns sharing the same stem (e.g. cat prefix)."""
    from collections import defaultdict

    agg_abs: dict[str, float] = defaultdict(float)
    agg_signed: dict[str, float] = defaultdict(float)
    for r in shap_rows:
        name = r["feature"]
        stem = name.split("_", 1)[0] if "_" in name else name
        agg_abs[stem] += r["mean_abs_shap"]
        agg_signed[stem] += r["mean_signed_shap"]

    combined = [
        {
            "feature": k,
            "mean_abs_shap": v,
            "mean_signed_shap": agg_signed[k],
            "direction": "increases" if agg_signed[k] >= 0 else "decreases",
        }
        for k, v in sorted(agg_abs.items(), key=lambda x: -x[1])
    ]
    return combined[:top_k]


def build_insights(
    df: pd.DataFrame,
    target: str,
    task_type: TaskType,
    shap_rows: list[dict[str, Any]],
    column_meta: list[dict[str, Any]],
    top_n: int = 8,
) -> list[dict[str, Any]]:
    """Correlation / SHAP-based insight strings."""
    meta_by_name = {m["name"]: m for m in column_meta}
    ranked = sorted(shap_rows, key=lambda r: -r["mean_abs_shap"])[:top_n]
    insights: list[dict[str, Any]] = []

    y = df[target]
    for r in ranked:
        fname = r["feature"]
        stem = _base_column_name(fname)
        direction = r["direction"]
        strength = r["mean_abs_shap"]

        text = (
            f"'{fname}' is among the strongest modeled drivers of '{target}' "
            f"(mean |SHAP| ≈ {strength:.4f}). Higher values tend to {direction} the predicted outcome."
        )

        if stem in df.columns and pd.api.types.is_numeric_dtype(df[stem]):
            try:
                sub = df[[stem, target]].dropna()
                if len(sub) > 5:
                    corr = sub[stem].corr(pd.to_numeric(sub[target], errors="coerce"))
                    if corr is not None and not np.isnan(corr):
                        text += f" Raw correlation with '{target}' is {corr:+.3f}."
            except Exception:
                pass

        if stem in meta_by_name and meta_by_name[stem].get("null_ratio", 0) > 0.3:
            text += f" Note: '{stem}' has ~{meta_by_name[stem]['null_ratio']*100:.0f}% missing values; improve data quality to tighten this insight."

        insights.append(
            {
                "feature": fname,
                "kind": "driver",
                "task_type": task_type,
                "summary": text,
                "mean_abs_shap": strength,
            }
        )

    return insights


def insights_to_json(insights: list[dict[str, Any]]) -> str:
    return json.dumps(insights)
