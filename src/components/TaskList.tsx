import React, { useState } from 'react';
import { Task, Group } from '../types';

interface TaskListProps {
  tasks: Task[];
  groups: Group[];
  isAuthenticated: boolean;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onRequireAuth: () => void;
}

export default function TaskList({ tasks, groups, isAuthenticated, onEdit, onDelete, onRequireAuth }: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    return groups.find((g) => g.id === groupId)?.name;
  };

  // 获取任务的所有子任务
  const getChildren = (parentId: string): Task[] => {
    return tasks.filter((t) => t.parentId === parentId);
  };

  // 获取所有有子任务的任务ID
  const getAllParentTaskIds = (): Set<string> => {
    const parentIds = new Set<string>();
    tasks.forEach((task) => {
      if (getChildren(task.id).length > 0) {
        parentIds.add(task.id);
      }
    });
    return parentIds;
  };

  const expandAll = () => {
    setExpandedTasks(getAllParentTaskIds());
  };

  const collapseAll = () => {
    setExpandedTasks(new Set());
  };

  // 递归渲染任务树
  const renderTaskTree = (task: Task, level: number = 0, isLast: boolean = false): React.ReactNode => {
    const children = getChildren(task.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const indent = level * 20; // 移动端减少缩进

    return (
      <div key={task.id}>
        <div
          className="p-2 sm:p-3 border rounded-md hover:shadow-md transition bg-white"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
                {hasChildren && (
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                    aria-label={isExpanded ? '折叠' : '展开'}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {!hasChildren && level > 0 && (
                  <span className="w-6 h-6 flex items-center justify-center text-gray-300">
                    <span className="text-xs">•</span>
                  </span>
                )}
                {level > 0 && !hasChildren && (
                  <span className="text-gray-400 font-mono text-xs sm:text-sm hidden sm:inline">
                    {isLast ? '└─ ' : '├─ '}
                  </span>
                )}
                <h4 className="font-medium text-gray-800 text-sm sm:text-base break-words">{task.name}</h4>
                {task.type === 'milestone' && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded flex-shrink-0">
                    里程碑
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1 text-xs sm:text-sm text-gray-600">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1 sm:gap-0">
                  <span className="whitespace-nowrap">开始: {task.start.toLocaleDateString('zh-CN')}</span>
                  <span className="whitespace-nowrap">结束: {task.end.toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1 sm:gap-0">
                  <span className="whitespace-nowrap">进度: {task.progress}%</span>
                  {getGroupName(task.groupId) && (
                    <span className="flex items-center space-x-1">
                      <span>分组:</span>
                      <span
                        className="px-1.5 sm:px-2 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: groups.find((g) => g.id === task.groupId)?.color + '20',
                          color: groups.find((g) => g.id === task.groupId)?.color,
                        }}
                      >
                        {getGroupName(task.groupId)}
                      </span>
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mt-2">
                  <div
                    className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    onEdit(task);
                  } else {
                    onRequireAuth();
                  }
                }}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition whitespace-nowrap ${
                  isAuthenticated
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
                title={!isAuthenticated ? '需要登录才能编辑' : ''}
              >
                编辑
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    onDelete(task.id);
                  } else {
                    onRequireAuth();
                  }
                }}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition whitespace-nowrap ${
                  isAuthenticated
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
                title={!isAuthenticated ? '需要登录才能删除' : ''}
              >
                删除
              </button>
            </div>
          </div>
        </div>
        {/* 递归渲染子任务（仅在展开时显示） */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child, index) => 
              renderTaskTree(child, level + 1, index === children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // 获取所有顶级任务（没有父任务的任务）
  const rootTasks = tasks.filter((t) => !t.parentId);

  const hasExpandableTasks = getAllParentTaskIds().size > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">任务列表</h3>
        {hasExpandableTasks && (
          <div className="flex space-x-2">
            <button
              onClick={expandAll}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              全部展开
            </button>
            <button
              onClick={collapseAll}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              全部折叠
            </button>
          </div>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-8 text-sm sm:text-base">暂无任务</p>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {rootTasks.map((task, index) => 
            renderTaskTree(task, 0, index === rootTasks.length - 1)
          )}
        </div>
      )}
    </div>
  );
}

