import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // H-3 修复:之前是 '127.0.0.1',在 Docker 容器内无法被外部访问。
    // host: true 等价于 '0.0.0.0',让宿主机/同网段容器都能访问。
    host: true,
    // F-04 修复:前端不再依赖 VITE_API_BASE 字面量,而是通过代理
    // 把 /api/* 转发到 backend 容器,避免与 CORS 互相耦合。
    // VITE_API_TARGET env 允许本地开发指到非 docker host:port
    // (docker compose 时默认 http://backend:8000;本地用 127.0.0.1:8765)
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    // L-11 修复:关闭 sourcemap,避免生产产物暴露源码结构
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
