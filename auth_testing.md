# MPS Auth — Testing Guide

## Backend API (preview environment)
Direct backend access: `http://localhost:8001`
API prefix in preview: `/api` (production: `/auth/api`)

## Step 1 — Check onboarding status
```bash
curl http://localhost:8001/api/onboarding/status
# Expected: {"needs_onboarding": true, "user_count": 0}
```

## Step 2 — Create first admin (onboarding)
```bash
curl -X POST http://localhost:8001/api/onboarding/setup \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mps.edu.au", "password": "Admin1234!", "full_name": "System Admin"}'
```

## Step 3 — Login
```bash
curl -c /tmp/cookies.txt -X POST http://localhost:8001/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mps.edu.au", "password": "Admin1234!"}'
# Returns access_token; sets refresh_token httpOnly cookie
```

## Step 4 — Use access token
```bash
TOKEN="<access_token_from_step_3>"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/verify/
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/users/
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/apps/
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/audit/
```

## Step 5 — Refresh token (silent)
```bash
curl -b /tmp/cookies.txt -X POST http://localhost:8001/api/token/refresh/
```

## Step 6 — Logout
```bash
curl -b /tmp/cookies.txt -c /tmp/cookies.txt \
  -X POST http://localhost:8001/api/logout/ \
  -H "Authorization: Bearer $TOKEN"
```

## Step 7 — Students
```bash
curl -X POST http://localhost:8001/api/students/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":"STU001","first_name":"Alice","last_name":"Smith","year_level":"10","class_group":"10A"}'

curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/students/
```

## Production deployment notes
- Set `API_PREFIX=/auth/api` in backend .env
- Set `DATABASE_URL=postgresql://user:pass@host:5432/mpsauth` in backend .env
- Run `npm run build` in frontend directory
- Serve frontend build directory at `/auth/` via nginx
- Configure PM2 with `ecosystem.config.js`
