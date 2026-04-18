"""Train XGBoost with tabular preprocessing; auto-detect classification vs regression."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    roc_auc_score,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier, XGBRegressor

TaskType = Literal["classification", "regression"]


@dataclass
class TrainResult:
    task_type: TaskType
    metrics: dict[str, float]
    model: XGBClassifier | XGBRegressor
    X_test: np.ndarray
    y_test: np.ndarray
    y_test_raw: np.ndarray
    feature_names: list[str]
    target_name: str
    label_encoder: LabelEncoder | None
    X_train: np.ndarray


MAX_CAT_LEVELS = 25


def detect_task_type(y: pd.Series) -> TaskType:
    if y.dtype == object or str(y.dtype) == "bool" or str(y.dtype) == "category":
        return "classification"
    nu = y.nunique(dropna=True)
    if pd.api.types.is_numeric_dtype(y) and nu <= 20:
        return "classification"
    return "regression"


def _prepare_features(df: pd.DataFrame, target: str) -> tuple[pd.DataFrame, list[str]]:
    X = df.drop(columns=[target]).copy()
    feature_parts: list[pd.DataFrame] = []
    names: list[str] = []

    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in X.columns if c not in num_cols]

    for c in num_cols:
        s = pd.to_numeric(X[c], errors="coerce")
        feature_parts.append(s.to_frame(name=c))
        names.append(c)

    for c in cat_cols:
        s = X[c].astype(str).replace("nan", np.nan)
        vc = s.value_counts(dropna=True)
        top = set(vc.head(MAX_CAT_LEVELS).index.astype(str))
        s = s.where(s.astype(str).isin(top), other="_OTHER_")
        dummies = pd.get_dummies(s, prefix=c, dummy_na=False)
        for col in dummies.columns:
            feature_parts.append(dummies[[col]])
            names.append(str(col))

    if not feature_parts:
        raise ValueError("No feature columns after preprocessing")

    X_mat = pd.concat(feature_parts, axis=1)
    X_mat.columns = names
    return X_mat, names


def train_model(
    df: pd.DataFrame,
    target: str,
    test_size: float = 0.2,
    max_rows: int | None = None,
    random_state: int = 42,
) -> TrainResult:
    if target not in df.columns:
        raise ValueError(f"Target column '{target}' not found")

    work = df.dropna(subset=[target]).copy()
    if max_rows is not None and len(work) > max_rows:
        work = work.sample(n=max_rows, random_state=random_state)

    y_probe = work[target]
    task = detect_task_type(y_probe)

    if task == "regression":
        y_num = pd.to_numeric(work[target], errors="coerce")
        work = work.loc[y_num.notna()].reset_index(drop=True)

    if len(work) < 10:
        raise ValueError("Not enough rows after cleaning (need at least 10)")

    y_raw = work[target]
    task = detect_task_type(y_raw)

    X_df, feature_names = _prepare_features(work, target)

    if task == "classification":
        n_unique = int(y_raw.astype(str).nunique())
        # Refuse ID-like / ultra-high-cardinality targets: they're not a
        # learnable classification signal (e.g. user_id, merchant, email).
        if n_unique > 50 or n_unique > 0.5 * len(work):
            raise ValueError(
                f"Target '{target}' has {n_unique} unique values over "
                f"{len(work)} rows. This looks like an identifier column, "
                "not a classification target. Pick a column with a small "
                "number of categories (e.g. status, label, churned) or a "
                "numeric metric."
            )
        le = LabelEncoder()
        y = le.fit_transform(y_raw.astype(str))
        unique, counts = np.unique(y, return_counts=True)
        # Stratification requires every class to have >= 2 samples. If any
        # class is singleton (common for high-cardinality / ID-like targets),
        # fall back to a plain random split instead of erroring out.
        if len(unique) > 1 and counts.min() >= 2:
            stratify = y
        else:
            stratify = None
    else:
        le = None
        y = pd.to_numeric(y_raw, errors="coerce").values.astype(float)
        stratify = None

    imputer = SimpleImputer(strategy="median")
    X_imp = imputer.fit_transform(X_df)
    X_train, X_test, y_train, y_test = train_test_split(
        X_imp,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify,
    )

    common_params: dict[str, Any] = {
        "n_estimators": 120,
        "max_depth": 6,
        "learning_rate": 0.08,
        "subsample": 0.9,
        "colsample_bytree": 0.9,
        "random_state": random_state,
        "n_jobs": -1,
    }

    if task == "classification":
        n_classes = len(np.unique(y_train))
        model = XGBClassifier(
            **common_params,
            objective="multi:softprob" if n_classes > 2 else "binary:logistic",
            eval_metric="mlogloss" if n_classes > 2 else "logloss",
        )
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        metrics: dict[str, float] = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        }
        if n_classes == 2:
            try:
                proba = model.predict_proba(X_test)[:, 1]
                metrics["roc_auc"] = float(roc_auc_score(y_test, proba))
            except Exception:
                metrics["roc_auc"] = 0.0
    else:
        model = XGBRegressor(**common_params, objective="reg:squarederror")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        metrics = {
            "r2": float(r2_score(y_test, y_pred)),
            "mae": float(mean_absolute_error(y_test, y_pred)),
            "rmse": float(np.sqrt(mse)),
        }

    y_test_raw_vals = (
        le.inverse_transform(y_test) if le is not None else y_test.astype(float)
    )

    return TrainResult(
        task_type=task,
        metrics=metrics,
        model=model,
        X_test=X_test,
        y_test=y_test,
        y_test_raw=np.asarray(y_test_raw_vals),
        feature_names=feature_names,
        target_name=target,
        label_encoder=le,
        X_train=X_train,
    )


def metrics_to_json(metrics: dict[str, float]) -> str:
    return json.dumps(metrics)
