from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import User, AuditLog
from auth import require_admin

router = APIRouter(tags=["audit"])


@router.get("/audit/")
async def list_audit_logs(
    action: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action.upper())
    if user_email:
        query = query.where(AuditLog.user_email.ilike(f"%{user_email}%"))
    if date_from:
        query = query.where(AuditLog.timestamp >= date_from)
    if date_to:
        query = query.where(AuditLog.timestamp <= date_to)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(AuditLog.timestamp.desc()).offset((page - 1) * limit).limit(limit)
    logs = (await db.execute(query)).scalars().all()

    return {
        "items": [
            {
                "id": str(l.id),
                "user_id": str(l.user_id) if l.user_id else None,
                "user_email": l.user_email,
                "action": l.action,
                "description": l.description,
                "ip_address": l.ip_address,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            }
            for l in logs
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }
