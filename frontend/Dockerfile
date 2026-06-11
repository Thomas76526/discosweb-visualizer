# syntax=docker/dockerfile:1.6
#
# Discosweb Visualizer — Frontend Dockerfile
# Multi-stage: deps cached in first stage, runtime uses non-root.
# Vite dev server listens on 0.0.0.0:5173 (see vite.config.ts → host: true).

# ---- deps stage: install node_modules ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
# 首次构建还没有 lockfile,先用 npm install。
# 后续:首次提交后生成 package-lock.json 并改用 `npm ci` 以获得可复现构建。
RUN npm install --no-audit --no-fund

# ---- runtime stage: non-root user + source ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=development
WORKDIR /app

# F-02 修复:非 root 用户
RUN addgroup -S app \
    && adduser -S app -G app

# 依赖(从 deps 阶段复用,加速构建)
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
# 源码
COPY --chown=app:app . .

USER app

EXPOSE 5173

# 启动:package.json 的 "dev" 脚本已包含 --host 0.0.0.0
CMD ["npm", "run", "dev"]
