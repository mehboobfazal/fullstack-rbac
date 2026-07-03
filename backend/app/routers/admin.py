from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_db, hash_password, get_current_admin
from app.models import User
from app.schemas import UserRegister, UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users", response_model=UserResponse, status_code=201)
def create_reviewer(
    body: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role="reviewer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
