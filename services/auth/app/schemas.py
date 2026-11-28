import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


_DIGIT_TRANSLATION = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def normalize_iranian_mobile(value: str) -> str:
    phone = value.translate(_DIGIT_TRANSLATION).strip()
    phone = re.sub(r"[\s\-()]", "", phone)
    if phone.startswith("+98"):
        phone = "0" + phone[3:]
    elif phone.startswith("0098"):
        phone = "0" + phone[4:]
    elif phone.startswith("98") and len(phone) == 12:
        phone = "0" + phone[2:]
    if not re.fullmatch(r"09\d{9}", phone):
        raise ValueError("شماره همراه باید با قالب ۰۹xxxxxxxxx وارد شود")
    return phone


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_bcrypt_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes")
        return value


class AdminPublic(BaseModel):
    id: int
    email: EmailStr
    name: str


class LoginResponse(BaseModel):
    token_type: str = "cookie"
    expires_in: int
    admin: AdminPublic


class StudentRegisterRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=80)
    last_name: str = Field(min_length=2, max_length=80)
    phone: str
    guardian_phone: str
    grade: Literal["دهم", "یازدهم", "دوازدهم"]
    field: Literal["physics", "computer"]
    password: str = Field(min_length=10, max_length=72)
    guardian_consent: bool
    privacy_accepted: bool

    @field_validator("first_name", "last_name")
    @classmethod
    def normalize_names(cls, value: str) -> str:
        value = " ".join(value.strip().split())
        if len(value) < 2:
            raise ValueError("نام باید حداقل دو نویسه داشته باشد")
        return value

    @field_validator("phone", "guardian_phone", mode="before")
    @classmethod
    def normalize_phones(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("شماره همراه معتبر نیست")
        return normalize_iranian_mobile(value)

    @field_validator("password")
    @classmethod
    def validate_student_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("رمز عبور نباید بیش از ۷۲ بایت باشد")
        if value.strip() != value:
            raise ValueError("رمز عبور نباید با فاصله شروع یا تمام شود")
        return value

    @field_validator("guardian_consent")
    @classmethod
    def require_guardian_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("رضایت ولی یا سرپرست قانونی لازم است")
        return value

    @field_validator("privacy_accepted")
    @classmethod
    def require_privacy_acceptance(cls, value: bool) -> bool:
        if not value:
            raise ValueError("تأیید اطلاعیه حریم خصوصی لازم است")
        return value


class StudentLoginRequest(BaseModel):
    phone: str
    password: str = Field(min_length=1, max_length=72)

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("شماره همراه معتبر نیست")
        return normalize_iranian_mobile(value)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("رمز عبور معتبر نیست")
        return value


class StudentPublic(BaseModel):
    id: int
    first_name: str
    last_name: str
    phone: str
    guardian_phone: str
    grade: str
    field: str
    phone_verified: bool


class StudentAuthResponse(BaseModel):
    token_type: str = "cookie"
    expires_in: int
    student: StudentPublic


class StudentServicePublic(BaseModel):
    key: str
    title: str
    description: str
    href: str
    action_label: str
    availability: Literal["available", "catalog"]
    note: str | None = None
