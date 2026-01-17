import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API响应接口
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  code?: number;
}

// 错误处理接口
export interface APIError {
  code: number;
  message: string;
  details?: any;
}

// API配置接口
export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

class APIService {
  private instance: AxiosInstance;
  private config: APIConfig;
  private isOnline: boolean = true;
  private retryQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      baseURL: 'http://localhost:3000',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'electron-desktop',
        'X-Client-Version': '1.0.0'
      }
    });

    this.setupInterceptors();
    this.setupNetworkMonitoring();
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加认证token
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加请求时间戳
        (config as any).metadata = { startTime: new Date() };

        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        const endTime = new Date();
        const startTime = (response.config as any).metadata?.startTime;
        const duration = startTime ? endTime.getTime() - startTime.getTime() : 0;

        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
        
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // 记录错误
        console.error(`❌ API Error: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, error);

        // 网络错误处理
        if (!navigator.onLine) {
          this.isOnline = false;
          return this.handleOfflineRequest(originalRequest);
        }

        // 认证错误处理
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          return this.handleAuthError(originalRequest);
        }

        // 服务器错误重试
        if (error.response?.status >= 500 && !originalRequest._retryCount) {
          return this.retryRequest(originalRequest);
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * 设置网络监控
   */
  private setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      console.log('🌐 网络已连接');
      this.isOnline = true;
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📵 网络已断开');
      this.isOnline = false;
    });
  }

  /**
   * 获取认证token
   */
  private getAuthToken(): string | null {
    // 从Electron存储或localStorage获取token
    return localStorage.getItem('auth_token') || null;
  }

  /**
   * 处理认证错误
   */
  private async handleAuthError(originalRequest: any): Promise<any> {
    try {
      // 尝试刷新token
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.instance.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token } = response.data.data;
      localStorage.setItem('auth_token', access_token);

      // 重新发送原始请求
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return this.instance(originalRequest);
    } catch (error) {
      // 刷新失败，清除认证信息并跳转到登录页
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      // 通知应用需要重新登录
      window.dispatchEvent(new CustomEvent('auth-required'));
      return Promise.reject(new Error('Authentication failed'));
    }
  }

  /**
   * 重试请求
   */
  private async retryRequest(originalRequest: any): Promise<any> {
    const retryCount = originalRequest._retryCount || 0;
    
    if (retryCount >= this.config.retryAttempts) {
      return Promise.reject(this.formatError({
        response: { status: 500, message: 'Max retry attempts reached' }
      }));
    }

    originalRequest._retryCount = retryCount + 1;

    // 延迟重试
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, retryCount)));

    console.log(`🔄 重试请求 (${retryCount + 1}/${this.config.retryAttempts}): ${originalRequest.url}`);
    return this.instance(originalRequest);
  }

  /**
   * 处理离线请求
   */
  private handleOfflineRequest(originalRequest: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const retryRequest = async () => {
        try {
          const response = await this.instance(originalRequest);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      this.retryQueue.push(retryRequest);
    });
  }

  /**
   * 处理重试队列
   */
  private async processRetryQueue() {
    if (this.isProcessingQueue || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 处理离线队列，共 ${this.retryQueue.length} 个请求`);

    while (this.retryQueue.length > 0) {
      const retryRequest = this.retryQueue.shift();
      try {
        await retryRequest();
      } catch (error) {
        console.error('重试队列中的请求失败:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * 格式化错误
   */
  private formatError(error: any): APIError {
    if (error.response) {
      // 服务器返回的错误
      return {
        code: error.response.status || 500,
        message: error.response.data?.message || error.message || 'Server error',
        details: error.response.data?.details
      };
    } else if (error.request) {
      // 网络错误
      return {
        code: 0,
        message: 'Network error - please check your connection',
        details: error.message
      };
    } else {
      // 其他错误
      return {
        code: -1,
        message: error.message || 'Unknown error occurred',
        details: error
      };
    }
  }

  /**
   * 通用GET请求
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.get(url, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * 通用POST请求
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * 通用PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * 通用DELETE请求
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<APIResponse<T>> {
    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * 文件上传
   */
  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<APIResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response: AxiosResponse<APIResponse<T>> = await this.instance.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      });

      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * 批量请求
   */
  async batch<T = any>(requests: Array<{ method: string; url: string; data?: any }>): Promise<APIResponse<T>[]> {
    const promises = requests.map(req => {
      switch (req.method.toLowerCase()) {
        case 'get':
          return this.get(req.url);
        case 'post':
          return this.post(req.url, req.data);
        case 'put':
          return this.put(req.url, req.data);
        case 'delete':
          return this.delete(req.url);
        default:
          throw new Error(`Unsupported method: ${req.method}`);
      }
    });

    try {
      return await Promise.all(promises);
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isOnline && navigator.onLine;
  }

  /**
   * 设置API配置
   */
  setConfig(config: Partial<APIConfig>) {
    this.config = { ...this.config, ...config };
    
    if (config.baseURL) {
      this.instance.defaults.baseURL = config.baseURL;
    }
    
    if (config.timeout) {
      this.instance.defaults.timeout = config.timeout;
    }
  }

  /**
   * 获取API配置
   */
  getConfig(): APIConfig {
    return { ...this.config };
  }

  /**
   * 清除重试队列
   */
  clearRetryQueue() {
    this.retryQueue = [];
  }

  /**
   * 获取重试队列状态
   */
  getRetryQueueStatus(): { length: number; isProcessing: boolean } {
    return {
      length: this.retryQueue.length,
      isProcessing: this.isProcessingQueue
    };
  }
}

// 创建全局API服务实例
const apiService = new APIService();

export default apiService;

// 导出类型和工具函数
export { APIService };