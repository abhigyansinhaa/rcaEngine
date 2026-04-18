"""SHAP / permutation explanations for tree and linear models."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import ElasticNet, LogisticRegression
from sklearn.pipeline import Pipeline as SkPipeline
from xgboost import XGBClassifier, XGBRegressor

from app.ml.common import TaskType

MAX_SHAP_SAMPLES = 1000


def _fallback_rows_from_importances(
    fitted_pipeline: SkPipeline | Any,
    feature_names: list[str],
) -> list[dict[str, Any]]:
    """Uniform or model-based importance when SHAP is unavailable."""
    model = (
        fitted_pipeline.named_steps["model"]
        if isinstance(fitted_pipeline, SkPipeline)
        else fitted_pipeline
    )
    n = len(feature_names)
    imp = getattr(model, "feature_importances_", None)
    if imp is not None:
        imp = np.asarray(imp, dtype=float).ravel()
        if imp.size != n:
            imp = np.ones(n) / max(n, 1)
    else:
        coef = getattr(model, "coef_", None)
        if coef is not None:
            c = np.asarray(coef, dtype=float)
            if c.ndim > 1:
                imp = np.mean(np.abs(c), axis=0).ravel()
            else:
                imp = np.abs(c).ravel()
            if imp.size != n:
                imp = np.ones(n) / max(n, 1)
        else:
            imp = np.ones(n) / max(n, 1)
    total = imp.sum() + 1e-12
    rows: list[dict[str, Any]] = []
    for i, name in enumerate(feature_names):
        w = float(imp[i]) if i < len(imp) else 0.0
        rows.append(
            {
                "feature": name,
                "mean_abs_shap": w / total,
                "mean_signed_shap": 0.0,
                "direction": "increases",
                "xgb_importance": w / total,
            }
        )
    rows.sort(key=lambda r: r["mean_abs_shap"], reverse=True)
    return rows


def compute_explanations_with_fallback(
    fitted_pipeline: SkPipeline | Any,
    X_test: np.ndarray,
    feature_names: list[str],
    artifact_dir: Path,
    model_kind: str,
    task_type: TaskType,
    y_test: np.ndarray | None = None,
    X_test_raw: pd.DataFrame | None = None,
) -> tuple[list[dict[str, Any]], str | None, list[str]]:
    """
    Like compute_explanations, but never raises: falls back to model importances and optional empty plot.
    """
    import logging

    from app.ml import messages as user_msg

    logger = logging.getLogger(__name__)
    notes: list[str] = []
    try:
        rows, plot_err = compute_explanations(
            fitted_pipeline,
            X_test,
            feature_names,
            artifact_dir,
            model_kind,
            task_type,
            y_test=y_test,
            X_test_raw=X_test_raw,
        )
        if plot_err:
            notes.append(user_msg.GOODWILL_PLOT_SKIPPED)
        return rows, plot_err, notes
    except Exception as e:
        logger.warning("Explanation pipeline failed, using importance fallback: %s", e, exc_info=True)
        notes.append(user_msg.GOODWILL_EXPLANATION_FALLBACK)
        try:
            rows = _fallback_rows_from_importances(fitted_pipeline, feature_names)
        except Exception as e2:
            logger.warning("Importance fallback failed: %s", e2, exc_info=True)
            n = len(feature_names)
            rows = [
                {
                    "feature": feature_names[i],
                    "mean_abs_shap": 1.0 / max(n, 1),
                    "mean_signed_shap": 0.0,
                    "direction": "increases",
                    "xgb_importance": 1.0 / max(n, 1),
                }
                for i in range(n)
            ]
        return rows, None, notes


def _scalar_feature_val(x: np.ndarray, i: int) -> float:
    """Index into per-feature arrays; SHAP can be 1D per feature or nested (e.g. multiclass)."""
    v = np.asarray(x[i], dtype=float).ravel()
    return float(np.mean(v)) if v.size else 0.0


def _squeeze_to_n_features(
    arr: np.ndarray,
    n_features: int,
    *,
    use_abs: bool,
) -> np.ndarray:
    """Reduce SHAP / importance arrays to shape (n_features,) for stable downstream use."""
    a = np.asarray(arr, dtype=float)
    if a.ndim == 1:
        if a.size == n_features:
            return a
        return np.resize(a, n_features)
    if a.ndim == 2:
        if a.shape[0] == n_features:
            return np.mean(np.abs(a) if use_abs else a, axis=1)
        if a.shape[1] == n_features:
            return np.mean(np.abs(a) if use_abs else a, axis=0)
    if a.ndim == 3:
        # Common: (n_samples, n_features, n_classes)
        if a.shape[1] == n_features:
            b = np.abs(a) if use_abs else a
            return np.mean(b, axis=(0, 2))
        if a.shape[2] == n_features:
            b = np.abs(a) if use_abs else a
            return np.mean(b, axis=(0, 1))
    # Fallback: average all but last dimension if it matches n_features
    if a.shape[-1] == n_features:
        b = np.abs(a) if use_abs else a
        return np.mean(b, axis=tuple(range(a.ndim - 1)))
    return np.resize(a.ravel(), n_features)


def _tree_explainer_shap(
    model: Any,
    X_sample: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    explainer = shap.TreeExplainer(model)
    sv = explainer.shap_values(X_sample)
    if isinstance(sv, list):
        abs_stack = np.stack([np.abs(s) for s in sv], axis=0)
        mean_abs = abs_stack.mean(axis=(0, 1))
        signed_stack = np.stack(sv, axis=0)
        mean_signed = signed_stack.mean(axis=(0, 1))
    else:
        sv_arr = np.asarray(sv)
        n_f = X_sample.shape[1]
        if sv_arr.ndim == 3:
            if sv_arr.shape[1] == n_f:
                mean_abs = np.abs(sv_arr).mean(axis=(0, 2))
                mean_signed = sv_arr.mean(axis=(0, 2))
            elif sv_arr.shape[2] == n_f:
                mean_abs = np.abs(sv_arr).mean(axis=(0, 1))
                mean_signed = sv_arr.mean(axis=(0, 1))
            else:
                flat_abs = np.abs(sv_arr).mean(axis=0).ravel()
                flat_s = sv_arr.mean(axis=0).ravel()
                mean_abs = np.resize(flat_abs, n_f)
                mean_signed = np.resize(flat_s, n_f)
        else:
            mean_abs = np.abs(sv_arr).mean(axis=0)
            mean_signed = sv_arr.mean(axis=0)
    return mean_abs, mean_signed


def _linear_coef_importance(
    model: LogisticRegression | ElasticNet,
    feature_names: list[str],
    task: TaskType,
) -> tuple[np.ndarray, np.ndarray]:
    if isinstance(model, LogisticRegression):
        coef = model.coef_
        if coef.ndim > 1:
            mean_abs = np.mean(np.abs(coef), axis=0)
            mean_signed = np.mean(coef, axis=0)
        else:
            mean_abs = np.abs(coef)
            mean_signed = coef
    else:
        coef = model.coef_
        mean_abs = np.abs(coef)
        mean_signed = coef
    return mean_abs, mean_signed


def compute_explanations(
    fitted_pipeline: SkPipeline | Any,
    X_test: np.ndarray,
    feature_names: list[str],
    artifact_dir: Path,
    model_kind: str,
    task_type: TaskType,
    y_test: np.ndarray | None = None,
    X_test_raw: pd.DataFrame | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Build per-feature explanation rows. Uses SHAP for tree models; coef / permutation for linear.
    `fitted_pipeline` is the full sklearn Pipeline (prep + model) when using sklearn stack.
    """
    artifact_dir.mkdir(parents=True, exist_ok=True)
    n = min(X_test.shape[0], MAX_SHAP_SAMPLES)
    rng = np.random.default_rng(42)
    idx = rng.choice(X_test.shape[0], size=n, replace=False)
    X_s = X_test[idx]

    model = (
        fitted_pipeline.named_steps["model"]
        if isinstance(fitted_pipeline, SkPipeline)
        else fitted_pipeline
    )

    mean_abs: np.ndarray
    mean_signed: np.ndarray
    imp: np.ndarray | None = getattr(model, "feature_importances_", None)

    if isinstance(model, (XGBClassifier, XGBRegressor, RandomForestClassifier, RandomForestRegressor)):
        mean_abs, mean_signed = _tree_explainer_shap(model, X_s)
        if imp is None or len(imp) != len(feature_names):
            imp = np.ones(len(feature_names)) / max(len(feature_names), 1)
    elif isinstance(model, (LogisticRegression, ElasticNet)):
        mean_abs, mean_signed = _linear_coef_importance(model, feature_names, task_type)
        if mean_abs.shape[0] != len(feature_names):
            mean_abs = np.resize(mean_abs, len(feature_names))
            mean_signed = np.resize(mean_signed, len(feature_names))
        imp = mean_abs / (mean_abs.sum() + 1e-12)
        if y_test is not None and isinstance(fitted_pipeline, SkPipeline) and X_test_raw is not None:
            try:
                X_perm = X_test_raw.iloc[idx].reset_index(drop=True)
                y_s = y_test[idx]
                perm = permutation_importance(
                    fitted_pipeline,
                    X_perm,
                    y_s,
                    n_repeats=5,
                    random_state=42,
                    n_jobs=-1,
                )
                mean_abs = perm.importances_mean
                mean_signed = np.sign(mean_abs) * np.abs(mean_abs)
            except Exception:
                pass
    else:
        mean_abs = np.ones(len(feature_names)) / max(len(feature_names), 1)
        mean_signed = mean_abs
        imp = mean_abs

    n_feat = len(feature_names)
    mean_abs = _squeeze_to_n_features(mean_abs, n_feat, use_abs=True)
    mean_signed = _squeeze_to_n_features(mean_signed, n_feat, use_abs=False)

    rows: list[dict[str, Any]] = []
    for i, name in enumerate(feature_names):
        ms = _scalar_feature_val(mean_signed, i)
        ma = _scalar_feature_val(mean_abs, i)
        direction = "increases" if ms >= 0 else "decreases"
        if imp is not None:
            imp_a = np.asarray(imp, dtype=float).ravel()
            imp_val = float(imp_a[i]) if i < imp_a.size else ma
        else:
            imp_val = ma
        rows.append(
            {
                "feature": name,
                "mean_abs_shap": ma,
                "mean_signed_shap": ms,
                "direction": direction,
                "xgb_importance": imp_val,
            }
        )
    rows.sort(key=lambda r: r["mean_abs_shap"], reverse=True)

    png_path = artifact_dir / "shap_summary.png"
    plot_err: str | None = None
    try:
        if isinstance(model, (XGBClassifier, XGBRegressor, RandomForestClassifier, RandomForestRegressor)):
            explainer = shap.TreeExplainer(model)
            sv = explainer.shap_values(X_s)
            if isinstance(sv, list):
                shap.summary_plot(
                    sv[0],
                    X_s,
                    feature_names=feature_names,
                    show=False,
                    max_display=min(20, len(feature_names)),
                )
            else:
                shap.summary_plot(
                    sv,
                    X_s,
                    feature_names=feature_names,
                    show=False,
                    max_display=min(20, len(feature_names)),
                )
            plt.tight_layout()
            plt.savefig(png_path, dpi=120, bbox_inches="tight")
            plt.close()
        else:
            # Bar chart of top |coef| or permutation
            top = sorted(rows, key=lambda r: -r["mean_abs_shap"])[:15]
            names = [r["feature"][:40] for r in top]
            vals = [r["mean_abs_shap"] for r in top]
            plt.figure(figsize=(8, max(4, len(top) * 0.25)))
            plt.barh(names[::-1], vals[::-1], color="#059669")
            plt.xlabel("Importance (|coef| or permutation)")
            plt.tight_layout()
            plt.savefig(png_path, dpi=120, bbox_inches="tight")
            plt.close()
    except Exception as e:
        plot_err = str(e)
        plt.close()

    return rows, plot_err


def shap_json_dump(rows: list[dict[str, Any]]) -> str:
    return json.dumps(rows)
