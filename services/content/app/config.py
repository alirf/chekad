from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    service_name: str = "unknown"
    service_port: int = 8000
    db_url: str = ""
    jwt_secret: str = ""
    jwt_expire_minutes: int = 120
    auth_internal_url: str = "http://auth-service:8000"
    public_site_origin: str = ""


settings = Settings()
