/**
 * Centralized API Configuration for TrueWear Frontend
 *
 * Production deployed backend: VITE_API_BASE_URL (e.g. https://truewear-api.onrender.com)
 * Local development fallback: http://localhost:8000
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

export const getApiUrl = (path: string = ''): string => {
  const cleanPath = path.replace(/^\/+/, '');
  return cleanPath ? `${API_BASE_URL}/${cleanPath}` : API_BASE_URL;
};
