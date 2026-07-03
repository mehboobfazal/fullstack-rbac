from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    name: str = Field(max_length=255)
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CandidateCreate(BaseModel):
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    email: EmailStr
    phone: str | None = None
    status: str = "new"
    role_applied: str = Field(max_length=100)
    company: str | None = None
    years_of_experience: int | None = 0
    skills: list[str] | None = None
    resume_link: str | None = None
    notes: str | None = None
    internal_notes: str | None = None


class CandidateUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = None
    status: str | None = None
    role_applied: str | None = Field(None, max_length=100)
    company: str | None = None
    years_of_experience: int | None = None
    skills: list[str] | None = None
    resume_link: str | None = None
    notes: str | None = None
    internal_notes: str | None = None


class CandidateResponse(BaseModel):
    id: int
    name: str
    first_name: str
    last_name: str
    email: str
    phone: str | None
    status: str
    role_applied: str
    company: str | None
    years_of_experience: int | None
    skills: list[str] | None
    resume_link: str | None
    notes: str | None
    internal_notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScoreCreate(BaseModel):
    category: str = Field(max_length=100)
    score: int = Field(ge=1, le=5)
    note: str | None = None


class ScoreResponse(BaseModel):
    id: int
    candidate_id: int
    reviewer_id: int
    reviewer_name: str
    category: str
    score: int
    note: str | None
    created_at: datetime
