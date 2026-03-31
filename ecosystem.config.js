// PM2 ecosystem config — for production server deployment (port 8000)
module.exports = {
  apps: [
    {
      name: "mps-auth-backend",
      cwd: "./backend",
      script: "uvicorn",
      args: "server:app --host 0.0.0.0 --port 8000 --workers 2",
      interpreter: "python3",
      env: {
        API_PREFIX: "/auth/api",
        COOKIE_SECURE: "true",
        // Set DATABASE_URL, JWT_SECRET, CORS_ORIGINS in your environment
      },
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/backend-err.log",
      out_file: "./logs/backend-out.log",
    },
    {
      name: "mps-auth-frontend",
      cwd: "./frontend",
      script: "npx",
      args: "serve -s build -l 3000",
      watch: false,
      error_file: "./logs/frontend-err.log",
      out_file: "./logs/frontend-out.log",
    },
  ],
};

/*
 * PRODUCTION NGINX CONFIG (add to your nginx.conf server block)
 *
 * location /auth/api/ {
 *     proxy_pass http://localhost:8000/auth/api/;
 *     proxy_set_header Host $host;
 *     proxy_set_header X-Real-IP $remote_addr;
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 * }
 *
 * location /auth {
 *     root /var/www/mps-auth/frontend;
 *     try_files $uri /auth/index.html;
 * }
 */
