from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class StoredFile:
    url: str
    path: str


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, category: str, owner_id: str, filename: str, content_type: str, data: bytes) -> StoredFile:
        raise NotImplementedError

    @abstractmethod
    def delete(self, storage_path: str) -> None:
        raise NotImplementedError
