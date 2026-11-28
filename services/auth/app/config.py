from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "auth-service"
    service_port: int = 8000
    db_url: str = ""

    jwt_secret: SecretStr
    jwt_expire_minutes: int = 120
    jwt_issuer: str = "chekad-auth"
    jwt_audience: str = "chekad-admin"

    app_env: str = "development"
    auth_cookie_secure: bool = False
    student_registration_enabled: bool = False

    @model_validator(mode="after")
    def enforce_secure_cookie_in_production(self):
        if self.app_env.lower() == "production" and not self.auth_cookie_secure:
            raise ValueError("AUTH_COOKIE_SECURE must be true when APP_ENV=production")
        return self

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if len(secret) < 32 or secret.lower().startswith("change_me"):
            raise ValueError("JWT_SECRET must be a non-placeholder secret of at least 32 characters")
        return value

    @field_validator("jwt_expire_minutes")
    @classmethod
    def validate_token_lifetime(cls, value: int) -> int:
        if value < 5 or value > 1440:
            raise ValueError("JWT_EXPIRE_MINUTES must be between 5 and 1440")
        return value


settings = Settings()
