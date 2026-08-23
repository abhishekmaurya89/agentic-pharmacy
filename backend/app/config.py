from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str
    database_name: str

    jwt_secret: str

    openai_api_key: str | None = None
    langchain_api_key: str | None = None

    langchain_tracing_v2: bool = False
    langchain_project: str = "agentic-pharmacy"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()