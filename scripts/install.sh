#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="${ROOT_DIR}/server"

echo "Taskline 开源版安装向导"
echo "--------------------------------------"

command -v node >/dev/null 2>&1 || { echo "错误: 未找到 Node.js，请先安装 Node.js 18+."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "错误: 未找到 npm，请确保 Node.js 安装完整."; exit 1; }

read -rp "API 协议 (默认 http): " API_PROTOCOL
API_PROTOCOL="${API_PROTOCOL:-http}"

read -rp "API 域名 (默认 localhost): " API_DOMAIN
API_DOMAIN="${API_DOMAIN:-localhost}"

read -rp "API 端口 (默认 3004): " API_PORT
API_PORT="${API_PORT:-3004}"

read -rp "API 路径前缀 (默认 /api): " API_PREFIX
API_PREFIX="${API_PREFIX:-/api}"

read -rp "允许访问的前端来源(可逗号分隔, 默认 http://localhost:5173): " CLIENT_ORIGINS
CLIENT_ORIGINS="${CLIENT_ORIGINS:-http://localhost:5173}"

read -rp "管理员用户名 (默认 admin): " ADMIN_USERNAME
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"

read -rp "管理员密码 (默认 Taskline@123): " ADMIN_PASSWORD
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Taskline@123}"

normalize_prefix() {
  local value="$1"
  if [ -z "$value" ]; then
    echo "/api"
    return
  fi

  if [ "$value" != "/" ]; then
    value="/${value#/}"
    value="${value%/}"
    [ -z "$value" ] && value="/"
  fi
  echo "$value"
}

API_PREFIX="$(normalize_prefix "$API_PREFIX")"
API_URL="${API_PROTOCOL}://${API_DOMAIN}:${API_PORT}${API_PREFIX}"

create_env_file() {
  local file_path="$1"
  local content="$2"

  if [ -f "$file_path" ]; then
    echo "[跳过] $file_path 已存在"
    return
  fi

  echo "[生成] $file_path"
  printf "%s\n" "$content" > "$file_path"
}

echo ""
create_env_file "${ROOT_DIR}/.env" "VITE_APP_NAME=Taskline
VITE_API_URL=${API_URL}
VITE_ADMIN_USERNAME=${ADMIN_USERNAME}
VITE_ADMIN_PASSWORD=${ADMIN_PASSWORD}"

create_env_file "${SERVER_DIR}/.env" "HOST=0.0.0.0
PORT=${API_PORT}
API_PREFIX=${API_PREFIX}
CORS_ORIGINS=${CLIENT_ORIGINS}
PUBLIC_API_PROTOCOL=${API_PROTOCOL}
PUBLIC_API_DOMAIN=${API_DOMAIN}
PUBLIC_API_PORT=${API_PORT}
DATABASE_PATH=../data/taskline.db"

echo ""
echo "安装前端依赖..."
cd "$ROOT_DIR"
npm install

echo ""
echo "安装后端依赖..."
cd "$SERVER_DIR"
npm install

echo ""
echo "安装完成！"
echo "前端 API 访问地址: ${API_URL}"
echo "请执行以下命令启动："
echo "  # 启动 API 服务"
echo "  cd server && npm start"
echo "  "
echo "  # 启动前端（开发模式）"
echo "  cd .. && npm run dev"


