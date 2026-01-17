// 桌面端应用商店服务 - 调用云端API

// 类型定义（从backend共享）
export interface AppCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  level: number;
  path: string;
  sortOrder: number;
  isActive: boolean;
  children?: AppCategory[];
}

export interface DesktopApp {
  id: string;
  name: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
  version: string;
  iconUrl?: string;
  screenshots: any;
  downloadUrl: string;
  installSize: number;
  minSystemReq: any;
  maxSystemReq?: any;
  supportedOS: any;
  features: any;
  changelog?: string;
  privacyPolicy?: string;
  termsOfUse?: string;
  price: number;
  currency: string;
  isFree: boolean;
  isActive: boolean;
  isFeatured: boolean;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  reviewCount: number;
  lastVersionUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
  developer?: {
    id: string;
    name: string;
    email?: string;
    website?: string;
  };
  category?: any;
  versions?: any[];
  reviews?: any[];
  avgRating?: number;
}

export interface AppSearchFilters {
  search?: string;
  categoryId?: string;
  developerId?: string;
  isFree?: boolean;
  isFeatured?: boolean;
  minRating?: number;
  maxPrice?: number;
  tags?: string[];
  supportedOS?: string[];
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

class DesktopAppStoreService {
  private baseUrl: string;

  constructor() {
    // 从环境变量或配置中获取API基础URL
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * 获取应用分类
   */
  async getCategories(parentId?: string): Promise<AppCategory[]> {
    const response = await this.request<AppCategory[]>(`/app-store/categories${parentId ? `?parentId=${parentId}` : ''}`);
    return response.data || [];
  }

  /**
   * 搜索应用
   */
  async searchApps(filters: AppSearchFilters = {}): Promise<{ apps: DesktopApp[], total: number }> {
    const params = new URLSearchParams();
    
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.developerId) params.append('developerId', filters.developerId);
    if (typeof filters.isFree === 'boolean') params.append('isFree', filters.isFree.toString());
    if (typeof filters.isFeatured === 'boolean') params.append('isFeatured', filters.isFeatured.toString());
    if (filters.minRating) params.append('minRating', filters.minRating.toString());
    if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
    if (filters.supportedOS && filters.supportedOS.length > 0) params.append('supportedOS', filters.supportedOS.join(','));
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await this.request<{ apps: DesktopApp[], total: number }>(`/app-store/apps/search?${params}`);
    return response.data || { apps: [], total: 0 };
  }

  /**
   * 获取应用详情
   */
  async getAppById(appId: string): Promise<DesktopApp | null> {
    const response = await this.request<DesktopApp>(`/app-store/apps/${appId}`);
    return response.data || null;
  }

  /**
   * 获取热门应用
   */
  async getFeaturedApps(limit = 10): Promise<DesktopApp[]> {
    const response = await this.request<DesktopApp[]>(`/app-store/apps/featured?limit=${limit}`);
    return response.data || [];
  }

  /**
   * 获取最新发布的应用
   */
  async getLatestApps(limit = 10): Promise<DesktopApp[]> {
    const response = await this.request<DesktopApp[]>(`/app-store/apps/latest?limit=${limit}`);
    return response.data || [];
  }

  /**
   * 记录应用下载
   */
  async recordDownload(appId: string, userId?: string): Promise<void> {
    const body = {
      userId,
      // 在桌面端可以添加更多客户端信息
      userAgent: navigator.userAgent,
      platform: process.platform,
    };

    await this.request(`/app-store/apps/${appId}/download`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * 切换收藏状态
   */
  async toggleFavorite(appId: string, userId: string): Promise<boolean> {
    const response = await this.request<{ isFavorite: boolean }>(`/app-store/apps/${appId}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return response.data?.isFavorite || false;
  }

  /**
   * 获取用户收藏的应用
   */
  async getUserFavorites(userId: string, page = 1, limit = 20): Promise<{ apps: DesktopApp[], total: number }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await this.request<{ apps: DesktopApp[], total: number }>(`/app-store/users/${userId}/favorites?${params}`);
    return response.data || { apps: [], total: 0 };
  }

  /**
   * 添加应用评价
   */
  async addAppReview(appId: string, userId: string, reviewData: {
    rating: number;
    title?: string;
    content: string;
  }): Promise<any> {
    const response = await this.request(`/app-store/apps/${appId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        ...reviewData,
      }),
    });
    return response.data;
  }

  /**
   * 获取应用统计信息
   */
  async getAppStats(appId: string): Promise<any> {
    const response = await this.request(`/app-store/apps/${appId}/stats`);
    return response.data;
  }

  /**
   * 下载应用文件
   */
  async downloadAppFile(downloadUrl: string, app: DesktopApp): Promise<void> {
    try {
      // 创建下载链接
      const response = await fetch(`${this.baseUrl}/app-store/apps/download?url=${encodeURIComponent(downloadUrl)}`);
      
      if (!response.ok) {
        throw new Error('下载失败');
      }

      // 获取文件大小和内容类型
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');

      // 创建可读流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取文件流');
      }

      // 在Electron环境中使用IPC下载
      if (window.electronAPI) {
        // 通过Electron主进程下载
        // @ts-ignore
        await window.electronAPI.downloadFile({
          url: downloadUrl,
          fileName: `${app.name}-${app.version}.exe`, // 根据系统类型调整扩展名
          fileSize: contentLength ? parseInt(contentLength) : undefined,
        });
      } else {
        // 浏览器环境下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.name}-${app.version}.exe`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      // 记录下载
      await this.recordDownload(app.id);
    } catch (error) {
      console.error('下载应用失败:', error);
      throw error;
    }
  }

  /**
   * 检查应用是否已安装
   */
  async checkAppInstallation(appId: string): Promise<boolean> {
    if (window.electronAPI) {
      // @ts-ignore
      return await window.electronAPI.checkAppInstallation(appId);
    }
    return false;
  }

  /**
   * 获取已安装的应用
   */
  async getInstalledApps(): Promise<DesktopApp[]> {
    if (window.electronAPI) {
      // @ts-ignore
      return await window.electronAPI.getInstalledApps();
    }
    return [];
  }

  /**
   * 启动应用
   */
  async launchApp(appId: string): Promise<void> {
    if (window.electronAPI) {
      // @ts-ignore
      await window.electronAPI.launchApp(appId);
    } else {
      throw new Error('无法在浏览器环境中启动应用');
    }
  }

  /**
   * 卸载应用
   */
  async uninstallApp(appId: string): Promise<void> {
    if (window.electronAPI) {
      // @ts-ignore
      await window.electronAPI.uninstallApp(appId);
    } else {
      throw new Error('无法在浏览器环境中卸载应用');
    }
  }

  /**
   * 获取应用更新信息
   */
  async checkAppUpdates(appId: string, currentVersion: string): Promise<{
    hasUpdate: boolean;
    latestVersion?: string;
    updateInfo?: DesktopApp;
  }> {
    const response = await this.request<{ hasUpdate: boolean; latestVersion?: string; updateInfo?: DesktopApp }>(`/app-store/apps/${appId}/updates?currentVersion=${currentVersion}`);
    return response.data || { hasUpdate: false };
  }
}

export class AppStoreService extends DesktopAppStoreService {}

// 创建单例实例
export const desktopAppStoreService = new DesktopAppStoreService();
export const appStoreService = desktopAppStoreService;

// 注意：electronAPI类型已在preload.ts中定义，此处不再重复声明
// 如果需要扩展electronAPI接口，请修改preload.ts中的ElectronAPI接口

export default desktopAppStoreService;