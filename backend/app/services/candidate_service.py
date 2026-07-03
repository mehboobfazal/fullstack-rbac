import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String

from app.models import Candidate, Score, User


def list_candidates(
    db: Session,
    offset: int = 0,
    limit: int = 20,
    status: str | None = None,
    role_applied: str | None = None,
    skill: str | None = None,
    keyword: str | None = None,
):
    q = db.query(Candidate).filter(Candidate.deleted_at.is_(None))

    if status:
        q = q.filter(Candidate.status == status)
    if role_applied:
        q = q.filter(Candidate.role_applied == role_applied)
    if skill:
        q = q.filter(cast(Candidate.skills, String).ilike(f"%{skill}%"))
    if keyword:
        pattern = f"%{keyword}%"
        q = q.filter(
            or_(
                Candidate.first_name.ilike(pattern),
                Candidate.last_name.ilike(pattern),
                Candidate.email.ilike(pattern),
            )
        )

    total = q.count()
    items = q.order_by(Candidate.created_at.desc()).offset(offset).limit(limit).all()
    return total, items


def get_candidate(db: Session, candidate_id: int):
    return (
        db.query(Candidate)
        .filter(Candidate.id == candidate_id, Candidate.deleted_at.is_(None))
        .first()
    )


def create_candidate(db: Session, data: dict) -> Candidate:
    candidate = Candidate(**data)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def update_candidate(db: Session, candidate: Candidate, data: dict) -> Candidate:
    for field, value in data.items():
        if value is not None:
            setattr(candidate, field, value)
    db.commit()
    db.refresh(candidate)
    return candidate


def soft_delete_candidate(db: Session, candidate: Candidate) -> None:
    from datetime import datetime, timezone

    candidate.deleted_at = datetime.now(timezone.utc)
    db.commit()


def _score_dict(score: Score) -> dict:
    return {
        "id": score.id,
        "candidate_id": score.candidate_id,
        "reviewer_id": score.reviewer_id,
        "category": score.category,
        "score": score.score,
        "note": score.note,
        "created_at": score.created_at,
    }


def create_score(
    db: Session, candidate_id: int, reviewer_id: int, data: dict
) -> dict:
    category = data.get("category")
    existing = (
        db.query(Score)
        .filter(
            Score.candidate_id == candidate_id,
            Score.reviewer_id == reviewer_id,
            Score.category == category,
        )
        .first()
    )
    if existing:
        existing.score = data.get("score", existing.score)
        existing.note = data.get("note", existing.note)
        db.commit()
        db.refresh(existing)
        result = _score_dict(existing)
    else:
        score = Score(candidate_id=candidate_id, reviewer_id=reviewer_id, **data)
        db.add(score)
        db.commit()
        db.refresh(score)
        result = _score_dict(score)

    reviewer = db.query(User).filter(User.id == reviewer_id).first()
    result["reviewer_name"] = reviewer.name if reviewer else ""
    return result


def get_scores_for_candidate(db: Session, candidate_id: int):
    rows = (
        db.query(Score, User.name)
        .join(User, Score.reviewer_id == User.id)
        .filter(Score.candidate_id == candidate_id)
        .order_by(Score.created_at.desc())
        .all()
    )
    return [
        {**_score_dict(s), "reviewer_name": name}
        for s, name in rows
    ]


def get_my_scores_for_candidate(
    db: Session, candidate_id: int, reviewer_id: int
):
    rows = (
        db.query(Score, User.name)
        .join(User, Score.reviewer_id == User.id)
        .filter(
            Score.candidate_id == candidate_id,
            Score.reviewer_id == reviewer_id,
        )
        .order_by(Score.created_at.desc())
        .all()
    )
    return [
        {**_score_dict(s), "reviewer_name": name}
        for s, name in rows
    ]


async def generate_summary(candidate: Candidate) -> str:
    await asyncio.sleep(2)
    return (
        f"{candidate.first_name} {candidate.last_name} applied for "
        f"{candidate.role_applied} with {candidate.years_of_experience or 0} years "
        f"of experience. Skills: {(', '.join(candidate.skills) if candidate.skills else 'N/A')}. "
        f"Current status: {candidate.status}."
    )
