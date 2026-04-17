"""Rule-based business recommendations from SHAP and data quality."""

from __future__ import annotations

from typing import Any, Literal

TaskType = Literal["classification", "regression"]


def build_recommendations(
    task_type: TaskType,
    target: str,
    shap_rows: list[dict[str, Any]],
    column_meta: list[dict[str, Any]],
    metrics: dict[str, float],
    top_k: int = 6,
) -> list[str]:
    recs: list[str] = []

    if task_type == "classification":
        acc = metrics.get("accuracy", 0)
        recs.append(
            f"Model accuracy on hold-out data is {acc:.1%}. Use insights as directional drivers, not guaranteed causal effects."
        )
    else:
        r2 = metrics.get("r2", 0)
        recs.append(
            f"Model explains about {r2:.1%} of variance in `{target}` (R²). Focus on the top drivers below for prioritization."
        )

    ranked = sorted(shap_rows, key=lambda r: -r["mean_abs_shap"])[:top_k]
    for r in ranked:
        feat = r["feature"]
        mag = r["mean_abs_shap"]
        direction = r["direction"]
        if direction == "increases":
            recs.append(
                f"Operational lever: strategies that increase '{feat}' are associated with higher predicted '{target}' "
                f"(approx. SHAP magnitude {mag:.3f}). Pilot interventions that move this signal and measure '{target}'."
            )
        else:
            recs.append(
                f"Risk / efficiency: higher '{feat}' is associated with lower predicted '{target}' "
                f"(SHAP magnitude {mag:.3f}). Investigate processes that reduce this driver if '{target}' should rise."
            )

    meta_by_name = {m["name"]: m for m in column_meta}
    for name, m in meta_by_name.items():
        if m.get("null_ratio", 0) > 0.3:
            recs.append(
                f"Data quality: '{name}' is missing ~{m['null_ratio']*100:.0f}% of the time — backfill or source "
                "cleaner data before locking in decisions on this field."
            )

    if len(ranked) >= 2 and len({r["feature"].split("_")[0] for r in ranked[:3]}) >= 2:
        recs.append(
            "Segment deep-dive: top drivers span multiple factors — consider segmenting customers/operations "
            f"by '{ranked[0]['feature']}' and '{ranked[1]['feature']}' for tailored playbooks."
        )

    return recs[:12]
