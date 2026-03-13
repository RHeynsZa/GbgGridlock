from gbg_gridlock_api.config import Settings


def test_worker_enabled_by_default():
    settings = Settings()

    assert settings.enable_worker is True


def test_postgres_scheme_is_normalized_for_asyncpg():
    settings = Settings(database_url="postgres://gbg:gbg@localhost:5432/gbggridlock")

    assert settings.database_url == "postgresql://gbg:gbg@localhost:5432/gbggridlock"
