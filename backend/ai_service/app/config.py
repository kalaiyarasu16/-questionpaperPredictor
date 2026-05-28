import os
from dataclasses import dataclass
from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/questionbank")
    upload_dir_abs: str = os.getenv("UPLOAD_DIR_ABS", "")
    port: int = int(os.getenv("PORT", "8001"))

    # Similarity threshold for clustering
    similarity_threshold: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.78"))


settings = Settings()

