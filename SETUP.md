# MPS Auth — Server Setup Guide

**Target:** Ubuntu Server · nginx · PM2 · FastAPI · React  
**Install path:** `/var/www/auth`

---

## 1. Prerequisites

```bash
# Node.js 20+ and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3.11+
sudo apt install -y python3 python3-pip python3-venv

# PM2 (global)
sudo npm install -g pm2

# nginx
sudo apt install -y nginx

# PostgreSQL (optional — app falls back to SQLite if not set)
sudo apt install -y postgresql postgresql-contrib
```

---

## 2. Copy the application files

```bash
sudo mkdir -p /var/www/auth
sudo chown $USER:$USER /var/www/auth

# Copy the project into /var/www/auth
# The result should be:
# /var/www/auth/
# ├── backend/
# ├── frontend/
# └── ecosystem.config.js
```

---

## 3. Backend setup

### 3a. Create a Python virtual environment

```bash
cd /var/www/auth/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### 3b. Create the backend `.env` file

```bash
nano /var/www/auth/backend/.env
```

Paste and fill in your values:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="https://apps.mps.edu.vic.gov.au"
DATABASE_URL="sqlite+aiosqlite:////var/www/auth/backend/mps_auth.db"
JWT_SECRET="replace-this-with-a-random-64-char-hex-string"
COOKIE_SECURE="true"
API_PREFIX="/auth/api"
```

Generate a secure JWT secret:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

> **PostgreSQL instead of SQLite** (recommended for production):
> ```
> DATABASE_URL="postgresql://mpsauth:yourpassword@localhost:5432/mpsauth"
> ```
> See Section 8 for PostgreSQL setup.

---

## 4. Frontend build

### 4a. Create the frontend production `.env`

```bash
nano /var/www/auth/frontend/.env.production
```

```
PUBLIC_URL=/auth
REACT_APP_API_PREFIX=/auth/api
REACT_APP_BACKEND_URL=https://apps.mps.edu.vic.gov.au
```

> Change `REACT_APP_BACKEND_URL` to your actual domain.

### 4b. Install dependencies and build

```bash
cd /var/www/auth/frontend
npm install
npm run build
```

The compiled app will be at `/var/www/auth/frontend/build/`.

---

## 5. PM2 — start the backend

### 5a. Update the ecosystem config

```bash
nano /var/www/auth/ecosystem.config.js
```

Replace the content with:

```javascript
module.exports = {
  apps: [
    {
      name: "mps-auth-backend",
      cwd: "/var/www/auth/backend",
      script: "/var/www/auth/backend/venv/bin/uvicorn",
      args: "server:app --host 127.0.0.1 --port 8000 --workers 2",
      interpreter: "none",
      env_file: "/var/www/auth/backend/.env",
      watch: false,
      max_memory_restart: "500M",
      error_file: "/var/log/mps-auth/backend-err.log",
      out_file:   "/var/log/mps-auth/backend-out.log",
    },
  ],
};
```

### 5b. Create the log directory and start

```bash
sudo mkdir -p /var/log/mps-auth
sudo chown $USER:$USER /var/log/mps-auth

cd /var/www/auth
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Follow the printed command to enable auto-start on reboot
```

### 5c. Verify the backend is running

```bash
pm2 status
curl -s http://127.0.0.1:8000/
# Should return: {"service":"MPS Auth","version":"1.0.0"}

curl -s http://127.0.0.1:8000/auth/api/onboarding/status
# Should return: {"needs_onboarding":true,"user_count":0}
```

---

## 6. nginx configuration

```bash
sudo nano /etc/nginx/sites-available/mps-auth
```

Paste this (replace the domain and SSL cert paths):

