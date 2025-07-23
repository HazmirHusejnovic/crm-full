import { toast } from 'sonner';

const BASE_URL = 'https://crm.radionasarijec.com/api';

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
  isAuthRequest?: boolean; // To prevent adding token to auth endpoints
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token, isAuthRequest, headers, ...rest } = options;

  const config: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (token && !isAuthRequest) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token: string | null = null) =>
    apiRequest<T>(endpoint, { method: 'GET', token }),
  post: <T>(endpoint: string, data: any, token: string | null = null, isAuthRequest: boolean = false) =>
    apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data), token, isAuthRequest }),
  put: <T>(endpoint: string, data: any, token: string | null = null) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(data), token }),
  delete: <T>(endpoint: string, token: string | null = null) =>
    apiRequest<T>(endpoint, { method: 'DELETE', token }),
  uploadFile: async <T>(endpoint: string, file: File, token: string | null = null): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file); // Ensure 'file' matches backend's expected field name

    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `File upload failed: ${response.statusText}`);
    }

    return response.json();
  },
};