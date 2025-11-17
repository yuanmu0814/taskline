import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, isAbsolute, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 3004;
const API_PREFIX = normalizeApiPrefix(process.env.API_PREFIX);
const DB_PATH = resolveDatabasePath(process.env.DATABASE_PATH);
const CORS_ORIGINS = process.env.CORS_ORIGINS || '*';
const PUBLIC_API_DOMAIN = process.env.PUBLIC_API_DOMAIN || HOST;
const PUBLIC_API_PORT = process.env.PUBLIC_API_PORT || PORT;
const PUBLIC_API_PROTOCOL = process.env.PUBLIC_API_PROTOCOL || 'http';

// 确保数据目录存在
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  try {
    mkdirSync(dataDir, { recursive: true });
    console.log(`数据目录已创建: ${dataDir}`);
  } catch (error) {
    console.error('创建数据目录失败:', error);
    process.exit(1);
  }
}

// 检查目录权限
try {
  const testFile = join(dataDir, '.test');
  writeFileSync(testFile, 'test');
  unlinkSync(testFile);
  console.log('数据目录权限检查通过');
} catch (error) {
  console.error('数据目录权限不足，请检查目录权限:', error);
  console.error('建议运行: chmod 755', dataDir);
}

const allowedOrigins = (CORS_ORIGINS || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const useWildcardCors = allowedOrigins.length === 0 || allowedOrigins.includes('*');

const corsMiddleware = useWildcardCors
  ? cors()
  : cors({
      origin: allowedOrigins,
      credentials: true,
    });

const app = express();
app.use(corsMiddleware);
app.use(express.json());
const apiRouter = express.Router();

// 初始化数据库
console.log(`尝试连接数据库: ${DB_PATH}`);
let db;

try {
  db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('数据库连接失败:', err);
      console.error('错误详情:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      console.error('\n可能的解决方案:');
      console.error('1. 检查 sqlite3 模块是否正确安装: npm install sqlite3');
      console.error('2. 检查数据库目录权限: chmod 755', dataDir);
      console.error('3. 检查数据库文件权限: chmod 644', DB_PATH);
      console.error('4. 如果使用 Linux，可能需要安装系统依赖:');
      console.error('   Ubuntu/Debian: sudo apt-get install build-essential python3');
      console.error('   CentOS/RHEL: sudo yum install gcc gcc-c++ python3');
      process.exit(1);
    } else {
      console.log('数据库连接成功');
      console.log(`数据库文件路径: ${DB_PATH}`);
      initDatabase();
    }
  });
} catch (error) {
  console.error('创建数据库连接时出错:', error);
  console.error('可能是 sqlite3 模块未正确安装，请运行: npm install sqlite3');
  process.exit(1);
}

// 初始化数据库表
function initDatabase() {
  db.serialize(() => {
    // 任务表
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        type TEXT DEFAULT 'task',
        parent_id TEXT,
        group_id TEXT,
        dependencies TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 分组表
    db.run(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 用户表（用于扩展）
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

// API 路由

// 获取所有任务
apiRouter.get('/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY created_at ASC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      start: new Date(row.start),
      end: new Date(row.end),
      progress: row.progress,
      type: row.type,
      parentId: row.parent_id || undefined,
      groupId: row.group_id || undefined,
      dependencies: row.dependencies ? row.dependencies.split(',') : [],
    })));
  });
});

