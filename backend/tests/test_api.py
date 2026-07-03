import os
import tempfile
import pytest
import pytest_asyncio
import httpx
from fastapi import FastAPI
from httpx import ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth import get_db, hash_password
from app.main import app
from app.models import Base, User, Candidate, Score

_db_file = tempfile.mktemp(suffix=".db")
TEST_DB_URL = f"sqlite:///{_db_file}"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    try:
        if os.path.exists(_db_file):
            os.remove(_db_file)
    except PermissionError:
        pass


@pytest_asyncio.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def _seed_user(db, email, password, role, name="Test User"):
    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_create_candidate(client):
    db = TestSessionLocal()
    _seed_user(db, "reviewer@test.com", "secret123", "reviewer")
    db.close()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@test.com", "password": "secret123"},
    )
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "first_name": "Ram",
        "last_name": "Shah",
        "email": "ram@example.com",
        "status": "new",
        "role_applied": "Software Engineer",
        "skills": ["Python", "FastAPI"],
    }

    resp = await client.post("/api/v1/candidates", json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["first_name"] == "Ram"
    assert data["last_name"] == "Shah"
    assert data["email"] == "ram@example.com"
    assert data["status"] == "new"
    assert data["role_applied"] == "Software Engineer"
    assert data["skills"] == ["Python", "FastAPI"]
    assert data["internal_notes"] is None
    assert "id" in data


@pytest.mark.asyncio
async def test_reviewer_cannot_see_other_reviewer_scores_or_internal_notes(client):
    db = TestSessionLocal()
    r1 = _seed_user(db, "rev1@test.com", "pass123", "reviewer")
    r2 = _seed_user(db, "rev2@test.com", "pass456", "reviewer")
    admin = _seed_user(db, "admin@test.com", "adminpass", "admin")
    r1_id = r1.id

    candidate = Candidate(
        first_name="Hari",
        last_name="Jones",
        email="hari@example.com",
        role_applied="Backend Dev",
        internal_notes="Admin only note",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    cid = candidate.id

    score1 = Score(candidate_id=cid, reviewer_id=r1_id, category="Technical Skills", score=5, note="Good")
    db.add(score1)
    db.commit()
    db.close()

    # --- Reviewer 2: should see empty scores and no internal_notes ---
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "rev2@test.com", "password": "pass456"},
    )
    token_r2 = resp.json()["access_token"]
    headers_r2 = {"Authorization": f"Bearer {token_r2}"}

    resp = await client.get(f"/api/v1/candidates/{cid}", headers=headers_r2)
    assert resp.status_code == 200
    assert resp.json()["internal_notes"] is None

    resp = await client.get(f"/api/v1/candidates/{cid}/scores", headers=headers_r2)
    assert resp.status_code == 200
    assert resp.json() == []

    # --- Admin: should see Reviewer 1's score and internal_notes ---
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    token_admin = resp.json()["access_token"]
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    resp = await client.get(f"/api/v1/candidates/{cid}", headers=headers_admin)
    assert resp.status_code == 200
    assert resp.json()["internal_notes"] == "Admin only note"

    resp = await client.get(f"/api/v1/candidates/{cid}/scores", headers=headers_admin)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["score"] == 5
    assert resp.json()[0]["category"] == "Technical Skills"
    assert resp.json()[0]["reviewer_id"] == r1_id
    assert resp.json()[0]["reviewer_name"] == "Test User"


@pytest.mark.asyncio
async def test_soft_delete_candidate(client):
    db = TestSessionLocal()
    _seed_user(db, "admin@test.com", "adminpass", "admin")
    db.close()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # create
    resp = await client.post(
        "/api/v1/candidates",
        json={
            "first_name": "ToDelete",
            "last_name": "User",
            "email": "delete@example.com",
            "role_applied": "Engineer",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    cid = resp.json()["id"]

    # soft delete
    resp = await client.delete(f"/api/v1/candidates/{cid}", headers=headers)
    assert resp.status_code == 204

    # get returns 404
    resp = await client.get(f"/api/v1/candidates/{cid}", headers=headers)
    assert resp.status_code == 404

    # list does not include it
    resp = await client.get("/api/v1/candidates", headers=headers)
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()["items"]]
    assert cid not in ids


@pytest.mark.asyncio
async def test_admin_create_reviewer(client):
    db = TestSessionLocal()
    _seed_user(db, "admin@test.com", "adminpass", "admin")
    _seed_user(db, "reviewer@test.com", "secret123", "reviewer")
    db.close()

    # admin can create a reviewer
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    admin_token = resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.post(
        "/api/v1/admin/users",
        json={"name": "New Reviewer", "email": "new@reviewer.com", "password": "pass123"},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "New Reviewer"
    assert resp.json()["email"] == "new@reviewer.com"
    assert resp.json()["role"] == "reviewer"

    # reviewer cannot create a reviewer
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@test.com", "password": "secret123"},
    )
    reviewer_token = resp.json()["access_token"]
    reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

    resp = await client.post(
        "/api/v1/admin/users",
        json={"name": "Another", "email": "another@test.com", "password": "pass123"},
        headers=reviewer_headers,
    )
    assert resp.status_code == 403

    # duplicate email fails
    resp = await client.post(
        "/api/v1/admin/users",
        json={"name": "Duplicate", "email": "new@reviewer.com", "password": "pass123"},
        headers=admin_headers,
    )
    assert resp.status_code == 400
