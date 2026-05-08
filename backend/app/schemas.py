from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

UserRole = Literal["teacher", "canteen_admin", "repair_admin", "canteen_repair_admin", "super_admin"]
MealType = Literal["breakfast", "lunch", "dinner"]
BookingStatus = Literal["booked", "cancelled"]
MenuBookingStatus = Literal["open", "closed"]
NotificationType = Literal["info", "warning", "urgent"]


class ApiError(BaseModel):
    error: str


class UserOut(BaseModel):
    id: UUID
    phone: str
    email: str | None = None


class ProfileOut(BaseModel):
    id: UUID
    teacher_no: str | None = None
    name: str
    email: str | None = None
    phone: str | None = None
    role: UserRole
    avatar_url: str | None = None
    created_at: datetime


class AuthRegisterIn(BaseModel):
    phone: str
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)
    email: EmailStr | None = None
    teacher_no: str | None = None


class AuthLoginIn(BaseModel):
    identifier: str
    password: str


class AuthOut(BaseModel):
    token: str
    user: UserOut
    profile: ProfileOut


class ProfileUpdateIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str
    email: EmailStr | None = None


class SelectedMealItem(BaseModel):
    name: str
    quantity: int


class MealMenuOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: date
    meal_type: MealType
    items: list[str]
    description: str | None = None
    image_url: str | None = None
    image_path: str | None = None
    time_range: str | None = None
    booking_status: MenuBookingStatus
    created_at: datetime
    updated_at: datetime


class MealBookingCreateIn(BaseModel):
    menu_id: UUID
    date: date
    meal_type: MealType
    selected_items: list[SelectedMealItem]


class MealBookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    menu_id: UUID
    date: date
    meal_type: MealType
    selected_items: list[SelectedMealItem]
    status: BookingStatus
    created_at: datetime
    updated_at: datetime
    profiles: dict[str, str | None] | None = None


class UploadedImage(BaseModel):
    url: str
    path: str


class RepairImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticket_id: UUID
    image_url: str
    storage_path: str
    created_at: datetime


class RepairTicketCreateIn(BaseModel):
    fault_type: str
    location: str
    description: str
    images: list[UploadedImage] = Field(default_factory=list, max_length=5)


class RepairTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    fault_type: str
    location: str
    description: str
    status: str
    result_text: str | None = None
    result_image_url: str | None = None
    result_image_path: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    repair_images: list[RepairImageOut] = Field(default_factory=list)
    repair_result_images: list[RepairImageOut] = Field(default_factory=list)
    profiles: dict[str, str | None] | None = None


class NotificationCreateIn(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    type: NotificationType = "info"
    target_user_id: UUID | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    content: str
    type: NotificationType
    target_user_id: UUID | None = None
    created_at: datetime


class NotificationReadIn(BaseModel):
    notification_ids: list[UUID]


class MenuSaveIn(BaseModel):
    date: date
    meal_type: MealType
    items: list[str]
    description: str | None = None
    image_url: str | None = None
    image_path: str | None = None
    time_range: str | None = None
    booking_status: MenuBookingStatus = "open"


class MenuStatusIn(BaseModel):
    booking_status: MenuBookingStatus


class TicketStatusIn(BaseModel):
    status: str


class TicketCompleteIn(BaseModel):
    result_text: str
    result_image_url: str | None = None
    result_image_path: str | None = None
    result_images: list[UploadedImage] = Field(default_factory=list, max_length=5)


class RoleUpdateIn(BaseModel):
    role: UserRole


class UploadOut(BaseModel):
    url: str
    path: str
