import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_db, get_current_user, SessionLocal
from app.models import Candidate, User, Score
from app.schemas import (
    CandidateCreate,
    CandidateUpdate,
    CandidateResponse,
    ScoreCreate,
    ScoreResponse,
)
from app.services.candidate_service import (
    list_candidates,
    get_candidate,
    create_candidate,
    update_candidate,
    soft_delete_candidate,
    create_score,
    get_scores_for_candidate,
    get_my_scores_for_candidate,
    generate_summary,
)

router = APIRouter(prefix="/candidates", tags=["candidates"])


def _candidate_to_response(c: Candidate, user: User) -> dict:
    data = {
        "id": c.id,
        "name": c.name,
        "created_by_id": c.created_by_id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "email": c.email,
        "phone": c.phone,
        "status": c.status,
        "role_applied": c.role_applied,
        "company": c.company,
        "years_of_experience": c.years_of_experience,
        "skills": c.skills,
        "resume_link": c.resume_link,
        "notes": c.notes,
        "internal_notes": c.internal_notes if user.role == "admin" else None,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }
    return data


@router.get("")
def list_all(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    status: str | None = None,
    role_applied: str | None = None,
    skill: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total, items = list_candidates(db, offset, limit, status, role_applied, skill, keyword)
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [_candidate_to_response(c, user) for c in items],
    }


@router.post("", response_model=CandidateResponse, status_code=201)
def create(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = body.model_dump()
    data["created_by_id"] = user.id
    if user.role != "admin":
        data.pop("internal_notes", None)
    check_candidate = db.query(Candidate).filter(Candidate.email == data["email"]).first()
    if check_candidate:
        raise HTTPException(status_code=400, detail="Candidate with this email already exists")
    candidate = create_candidate(db, data)
    return _candidate_to_response(candidate, user)


@router.get("/{candidate_id}")
def get(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    result = _candidate_to_response(candidate, user)
    if user.role == "admin":
        result["scores"] = get_scores_for_candidate(db, candidate_id)
    else:
        result["scores"] = get_my_scores_for_candidate(db, candidate_id, user.id)
    return result


@router.put("/{candidate_id}", response_model=CandidateResponse)
def update(
    candidate_id: int,
    body: CandidateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    data = body.model_dump(exclude_unset=True)
    if user.role != "admin":
        data.pop("internal_notes", None)
    candidate = update_candidate(db, candidate, data)
    return _candidate_to_response(candidate, user)


@router.delete("/{candidate_id}", status_code=204)
def delete(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    soft_delete_candidate(db, candidate)


@router.post("/{candidate_id}/scores", response_model=ScoreResponse, status_code=201)
def add_score(
    candidate_id: int,
    body: ScoreCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    score = create_score(db, candidate_id, user.id, body.model_dump())
    return score


@router.get("/{candidate_id}/scores")
def list_scores(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if user.role == "admin":
        scores = get_scores_for_candidate(db, candidate_id)
    else:
        scores = get_my_scores_for_candidate(db, candidate_id, user.id)
    return scores


@router.post("/{candidate_id}/summary")
async def summary(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    text = await generate_summary(candidate)
    return {"summary": text}


@router.get("/{candidate_id}/stream")
async def stream_scores(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    async def event_generator():
        try:
            while True:
                def fetch():
                    s = SessionLocal()
                    try:
                        if user.role == "admin":
                            return get_scores_for_candidate(s, candidate_id)
                        return get_my_scores_for_candidate(s, candidate_id, user.id)
                    finally:
                        s.close()

                scores = await asyncio.to_thread(fetch)
                yield f"event: scores\ndata: {json.dumps(scores, default=str)}\n\n"
                await asyncio.sleep(10)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
