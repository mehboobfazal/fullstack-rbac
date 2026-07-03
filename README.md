# Candidate Scoring & Review Dashboard

An internal candidate scoring and review dashboard for TechKraft's recruitment workflow. Built with FastAPI + React + SQLite, containerised with Docker Compose.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Running Without Docker](#running-without-docker)
- [Running With Docker Compose](#running-with-docker-compose)
- [Directory Structure](#directory-structure)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Architecture Decision Record](#architecture-decision-record)
- [Debugging: Bug Identification](#debugging-bug-identification)
- [Learning Reflection](#learning-reflection)

---

## Quick Start

```bash
# 1. Clone and enter the repo
git clone https://github.com/mehboobfazal/fullstack-rbac
cd fullstack-rbac

# 2. Copy env file (no real credentials committed)
cp .env.example .env

# 3. Start everything
docker compose up --build

# 4. Open the app
#    Frontend: http://localhost:5173
#    Backend:  http://localhost:8000/api/v1
```

An admin account is auto-seeded on first start using the values in `.env`. The default credentials are `admin1@admin1.com` / `admin1` (matching the `.env.example` defaults).

---

## Environment Variables

| Variable                      | Default                   | Description                 |
| ----------------------------- | ------------------------- | --------------------------- |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`                      | JWT token expiry in minutes |
| `SECRET_KEY`                  | `change-me-in-production` | JWT signing key             |
| `ADMIN_EMAIL`                 | `admin1@admin1.com`       | Admin login email           |
| `ADMIN_PASSWORD`              | `admin1`                  | Admin login password        |

Copy `.env.example` to `.env` and adjust for production.

---

## Running Without Docker

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate     # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Copy env (to project root, load_dotenv looks for .env in parent of backend/)
cp ../.env.example .env   # or copy manually

# Run
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/v1/*` to `http://localhost:8000`.

---

## Running With Docker Compose

```bash
docker compose up --build
```

| Service  | Port | URL                   |
| -------- | ---- | --------------------- |
| Backend  | 8000 | http://localhost:8000 |
| Frontend | 5173 | http://localhost:5173 |

---

## Directory Structure

```
/
├── README.md
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, lifespan, CORS, router registration
│   │   ├── models.py            # SQLAlchemy models: User, Candidate, Score
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth.py              # JWT creation/verification, password hashing, DB session
│   │   ├── seed.py              # Admin account auto-seed on startup
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # POST /auth/login
│   │   │   ├── candidates.py    # CRUD + scores + summary endpoints
│   │   │   └── admin.py         # POST /admin/users (admin-only reviewer creation)
│   │   └── services/
│   │       ├── __init__.py
│   │       └── candidate_service.py  # Business logic: list, filter, paginate, score, soft-delete
│   └── tests/
│       └── test_api.py          # 4 integration tests
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── App.jsx              # Routes + ProtectedRoute/PublicRoute guards
    │   ├── main.jsx
    │   ├── index.css            # Tailwind directives
    │   ├── constants.js         # STATUSES, ROLES
    │   ├── api/
    │   │   └── client.js        # All API call functions + JWT helpers
    │   ├── components/
    │   │   └── ConfirmDialog.jsx
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── CandidateListPage.jsx
    │       ├── CandidateDetailPage.jsx
    │       ├── CandidateFormPage.jsx
    │       └── AddReviewerPage.jsx
    └── tailwind.config.js
```

---

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Auth

| Method | Path          | Auth   | Description              |
| ------ | ------------- | ------ | ------------------------ |
| POST   | `/auth/login` | Public | Login, returns JWT token |

### Candidates

| Method | Path                       | Auth | Description                                              |
| ------ | -------------------------- | ---- | -------------------------------------------------------- |
| GET    | `/candidates`              | JWT  | List candidates (paginated, filterable)                  |
| POST   | `/candidates`              | JWT  | Create a candidate                                       |
| GET    | `/candidates/{id}`         | JWT  | Get candidate detail with scores inline                  |
| PUT    | `/candidates/{id}`         | JWT  | Update candidate (internal_notes stripped for reviewers) |
| DELETE | `/candidates/{id}`         | JWT  | Soft-delete candidate (sets `deleted_at`)                |
| POST   | `/candidates/{id}/scores`  | JWT  | Submit/upsert score for a category                       |
| GET    | `/candidates/{id}/scores`  | JWT  | List scores (admin sees all, reviewer sees own)          |
| POST   | `/candidates/{id}/summary` | JWT  | Trigger mock AI summary (2s delay)                       |
| GET    | `/candidates/{id}/stream`  | JWT  | SSE — stream score updates in real time                  |

### Admin

| Method | Path           | Role  | Description                |
| ------ | -------------- | ----- | -------------------------- |
| POST   | `/admin/users` | Admin | Create a new reviewer user |

### Cursor Examples

```bash
# Login as admin
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@admin1.com","password":"admin1"}'
# → {"access_token":"...","token_type":"bearer"}

TOKEN="<token from above>"

# List candidates (page 1, 20 per page)
curl -s http://localhost:8000/api/v1/candidates?offset=0&limit=20 \
  -H "Authorization: Bearer $TOKEN"

# Create a candidate
curl -s -X POST http://localhost:8000/api/v1/candidates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Ram",
    "last_name": "Shah",
    "email": "ram@example.com",
    "role_applied": "Software Engineer"
  }'

# Submit a score
curl -s -X POST http://localhost:8000/api/v1/candidates/1/scores \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"Technical Skills","score":5,"note":"Excellent"}'

# Trigger AI summary
curl -s -X POST http://localhost:8000/api/v1/candidates/1/summary \
  -H "Authorization: Bearer $TOKEN"

# Soft-delete a candidate
curl -s -X DELETE http://localhost:8000/api/v1/candidates/1 \
  -H "Authorization: Bearer $TOKEN"

# Admin creates a reviewer
curl -s -X POST http://localhost:8000/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Reviewer","email":"jane@reviewer.com","password":"secret123"}'
```

### Query Parameters (GET /candidates)

| Parameter      | Type   | Description                                               |
| -------------- | ------ | --------------------------------------------------------- |
| `offset`       | int    | Pagination offset (default 0)                             |
| `limit`        | int    | Page size (default 20, max 50)                            |
| `status`       | string | Filter by status (`new`, `reviewed`, `hired`, `rejected`) |
| `role_applied` | string | Filter by role                                            |
| `skill`        | string | ILIKE search on skills JSON array                         |
| `keyword`      | string | ILIKE search on name/email                                |

---

## Testing

```bash
cd backend
venv\Scripts\activate   # or source venv/bin/activate
pytest tests/ -v
```

Four tests cover:

1. `test_create_candidate` — Create candidate, verify response shape + `internal_notes` is `None` for reviewer
2. `test_reviewer_cannot_see_other_reviewer_scores_or_internal_notes` — RBAC enforcement
3. `test_soft_delete_candidate` — DELETE returns 204, subsequent GET returns 404, list excludes deleted
4. `test_admin_create_reviewer` — Admin creates reviewer (201), reviewer cannot (403), duplicate email (400)

---

## Architecture Decision Record

### ADR 1: SQLite over PostgreSQL / DynamoDB

**Context:** The assignment required a database that works without external infrastructure. SQLite was chosen for zero-setup portability.

**Decision:** Use SQLite with SQLAlchemy. Indexes are added on `candidates.status`, `candidates.role_applied`, and `scores.candidate_id` as required. A file-based DB replaced the initial `:memory:` approach because ASGI threadpool calls created separate in-memory databases per request.

**Trade-off:** SQLite lacks concurrent write support, which is fine for an internal tool with low traffic but would need migration to PostgreSQL for production scale. SQLAlchemy ORM makes this migration straightforward (change the connection string).

### ADR 2: Role-Based Score Visibility at Query Level vs Application Level

**Context:** Reviewers must see only their own scores; admins must see all scores. `internal_notes` must be hidden from reviewers.

**Decision:** Enforce both at the query level. The scores endpoint runs different queries based on role (`get_scores_for_candidate` vs `get_my_scores_for_candidate`). `internal_notes` is stripped in the `_candidate_to_response` helper before serialisation.

**Trade-off:** Slightly more code than a single query + post-filter, but avoids accidentally leaking data if a new endpoint forgets to filter. The query-level approach guarantees no sensitive data leaves the database layer.

### ADR 3: Admin-Only Reviewer Creation Instead of Self-Registration

**Context:** Open registration would allow anyone to create a reviewer account, undermining the RBAC model.

**Decision:** Removed the public `/auth/register` endpoint entirely. Added `POST /api/v1/admin/users` (admin-only) so only an existing admin can provision reviewers. The admin account itself is bootstrapped via environment variables on first startup.

**Trade-off:** Zero sign-up friction for reviewers (they must ask an admin), which is acceptable for an internal tool where user counts are small and centrally managed. Eliminates the entire class of spam-account vulnerabilities.

---

## Debugging: Bug Identification

The provided code snippet has a **lack of database-level filtering** bug:

```python
def search_candidates(status: str, keyword: str, page: int, page_size: int):
    all_candidates = db.execute("SELECT * FROM candidates").fetchall()
    filtered = [c for c in all_candidates if c["status"] == status]
    # ... also filter by keyword in Python ...
    offset = (page - 1) * page_size
    return filtered[offset : offset + page_size]
```

**Why it matters at scale:** The query fetches **every row** from the `candidates` table into application memory before filtering. With thousands or millions of candidates, this:

1. Saturates application memory (OOM risk)
2. Wastes network I/O transferring irrelevant rows
3. Makes the pagination `LIMIT/OFFSET` pointless since all data is already loaded
4. Prevents the database from using indexes on `status` or other filtered columns

**Correct approach:** Push filtering and pagination into SQL:

```python
def search_candidates(status: str, keyword: str, page: int, page_size: int):
    offset = (page - 1) * page_size
    query = "SELECT * FROM candidates WHERE status = :status"
    params = {"status": status, "limit": page_size, "offset": offset}
    if keyword:
        query += " AND (first_name ILIKE :kw OR last_name ILIKE :kw OR email ILIKE :kw)"
        params["kw"] = f"%{keyword}%"
    query += " LIMIT :limit OFFSET :offset"
    return db.execute(query, params).fetchall()
```

Or with SQLAlchemy ORM — use the query builder to add `.filter()` and `.offset()/.limit()` so the database does the heavy lifting.

---

## Learning Reflection

This project was my first time building a full-stack RBAC system with JWT auth from scratch. I'd previously worked with frameworks that provide auth out of the box, so wiring up passlib + PyJWT + role-checking middleware was a valuable exercise in understanding the primitives.

Given more time, I'd add a reviewer management list page so admins can view and deactivate existing reviewers without raw DB access.
