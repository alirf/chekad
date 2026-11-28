import re
from datetime import date, datetime
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


ApplicationStatus = Literal[
    "new", "reviewing", "waiting_for_student", "options_proposed",
    "accepted", "active", "completed", "rejected", "cancelled",
]


class AdminApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    reject_reason: str | None = Field(default=None, max_length=1000)


class InternalNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_non_blank_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("یادداشت نمی‌تواند خالی باشد.")
        return value


class StudentMessageThreadCreate(BaseModel):
    subject: str = Field(default="گفت‌وگو با پشتیبانی چکاد", min_length=3, max_length=140)

    @field_validator("subject")
    @classmethod
    def clean_subject(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 3:
            raise ValueError("موضوع گفت‌وگو را وارد کنید.")
        return value


class StudentMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("متن پیام نمی‌تواند خالی باشد.")
        return value


class StudentStudyReportCreate(BaseModel):
    report_date: date
    study_minutes: int = Field(ge=0, le=1440)
    topics: str = Field(min_length=2, max_length=2000)
    summary: str = Field(min_length=2, max_length=3000)
    blockers: str | None = Field(default=None, max_length=2000)
    next_step: str | None = Field(default=None, max_length=1000)

    @field_validator("topics", "summary", "blockers", "next_step")
    @classmethod
    def clean_report_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class StudentStudyTaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=1200)
    planned_at: datetime
    duration_minutes: int = Field(default=60, ge=10, le=600)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("عنوان فعالیت را وارد کنید.")
        return value

    @field_validator("planned_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("زمان برنامه باید همراه منطقه زمانی ارسال شود.")
        return value


class StudentStudyTaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=1200)
    planned_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=10, le=600)
    status: Literal["pending", "completed", "skipped"] | None = None

    @field_validator("planned_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("زمان برنامه باید همراه منطقه زمانی ارسال شود.")
        return value

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("عنوان فعالیت معتبر نیست.")
        return value



class AssignmentSessionInput(BaseModel):
    scheduled_at: datetime
    duration_minutes: int = Field(default=20, ge=10, le=360)

    @field_validator("scheduled_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("زمان جلسه باید همراه منطقه زمانی ارسال شود.")
        return value


class AdminAssignmentCreate(BaseModel):
    kind: Literal["mentorship", "tutoring"]
    application_id: int = Field(ge=1)
    person_id: int = Field(ge=1)
    start_date: date
    end_date: date | None = None
    sessions: list[AssignmentSessionInput] = Field(default_factory=list, max_length=24)

    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, value: date | None, info):
        start = info.data.get("start_date")
        if value is not None and start is not None and value < start:
            raise ValueError("تاریخ پایان نمی‌تواند قبل از شروع باشد.")
        return value


class AdminAssignmentStatusUpdate(BaseModel):
    status: Literal["active", "completed", "cancelled"]


class StudentInvoiceCreate(BaseModel):
    student_auth_id: int = Field(ge=1)
    service_type: Literal["mentorship", "tutoring", "other"] = "other"
    application_id: int | None = Field(default=None, ge=1)
    title: str = Field(min_length=3, max_length=180)
    description: str | None = Field(default=None, max_length=2000)
    amount_toman: int = Field(ge=1, le=1_000_000_000_000)
    due_date: date | None = None
    payment_instructions: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def clean_invoice_title(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 3:
            raise ValueError("عنوان فاکتور معتبر نیست.")
        return value

    @field_validator("description", "payment_instructions")
    @classmethod
    def clean_optional_invoice_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class AdminInvoiceStatusUpdate(BaseModel):
    status: Literal["issued", "paid", "void"]
    payment_reference: str | None = Field(default=None, max_length=120)

    @field_validator("payment_reference")
    @classmethod
    def clean_payment_reference(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None



class MentorWeeklyReportCreate(BaseModel):
    week_number: int = Field(ge=1, le=52)
    content: str = Field(min_length=10, max_length=5000)

    @field_validator("content")
    @classmethod
    def clean_weekly_report(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 10:
            raise ValueError("گزارش هفتگی باید حداقل ۱۰ نویسه داشته باشد.")
        return value
