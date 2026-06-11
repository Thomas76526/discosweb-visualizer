# Security Policy

## Supported Versions

| 版本 | 支持状态 |
|------|---------|
| `main` 分支 | ✅ 积极维护 |
| 最新 release tag | ✅ 安全更新 |
| 旧版本 | ❌ 不再支持 |

## Reporting a Vulnerability

**请勿**在公开 issue 中报告安全漏洞。

请通过以下任一私密渠道报告：

- **GitHub Security Advisories**：仓库页 → Security tab → "Report a vulnerability"
- **邮件**：见仓库 `OWNERS` 文件（待补充）

请在报告中包含：

1. 漏洞描述与影响范围
2. 复现步骤 / PoC
3. 受影响的版本
4. 你的联系方式（可选）

## 响应承诺

- **确认**：收到报告后 7 天内
- **修复计划**：评估后 14 天内
- **披露**：修复后 90 天内（或协商更早）

## 安全姿态

项目在 CI 中执行以下检查：

- 后端 `ruff` + `mypy`
- 前端 `tsc --noEmit`
- Docker 镜像构建验证

详见 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)。
