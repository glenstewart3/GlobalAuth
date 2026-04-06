from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from database import get_db
from models import User, App, UserAppPermission, AuditLog
from schemas import UserCreate, UserUpdate, AppCreate, AppUpdate, PermissionCreate
from auth import require_admin, hash_password, get_client_ip

router = APIRouter(tags=["admin"])


def user_to_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }


def app_to_dict(app: App) -> dict:
    return {
        "id": str(app.id),
        "name": app.name,
        "slug": app.slug,
        "description": app.description,
        "is_active": app.is_active,
        "created_at": app.created_at.isoformat() if app.created_at else None,
    }


def perm_to_dict(perm: UserAppPermission, app: App = None) -> dict:
    result = {
        "id": str(perm.id),
        "user_id": str(perm.user_id),
        "app_id": str(perm.app_id),
        "role": perm.role,
        "is_active": perm.is_active,
        "created_at": perm.created_at.isoformat() if perm.created_at else None,
    }
    if app:
        result["app_name"] = app.name
        result["app_slug"] = app.slug
    return result


# ── USERS ──────────────────────────────────────────────────────────────────────

@router.get("/users/")
async def list_users(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    if search:
        query = query.where(
            or_(User.email.ilike(f"%{search}%"), User.full_name.ilike(f"%{search}%"))
        )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    users = (await db.execute(query)).scalars().all()
    return {"items": [user_to_dict(u) for u in users], "total": total, "page": page, "limit": limit}


@router.post("/users/", status_code=201)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    existing = (await db.execute(select(User).where(User.email == user_data.email.lower()))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email.lower(),
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        is_admin=user_data.is_admin,
        is_active=True,
    )
    db.add(user)
    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="USER_CREATED",
        description=f"Created user {user_data.email}",
        ip_address=ip,
    ))
    await db.commit()
    await db.refresh(user)
    return user_to_dict(user)


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rows = (await db.execute(
        select(UserAppPermission, App)
        .join(App, App.id == UserAppPermission.app_id)
        .where(UserAppPermission.user_id == user_id)
    )).all()

    data = user_to_dict(user)
    data["permissions"] = [perm_to_dict(p, a) for p, a in rows]
    return data


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = user_data.model_dump(exclude_none=True)
    if "email" in updates:
        updates["email"] = updates["email"].lower()
    for key, val in updates.items():
        setattr(user, key, val)
    user.updated_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="USER_UPDATED",
        description=f"Updated user {user_id}: {list(updates.keys())}",
        ip_address=ip,
    ))
    await db.commit()
    await db.refresh(user)
    return user_to_dict(user)


@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    if user_id == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    user.updated_at = datetime.now(timezone.utc)
    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="USER_DEACTIVATED",
        description=f"Deactivated user {user.email}",
        ip_address=ip,
    ))
    await db.commit()
    return {"message": "User deactivated"}


@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    user.updated_at = datetime.now(timezone.utc)
    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="USER_ACTIVATED",
        description=f"Activated user {user.email}",
        ip_address=ip,
    ))
    await db.commit()
    return {"message": "User activated"}


@router.get("/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(UserAppPermission, App)
        .join(App, App.id == UserAppPermission.app_id)
        .where(UserAppPermission.user_id == user_id)
    )).all()
    return [perm_to_dict(p, a) for p, a in rows]


@router.post("/users/{user_id}/permissions", status_code=201)
async def assign_permission(
    user_id: str,
    perm_data: PermissionCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    app = (await db.execute(select(App).where(App.id == perm_data.app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    existing = (await db.execute(
        select(UserAppPermission).where(
            UserAppPermission.user_id == user_id,
            UserAppPermission.app_id == perm_data.app_id,
        )
    )).scalar_one_or_none()

    if existing:
        existing.role = perm_data.role
        existing.is_active = True
        perm = existing
    else:
        perm = UserAppPermission(user_id=user_id, app_id=perm_data.app_id, role=perm_data.role)
        db.add(perm)

    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="PERMISSION_CHANGE",
        description=f"Assigned {user.email} to {app.name} as {perm_data.role}",
        ip_address=ip,
    ))
    await db.commit()
    await db.refresh(perm)
    return perm_to_dict(perm, app)


@router.delete("/users/{user_id}/permissions/{perm_id}")
async def remove_permission(
    user_id: str,
    perm_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    row = (await db.execute(
        select(UserAppPermission, App)
        .join(App, App.id == UserAppPermission.app_id)
        .where(UserAppPermission.id == perm_id, UserAppPermission.user_id == user_id)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Permission not found")

    perm, app = row
    await db.delete(perm)
    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="PERMISSION_CHANGE",
        description=f"Removed {app.name} permission from user {user_id}",
        ip_address=ip,
    ))
    await db.commit()
    return {"message": "Permission removed"}


# ── APPS ───────────────────────────────────────────────────────────────────────

@router.get("/apps/")
async def list_apps(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    apps = (await db.execute(select(App).order_by(App.name))).scalars().all()
    return [app_to_dict(a) for a in apps]


@router.post("/apps/", status_code=201)
async def create_app(
    app_data: AppCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    existing = (await db.execute(select(App).where(App.slug == app_data.slug))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="App with this slug already exists")

    app = App(name=app_data.name, slug=app_data.slug, description=app_data.description)
    db.add(app)
    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="APP_CREATED",
        description=f"Created app: {app_data.name}",
        ip_address=ip,
    ))
    await db.commit()
    await db.refresh(app)
    return app_to_dict(app)


@router.patch("/apps/{app_id}")
async def update_app(
    app_id: str,
    app_data: AppUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    app = (await db.execute(select(App).where(App.id == app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    updates = app_data.model_dump(exclude_none=True)
    for key, val in updates.items():
        setattr(app, key, val)

    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="APP_UPDATED",
        description=f"Updated app {app.name}: {list(updates.keys())}",
        ip_address=ip,
    ))
    await db.commit()
    await db.refresh(app)
    return app_to_dict(app)


@router.delete("/apps/{app_id}", status_code=204)
async def delete_app(
    app_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    app = (await db.execute(select(App).where(App.id == app_id))).scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    name = app.name
    await db.delete(app)
    db.add(AuditLog(
        user_id=str(current_user.id),
        user_email=current_user.email,
        action="APP_DELETED",
        description=f"Deleted app: {name}",
        ip_address=ip,
    ))
    await db.commit()

