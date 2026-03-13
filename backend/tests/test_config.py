from gbg_gridlock_api.config import Settings


def test_worker_enabled_by_default():
    settings = Settings()

    assert settings.enable_worker is True


def test_postgres_scheme_is_normalized_for_asyncpg():
    settings = Settings(database_url="postgres://gbg:gbg@localhost:5432/gbggridlock")

    assert settings.database_url == "postgresql://gbg:gbg@localhost:5432/gbggridlock"


def test_auth_key_prefers_vt_auth_key_env(monkeypatch):
    monkeypatch.setenv("VT_AUTH_KEY", "auth-key")
    monkeypatch.setenv("VT_SUBSCRIPTION_KEY", "legacy-key")

    settings = Settings()

    assert settings.vt_auth_key == "auth-key"
