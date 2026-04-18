"""Tests for dataset profiling and target suitability."""

from __future__ import annotations

import pandas as pd
from app.ml.profile import profile_dataset_for_target


def _meta(df: pd.DataFrame) -> list[dict]:
    return [
        {
            "name": c,
            "dtype": str(df[c].dtype),
            "null_ratio": float(df[c].isna().mean()),
            "n_unique": int(df[c].nunique()),
        }
        for c in df.columns
    ]


def test_missing_target_blocks():
    df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
    pr = profile_dataset_for_target(df, "missing", _meta(df))
    assert not pr.ok
    assert any("not found" in e.lower() for e in pr.blocking_errors)


def test_id_like_classification_blocks():
    df = pd.DataFrame({"y": [f"id{i}" for i in range(100)], "x": range(100)})
    pr = profile_dataset_for_target(df, "y", _meta(df))
    assert not pr.ok


def test_binary_classification_ok():
    df = pd.DataFrame({"y": [0, 1] * 30, "x": range(60)})
    pr = profile_dataset_for_target(df, "y", _meta(df))
    assert pr.ok
    assert pr.task_type == "classification"


def test_regression_ok():
    rng = __import__("numpy").random.default_rng(42)
    y = rng.normal(size=80)
    df = pd.DataFrame({"y": y, "x": range(80)})
    pr = profile_dataset_for_target(df, "y", _meta(df))
    assert pr.ok
    assert pr.task_type == "regression"
