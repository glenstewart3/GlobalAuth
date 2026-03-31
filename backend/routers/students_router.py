from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from database import get_db
from models import User, Student
from schemas import StudentCreate, StudentUpdate
from auth import get_current_user, require_admin

router = APIRouter(tags=["students"])


def student_to_dict(s: Student) -> dict:
    return {
        "id": str(s.id),
        "student_id": s.student_id,
        "first_name": s.first_name,
        "last_name": s.last_name,
        "year_level": s.year_level,
        "class_group": s.class_group,
        "is_active": s.is_active,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


@router.get("/students/")
async def list_students(
    search: Optional[str] = Query(None),
    year_level: Optional[str] = Query(None),
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Student)
    if search:
        query = query.where(
            or_(
                Student.first_name.ilike(f"%{search}%"),
                Student.last_name.ilike(f"%{search}%"),
                Student.student_id.ilike(f"%{search}%"),
            )
        )
    if year_level:
        query = query.where(Student.year_level == year_level)
    if active_only:
        query = query.where(Student.is_active == True)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Student.last_name, Student.first_name).offset((page - 1) * limit).limit(limit)
    students = (await db.execute(query)).scalars().all()
    return {"items": [student_to_dict(s) for s in students], "total": total, "page": page, "limit": limit}


@router.post("/students/", status_code=201)
async def create_student(
    student_data: StudentCreate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(
        select(Student).where(Student.student_id == student_data.student_id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Student ID already exists")

    student = Student(**student_data.model_dump())
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student_to_dict(student)


@router.get("/students/{student_ref}")
async def get_student(
    student_ref: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Try UUID id first, then student_id field
    student = (await db.execute(select(Student).where(Student.id == student_ref))).scalar_one_or_none()
    if not student:
        student = (await db.execute(select(Student).where(Student.student_id == student_ref))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student_to_dict(student)


@router.patch("/students/{student_id}")
async def update_student(
    student_id: str,
    student_data: StudentUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    student = (await db.execute(select(Student).where(Student.id == student_id))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    updates = student_data.model_dump(exclude_none=True)
    for key, val in updates.items():
        setattr(student, key, val)
    student.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(student)
    return student_to_dict(student)


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    student = (await db.execute(select(Student).where(Student.id == student_id))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await db.delete(student)
    await db.commit()
    return {"message": "Student deleted"}
