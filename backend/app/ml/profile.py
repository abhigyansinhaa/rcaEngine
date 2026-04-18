"""Dataset profiling and target suitability checks before training."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

import pandas as pd

from app.ml.common import TaskType, detect_task_type

# Heuristic thresholds (tunable)
MIN_ROWS_FOR_ANALYSIS = 10
MIN_ROWS_RECOMMENDED = 50
MAX_CLASSIFICATION_CARDINALITY = 50
ID_LIKE_UNIQUE_RATIO = 0.5
HIGH_NULL_RATIO = 0.5
HIGH_CARD_CAT_UNIQUE = 100
LEAKAGE_NAME_SUBSTR = ("id", "uuid", "email", "phone", "ssn", "hash")


@dataclass
class ProfileResult:
    """Result of profiling a dataframe for a given target column."""

    ok: bool
    blocking_errors: list[str]
    warnings: list[str]
    dataset_health: dict[str, Any]
    target_suitability: dict[str, Any]
    task_type: TaskType | None
    n_rows_effective: int
    n_features: int

    def to_report_section(self) -> dict[str, Any]:
        return {
            "dataset_health": self.dataset_health,
            "target_suitability": self.target_suitability,
            "warnings": self.warnings,
            "blocking_errors": self.blocking_errors,
            "task_type_hint": self.task_type,
        }


def _dataset_health(df: pd.DataFrame, column_meta: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(df)
    dup_ratio = float(df.duplicated().sum() / n) if n else 0.0
    constant_cols = [c for c in df.columns if df[c].nunique(dropna=True) <= 1]
    meta_by_name = {m["name"]: m for m in column_meta}
    high_null = [c for c in df.columns if meta_by_name.get(c, {}).get("null_ratio", 0) > HIGH_NULL_RATIO]
    return {
        "n_rows": n,
        "n_columns": df.shape[1],
        "duplicate_row_ratio": round(dup_ratio, 4),
        "n_constant_columns": len(constant_cols),
        "high_null_columns_count": len(high_null),
        "constant_columns_sample": constant_cols[:10],
    }


def _target_suitability(
    df: pd.DataFrame,
    target: str,
    column_meta: list[dict[str, Any]],
) -> dict[str, Any]:
    meta_by_name = {m["name"]: m for m in column_meta}
    m = meta_by_name.get(target, {})
    y = df[target]
    n = len(df.dropna(subset=[target]))
    n_unique = int(y.nunique(dropna=True))
    null_ratio = float(m.get("null_ratio", y.isna().mean()))
    task = detect_task_type(y.loc[y.notna()] if len(y) else y)

    imbalance_ratio: float | None = None
    if task == "classification" and n_unique >= 2:
        vc = y.astype(str).value_counts()
        imbalance_ratio = float(vc.min() / max(vc.sum(), 1))

    return {
        "target": target,
        "task_hint": task,
        "n_non_null": n,
        "n_unique": n_unique,
        "null_ratio": round(null_ratio, 4),
        "class_imbalance_minority_ratio": round(imbalance_ratio, 4) if imbalance_ratio is not None else None,
    }


def profile_dataset_for_target(
    df: pd.DataFrame,
    target: str,
    column_meta: list[dict[str, Any]],
) -> ProfileResult:
    """
    Validate dataset and target before ML. Sets ok=False if training should not proceed.
    """
    blocking: list[str] = []
    warnings: list[str] = []

    if target not in df.columns:
        blocking.append(f"Target column '{target}' not found in dataset.")
        return ProfileResult(
            ok=False,
            blocking_errors=blocking,
            warnings=warnings,
            dataset_health={},
            target_suitability={},
            task_type=None,
            n_rows_effective=0,
            n_features=0,
        )

    health = _dataset_health(df, column_meta)
    suitability = _target_suitability(df, target, column_meta)

    work = df.dropna(subset=[target])
    n_eff = len(work)
    n_features = max(0, df.shape[1] - 1)

    if n_eff < MIN_ROWS_FOR_ANALYSIS:
        blocking.append(
            f"Not enough rows with non-null target: {n_eff} (need at least {MIN_ROWS_FOR_ANALYSIS})."
        )

    if health["duplicate_row_ratio"] > 0.3:
        warnings.append(
            f"High duplicate row ratio ({health['duplicate_row_ratio']:.0%}); consider deduplicating for cleaner RCA."
        )

    y = work[target]
    task = detect_task_type(y)

    if task == "classification":
        n_unique = int(y.astype(str).nunique())
        suitability["task_resolved"] = "classification"
        if n_unique > MAX_CLASSIFICATION_CARDINALITY or n_unique > ID_LIKE_UNIQUE_RATIO * max(n_eff, 1):
            blocking.append(
                f"Target '{target}' has {n_unique} unique values over {n_eff} rows. "
                "This looks like an identifier or high-cardinality field, not a classification target. "
                "Choose a column with fewer categories or a numeric metric."
            )
        elif n_unique < 2:
            blocking.append(f"Target '{target}' has fewer than 2 classes; cannot train a classifier.")

        if n_unique == 2 and suitability.get("class_imbalance_minority_ratio") is not None:
            ir = suitability["class_imbalance_minority_ratio"]
            if ir is not None and ir < 0.05:
                warnings.append(
                    f"Severe class imbalance (minority class ~{ir:.1%} of rows); metrics may be unstable."
                )
    else:
        suitability["task_resolved"] = "regression"
        y_num = pd.to_numeric(y, errors="coerce")
        valid = y_num.notna().sum()
        if valid < MIN_ROWS_FOR_ANALYSIS:
            blocking.append(f"Not enough numeric target values after coercion: {valid}.")
        var = float(y_num.var()) if valid > 1 else 0.0
        if var < 1e-12:
            warnings.append(f"Target '{target}' is nearly constant; model explanations may be uninformative.")

    if n_eff < MIN_ROWS_RECOMMENDED:
        warnings.append(
            f"Only {n_eff} rows with non-null target; results are more reliable with at least {MIN_ROWS_RECOMMENDED} rows."
        )

    # Leakage hints: ID-like feature names
    meta_map = {m["name"]: m for m in column_meta}
    for c in df.columns:
        if c == target:
            continue
        cl = c.lower()
        if any(s in cl for s in LEAKAGE_NAME_SUBSTR):
            mc = meta_map.get(c)
            if mc is not None and mc.get("n_unique", 0) > 0.9 * max(n_eff, 1):
                warnings.append(
                    f"Column '{c}' looks identifier-like (high cardinality); consider excluding from drivers."
                )

    ok = len(blocking) == 0
    return ProfileResult(
        ok=ok,
        blocking_errors=blocking,
        warnings=warnings,
        dataset_health=health,
        target_suitability=suitability,
        task_type=task if ok else (task if not blocking else None),
        n_rows_effective=n_eff,
        n_features=n_features,
    )
