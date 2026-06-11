# discosweb-visualizer

> 上传数据,拖拽字段,秒出图表 —— 一个零门槛的自助式数据可视化 Web 应用。

## 5 秒 Quickstart

```bash
docker-compose up
```

打开浏览器访问 [http://localhost:5173](http://localhost:5173) 即可。

- 前端: [http://localhost:5173](http://localhost:5173)
- 后端 API: [http://localhost:8000/docs](http://localhost:8000/docs) (FastAPI Swagger)

首次启动会自动加载 [`data/sample-sales-2025.csv`](./data/sample-sales-2025.csv) 作为演示数据。

## 核心特性

- 拖拽上传 (CSV / JSON / Excel)
- 智能字段识别 (自动推断维度/度量)
- 8+ 种基础图表 (折线/柱状/饼图/散点/面积/雷达/漏斗/桑基)
- 看板模式 + 模板保存
- 导出 PNG / SVG / PDF
- PWA,离线可用

## 目录结构

```text
discosweb-visualizer/
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/    # 业务组件 (按特性组织)
│   │   ├── hooks/         # 自定义 hooks
│   │   ├── lib/           # 工具函数
│   │   ├── store/         # Zustand 状态
│   │   └── styles/        # tokens / global
│   ├── public/            # 静态资源
│   └── package.json
├── backend/               # FastAPI + Python
│   ├── app/
│   │   ├── api/           # 路由
│   │   ├── core/          # 配置 / 安全
│   │   ├── services/      # 业务逻辑 (解析、聚合、导出)
│   │   └── main.py
│   ├── tests/
│   └── pyproject.toml
├── data/                  # 示例数据
│   ├── sample-sales-2025.csv
│   ├── sample-products.json
│   └── README.md
├── docs/                  # 项目文档
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 关键截图 (占位)

> 真实截图待补,以下是各页面应展示内容的描述。

- **`docs/screenshots/01-upload.png`** — 上传页:大字号拖拽区,支持 CSV/JSON/Excel,实时显示行数与字段预览。
- **`docs/screenshots/02-chart-builder.png`** — 图表构建器:左侧字段面板(自动识别维度/度量),中间画布,右侧图表配置(颜色/标题/坐标轴)。
- **`docs/screenshots/03-dashboard.png`** — 看板模式:2x2 网格,每个 cell 一个图表,支持拖拽重排。
- **`docs/screenshots/04-export.png`** — 导出对话框:PNG/SVG/PDF 三选一,可选包含数据表。
- **`docs/screenshots/05-pwa-mobile.png`** — PWA 移动视图:同一看板在手机上的响应式布局。

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 | React 18, TypeScript, Vite, Zustand, ECharts |
| 后端 | Python 3.11, FastAPI, Pandas, Polars |
| 存储 | 浏览器 IndexedDB (主) + 内存 (辅) |
| 部署 | Docker + Docker Compose |

## 贡献指南

1. Fork 仓库,创建特性分支 (`git checkout -b feat/xxx`)
2. 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式
3. 提交前运行 `pnpm test` (前端) 和 `pytest` (后端)
4. 发起 PR,描述变更与测试计划

详细规范见 `frontend/CONTRIBUTING.md` 与 `backend/CONTRIBUTING.md`。

## 许可证

[MIT](./LICENSE)
