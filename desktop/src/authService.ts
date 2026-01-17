import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscriptionPlan: string;
  tokensRemaining: number;
  isVerified: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  subscribeNewsletter?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  error?: string;
  message?: string;
}

class AuthService {
  private readonly API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  private readonly TOKEN_KEY = 'aidesign_token';
  private readonly REFRESH_TOKEN_KEY = 'aidesign_refresh_token';
  private readonly USER_KEY = 'aidesign_user';

  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupAxiosInterceptors();
    this.initTokenRefresh();
  }

  /**
   * 设置 Axios 请求拦截器
   */
  private setupAxiosInterceptors(): void {
    axios.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getStoredRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await axios.post(`${this.API_BASE_URL}/auth/refresh`, {
              refreshToken
            });

            const { token, refreshToken: newRefreshToken } = response.data;
            
            this.storeToken(token);
            if (newRefreshToken) {
              this.storeRefreshToken(newRefreshToken);
            }

            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 初始化 Token 自动刷新
   */
  private initTokenRefresh(): void {
    const token = this.getStoredToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000; // 转换为毫秒
        const refreshTime = expirationTime - 5 * 60 * 1000; // 提前5分钟刷新

        if (refreshTime > Date.now()) {
          this.scheduleTokenRefresh(refreshTime - Date.now());
        }
      } catch (error) {
        console.warn('Token 解析失败:', error);
      }
    }
  }

  /**
   * 安排 Token 刷新
   */
  private scheduleTokenRefresh(delay: number): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    this.tokenRefreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Token 自动刷新失败:', error);
        this.logout();
      }
    }, delay);
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/login`, credentials);
      const data = response.data;

      if (data.success) {
        this.storeToken(data.token);
        if (data.refreshToken) {
          this.storeRefreshToken(data.refreshToken);
        }
        if (data.user) {
          this.storeUser(data.user);
        }
        this.initTokenRefresh();
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '登录失败，请检查您的凭据'
      };
    }
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/register`, userData);
      const data = response.data;

      if (data.success) {
        this.storeToken(data.token);
        if (data.refreshToken) {
          this.storeRefreshToken(data.refreshToken);
        }
        if (data.user) {
          this.storeUser(data.user);
        }
        this.initTokenRefresh();
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '注册失败，请稍后重试'
      };
    }
  }

  /**
   * 微信登录
   */
  async wechatLogin(): Promise<AuthResponse> {
    try {
      // 打开微信授权窗口
      const authUrl = `${this.API_BASE_URL}/auth/wechat`;
      const popup = window.open(
        authUrl,
        'wechat-login',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        return {
          success: false,
          error: '无法打开授权窗口，请检查弹窗拦截设置'
        };
      }

      // 监听授权结果
      return new Promise((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === 'WECHAT_AUTH_SUCCESS') {
            popup.close();
            window.removeEventListener('message', messageHandler);

            const { token, refreshToken, user } = event.data;
            
            if (token && user) {
              this.storeToken(token);
              if (refreshToken) {
                this.storeRefreshToken(refreshToken);
              }
              this.storeUser(user);
              this.initTokenRefresh();

              resolve({
                success: true,
                user,
                token,
                refreshToken
              });
            } else {
              resolve({
                success: false,
                error: '微信授权失败'
              });
            }
          } else if (event.data.type === 'WECHAT_AUTH_ERROR') {
            popup.close();
            window.removeEventListener('message', messageHandler);
            
            resolve({
              success: false,
              error: event.data.error || '微信授权失败'
            });
          }
        };

        window.addEventListener('message', messageHandler);

        // 设置超时
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
            window.removeEventListener('message', messageHandler);
            resolve({
              success: false,
              error: '授权超时，请重试'
            });
          }
        }, 60000); // 60秒超时
      });
    } catch (error) {
      return {
        success: false,
        error: '微信登录失败，请稍后重试'
      };
    }
  }

  /**
   * 发送邮箱验证码
   */
  async sendVerificationCode(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/send-verification`, { email });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '发送验证码失败'
      };
    }
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/verify-email`, { email, code });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '验证失败'
      };
    }
  }

  /**
   * 忘记密码
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '发送重置邮件失败'
      };
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/reset-password`, {
        token,
        newPassword
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '重置密码失败'
      };
    }
  }

  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getStoredRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await axios.post(`${this.API_BASE_URL}/auth/refresh`, {
        refreshToken
      });

      const { token, refreshToken: newRefreshToken, user } = response.data;
      
      this.storeToken(token);
      if (newRefreshToken) {
        this.storeRefreshToken(newRefreshToken);
      }
      if (user) {
        this.storeUser(user);
      }
      
      this.initTokenRefresh();
      return true;
    } catch (error) {
      console.error('Token 刷新失败:', error);
      return false;
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      // 通知服务器登出
      const refreshToken = this.getStoredRefreshToken();
      if (refreshToken) {
        await axios.post(`${this.API_BASE_URL}/auth/logout`, { refreshToken });
      }
    } catch (error) {
      console.warn('服务器登出失败:', error);
    } finally {
      this.clearAuthData();
    }
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): AuthUser | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 更新用户信息
   */
  updateUser(userData: Partial<AuthUser>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      this.storeUser(updatedUser);
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  /**
   * 检查 Token 是否即将过期
   */
  isTokenExpiringSoon(minutes: number = 5): boolean {
    const token = this.getStoredToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const now = Date.now();
      const fiveMinutesFromNow = now + minutes * 60 * 1000;
      
      return expirationTime <= fiveMinutesFromNow;
    } catch (error) {
      return true; // 如果无法解析，认为即将过期
    }
  }

  /**
   * 获取 Token 生命周期信息
   */
  getTokenInfo(): { issuedAt: number; expiresAt: number; timeUntilExpiry: number } | null {
    const token = this.getStoredToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now();
      
      return {
        issuedAt: payload.iat * 1000,
        expiresAt: payload.exp * 1000,
        timeUntilExpiry: payload.exp * 1000 - now
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 存储 Token
   */
  private storeToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * 存储 Refresh Token
   */
  private storeRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * 存储用户信息
   */
  private storeUser(user: AuthUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * 获取存储的 Token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * 获取存储的 Refresh Token
   */
  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * 清除认证数据
   */
  private clearAuthData(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * 验证 Token 格式
   */
  private isTokenValid(token: string): boolean {
    try {
      const parts = token.split('.');
      return parts.length === 3 && !!parts[0] && !!parts[1] && !!parts[2];
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取授权头
   */
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/password-reset-request`, { email });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '发送重置邮件失败'
      };
    }
  }

  /**
   * 验证重置 Token
   */
  async validateResetToken(token: string): Promise<{ success: boolean; valid: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/validate-reset-token`, { token });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        valid: false,
        error: error.response?.data?.message || '无效的重置链接'
      };
    }
  }

  /**
   * 更改密码
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || '密码更改失败'
      };
    }
  }

  /**
   * 检查邮箱是否已存在
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/check-email`, { email });
      return response.data;
    } catch (error: any) {
      return {
        exists: false,
        error: error.response?.data?.message || '检查邮箱失败'
      };
    }
  }

  /**
   * 检查用户名是否已存在
   */
  async checkUsernameExists(username: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const response = await axios.post(`${this.API_BASE_URL}/auth/check-username`, { username });
      return response.data;
    } catch (error: any) {
      return {
        exists: false,
        error: error.response?.data?.message || '检查用户名失败'
      };
    }
  }

  /**
   * 获取用户统计数据
   */
  async getUserStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/user/stats`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '获取用户统计失败');
    }
  }

  /**
   * 销毁认证服务
   */
  destroy(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }
}

// 创建单例实例
const authService = new AuthService();

export default authService;