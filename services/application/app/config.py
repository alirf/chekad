from urllib.parse import urlsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "unknown"
    service_port: int = 8000
    app_env: str = "development"
    db_url: str = ""
    auth_internal_url: str = "http://auth-service:8000"
    people_internal_url: str = "http://people-service:8000"
    public_applications_enabled: bool = False
    public_site_origin: str = ""
    privacy_contact_email: str = ""
    privacy_contact_phone: str = ""
    privacy_contact_telegram: str = ""
    terms_approved: bool = False

    @model_validator(mode="after")
    def require_https_origin_in_production(self):
        if self.app_env.lower() == "production":
            origin = urlsplit(self.public_site_origin.strip())
            if origin.scheme != "https" or not origin.netloc or origin.path not in ("", "/") or origin.query or origin.fragment:
                raise ValueError("PUBLIC_SITE_ORIGIN must be an HTTPS origin when APP_ENV=production")
        return self


settings = Settings()
