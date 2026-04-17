"""SHAP TreeExplainer + feature importance artifacts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import shap
from xgboost import XGBClassifier, XGBRegressor

MAX_SHAP_SAMPLES = 1000


def _shap_arrays(
    model: XGBClassifier | XGBRegressor,
    X_sample: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Returns (mean_abs_per_feature, mean_signed_per_feature)."""
    explainer = shap.TreeExplainer(model)
    sv = explainer.shap_values(X_sample)
    if isinstance(sv, list):
        abs_stack = np.mean([np.abs(s) for s in sv], axis=0)
        mean_abs = abs_stack.mean(axis=0)
        signed_stack = np.mean(sv, axis=0)
        mean_signed = signed_stack.mean(axis=0)
    else:
        mean_abs = np.abs(sv).mean(axis=0)
        mean_signed = sv.mean(axis=0)
    return mean_abs, mean_signed


def compute_explanations(
    model: XGBClassifier | XGBRegressor,
    X_test: np.ndarray,
    feature_names: list[str],
    artifact_dir: Path,
) -> tuple[list[dict[str, Any]], str | None]:
    artifact_dir.mkdir(parents=True, exist_ok=True)
    n = min(X_test.shape[0], MAX_SHAP_SAMPLES)
    rng = np.random.default_rng(42)
    idx = rng.choice(X_test.shape[0], size=n, replace=False)
    X_s = X_test[idx]

    mean_abs, mean_signed = _shap_arrays(model, X_s)

    imp = getattr(model, "feature_importances_", None)
    if imp is None or len(imp) != len(feature_names):
        imp = np.ones(len(feature_names)) / max(len(feature_names), 1)

    rows: list[dict[str, Any]] = []
    for i, name in enumerate(feature_names):
        direction = "increases" if mean_signed[i] >= 0 else "decreases"
        rows.append(
            {
                "feature": name,
                "mean_abs_shap": float(mean_abs[i]),
                "mean_signed_shap": float(mean_signed[i]),
                "direction": direction,
                "xgb_importance": float(imp[i]) if i < len(imp) else 0.0,
            }
        )
    rows.sort(key=lambda r: r["mean_abs_shap"], reverse=True)

    png_path = artifact_dir / "shap_summary.png"
    plot_err: str | None = None
    try:
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
    except Exception as e:
        plot_err = str(e)
        plt.close()

    return rows, plot_err


def shap_json_dump(rows: list[dict[str, Any]]) -> str:
    return json.dumps(rows)
