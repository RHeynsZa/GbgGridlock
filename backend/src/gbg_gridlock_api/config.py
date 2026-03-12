from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://gbg:gbg@localhost:5432/gbggridlock"
    vt_client_id: str = ""
    vt_client_secret: str = ""
    vt_token_url: str = "https://ext-api.vasttrafik.se/token"
    vt_api_base_url: str = "https://ext-api.vasttrafik.se/pr/v4"
    poll_interval_seconds: int = 60
    http_concurrency: int = 5
    enable_worker: bool = True


TARGET_STOP_AREA_GIDS = [
    "9021014001760000",
    "9021014002510000",
    "9021014002440000",
]
