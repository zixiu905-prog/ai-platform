import { notificationManager } from './notificationManager';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  notifyOnError?: boolean;
}

export class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private defaultTimeout = 30000; // 30秒

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * 设置认证令牌
   */
  setToken(token: string): void {
    this.token = token;
    // 存储到本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * 获取认证令牌
   */
  getToken(): string | null {
    if (this.token) {
      return this.token;
    }
    
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    
    return this.token;
  }

  /**
   * 清除认证令牌
   */
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * 发送HTTP请求
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = 0,
      notifyOnError = true
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // 处理响应
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || responseData.message || `HTTP ${response.status}`);
        }

        // 保存新的token（如果返回的话）
        if (responseData.token) {
          this.setToken(responseData.token);
        }

        return {
          success: true,
          data: responseData.data || responseData,
          message: responseData.message
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        attempt++;
        
        if (attempt <= retries) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // 所有重试都失败了
    const errorMessage = lastError?.message || '请求失败';
    
    if (notifyOnError) {
      await notificationManager.showError('API请求失败', errorMessage);
    }

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * GET请求
   */
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T = any>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  /**
   * PUT请求
   */
  async put<T = any>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(endpoint: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }

  /**
   * 上传文件
   */
  async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    options?: Omit<RequestOptions, 'method' | 'body' | 'headers'>
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const token = this.getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        ...headers,
        // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
      }
    });
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    endpoint: string,
    files: File[],
    additionalData?: Record<string, any>,
    options?: Omit<RequestOptions, 'method' | 'body' | 'headers'>
  ): Promise<ApiResponse<any[]>> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const token = this.getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        ...headers,
      }
    });
  }

  /**
   * 下载文件
   */
  async downloadFile(
    endpoint: string,
    filename?: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await notificationManager.showSuccess('下载完成', `文件已保存到下载文件夹`);
    } catch (error) {
      await notificationManager.showError('下载失败', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.get('/health', { 
        timeout: 5000, 
        notifyOnError: false,
        retries: 1 
      });
      return response.success;
    } catch {
      return false;
    }
  }
}

// 创建API服务实例
export const apiService = new ApiService();

// 导出具体API方法
export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    apiService.post('/auth/login', credentials),
  
  logout: () =>
    apiService.post('/auth/logout'),
  
  refreshToken: () =>
    apiService.post('/auth/refresh'),
  
  getProfile: () =>
    apiService.get('/auth/profile'),
};

export const fileApi = {
  upload: (file: File, options?: any) =>
    apiService.uploadFile('/files/upload', file, options),
  
  uploadMultiple: (files: File[], options?: any) =>
    apiService.uploadFiles('/files/upload-multiple', files, options),
  
  list: (params?: any) =>
    apiService.get('/files', { body: params }),
  
  delete: (fileId: string) =>
    apiService.delete(`/files/${fileId}`),
  
  download: (fileId: string, filename?: string) =>
    apiService.downloadFile(`/files/${fileId}/download`, filename),
};

export const aiApi = {
  processImage: (imageData: any) =>
    apiService.post('/ai/process-image', imageData),
  
  speechToText: (audioData: any) =>
    apiService.post('/ai/speech-to-text', audioData),
  
  textToSpeech: (text: string, options?: any) =>
    apiService.post('/ai/text-to-speech', { text, ...options }),
  
  generateContent: (prompt: string, options?: any) =>
    apiService.post('/ai/generate', { prompt, ...options }),
};

export const systemApi = {
  getSystemInfo: () =>
    apiService.get('/system/info'),
  
  getSystemStatus: () =>
    apiService.get('/system/status'),
  
  getLogs: (params?: any) =>
    apiService.get('/system/logs', { body: params }),
  
  clearLogs: () =>
    apiService.delete('/system/logs'),
};