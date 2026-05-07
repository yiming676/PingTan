from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import admin, auth, meals, notifications, repairs, uploads
from app.config import settings

app = FastAPI(title="PingTan API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings.upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")

app.include_router(auth.router)
app.include_router(auth.profile_router)
app.include_router(meals.router)
app.include_router(repairs.router)
app.include_router(notifications.router)
app.include_router(uploads.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"ok": True}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal server error"})
