import os
from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import User


def seed_admin(db: Session) -> None:
    email = os.getenv("ADMIN_EMAIL", "admin1@admin1.com")
    password = os.getenv("ADMIN_PASSWORD", "admin1")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"Admin user already exists. Skipping seeding.", flush=True)
        return

    user = User(
        name="Admin",
        email=email,
        hashed_password=hash_password(password),
        role="admin",
    )
    db.add(user)
    db.commit()
    print(f"Seeded admin user: {email}", flush=True)
