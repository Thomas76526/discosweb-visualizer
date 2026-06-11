# syntax=docker/dockerfile:1.6
#
# Discosweb Visualizer — Backend Dockerfile
# Multi-stage: wheels built in builder, runtime is slim + non-root + healthcheck.

# ---- builder stage: 离线 wheel ----
FROM python:3.11-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ---- runtime stage: 最小镜像 + 非 root ----
FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# F-02 修复:清理 apt 缓存 + 创建非 root 用户(app)
# 装 curl 仅供 HEALTHCHECK 使用;生产可换 wget 或 Python one-liner
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --create-home --shell /usr/sbin/nologin --gid app app

# 从 builder 装 wheels
COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

# 复制源码(归属 app)
COPY --chown=app:app . .

# F-02 修复:用非 root 跑 uvicorn
USER app

EXPOSE 8000

# 健康检查(F-03):应用层 + 容器层双保险
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
