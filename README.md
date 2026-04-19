# RCA ML Platform (MVP)

Web app for uploading tabular datasets, choosing a target variable, and getting **root-cause-style insights**, **feature importance**, **SHAP explanations**, and **rule-based business recommendations**.

- **Backend:** FastAPI, SQLAlchemy (MySQL), JWT auth, XGBoost, SHAP  
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, TanStack Query, Recharts  

**Architecture & scalability:** [docs/ARCHITECTURE_AND_SCALABILITY.md](docs/ARCHITECTURE_AND_SCALABILITY.md) — full stack, ML pipeline, and future scaling. **PDF:** [docs/ARCHITECTURE_AND_SCALABILITY.pdf](docs/ARCHITECTURE_AND_SCALABILITY.pdf). Regenerate with `python scripts/generate_architecture_pdf.py` (requires `pip install markdown xhtml2pdf`).

## Quick start (Docker)

```bash
docker compose up --build
```

- UI: http://localhost:5000  
- API: http://localhost:8000/api/health  
- Data (uploads, artifacts) persist under `./data`; MySQL data persists in Docker volume `mysql_data`  

Set a strong `SECRET_KEY` in production (e.g. `SECRET_KEY=... docker compose up`).

## Local development (no Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Set `DATABASE_URL` for local backend, for example:

```bash
set DATABASE_URL=mysql+pymysql://rca_user:rca_pass@127.0.0.1:3306/rca_db
```

Then run MySQL separately (or with Docker compose). Uploads and artifacts are stored under `data/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5000 — the dev server proxies `/api` and `/artifacts` to the backend.

## Usage

1. **Register** a new account (or log in).  
2. **Upload** a CSV or Parquet file.  
3. Open the dataset, **select the target column**, and run **Root-cause analysis**.  
4. Wait for status **completed** (the results page polls automatically).  
5. Review metrics, SHAP / feature importance, narrative insights, recommendations, and download the JSON report.  

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register `{ email, password }` |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Current user (Bearer token) |
| POST | `/api/datasets` | Multipart upload (`file`, optional `name`) |
| GET | `/api/datasets` | List datasets |
| GET | `/api/datasets/{id}` | Dataset + schema |
| GET | `/api/datasets/{id}/preview` | Preview rows |
| POST | `/api/datasets/{id}/profile` | `{ "target" }` — suitability checks (no training) |
| DELETE | `/api/datasets/{id}` | Delete dataset + analyses |
| POST | `/api/datasets/{id}/analyses` | `{ target, test_size?, max_rows? }` |
| GET | `/api/analyses/{id}` | Analysis status and results |
| GET | `/artifacts/{id}/shap_summary.png` | SHAP summary image |

## Project layout

```
backend/app/          # FastAPI app, ML pipeline, jobs
frontend/src/         # React UI
data/                 # uploads + analysis artifacts (gitignored contents)
backend/sql/          # MySQL schema initialization script
```

## Notes

- **Scaling:** With `REDIS_URL` set (see Docker Compose), analyses run on an **RQ worker**; otherwise they use FastAPI `BackgroundTasks`.  
- **Models:** Sklearn `Pipeline` (imputation, scaling, one-hot) plus routed models: **XGBoost**, **Random Forest**, or **Elastic Net / Logistic Regression** depending on dataset size and task.  
- **Profiling:** `POST /api/datasets/{id}/profile` with `{ "target": "column_name" }` returns suitability checks before training.  
- **Report:** Completed analyses include a structured `report` (dataset health, model choice, CV hints, grouped drivers).  
- **Database migration:** If you created the DB before `report_json` existed, run [backend/sql/migration_002_add_report_json.sql](backend/sql/migration_002_add_report_json.sql).  
- **SHAP:** Tree models use `TreeExplainer`; linear baselines use coefficients and/or permutation importance. Plots are saved under `data/artifacts/{analysis_id}/`.  
- **Causal language:** Outputs are **associative** (model-based), not proven causal effects.  

## Tests

```bash
cd backend
python -m pytest tests -q
```
