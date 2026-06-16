"""Application settings powered by Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_", extra="ignore")

    app_name: str = "discosweb-visualizer"
    cors_origins: list[str] = ["http://localhost:5173"]
    # R1 / F-13 修复:运行时数据(可写)与样本数据(只读)分离
    # 样本在 ./data/sample/  通过 bind mount 以 :ro 挂入
    # 运行时文件(DuckDB / 上传文件)在 ./data/runtime/  通过命名卷 db-data 挂入
    storage_dir: str = "./data/runtime"
    duckdb_path: str = "./data/runtime/visualizer.duckdb"
    # M2: 看板持久化 (独立 SQLite 文件,理由见 dashboard_store.py docstring)
    dashboard_db_path: str = "./data/runtime/dashboards.sqlite"
    # F-05 修复:可配置的上传体积上限(MB)
    max_upload_mb: int = 50


settings = Settings()
