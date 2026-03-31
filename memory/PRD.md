# MPS Auth — PRD

## Problem Statement
Centralised authentication and user management portal for a school's suite of web apps. FastAPI + React. Deployed at `/auth` with backend on port 8000 (PM2) for production. Preview uses port 8001 + Supervisor.

## Architecture
- **Backend**: FastAPI (async), SQLAlchemy async + asyncpg/aiosqlite, PyJWT
- **Frontend**: React + React Router v7 (basename="/auth"), Tailwind CSS, Shadcn UI
- **Database**: PostgreSQL (production), SQLite (development/preview fallback)
- **Auth**: JWT access tokens (30 min) + httpOnly refresh token cookie (10 hr)

## Core Requirements (Static)
1. Login at `/auth/login` — email + password
2. JWT access (30 min) + refresh token in httpOnly cookie (10 hr)
3. Admin UI: create/deactivate users, assign app roles (student/teacher/admin)
4. App names stored in DB — no code changes needed to add new apps
5. `/auth/api/token/refresh/` — silent refresh via cookie
6. `/auth/api/verify/` — JWT verification + user permissions for other apps
7. `/auth/api/logout/` — clears refresh token cookie
8. Full audit log: login, logout, failed login, permission changes
9. Shared student database: student_id, first_name, last_name, year_level, class_group, is_active
10. All FastAPI endpoints async; JWT as reusable `Depends()` function
11. `httpx` available for inter-service calls

## Implemented (2026-02)
- [x] FastAPI backend: auth, admin, students, audit, onboarding routers
- [x] SQLAlchemy async models: User, App, UserAppPermission, AuditLog, Student
- [x] JWT utilities in `auth.py` with `get_current_user` and `require_admin` Depends()
- [x] httpOnly cookie for refresh token
- [x] Onboarding wizard (first-admin setup, no seed)
- [x] Login, logout, token refresh, verify endpoints
- [x] Admin UI: Users (CRUD + permissions), Students (CRUD), Apps (CRUD), Audit Log
- [x] Dashboard with stats + recent activity
- [x] Seeded default apps: WellTrack, BeeShopKiosk, PsychScheduler
- [x] Full audit logging on all significant actions
- [x] PM2 ecosystem.config.js for production deployment
- [x] API_PREFIX env var (preview: `/api`, production: `/auth/api`)
- [x] Design system: Chivo + IBM Plex Sans + IBM Plex Mono, #0047FF primary

## Configurable via .env
| Key | Preview | Production |
|-----|---------|------------|
| API_PREFIX | /api | /auth/api |
| DATABASE_URL | sqlite+aiosqlite://... | postgresql://... |
| JWT_SECRET | (set) | (change!) |
| COOKIE_SECURE | false | true |

## Prioritised Backlog
### P0 (blocking)
- None — all core features implemented

### P1 (high value)
- [ ] User password reset flow
- [ ] Pagination controls on Users page (UI)
- [ ] Student bulk import (CSV upload)

### P2 (nice to have)
- [ ] Dark mode
- [ ] Email notifications on account creation
- [ ] Per-app active session count on dashboard
- [ ] Student search API used by WellTrack/BeeShopKiosk

## Next Tasks
1. Update `DATABASE_URL` in backend .env with real PostgreSQL URL
2. Change `JWT_SECRET` to a secure random value for production
3. Set `COOKIE_SECURE=true` and `API_PREFIX=/auth/api` for production
4. Configure nginx as per `ecosystem.config.js` comments
5. Run `npm run build` in frontend and serve at `/auth`
