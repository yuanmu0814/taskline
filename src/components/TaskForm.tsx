import { useState, useEffect } from 'react';
import { Task, Group, TaskFormData } from '../types';

interface TaskFormProps {
  task?: Task;
  groups: Group[];
  parentTasks: Task[];
  allTasks: Task[];
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}

export default function TaskForm({ task, groups, parentTasks, allTasks, onSubmit, onCancel }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    start: new Date(),
    end: new Date(),
    progress: 0,
    type: 'task',
    parentId: undefined,
    groupId: undefined,
    dependencies: [],
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        start: task.start,
        end: task.end,
        progress: task.progress,
        type: task.type,
        parentId: task.parentId,
        groupId: task.groupId,
        dependencies: task.dependencies || [],
      });
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          任务名称
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            开始日期
          </label>
          <input
            type="date"
            value={formData.start.toISOString().split('T')[0]}
            onChange={(e) => setFormData({ ...formData, start: new Date(e.target.value) })}
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            结束日期
          </label>
          <input
            type="date"
            value={formData.end.toISOString().split('T')[0]}
            onChange={(e) => setFormData({ ...formData, end: new Date(e.target.value) })}
            className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          进度 (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={formData.progress}
          onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          任务类型
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'task' | 'milestone' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="task">任务</option>
          <option value="milestone">里程碑</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          所属分组
        </label>
        <select
          value={formData.groupId || ''}
          onChange={(e) => setFormData({ ...formData, groupId: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">无分组</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          父任务
        </label>
        <select
          value={formData.parentId || ''}
          onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">无父任务（独立任务）</option>
          {parentTasks.map((t) => {
            // 计算任务的层级深度
            const getLevel = (taskId: string, level: number = 0): number => {
              const task = allTasks.find((t) => t.id === taskId);
              if (!task || !task.parentId) return level;
              return getLevel(task.parentId, level + 1);
            };
            const level = getLevel(t.id);
            const indent = '  '.repeat(level);
            return (
              <option key={t.id} value={t.id}>
                {indent}{level > 0 ? '└─ ' : ''}{t.name}
              </option>
            );
          })}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          可以选择任何任务作为父任务，支持多级嵌套
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-3 sm:pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
        >
          {task ? '更新' : '创建'}
        </button>
      </div>
    </form>
  );
}


