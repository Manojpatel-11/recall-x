from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    hindsight_api_url: str = Field(default="http://localhost:8000", alias="HINDSIGHT_API_URL")
    hindsight_api_key: str = Field(default="", alias="HINDSIGHT_API_KEY")
    hindsight_bank_id: str = Field(default="recall-x-experiments", alias="HINDSIGHT_BANK_ID")

    llm_api_key: str = Field(default="", alias="LLM_API_KEY")
    llm_model_name: str = Field(default="gpt-4o-mini", alias="LLM_MODEL_NAME")
    llm_base_url: str = Field(default="https://api.openai.com/v1", alias="LLM_BASE_URL")

    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8001, alias="APP_PORT")
    debug: bool = Field(default=True, alias="DEBUG")

    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()