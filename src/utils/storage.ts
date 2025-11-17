import { Task, Group } from '../types';
import { dbStatusManager } from './dbStatus';
import { API_BASE_URL } from './apiConfig';

// API 请求辅助函数
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(`${API_BASE_URL}${sanitizedEndpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  }
}

export const storage = {
  getTasks: async (): Promise<Task[]> => {
    try {
      dbStatusManager.recordRead('任务列表');
      const tasks = await apiRequest('/tasks');
      setTimeout(() => dbStatusManager.clear(), 500);
      return tasks.map((task: any) => ({
        ...task,
        start: new Date(task.start),
        end: new Date(task.end),
      }));
    } catch (error) {
      console.error('获取任务失败:', error);
      setTimeout(() => dbStatusManager.clear(), 500);
      return [];
    }
  },

  // 创建单个任务
  createTask: async (task: Task): Promise<void> => {
    dbStatusManager.recordWrite(`创建任务: ${task.name}`);
    const taskData = {
      id: task.id,
      name: task.name,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      progress: task.progress,
      type: task.type,
      parentId: task.parentId,
      groupId: task.groupId,
      dependencies: task.dependencies || [],
    };
    await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    setTimeout(() => dbStatusManager.clear(), 500);
  },

  // 更新单个任务
  updateTask: async (task: Task): Promise<void> => {
    dbStatusManager.recordUpdate(`更新任务: ${task.name}`);
    const taskData = {
      id: task.id,
      name: task.name,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      progress: task.progress,
      type: task.type,
      parentId: task.parentId,
      groupId: task.groupId,
      dependencies: task.dependencies || [],
    };
    await apiRequest(`/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
    setTimeout(() => dbStatusManager.clear(), 500);
  },

  // 删除单个任务
  deleteTask: async (id: string): Promise<void> => {
    dbStatusManager.recordWrite(`删除任务`);
    await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    setTimeout(() => dbStatusManager.clear(), 500);
  },

  saveTasks: async (tasks: Task[]): Promise<void> => {
    // 保存所有任务（先删除再创建，或使用批量更新）
    // 这里简化处理：逐个保存
    try {
      dbStatusManager.recordWrite(`批量保存任务 (${tasks.length}个)`);
      // 获取现有任务
      const existingTasks = await storage.getTasks();
      const existingIds = new Set(existingTasks.map(t => t.id));
      const newIds = new Set(tasks.map(t => t.id));

      // 删除不存在的任务
      for (const task of existingTasks) {
        if (!newIds.has(task.id)) {
          await apiRequest(`/tasks/${task.id}`, { method: 'DELETE' });
        }
      }

      // 创建或更新任务
      for (const task of tasks) {
        const taskData = {
          id: task.id,
          name: task.name,
          start: task.start.toISOString(),
          end: task.end.toISOString(),
          progress: task.progress,
          type: task.type,
          parentId: task.parentId,
          groupId: task.groupId,
          dependencies: task.dependencies || [],
        };

        if (existingIds.has(task.id)) {
          await apiRequest(`/tasks/${task.id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData),
          });
        } else {
          await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData),
          });
        }
      }
      setTimeout(() => dbStatusManager.clear(), 500);
    } catch (error) {
      console.error('保存任务失败:', error);
      setTimeout(() => dbStatusManager.clear(), 500);
      throw error;
    }
  },

  getGroups: async (): Promise<Group[]> => {
    try {
      dbStatusManager.recordRead('分组列表');
      const groups = await apiRequest('/groups');
      setTimeout(() => dbStatusManager.clear(), 500);
      return groups;
    } catch (error) {
      console.error('获取分组失败:', error);
      setTimeout(() => dbStatusManager.clear(), 500);
      return [];
    }
  },

  // 创建单个分组
  createGroup: async (group: Group): Promise<void> => {
    dbStatusManager.recordWrite(`创建分组: ${group.name}`);
    await apiRequest('/groups', {
      method: 'POST',
      body: JSON.stringify(group),
    });
    setTimeout(() => dbStatusManager.clear(), 500);
  },

  // 删除单个分组
  deleteGroup: async (id: string): Promise<void> => {
    dbStatusManager.recordWrite('删除分组');
    await apiRequest(`/groups/${id}`, { method: 'DELETE' });
    setTimeout(() => dbStatusManager.clear(), 500);
  },

  saveGroups: async (groups: Group[]): Promise<void> => {
    try {
      dbStatusManager.recordWrite(`批量保存分组 (${groups.length}个)`);
      // 获取现有分组
      const existingGroups = await storage.getGroups();
      const existingIds = new Set(existingGroups.map(g => g.id));
      const newIds = new Set(groups.map(g => g.id));

      // 删除不存在的分组
      for (const group of existingGroups) {
        if (!newIds.has(group.id)) {
          await apiRequest(`/groups/${group.id}`, { method: 'DELETE' });
        }
      }

      // 创建新分组
      for (const group of groups) {
        if (!existingIds.has(group.id)) {
          await apiRequest('/groups', {
            method: 'POST',
            body: JSON.stringify(group),
          });
        }
      }
      setTimeout(() => dbStatusManager.clear(), 500);
    } catch (error) {
      console.error('保存分组失败:', error);
      setTimeout(() => dbStatusManager.clear(), 500);
      throw error;
    }
  },
};


