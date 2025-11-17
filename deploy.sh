#!/bin/bash

echo "开始部署 Taskline 项目..."

# 检查 Node.js 和 npm
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
npm install

# 构建生产版本
echo "构建生产版本..."
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "错误: 构建失败，dist 目录不存在"
    exit 1
fi

echo "构建完成！"
echo ""
echo "部署选项："
echo "1. 使用 serve (需要先安装: npm install -g serve)"
echo "   serve -s dist -l 3000"
echo ""
echo "2. 使用 PM2 (需要先安装: npm install -g pm2)"
echo "   pm2 serve dist 3000 --name taskline --spa"
echo ""
echo "3. 使用 Nginx (推荐生产环境)"
echo "   配置 Nginx 指向 dist 目录"
echo ""
echo "4. 开发模式（外网可访问）"
echo "   npm run dev:host"