// 创建任务
apiRouter.post('/tasks', (req, res) => {
  const { id, name, start, end, progress, type, parentId, groupId, dependencies } = req.body;
  
  // 规范化日期格式：如果已经是字符串就直接使用，否则转换为 ISO 字符串
  const startDate = typeof start === 'string' ? start : new Date(start).toISOString();
  const endDate = typeof end === 'string' ? end : new Date(end).toISOString();
  
  db.run(
    `INSERT INTO tasks (id, name, start, end, progress, type, parent_id, group_id, dependencies, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [id, name, startDate, endDate, progress, type, parentId || null, groupId || null, dependencies?.join(',') || null],
    function(err) {
      if (err) {
        console.error('创建任务失败:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, message: '任务创建成功' });
    }
  );
});

// 更新任务
apiRouter.put('/tasks/:id', (req, res) => {
  const { name, start, end, progress, type, parentId, groupId, dependencies } = req.body;
  
  // 规范化日期格式：如果已经是字符串就直接使用，否则转换为 ISO 字符串
  const startDate = typeof start === 'string' ? start : new Date(start).toISOString();
  const endDate = typeof end === 'string' ? end : new Date(end).toISOString();
  
  db.run(
    `UPDATE tasks 
     SET name = ?, start = ?, end = ?, progress = ?, type = ?, parent_id = ?, group_id = ?, dependencies = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, startDate, endDate, progress, type, parentId || null, groupId || null, dependencies?.join(',') || null, req.params.id],
    function(err) {
      if (err) {
        console.error('更新任务失败:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: '任务更新成功' });
    }
  );
});

// 删除任务
apiRouter.delete('/tasks/:id', (req, res) => {
  // 递归删除任务及其所有子任务
  const deleteTaskAndChildren = (taskId, callback) => {
    db.run('DELETE FROM tasks WHERE id = ?', [taskId], (err) => {
      if (err) {
        callback(err);
        return;
      }
      
      // 查找子任务
      db.all('SELECT id FROM tasks WHERE parent_id = ?', [taskId], (err, children) => {
        if (err) {
          callback(err);
          return;
        }
        
        // 递归删除子任务
        if (children.length > 0) {
          let completed = 0;
          children.forEach(child => {
            deleteTaskAndChildren(child.id, (err) => {
              if (err) {
                callback(err);
                return;
              }
              completed++;
              if (completed === children.length) {
                callback(null);
              }
            });
          });
        } else {
          callback(null);
        }
      });
    });
  };

  deleteTaskAndChildren(req.params.id, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: '任务删除成功' });
  });
});

// 获取所有分组
apiRouter.get('/groups', (req, res) => {
  db.all('SELECT * FROM groups ORDER BY created_at ASC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
    })));
  });
});

// 创建分组
apiRouter.post('/groups', (req, res) => {
  const { id, name, color } = req.body;
  
  db.run(
    'INSERT INTO groups (id, name, color) VALUES (?, ?, ?)',
    [id, name, color],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, message: '分组创建成功' });
    }
  );
});

// 删除分组
apiRouter.delete('/groups/:id', (req, res) => {
  db.run('DELETE FROM groups WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // 移除任务中的分组引用
    db.run('UPDATE tasks SET group_id = NULL WHERE group_id = ?', [req.params.id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: '分组删除成功' });
    });
  });
});

// 健康检查
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(API_PREFIX, apiRouter);

// 启动服务器
app.listen(PORT, HOST, () => {
  const displayDomain = PUBLIC_API_DOMAIN === '0.0.0.0' ? 'localhost' : PUBLIC_API_DOMAIN;
  const apiPathForDisplay = API_PREFIX === '/' ? '' : API_PREFIX;
  console.log(`服务器运行在 http://${HOST}:${PORT}`);
  console.log(`数据库路径: ${DB_PATH}`);
  console.log(`API 地址: ${PUBLIC_API_PROTOCOL}://${displayDomain}:${PUBLIC_API_PORT}${apiPathForDisplay}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接失败:', err);
    } else {
      console.log('数据库连接已关闭');
    }
    process.exit(0);
  });
});

function normalizeApiPrefix(prefix = '/api') {
  const trimmed = prefix?.trim() || '/api';
  if (trimmed === '/') {
    return '/';
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, '') || '/';
}

function resolveDatabasePath(customPath) {
  if (!customPath) {
    return join(__dirname, '..', 'data', 'taskline.db');
  }
  return isAbsolute(customPath) ? customPath : join(__dirname, '..', customPath);
}

