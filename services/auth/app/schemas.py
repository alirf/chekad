from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_bcrypt_password_length(cls, value: str) -> str:
        # bcrypt only uses the first 72 bytes. Reject longer inputs rather than
        # silently treating distinct passwords as equivalent.
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
