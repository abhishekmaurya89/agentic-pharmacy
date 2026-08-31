import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    mongodb_uri: str
    database_name: str
    frontend_url: str = "http://localhost:5173"

    jwt_secret: str

    gemini_api_key: str | None = None

    langchain_api_key: str | None = None
    langchain_tracing_v2: bool = False
    langchain_project: str = "agentic-pharmacy"

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", PROJECT_ROOT / "backend" / ".env"),
        extra="ignore",
    )


settings = Settings()

if settings.langchain_api_key:
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGSMITH_API_KEY"] = settings.langchain_api_key

os.environ["LANGCHAIN_TRACING_V2"] = str(bool(settings.langchain_tracing_v2)).lower()
os.environ["LANGSMITH_TRACING"] = str(bool(settings.langchain_tracing_v2)).lower()
os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
os.environ["LANGSMITH_PROJECT"] = settings.langchain_project
