from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "unknown"
    service_port: int = 8000
    db_url: str = ""
    auth_internal_url: str = "http://auth-service:8000"
    public_applications_enabled: bool = False
    public_site_origin: str = ""
    privacy_contact_email: str = ""


settings = Settings()
