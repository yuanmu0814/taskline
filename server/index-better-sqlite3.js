// 使用 better-sqlite3 的版本（如果 sqlite3 安装有问题，可以使用这个版本）
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;
const DB_PATH = join(__dirname, '..', 'data', 'taskline.db');

// 确保数据目录存在
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  try {
    mkdirSync(dataDir, { recursive: true });
    console.log(`数据目录已创建: ${dataDir}`);
  } catch (error) {
    console.error('创建数据目录失败:', error);
    process.exit(1);
  }
}

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据库
console.log(`尝试连接数据库: ${DB_PATH}`);
let db;

try {
  db = new Database(DB_PATH);
  console.log('数据库连接成功');
  console.log(`数据库文件路径: ${DB_PATH}`);
  initDatabase();
} catch (error) {
  console.error('数据库连接失败:', error);
  console.error('错误详情:', error.message);
  process.exit(1);
}

// 初始化数据库表
function initDatabase() {
  try {
    // 任务表
    db.exec(`
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
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 用户表（用于扩展）
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('初始化数据库表失败:', error);
  }
}

// API 路由

// 获取所有任务
app.get('/api/tasks', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at ASC').all();
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建任务
app.post('/api/tasks', (req, res) => {
  try {
    const { id, name, start, end, progress, type, parentId, groupId, dependencies } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO tasks (id, name, start, end, progress, type, parent_id, group_id, dependencies, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(id, name, start.toISOString(), end.toISOString(), progress, type, parentId || null, groupId || null, dependencies?.join(',') || null);
    res.json({ id, message: '任务创建成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新任务
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { name, start, end, progress, type, parentId, groupId, dependencies } = req.body;
    
    const stmt = db.prepare(`
      UPDATE tasks 
      SET name = ?, start = ?, end = ?, progress = ?, type = ?, parent_id = ?, group_id = ?, dependencies = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(name, start.toISOString(), end.toISOString(), progress, type, parentId || null, groupId || null, dependencies?.join(',') || null, req.params.id);
    res.json({ message: '任务更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除任务
app.delete('/api/tasks/:id', (req, res) => {
  try {
    // 递归删除任务及其所有子任务
    const deleteTaskAndChildren = (taskId) => {
      // 查找子任务
      const children = db.prepare('SELECT id FROM tasks WHERE parent_id = ?').all(taskId);
      
      // 递归删除子任务
      children.forEach(child => {
        deleteTaskAndChildren(child.id);
      });
      
      // 删除当前任务
      db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    };

    deleteTaskAndChildren(req.params.id);
    res.json({ message: '任务删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取所有分组
app.get('/api/groups', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM groups ORDER BY created_at ASC').all();
    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建分组
app.post('/api/groups', (req, res) => {
  try {
    const { id, name, color } = req.body;
    
    const stmt = db.prepare('INSERT INTO groups (id, name, color) VALUES (?, ?, ?)');
    stmt.run(id, name, color);
    res.json({ id, message: '分组创建成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除分组
app.delete('/api/groups/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE tasks SET group_id = NULL WHERE group_id = ?').run(req.params.id);
    res.json({ message: '分组删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`数据库路径: ${DB_PATH}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  try {
    db.close();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接失败:', error);
  }
  process.exit(0);
});



