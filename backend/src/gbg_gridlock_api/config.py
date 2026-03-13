from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://gbg:gbg@localhost:5432/gbggridlock"

    enable_worker: bool = True
    vt_client_id: str = ""
    vt_client_secret: str = ""
    vt_auth_key: str = Field(default="", validation_alias=AliasChoices("VT_AUTH_KEY", "VT_SUBSCRIPTION_KEY"))
    vt_token_url: str = "https://ext-api.vasttrafik.se/token"
    vt_api_base_url: str = "https://ext-api.vasttrafik.se/pr/v4"
    worker_interval_seconds: int = 60
    worker_http_concurrency: int = 5

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql://", 1)
        return value
