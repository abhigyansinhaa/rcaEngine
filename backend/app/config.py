from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_data_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "data"


def _default_database_url() -> str:
    p = (_default_data_dir() / "app.db").resolve()
    return f"sqlite:///{p.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    database_url: str = Field(default_factory=_default_database_url)
    data_dir: Path = Field(default_factory=_default_data_dir)
    uploads_dir: Path | None = None
    artifacts_dir: Path | None = None

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @model_validator(mode="after")
    def set_subdirs(self) -> "Settings":
        object.__setattr__(self, "uploads_dir", self.data_dir / "uploads")
        object.__setattr__(self, "artifacts_dir", self.data_dir / "artifacts")
        return self


settings = Settings()
