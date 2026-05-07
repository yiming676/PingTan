from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://pingtan:pingtan@localhost:5432/pingtan"
    jwt_secret_key: str = Field(default="change-me", min_length=8)
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "./uploads"
    public_base_url: str = "http://localhost:8000"
    max_upload_bytes: int = 5 * 1024 * 1024
    auth_cookie_name: str = "pingtan_token"
    init_admin_phone: str | None = None
    init_admin_password: str | None = None
    init_admin_name: str = "System Admin"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
