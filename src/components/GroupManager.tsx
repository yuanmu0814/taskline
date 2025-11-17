import { useState } from 'react';
import { Group } from '../types';

interface GroupManagerProps {
  groups: Group[];
  isAuthenticated: boolean;
  onAddGroup: (name: string, color: string) => void;
  onDeleteGroup: (id: string) => void;
  onRequireAuth: () => void;
}

const COLOR_OPTIONS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export default function GroupManager({ groups, isAuthenticated, onAddGroup, onDeleteGroup, onRequireAuth }: GroupManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGroupName.trim()) {
      onAddGroup(newGroupName.trim(), selectedColor);
      setNewGroupName('');
      setShowForm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">分组管理</h3>
        <button
          onClick={() => {
            if (isAuthenticated) {
              setShowForm(!showForm);
            } else {
              onRequireAuth();
            }
          }}
          className={`px-3 py-1 text-sm rounded-md transition ${
            isAuthenticated
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-400 bg-gray-200 cursor-not-allowed'
          }`}
          title={!isAuthenticated ? '需要登录才能创建分组' : ''}
        >
          {showForm ? '取消' : '+ 新建分组'}
        </button>
      </div>

      {showForm && isAuthenticated && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="space-y-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="分组名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition ${
                      selectedColor === color
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
            >
              创建分组
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无分组</p>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-sm font-medium text-gray-800">{group.name}</span>
              </div>
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    onDeleteGroup(group.id);
                  } else {
                    onRequireAuth();
                  }
                }}
                className={`px-2 py-1 text-xs rounded transition ${
                  isAuthenticated
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
                title={!isAuthenticated ? '需要登录才能删除分组' : ''}
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


