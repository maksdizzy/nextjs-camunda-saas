"""Configuration management for FastAPI proxy."""
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Clerk Authentication
    clerk_jwks_url: str
    clerk_audience: str | None = None  # Optional: validate JWT audience

    # Camunda Engine
    engine_url: str = "http://localhost:8080/engine-rest"
    engine_user: str = "demo"
    engine_pass: str = "demo"
    engine_timeout: int = 30  # seconds
    engine_jwt_secret: str = "Ym9ZpC1VyZUU9svrmtrJGXZlAlMx5dW29qQwXUDYp50="  # Base64 encoded secret
    engine_jwt_algorithm: str = "HS256"

    # CORS Configuration (can be comma-separated string or list)
    cors_origins: str | List[str] = "http://localhost:3000"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # Application Settings
    app_name: str = "Clerk-Camunda Proxy"
    debug: bool = False
    log_level: str = "INFO"

    # Request Settings
    max_retries: int = 3
    retry_backoff: float = 0.5

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
