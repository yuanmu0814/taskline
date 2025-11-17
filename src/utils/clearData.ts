// 清除所有测试数据的工具函数
import { storage } from './storage';

export const clearAllData = () => {
  // 清除任务数据
  localStorage.removeItem('taskline_tasks');
  
  // 清除分组数据
  localStorage.removeItem('taskline_groups');
  
  // 清除认证数据（可选，如果需要清除登录状态）
  // localStorage.removeItem('taskline_auth');
  
  console.log('所有测试数据已清除');
};

// 检查并清除测试数据（在开发环境中使用）
export const checkAndClearTestData = () => {
  const tasks = storage.getTasks();
  const groups = storage.getGroups();
  
  // 如果有测试数据，可以在这里添加清除逻辑
  // 例如：清除特定名称的任务或分组
  
  // 示例：清除所有数据（谨慎使用）
  // clearAllData();
};

