import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Grade = Literal["دهم", "یازدهم", "دوازدهم", "فارغ‌التحصیل", "سایر"]
OlympiadField = Literal["physics", "computer"]


class PublicApplicationBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    grade: Grade
    field: OlympiadField
    guardian_phone: str = Field(min_length=10, max_length=20)
    guardian_consent: Literal[True]
    privacy_accepted: Literal[True]

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_person_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value or not re.fullmatch(r"[\w\u0600-\u06FF .'-]+", value, flags=re.UNICODE):
            raise ValueError("نام واردشده معتبر نیست")
        return value

    @field_validator("guardian_phone", mode="before")
    @classmethod
    def normalize_guardian_phone(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("شماره تماس ولی یا سرپرست معتبر نیست")

        translation = str.maketrans(
            "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
            "01234567890123456789",
        )
        normalized = value.translate(translation).strip()
        normalized = re.sub(r"[\s()\-]", "", normalized)

        if normalized.startswith("0098"):
            normalized = "+98" + normalized[4:]
        elif normalized.startswith("98"):
            normalized = "+" + normalized

        if re.fullmatch(r"09\d{9}", normalized):
            normalized = "+98" + normalized[1:]

        if not re.fullmatch(r"\+989\d{9}", normalized):
            raise ValueError("شماره موبایل ولی یا سرپرست معتبر نیست")

        return normalized


class MentorshipApplicationCreate(PublicApplicationBase):
    level: str | None = Field(default=None, max_length=64)
    goal: str | None = Field(default=None, max_length=180)
    notes: str | None = Field(default=None, max_length=1200)


class TutoringApplicationCreate(PublicApplicationBase):
    topic: str = Field(min_length=2, max_length=160)
    goal: str | None = Field(default=None, max_length=180)
    notes: str | None = Field(default=None, max_length=1200)


class PublicApplicationCreated(BaseModel):
    request_id: int
    status: Literal["received"] = "received"
    message: str
