from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from .monitored_stops import MONITORED_STOP_AREA_GIDS


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    vt_client_id: str
    vt_client_secret: str
    vt_auth_key: str = Field(default="", validation_alias=AliasChoices("VT_AUTH_KEY", "VT_SUBSCRIPTION_KEY"))
    vt_token_url: str = "https://ext-api.vasttrafik.se/token"
    vt_api_base_url: str = "https://ext-api.vasttrafik.se/pr/v4"
    database_url: str = "postgresql://gbg:gbg@localhost:5432/gbggridlock"
    poll_interval_seconds: int = 60
    http_concurrency: int = 5

TARGET_STOP_AREA_GIDS = list(MONITORED_STOP_AREA_GIDS)