```nginx
# Rate limit zones — in the http {} block of nginx.conf, NOT here
# Add these to /etc/nginx/nginx.conf inside the http {} block if not present:
#   limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
#   limit_req_zone $binary_remote_addr zone=api_limit:10m   rate=30r/s;

server {
    listen 80;
    server_name apps.mps.edu.vic.gov.au;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name apps.mps.edu.vic.gov.au;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # ── Login endpoint (strict rate limit) ──────────────────────────
    location /auth/api/login/ {
        limit_req zone=login_limit burst=3;
        proxy_pass         http://127.0.0.1:8000/auth/api/login/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Authorization     $http_authorization;
        client_max_body_size 1M;
    }

    # ── All other API endpoints ──────────────────────────────────────
    location ^~ /auth/api/ {
        limit_req zone=api_limit burst=20;
        proxy_pass         http://127.0.0.1:8000/auth/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Authorization     $http_authorization;
        client_max_body_size 1M;
    }

    # ── React frontend ───────────────────────────────────────────────
    location /auth/ {
        alias /var/www/auth/frontend/build/;
        index index.html;
        try_files $uri $uri/ /auth/index.html;
    }

    location = /auth {
        return 301 /auth/;
    }
}
```

Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/mps-auth /etc/nginx/sites-enabled/
sudo nginx -t
sudo nginx -s reload
```

---

## 7. First-time onboarding

Open your browser and go to:
```
https://apps.mps.edu.vic.gov.au/auth/login
```

Click **"Create the first admin account"**, fill in your name, email and password, then sign in.

---

## 8. PostgreSQL setup (recommended)

```bash
sudo -u postgres psql
```

```sql
CREATE USER mpsauth WITH PASSWORD 'yourpassword';
CREATE DATABASE mpsauth OWNER mpsauth;
\q
```

Update `/var/www/auth/backend/.env`:
```
DATABASE_URL="postgresql://mpsauth:yourpassword@localhost:5432/mpsauth"
```

Restart the backend to apply:
```bash
pm2 restart mps-auth-backend
```

---

## 9. Day-to-day operations

| Task | Command |
|------|---------|
| Check backend status | `pm2 status` |
| View live backend logs | `pm2 logs mps-auth-backend` |
| Restart backend | `pm2 restart mps-auth-backend` |
| Stop backend | `pm2 stop mps-auth-backend` |
| Reload nginx | `sudo nginx -s reload` |
| Test nginx config | `sudo nginx -t` |

---

## 10. Updating the application

### Backend update
```bash
cd /var/www/auth/backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
pm2 restart mps-auth-backend
```

### Frontend update
```bash
cd /var/www/auth/frontend
npm install
npm run build
# No nginx restart needed — nginx reads the files directly
```

---

## 11. Troubleshooting

### Backend not starting
```bash
pm2 logs mps-auth-backend --lines 50
# Look for Python tracebacks — most common causes:
# - Wrong DATABASE_URL (check PostgreSQL credentials)
# - Missing packages (re-run pip install -r requirements.txt)
# - Port 8000 already in use (sudo lsof -i :8000)
```

### 401 on every page load
Normal — the app always calls `/auth/api/token/refresh/` on load to restore the session. If no session cookie exists, 401 is the correct response and the login page is shown.

### 503 on API calls
```bash
# Check rate limit zones in nginx.conf
grep "api_limit" /etc/nginx/nginx.conf
# Should be: rate=30r/s  (NOT 20r/m)

# Check backend is alive
curl -s http://127.0.0.1:8000/auth/api/onboarding/status
```

### White screen at /auth/login
Static assets (JS/CSS) are 404 — the frontend was built without `PUBLIC_URL=/auth`.  
Fix: confirm `/var/www/auth/frontend/.env.production` has `PUBLIC_URL=/auth`, then rebuild with `npm run build`.

### Refresh token cookie not saving
Ensure `COOKIE_SECURE="true"` in backend `.env` (required for HTTPS sites) and the nginx config passes `X-Forwarded-Proto $scheme`.

---

## 12. File & directory summary

```
/var/www/auth/
├── backend/
│   ├── .env                  ← secrets & config (never commit)
│   ├── venv/                 ← Python virtual environment
│   ├── server.py
│   ├── database.py
│   ├── models.py
│   ├── auth.py
│   ├── schemas.py
│   ├── routers/
│   └── mps_auth.db           ← SQLite file (if not using PostgreSQL)
├── frontend/
│   ├── .env.production       ← build-time config (PUBLIC_URL, API prefix)
│   ├── build/                ← compiled React app (served by nginx)
│   └── src/
├── ecosystem.config.js       ← PM2 process definition
└── SETUP.md                  ← this file

/var/log/mps-auth/
├── backend-out.log
└── backend-err.log

/etc/nginx/sites-available/mps-auth   ← nginx vhost config
```
