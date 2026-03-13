from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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


# Placeholder seed list; replace with validated Västtrafik stop area GIDs.
TARGET_STOP_AREA_GIDS = [
    "9021014001760000",  # Brunnsparken (example format)
    "9021014002510000",  # Korsvägen (example format)
    "9021014002440000",  # Gamlestads Torg (example format)
]
