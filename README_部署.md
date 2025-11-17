# 服务器端部署指南

## 架构说明

应用已改为服务器端存储，使用 SQLite 数据库保存数据。

- **前端**：React + Vite（端口 5173）
- **后端**：Node.js + Express（端口 3004）
- **数据库**：SQLite（存储在 `data/taskline.db`）

## 部署步骤

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 启动后端服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

后端服务器会在 `http://0.0.0.0:3004` 启动（监听所有网络接口）。

### 3. 配置前端 API 地址

创建 `.env` 文件（或修改现有文件）：

**生产环境（使用自定义域名与 HTTPS）：**
```bash
VITE_API_URL=https://api.example.com/api
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=Taskline@123
```

**服务器部署（使用服务器 IP）：**
```bash
VITE_API_URL=http://your-server-ip:3004/api
```

**本地开发：**
```bash
VITE_API_URL=http://localhost:3004/api
```

### 4. 启动前端

```bash
# 在项目根目录
npm run dev
```

### 5. 使用 PM2 管理（推荐）

#### 启动后端

**方法 1：直接启动（确保在正确目录）**
```bash
cd /absolute/path/to/taskline/server
pm2 start index.js --name taskline-server
```

**方法 2：使用启动脚本（推荐）**
```bash
cd server
chmod +x start.sh
./start.sh
```

**方法 3：使用 PM2 配置文件**
```bash
# 编辑 ecosystem.config.js，设置正确的 cwd 路径
cd server
pm2 start ecosystem.config.js
```

#### 启动前端

```bash
# 在项目根目录
pm2 start npm --name taskline-frontend -- run dev
```

#### 查看状态

```bash
pm2 status
pm2 logs
```

#### 设置开机自启

```bash
pm2 startup
pm2 save
```

## 生产环境部署

### 1. 构建前端

```bash
npm run build
```

### 2. 使用 Nginx 反向代理

Nginx 配置示例：

```nginx
# 前端
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/taskline/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 启动后端

```bash
cd server
pm2 start index.js --name taskline-server
```

## 数据库位置

数据库文件保存在：`data/taskline.db`

## 数据备份

```bash
# 备份数据库
cp data/taskline.db data/taskline.db.backup

# 恢复数据库
cp data/taskline.db.backup data/taskline.db
```

## 端口说明

- **前端开发服务器**：5173
- **后端 API 服务器**：3004
- **生产环境**：80（通过 Nginx）

## 防火墙配置

```bash
# 开放后端端口
sudo ufw allow 3004/tcp

# 开放前端端口（如果使用开发模式）
sudo ufw allow 5173/tcp

# 开放 HTTP 端口（生产环境）
sudo ufw allow 80/tcp
```

## 环境变量

可以在 `.env` 文件中配置：

```bash
# 后端端口（server/.env）
PORT=3004
API_PREFIX=/api
CORS_ORIGINS=https://app.example.com

# API 基础 URL（前端 .env）
VITE_API_URL=https://api.example.com/api
# 或使用服务器 IP
# VITE_API_URL=http://your-server-ip:3004/api

# 管理员账号（前端 .env）
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=Taskline@123
```

