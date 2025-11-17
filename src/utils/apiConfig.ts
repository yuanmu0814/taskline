const DEFAULT_DEV_API_URL = 'http://localhost:3004/api';

const stripTrailingSlash = (value: string) => {
  if (!value || value === '/') {
    return value;
  }
  return value.replace(/\/+$/, '');
};

export const getApiBaseUrl = (): string => {
  const configured = import.meta.env?.VITE_API_URL?.trim();
  if (configured) {
    return stripTrailingSlash(configured);
  }

  if (import.meta.env?.DEV) {
    return DEFAULT_DEV_API_URL;
  }

  if (typeof window !== 'undefined') {
    return stripTrailingSlash(`${window.location.origin}/api`);
  }

  return DEFAULT_DEV_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

