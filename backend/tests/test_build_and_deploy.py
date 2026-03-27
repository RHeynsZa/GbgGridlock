from pathlib import Path
import tomllib


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_backend_pyproject_has_package_readme() -> None:
    pyproject = REPO_ROOT / "backend" / "pyproject.toml"
    config = tomllib.loads(pyproject.read_text(encoding="utf-8"))

    assert config["project"]["readme"] == "README.md"


def test_railway_configuration_runs_backend_build_and_deploy_commands() -> None:
    railway_toml = REPO_ROOT / "railway.toml"
    config = tomllib.loads(railway_toml.read_text(encoding="utf-8"))

    build_command = config["build"]["buildCommand"]
    pre_deploy_commands = config["deploy"]["preDeployCommand"]
    start_command = config["deploy"]["startCommand"]

    assert "cd backend && uv sync --frozen --no-dev" in build_command
    assert any("cd backend && uv run alembic upgrade head" in cmd for cmd in pre_deploy_commands)
    assert "cd backend && uv run uvicorn gbg_gridlock_api.main:app" in start_command


def test_railway_configuration_pins_supported_python_version() -> None:
    railway_toml = REPO_ROOT / "railway.toml"
    config = tomllib.loads(railway_toml.read_text(encoding="utf-8"))

    assert config["variables"]["NIXPACKS_PYTHON_VERSION"] == "3.12"
