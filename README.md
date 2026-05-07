# PingTan Campus Assistant

PingTan is a Next.js frontend backed by a self-hosted FastAPI + PostgreSQL API.

## Stack

- Frontend: Next.js 16, React 19, TypeScript
- Backend: FastAPI, SQLAlchemy 2.x, Alembic, Pydantic
- Database: PostgreSQL
- Auth: phone + password, bcrypt password hashes, JWT, HttpOnly cookie
- Storage: local persistent uploads under `UPLOAD_DIR`

## Local Development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m app.seed_admin
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The frontend reads:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Docker Deployment

Set production-safe values in `backend/.env`, then run:

```bash
docker compose up -d --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Uploaded files: `http://localhost:8000/uploads/...`

PostgreSQL and uploaded files are persisted through Docker volumes.

## Initial Administrator

The backend startup command runs:

```bash
python -m app.seed_admin
```

It reads `INIT_ADMIN_PHONE` and `INIT_ADMIN_PASSWORD` and idempotently creates or promotes that account to `super_admin`.

## Verification

```bash
npm run build
python -m compileall backend\app -q
```

Core flows to check after `docker compose up -d`:

- register and log in with phone + password
- book and cancel meals
- submit repair tickets and upload images
- read notifications
- manage menus, bookings, tickets, notifications, and user roles as an administrator
