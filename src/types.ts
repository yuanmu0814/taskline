export interface Task {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'task' | 'milestone';
  parentId?: string;
  groupId?: string;
  dependencies?: string[];
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export type TaskFormData = Omit<Task, 'id'>;


