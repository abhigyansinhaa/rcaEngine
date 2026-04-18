"""Pytest configuration."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure `app` package is importable when running `pytest` from repo root or backend/.
_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))
