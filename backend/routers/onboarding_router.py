from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import User
from schemas import OnboardingSetup
from auth import hash_password

router = APIRouter(tags=["onboarding"])


@router.get("/onboarding/status")
async def onboarding_status(db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count()).select_from(User))).scalar()
    return {"needs_onboarding": count == 0, "user_count": count}


@router.post("/onboarding/setup", status_code=201)
async def onboarding_setup(data: OnboardingSetup, db: AsyncSession = Depends(get_db)):
    count = (await db.execute(select(func.count()).select_from(User))).scalar()
    if count > 0:
        raise HTTPException(status_code=403, detail="System already configured. Onboarding is disabled.")

    admin = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        is_admin=True,
        is_active=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    return {
        "message": "Admin account created successfully",
        "user": {
            "id": str(admin.id),
            "email": admin.email,
            "full_name": admin.full_name,
            "is_admin": True,
        },
    }
