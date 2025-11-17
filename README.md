# Taskline 开源版

Taskline 是一个开源的项目进度管理应用，提供甘特图、任务/分组管理、权限校验以及 SQLite 数据持久化。前端基于 React + Vite，后端基于 Express + SQLite，适合个人或小团队自建部署。

## 功能特性

- 📊 **甘特图展示**：直观掌控时间轴与依赖关系
- ✅ **任务生命周期**：创建、更新、删除、层级任务与依赖
- 🏷️ **分组管理**：支持多级分组与颜色标识
- 🔐 **基础鉴权**：操作前需登录，防止误操作
- 🌐 **自定义 API 域名**：通过环境变量/安装脚本即可调整 API 域名、端口与 CORS

## 架构概览

- `src/`：前端单页应用（React 18 + TypeScript + Tailwind + frappe-gantt）
- `server/`：后端 REST API（Express + SQLite）
- `scripts/`：自动化脚本（安装、环境生成）
- `data/`：默认 SQLite 数据库存储目录

## 快速安装

推荐使用自动化脚本（需要 Bash 环境，Windows 可使用 Git Bash/WSL）：

```bash
git clone [<repo-url>](https://github.com/yuanmu0814/taskline.git) taskline
cd taskline
npm run setup
```

脚本会：

1. 交互式收集 API 域名、端口、CORS 白名单等信息
2. 可选设置管理员用户名/密码（默认 `admin` / `Taskline@123`，建议修改）
2. 在项目根目录生成 `.env`（前端）与 `server/.env`（后端）
3. 安装前后端依赖

> 若无法使用 Bash，可参考下方“手动配置”章节。

## 手动配置

1. 安装依赖
   ```bash
   npm install
   cd server && npm install
   ```
2. 复制示例环境变量文件
   ```bash
   cp env.example .env
   cp server/env.example server/.env
   ```
3. 根据你的部署环境修改 `.env` 与 `server/.env`：
   - `.env` 中的 `VITE_API_URL` 指向 API 域名，例如 `https://api.example.com/api`
   - `.env` 中的 `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` 决定登录凭据（生成后可直接修改）
   - `server/.env` 中可配置 `HOST`、`PORT`、`API_PREFIX`、`CORS_ORIGINS` 等
4. 启动服务
   ```bash
   cd server && npm start          # API 服务 (默认 3004)
   cd .. && npm run dev            # 前端 (默认 5173)
   ```

## 自定义 API 域名与端口

- **域名/端口**：修改 `server/.env` 中的 `PUBLIC_API_DOMAIN` / `PUBLIC_API_PORT`，并在 `.env` 或部署平台中同步 `VITE_API_URL`
- **路径前缀**：`API_PREFIX` 默认为 `/api`，可改为 `/api/v1`
- **CORS**：`CORS_ORIGINS` 支持逗号分隔多个来源，例如 `https://app.example.com,https://admin.example.com`
- **数据库路径**：通过 `DATABASE_PATH` 指定数据库文件，支持绝对路径或相对 `project-root` 的路径

## 构建与部署

```bash
# 构建前端产物
npm run build

# 使用 PM2 或 systemd 管理 server/index.js
cd server && npm install --production && npm start
```

可参考 `deploy.sh` 与 `server/start.sh`/`server/ecosystem.config.js` 获得更多部署示例。

## 项目结构

```
.
├── src/                 # 前端
├── server/              # 后端
├── scripts/install.sh   # 安装脚本
├── data/                # SQLite 数据
└── env.example          # 前端环境变量示例
```

## 开源许可

本项目基于 MIT License 发布，详见 `LICENSE`。

