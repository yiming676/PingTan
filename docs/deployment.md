# PingTan Deployment

## Local Docker

1. Review `backend/.env.example` and set production-safe values for `JWT_SECRET_KEY`, `INIT_ADMIN_PHONE`, and `INIT_ADMIN_PASSWORD` before production use. The included compose file uses this example file so the stack can boot locally without extra setup.
2. Start the stack:

```bash
docker compose up -d --build
```

3. Open `http://localhost:3000`.

The backend runs Alembic migrations and `python -m app.seed_admin` on container start. PostgreSQL data is stored in the `postgres_data` volume. Uploaded files are stored in the `uploads_data` volume.

## Cloud Server Docker

1. Install Docker Engine and the Docker Compose plugin on the server.
2. Copy `deploy.env.example` to `.env` and replace `1.2.3.4` with the server public IP or domain:

```bash
cp deploy.env.example .env
```

For example, if the server IP is `203.0.113.10`:

```env
NEXT_PUBLIC_API_BASE_URL=http://203.0.113.10:8000
CORS_ORIGINS=http://203.0.113.10:3000
PUBLIC_BASE_URL=http://203.0.113.10:8000
```

3. Set strong values for `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, and `INIT_ADMIN_PASSWORD`.
4. Start the stack:

```bash
docker compose --env-file .env up -d --build
```

5. Check status and logs:

```bash
docker compose ps
docker compose logs -f backend
```

6. Open the frontend:

```text
http://SERVER_IP:3000
```

Open ports `3000` and `8000` in the server firewall/security group. If you put Nginx/Caddy in front later, set `NEXT_PUBLIC_API_BASE_URL`, `CORS_ORIGINS`, and `PUBLIC_BASE_URL` to the HTTPS domain instead of the raw IP.

## Services

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Uploaded files: `http://localhost:8000/uploads/...`

## Required Environment

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JWT_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `UPLOAD_DIR`
- `PUBLIC_BASE_URL`
- `MAX_UPLOAD_BYTES`
- `INIT_ADMIN_PHONE`
- `INIT_ADMIN_PASSWORD`

## Database

Run migrations manually when needed:

```bash
cd backend
alembic upgrade head
```

Seed the first super administrator:

```bash
cd backend
python -m app.seed_admin
```
