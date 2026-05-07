import re
import uuid
from pathlib import Path

from app.config import settings
from app.storage.base import StorageBackend, StoredFile


class LocalStorageBackend(StorageBackend):
    allowed_extensions = {"jpg", "jpeg", "png", "webp"}

    def __init__(self, root: Path | None = None, public_base_url: str | None = None) -> None:
        self.root = root or settings.upload_path
        self.public_base_url = (public_base_url or settings.public_base_url).rstrip("/")
        self.root.mkdir(parents=True, exist_ok=True)

    async def save(self, category: str, owner_id: str, filename: str, content_type: str, data: bytes) -> StoredFile:
        ext = self._extension(filename)
        if ext not in self.allowed_extensions:
            raise ValueError("Only jpg, jpeg, png and webp files are allowed")
        if content_type and content_type not in {
            "image/jpeg",
            "image/png",
            "image/webp",
        }:
            raise ValueError("Unsupported image content type")
        if len(data) > settings.max_upload_bytes:
            raise ValueError("File is too large")

        safe_owner = self._safe_segment(owner_id)
        safe_category = self._safe_segment(category)
        target_dir = self.root / safe_category / safe_owner
        target_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}.{ext}"
        target = target_dir / stored_name
        target.write_bytes(data)
        storage_path = f"{safe_category}/{safe_owner}/{stored_name}"
        return StoredFile(url=f"{self.public_base_url}/uploads/{storage_path}", path=storage_path)

    def delete(self, storage_path: str) -> None:
        target = (self.root / storage_path).resolve()
        if self.root not in target.parents:
            raise ValueError("Invalid storage path")
        if target.is_file():
            target.unlink()

    def _extension(self, filename: str) -> str:
        suffix = Path(filename or "").suffix.lower().lstrip(".")
        return "jpg" if suffix == "jpeg" else suffix

    def _safe_segment(self, value: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_-]", "-", value).strip("-") or "default"
