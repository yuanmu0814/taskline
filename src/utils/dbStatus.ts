// 数据库操作状态管理器

export type DbOperationType = 'read' | 'update' | 'write' | null;

export interface DbOperationStatus {
  type: DbOperationType;
  timestamp: number;
  message: string;
}

class DbStatusManager {
  private listeners: Set<(status: DbOperationStatus) => void> = new Set();
  private currentStatus: DbOperationStatus = {
    type: null,
    timestamp: Date.now(),
    message: '就绪',
  };

  // 订阅状态变化
  subscribe(listener: (status: DbOperationStatus) => void): () => void {
    this.listeners.add(listener);
    // 立即通知当前状态
    listener(this.currentStatus);
    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 更新状态
  private updateStatus(type: DbOperationType, message: string) {
    this.currentStatus = {
      type,
      timestamp: Date.now(),
      message,
    };
    // 通知所有监听者
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  // 记录读取操作
  recordRead(operation: string) {
    this.updateStatus('read', `读取: ${operation}`);
  }

  // 记录更新操作
  recordUpdate(operation: string) {
    this.updateStatus('update', `更新: ${operation}`);
  }

  // 记录写入操作
  recordWrite(operation: string) {
    this.updateStatus('write', `写入: ${operation}`);
  }

  // 清除状态（操作完成）
  clear() {
    this.updateStatus(null, '就绪');
  }

  // 获取当前状态
  getStatus(): DbOperationStatus {
    return this.currentStatus;
  }
}

export const dbStatusManager = new DbStatusManager();


