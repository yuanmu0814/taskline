import { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import { Task, Group } from '../types';

interface GanttChartProps {
  tasks: Task[];
  groups: Group[];
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

type ViewMode = 'Day' | 'Week' | 'Month';

export default function GanttChart({ tasks, groups, isAuthenticated, onRequireAuth }: GanttChartProps) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const ganttInstanceRef = useRef<Gantt | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [columnWidth, setColumnWidth] = useState(30);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [maxLevel, setMaxLevel] = useState<number>(-1); // -1 表示显示所有层级
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  // 计算任务的层级深度（0 表示顶级任务）
  const getTaskLevel = (task: Task, allTasks: Task[]): number => {
    if (!task.parentId) return 0;
    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return 0;
    return getTaskLevel(parent, allTasks) + 1;
  };

  // 获取任务的所有子任务（递归）
  const getAllChildren = (taskId: string, allTasks: Task[]): Set<string> => {
    const children = new Set<string>();
    const directChildren = allTasks.filter(t => t.parentId === taskId);
    directChildren.forEach(child => {
      children.add(child.id);
      // 递归获取子任务的子任务
      const grandChildren = getAllChildren(child.id, allTasks);
      grandChildren.forEach(gc => children.add(gc));
    });
    return children;
  };

  // 检查任务是否应该显示（如果其任何父任务被折叠，则不应该显示）
  const shouldShowTask = (task: Task, allTasks: Task[]): boolean => {
    if (!task.parentId) return true; // 顶级任务总是显示
    
    // 检查父任务是否被折叠
    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return true;
    
    if (collapsedTasks.has(task.parentId)) {
      return false; // 如果父任务被折叠，不显示
    }
    
    // 递归检查所有祖先任务
    return shouldShowTask(parent, allTasks);
  };

  // 切换任务的折叠状态
  const toggleTaskCollapse = (taskId: string) => {
    setCollapsedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // 根据选中的分组过滤任务
  const groupFilteredTasks = selectedGroupId === 'all' 
    ? tasks 
    : selectedGroupId === 'none'
    ? tasks.filter(task => !task.groupId)
    : tasks.filter(task => task.groupId === selectedGroupId);

  // 根据选中的层级过滤任务
  const levelFilteredTasks = maxLevel === -1
    ? groupFilteredTasks
    : groupFilteredTasks.filter(task => getTaskLevel(task, tasks) <= maxLevel);

  // 根据折叠状态过滤任务
  const filteredTasks = levelFilteredTasks.filter(task => shouldShowTask(task, tasks));

  useEffect(() => {
    if (!ganttRef.current) return;

    // 检查任务是否有子任务
    const hasChildren = (taskId: string): boolean => {
      return tasks.some(t => t.parentId === taskId);
    };

    // 转换任务格式为 frappe-gantt 需要的格式
    const ganttTasks = filteredTasks.map(task => {
      const hasChildTasks = hasChildren(task.id);
      const isCollapsed = collapsedTasks.has(task.id);
      // 在任务名称前添加折叠/展开指示器
      const namePrefix = hasChildTasks ? (isCollapsed ? '▶ ' : '▼ ') : '  ';
      return {
        id: task.id,
        name: namePrefix + task.name,
        start: task.start.toISOString().split('T')[0],
        end: task.end.toISOString().split('T')[0],
        progress: task.progress,
        dependencies: task.dependencies?.join(',') || '',
        custom_class: task.type === 'milestone' ? 'milestone' : '',
      };
    });

    // 销毁旧的实例
    if (ganttInstanceRef.current) {
      ganttRef.current.innerHTML = '';
    }

    // 创建新的甘特图实例
    if (ganttTasks.length > 0) {
      ganttInstanceRef.current = new Gantt(ganttRef.current, ganttTasks, {
        view_mode: viewMode,
        language: 'zh',
        header_height: 50,
        column_width: columnWidth,
        step: 24,
        bar_height: 20,
        bar_corner_radius: 3,
        arrow_curve: 5,
        padding: 18,
        date_format: 'YYYY-MM-DD',
        on_click: (task: any) => {
          // 获取任务 ID（frappe-gantt 可能使用 _id 或 id）
          const taskId = task._id || task.id;
          if (!taskId) return;
          
          // 检查点击的任务是否有子任务
          const clickedTask = tasks.find(t => t.id === taskId);
          if (clickedTask) {
            const hasChildTasks = tasks.some(t => t.parentId === clickedTask.id);
            if (hasChildTasks) {
              // 如果有子任务，切换折叠状态
              toggleTaskCollapse(clickedTask.id);
            }
          }
        },
      });

    }
  }, [filteredTasks, viewMode, columnWidth, collapsedTasks, tasks]);

  // 导出为 PNG 图片
  const exportToPNG = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    
    if (!ganttRef.current) return;

    try {
      // 动态导入 html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(ganttRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `甘特图_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请确保已安装 html2canvas 库');
    }
  };

  // 导出为 SVG
  const exportToSVG = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    
    if (!ganttRef.current) return;

    const svg = ganttRef.current.querySelector('svg');
    if (!svg) {
      alert('未找到 SVG 元素');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const link = document.createElement('a');
    link.download = `甘特图_${new Date().toISOString().split('T')[0]}.svg`;
    link.href = svgUrl;
    link.click();
    
    URL.revokeObjectURL(svgUrl);
  };

  // 导出为 PDF（使用打印功能）
  const exportToPDF = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    
    if (!ganttRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }

    const ganttHTML = ganttRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>甘特图导出</title>
          <style>
            body { margin: 0; padding: 20px; }
            svg { width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${ganttHTML}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 调整视图模式
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // 根据视图模式调整列宽
    switch (mode) {
      case 'Day':
        setColumnWidth(30);
        break;
      case 'Week':
        setColumnWidth(50);
        break;
      case 'Month':
        setColumnWidth(80);
        break;
    }
  };



  return (
    <div className="w-full bg-white rounded-lg shadow">
      {/* 工具栏 */}
      <div className="p-2 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 flex-1">
          {/* 分组筛选 */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">分组:</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部</option>
              <option value="none">未分组</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* 层级筛选 */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">层级:</label>
            <select
              value={maxLevel}
              onChange={(e) => setMaxLevel(parseInt(e.target.value))}
              className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="-1">全部层级</option>
              <option value="0">仅顶级</option>
              <option value="1">最多2层</option>
              <option value="2">最多3层</option>
              <option value="3">最多4层</option>
              <option value="4">最多5层</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">视图:</label>
            <div className="flex space-x-1">
              <button
                onClick={() => handleViewModeChange('Day')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition ${
                  viewMode === 'Day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                日
              </button>
              <button
                onClick={() => handleViewModeChange('Week')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition ${
                  viewMode === 'Week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                周
              </button>
              <button
                onClick={() => handleViewModeChange('Month')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition ${
                  viewMode === 'Month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                月
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 flex-1 min-w-0">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:inline">列宽:</label>
            <button
              onClick={() => setColumnWidth(Math.max(20, columnWidth - 5))}
              className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition flex-shrink-0"
              disabled={columnWidth <= 20}
              title="缩小"
            >
              −
            </button>
            <input
              type="range"
              min="20"
              max="150"
              value={columnWidth}
              onChange={(e) => setColumnWidth(parseInt(e.target.value))}
              className="flex-1 min-w-0"
            />
            <button
              onClick={() => setColumnWidth(Math.min(150, columnWidth + 5))}
              className="px-1.5 sm:px-2 py-1 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition flex-shrink-0"
              disabled={columnWidth >= 150}
              title="放大"
            >
              +
            </button>
            <span className="text-xs sm:text-sm text-gray-600 w-10 sm:w-12 text-right flex-shrink-0">{columnWidth}px</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">导出:</span>
          <button
            onClick={exportToPNG}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition ${
              isAuthenticated
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={isAuthenticated ? '导出为 PNG 图片' : '需要登录才能导出'}
            disabled={!isAuthenticated}
          >
            PNG
          </button>
          <button
            onClick={exportToSVG}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition ${
              isAuthenticated
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={isAuthenticated ? '导出为 SVG 矢量图' : '需要登录才能导出'}
            disabled={!isAuthenticated}
          >
            SVG
          </button>
          <button
            onClick={exportToPDF}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition ${
              isAuthenticated
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={isAuthenticated ? '导出为 PDF（打印）' : '需要登录才能导出'}
            disabled={!isAuthenticated}
          >
            PDF
          </button>
        </div>
      </div>

      {/* 甘特图容器 */}
      <div ref={ganttContainerRef} className="overflow-x-auto overflow-y-auto max-h-[400px] sm:max-h-[600px]">
        <div ref={ganttRef} className="gantt-container"></div>
      </div>
    </div>
  );
}


