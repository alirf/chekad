from urllib.parse import urlsplit

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "auth-service"
    service_port: int = 8000
    db_url: str = ""
    people_internal_url: str = "http://people-service:8000"

    jwt_secret: SecretStr
    jwt_expire_minutes: int = 120
    jwt_issuer: str = "chekad-auth"
    jwt_audience: str = "chekad-admin"

    app_env: str = "development"
    auth_cookie_secure: bool = False
    public_site_origin: str = "http://localhost:8080"
    student_registration_enabled: bool = False
    otp_hash_secret: SecretStr = SecretStr("")
    sms_provider: str = "console"
    sms_gateway_url: str = ""
    sms_gateway_token: SecretStr = SecretStr("")
    sms_sender_id: str = ""
    sms_code_ttl_seconds: int = 300
    sms_resend_cooldown_seconds: int = 60
    sms_max_daily_sends: int = 5

    @model_validator(mode="after")
    def enforce_secure_cookie_in_production(self):
        if self.app_env.lower() == "production":
            if not self.auth_cookie_secure:
                raise ValueError("AUTH_COOKIE_SECURE must be true when APP_ENV=production")
            origin = urlsplit(self.public_site_origin.strip())
            if origin.scheme != "https" or not origin.netloc or origin.path not in ("", "/") or origin.query or origin.fragment:
                raise ValueError("PUBLIC_SITE_ORIGIN must be an HTTPS origin when APP_ENV=production")
        return self

    @model_validator(mode="after")
    def validate_sms_configuration(self):
        provider = self.sms_provider.lower().strip()
        if provider not in {"console", "http"}:
            raise ValueError("SMS_PROVIDER must be console or http")
        if self.sms_code_ttl_seconds < 60 or self.sms_code_ttl_seconds > 600:
            raise ValueError("SMS_CODE_TTL_SECONDS must be between 60 and 600")
        if self.sms_resend_cooldown_seconds < 30:
            raise ValueError("SMS_RESEND_COOLDOWN_SECONDS must be at least 30")
        if self.sms_max_daily_sends < 1 or self.sms_max_daily_sends > 10:
            raise ValueError("SMS_MAX_DAILY_SENDS must be between 1 and 10")
        if self.app_env.lower() == "production":
            otp_secret = self.otp_hash_secret.get_secret_value()
            if len(otp_secret) < 32 or otp_secret.lower().startswith("change_me"):
                raise ValueError("OTP_HASH_SECRET must be a non-placeholder secret of at least 32 characters in production")
            url = urlsplit(self.sms_gateway_url.strip())
            if (
                provider != "http"
                or url.scheme != "https"
                or not url.netloc
                or not self.sms_gateway_token.get_secret_value()
            ):
                raise ValueError(
                    "Production requires SMS_PROVIDER=http, an HTTPS SMS_GATEWAY_URL and SMS_GATEWAY_TOKEN"
                )
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
