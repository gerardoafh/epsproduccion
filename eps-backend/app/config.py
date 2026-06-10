from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/eps_produccion"
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"

settings = Settings()
