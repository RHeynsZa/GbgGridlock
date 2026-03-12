from gbg_gridlock_api.config import Settings


def test_worker_enabled_by_default():
    settings = Settings()

    assert settings.enable_worker is True
