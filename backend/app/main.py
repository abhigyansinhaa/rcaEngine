from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import init_db
from app.routers import analyses, auth, datasets
from app.storage import ensure_dirs


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs()
    init_db()
    yield


app = FastAPI(title="RCA ML Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(datasets.router, prefix="/api")
app.include_router(analyses.router, prefix="/api")

app.mount("/artifacts", StaticFiles(directory=str(settings.artifacts_dir)), name="artifacts")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
