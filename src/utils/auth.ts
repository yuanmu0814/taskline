// 简单的认证工具
// 在实际项目中，应该使用更安全的认证方式

const AUTH_KEY = 'taskline_auth';

const DEFAULT_USERNAME = (import.meta.env?.VITE_ADMIN_USERNAME || 'admin').trim();
const DEFAULT_PASSWORD = (import.meta.env?.VITE_ADMIN_PASSWORD || 'Taskline@123').trim();

export interface User {
  username: string;
  loginTime: number;
}

export const auth = {
  // 登录
  login: (username: string, password: string): boolean => {
    // 简单的用户名密码验证
    if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      const user: User = {
        username,
        loginTime: Date.now(),
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  },

  // 登出
  logout: (): void => {
    localStorage.removeItem(AUTH_KEY);
  },

  // 检查是否已登录
  isAuthenticated: (): boolean => {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return false;

    try {
      const user: User = JSON.parse(authData);
      // 可以添加过期时间检查（例如24小时）
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      if (Date.now() - user.loginTime > maxAge) {
        localStorage.removeItem(AUTH_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  // 获取当前用户
  getCurrentUser: (): User | null => {
    const authData = localStorage.getItem(AUTH_KEY);
    if (!authData) return null;

    try {
      return JSON.parse(authData) as User;
    } catch {
      return null;
    }
  },
};

