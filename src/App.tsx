import { useState, useEffect } from 'react';
import { Task, Group, TaskFormData } from './types';
import { storage } from './utils/storage';
import { auth } from './utils/auth';
import { dbStatusManager, DbOperationStatus } from './utils/dbStatus';
import { getApiBaseUrl } from './utils/apiConfig';
import GanttChart from './components/GanttChart';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import GroupManager from './components/GroupManager';
import Login from './components/Login';

function App() {
  const apiBaseUrl = getApiBaseUrl();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [activeTab, setActiveTab] = useState<'gantt' | 'list' | 'groups'>('gantt');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [dbStatus, setDbStatus] = useState<DbOperationStatus>({
    type: null,
    timestamp: Date.now(),
    message: '就绪',
  });

  // 检查服务器状态
  const checkServerStatus = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
      
      const response = await fetch(`${apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setServerStatus('connected');
      } else {
        setServerStatus('disconnected');
      }
    } catch (error) {
      setServerStatus('disconnected');
    }
  };

  useEffect(() => {
    // 检查登录状态
    setIsAuthenticated(auth.isAuthenticated());
    
    // 检查服务器状态
    checkServerStatus();
    // 每5秒检查一次服务器状态
    const statusInterval = setInterval(checkServerStatus, 5000);
    
    // 订阅数据库操作状态
    const unsubscribe = dbStatusManager.subscribe((status) => {
      setDbStatus(status);
    });
    
    // 加载数据（异步）
    const loadData = async () => {
      try {
        const loadedTasks = await storage.getTasks();
        const loadedGroups = await storage.getGroups();
        setTasks(loadedTasks);
        setGroups(loadedGroups);
      } catch (error) {
        console.error('加载数据失败:', error);
        // 不显示 alert，只在控制台记录
      }
    };
    
    loadData();

    return () => {
      clearInterval(statusInterval);
      unsubscribe();
    };
  }, []);

  // 处理登录
  const handleLogin = (username: string, password: string): boolean => {
    const success = auth.login(username, password);
    if (success) {
      setIsAuthenticated(true);
      setShowLogin(false);
    }
    return success;
  };

  // 处理登出
  const handleLogout = () => {
    auth.logout();
    setIsAuthenticated(false);
  };

  // 检查权限，如果未登录则显示登录框
  const requireAuth = (callback: () => void) => {
    if (isAuthenticated) {
      callback();
    } else {
      setShowLogin(true);
    }
  };

  const handleAddTask = async (formData: TaskFormData) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    const newTask: Task = {
      ...formData,
      id: Date.now().toString(),
    };
    
    try {
      await storage.createTask(newTask);
      setTasks([...tasks, newTask]);
      setShowTaskForm(false);
      setEditingTask(undefined);
    } catch (error) {
      console.error('添加任务失败:', error);
      alert('添加任务失败，请检查服务器连接');
    }
  };

  const handleUpdateTask = async (formData: TaskFormData) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    if (!editingTask) return;
    
    try {
      const updatedTask: Task = { ...formData, id: editingTask.id };
      await storage.updateTask(updatedTask);
      const updatedTasks = tasks.map((t) =>
        t.id === editingTask.id ? updatedTask : t
      );
      setTasks(updatedTasks);
      setShowTaskForm(false);
      setEditingTask(undefined);
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新任务失败，请检查服务器连接');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    if (window.confirm('确定要删除这个任务吗？子任务也会被删除。')) {
      try {
        // 服务器端会递归删除子任务
        await storage.deleteTask(id);
        
        // 重新加载任务列表
        const loadedTasks = await storage.getTasks();
        setTasks(loadedTasks);
      } catch (error) {
        console.error('删除任务失败:', error);
        alert('删除任务失败，请检查服务器连接');
      }
    }
  };

  const handleEditTask = (task: Task) => {
    requireAuth(() => {
      setEditingTask(task);
      setShowTaskForm(true);
    });
  };

  const handleAddGroup = async (name: string, color: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    const newGroup: Group = {
      id: Date.now().toString(),
      name,
      color,
    };
    
    try {
      await storage.createGroup(newGroup);
      setGroups([...groups, newGroup]);
    } catch (error) {
      console.error('添加分组失败:', error);
      alert('添加分组失败，请检查服务器连接');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    if (window.confirm('确定要删除这个分组吗？分组中的任务不会被删除，但会失去分组。')) {
      try {
        await storage.deleteGroup(id);
        
        // 重新加载数据
        const [loadedGroups, loadedTasks] = await Promise.all([
          storage.getGroups(),
          storage.getTasks(),
        ]);
        setGroups(loadedGroups);
        setTasks(loadedTasks);
      } catch (error) {
        console.error('删除分组失败:', error);
        alert('删除分组失败，请检查服务器连接');
      }
    }
  };

  // 获取可以作为父任务的任务列表（排除当前编辑的任务及其所有子任务，避免循环引用）
  const getAvailableParentTasks = (): Task[] => {
    if (!editingTask) {
      return tasks; // 新建任务时，所有任务都可以作为父任务
    }

    // 获取当前任务的所有子任务ID（递归）
    const getDescendantIds = (taskId: string): Set<string> => {
      const descendants = new Set<string>([taskId]);
      const findChildren = (parentId: string) => {
        tasks.forEach((t) => {
          if (t.parentId === parentId) {
            descendants.add(t.id);
            findChildren(t.id);
          }
        });
      };
      findChildren(taskId);
      return descendants;
    };

    const descendantIds = getDescendantIds(editingTask.id);
    return tasks.filter((t) => !descendantIds.has(t.id));
  };

  const parentTasks = getAvailableParentTasks();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">PhD_Tasks_Line</h1>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
                    {auth.getCurrentUser()?.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                  >
                    登出
                  </button>
                  <button
                    onClick={() => {
                      setEditingTask(undefined);
                      setShowTaskForm(true);
                    }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-white bg-blue-600 rounded-md hover:bg-blue-700 transition flex-shrink-0"
                  >
                    <span className="hidden sm:inline">+ 新建任务</span>
                    <span className="sm:hidden">+ 新建</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-white bg-green-600 rounded-md hover:bg-green-700 transition"
                  >
                    登录
                  </button>
                  <button
                    onClick={() => requireAuth(() => {
                      setEditingTask(undefined);
                      setShowTaskForm(true);
                    })}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-white bg-blue-600 rounded-md hover:bg-blue-700 transition flex-shrink-0"
                  >
                    <span className="hidden sm:inline">+ 新建任务</span>
                    <span className="sm:hidden">+ 新建</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* 标签页导航 */}
        <div className="mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-4 sm:space-x-8 min-w-max">
            <button
              onClick={() => setActiveTab('gantt')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition whitespace-nowrap ${
                activeTab === 'gantt'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              甘特图
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition whitespace-nowrap ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              任务列表
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition whitespace-nowrap ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              分组管理
            </button>
          </nav>
        </div>

        {/* 登录模态框 */}
        {showLogin && (
          <Login
            onLogin={handleLogin}
            onCancel={() => setShowLogin(false)}
          />
        )}

        {/* 任务表单模态框 */}
        {showTaskForm && isAuthenticated && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
                {editingTask ? '编辑任务' : '新建任务'}
              </h2>
              <TaskForm
                task={editingTask}
                groups={groups}
                parentTasks={parentTasks}
                allTasks={tasks}
                onSubmit={editingTask ? handleUpdateTask : handleAddTask}
                onCancel={() => {
                  setShowTaskForm(false);
                  setEditingTask(undefined);
                }}
              />
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div className="space-y-6">
          {activeTab === 'gantt' && (
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">甘特图</h2>
              <GanttChart 
                tasks={tasks}
                groups={groups}
                isAuthenticated={isAuthenticated}
                onRequireAuth={() => setShowLogin(true)}
              />
            </div>
          )}

          {activeTab === 'list' && (
            <div>
              <TaskList
                tasks={tasks}
                groups={groups}
                isAuthenticated={isAuthenticated}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onRequireAuth={() => setShowLogin(true)}
              />
            </div>
          )}

          {activeTab === 'groups' && (
            <div>
              <GroupManager
                groups={groups}
                isAuthenticated={isAuthenticated}
                onAddGroup={handleAddGroup}
                onDeleteGroup={handleDeleteGroup}
                onRequireAuth={() => setShowLogin(true)}
              />
            </div>
          )}
        </div>
      </main>

      {/* 服务器状态指示器 */}
      <div className="fixed bottom-0 left-0 p-2 sm:p-3 z-10 space-y-2">
        {/* 服务器连接状态 */}
        <div className={`flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium shadow-md ${
          serverStatus === 'connected'
            ? 'bg-green-100 text-green-700 border border-green-300'
            : serverStatus === 'checking'
            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
            : 'bg-red-100 text-red-700 border border-red-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            serverStatus === 'connected'
              ? 'bg-green-500 animate-pulse'
              : serverStatus === 'checking'
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}></div>
          <span>
            {serverStatus === 'connected' && '服务器已连接'}
            {serverStatus === 'checking' && '检查中...'}
            {serverStatus === 'disconnected' && '服务器未连接'}
          </span>
        </div>

        {/* 数据库操作状态 */}
        <div className={`flex items-center space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium shadow-md transition-all ${
          dbStatus.type === 'read'
            ? 'bg-blue-100 text-blue-700 border border-blue-300'
            : dbStatus.type === 'update'
            ? 'bg-orange-100 text-orange-700 border border-orange-300'
            : dbStatus.type === 'write'
            ? 'bg-purple-100 text-purple-700 border border-purple-300'
            : 'bg-gray-100 text-gray-600 border border-gray-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            dbStatus.type === 'read'
              ? 'bg-blue-500'
              : dbStatus.type === 'update'
              ? 'bg-orange-500'
              : dbStatus.type === 'write'
              ? 'bg-purple-500'
              : 'bg-gray-400'
          } ${dbStatus.type ? 'animate-pulse' : ''}`}></div>
          <span className="whitespace-nowrap">{dbStatus.message}</span>
        </div>
      </div>
    </div>
  );
}

export default App;


