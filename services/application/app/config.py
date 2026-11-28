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


settings = Settings()
