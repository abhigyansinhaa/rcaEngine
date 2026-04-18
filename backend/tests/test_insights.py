"""Tests for SHAP aggregation."""

from __future__ import annotations

from app.ml.insights import aggregate_shap_by_column


def test_aggregate_one_hot_stems():
    rows = [
        {"feature": "city_NYC", "mean_abs_shap": 0.5, "mean_signed_shap": 0.2, "direction": "increases"},
        {"feature": "city_LA", "mean_abs_shap": 0.3, "mean_signed_shap": -0.1, "direction": "decreases"},
        {"feature": "age", "mean_abs_shap": 0.1, "mean_signed_shap": 0.05, "direction": "increases"},
    ]
    agg = aggregate_shap_by_column(rows, top_k=5)
    names = {r["feature"] for r in agg}
    assert "city" in names
    assert len(agg) >= 1
