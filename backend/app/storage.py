import shutil
import uuid
from pathlib import Path

from app.config import settings


def ensure_dirs() -> None:
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.artifacts_dir.mkdir(parents=True, exist_ok=True)
    settings.data_dir.mkdir(parents=True, exist_ok=True)


def save_upload(filename: str, content: bytes) -> tuple[str, str]:
    """Returns (storage_path, file_format) where file_format is csv or parquet."""
    ext = Path(filename).suffix.lower()
    if ext == ".csv":
        fmt = "csv"
    elif ext in (".parquet", ".pq"):
        fmt = "parquet"
    else:
        raise ValueError("Only .csv and .parquet files are supported")

    uid = uuid.uuid4().hex
    new_name = f"{uid}{ext}"
    dest = settings.uploads_dir / new_name
    dest.write_bytes(content)
    return str(dest.resolve()), fmt


def delete_file(path: str) -> None:
    p = Path(path)
    if p.is_file():
        p.unlink()


def analysis_artifact_dir(analysis_id: int) -> Path:
    d = settings.artifacts_dir / str(analysis_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def remove_artifact_dir(analysis_id: int) -> None:
    d = settings.artifacts_dir / str(analysis_id)
    if d.is_dir():
        shutil.rmtree(d, ignore_errors=True)
