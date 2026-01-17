import { api } from './api';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  settings: {
    maxUsers: number;
    maxProjects: number;
    storageQuota: number;
    aiFeatures: string[];
    customBranding: boolean;
    apiRateLimit: number;
    ssoEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  billingInfo?: any;
}

export interface UserTenant {
  userId: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'user' | 'viewer';
  permissions: string[];
  joinedAt: string;
  lastActiveAt: string;
}

export interface TenantRole {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
}

export interface CreateTenantData {
  name: string;
  domain: string;
  plan: 'basic' | 'professional' | 'enterprise';
  settings?: {
    maxUsers?: number;
    maxProjects?: number;
    storageQuota?: number;
    aiFeatures?: string[];
    customBranding?: boolean;
    apiRateLimit?: number;
    ssoEnabled?: boolean;
  };
  status?: 'active' | 'suspended' | 'trial';
  expiresAt?: string;
  billingInfo?: any;
}

export interface TenantStats {
  users: {
    total: number;
    active: number;
  };
  projects: {
    total: number;
    active: number;
  };
  storage: {
    used: number;
    quota: number;
  };
  ai: any;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface QuotaCheck {
  withinLimit: boolean;
  currentUsage: any;
  limits: any;
}

class TenantService {
  /**
   * 创建租户
   */
  async createTenant(tenantData: CreateTenantData): Promise<Tenant> {
    const response = await api.post('/tenants', tenantData);
    return response.data.data;
  }

  /**
   * 获取租户信息
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const response = await api.get(`/tenants/${tenantId}`);
      return response.data!.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 根据域名获取租户信息
   */
  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    try {
      const response = await api.get(`/tenants/domain/${domain}`);
      return response.data!.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 更新租户信息
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const response = await api.put(`/tenants/${tenantId}`, updates);
    return response.data.data;
  }

  /**
   * 删除租户
   */
  async deleteTenant(tenantId: string): Promise<void> {
    await api.delete(`/tenants/${tenantId}`);
  }

  /**
   * 获取用户的所有租户
   */
  async getUserTenants(): Promise<UserTenant[]> {
    const response = await api.get('/tenants/my-tenants');
    return response.data.data;
  }

  /**
   * 获取租户的所有用户
   */
  async getTenantUsers(): Promise<UserTenant[]> {
    const response = await api.get('/tenants/users');
    return response.data.data;
  }

  /**
   * 添加用户到租户
   */
  async addUserToTenant(userId: string, role: UserTenant['role'], permissions: string[] = []): Promise<UserTenant> {
    const response = await api.post('/tenants/users', {
      userId,
      role,
      permissions
    });
    return response.data.data;
  }

  /**
   * 更新用户角色
   */
  async updateUserRole(userId: string, role: UserTenant['role'], permissions?: string[]): Promise<UserTenant> {
    const response = await api.put(`/tenants/users/${userId}/role`, {
      role,
      permissions
    });
    return response.data.data;
  }

  /**
   * 从租户移除用户
   */
  async removeUserFromTenant(userId: string): Promise<void> {
    await api.delete(`/tenants/users/${userId}`);
  }

  /**
   * 获取租户统计信息
   */
  async getTenantStats(): Promise<TenantStats> {
    const response = await api.get('/tenants/stats');
    return response.data.data;
  }

  /**
   * 检查租户配额
   */
  async checkTenantQuota(): Promise<QuotaCheck> {
    const response = await api.get('/tenants/quota');
    return response.data.data;
  }

  /**
   * 获取审计日志
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: AuditLog[]; pagination: any }> {
    const response = await api.get('/tenants/audit-logs', { params: filters });
    return {
      logs: response.data.data,
      pagination: response.data.pagination
    };
  }

  /**
   * 获取当前租户信息
   */
  async getCurrentTenant(): Promise<Tenant> {
    const response = await api.get('/tenants/current');
    return response.data.data;
  }

  /**
   * 获取租户角色列表
   */
  async getTenantRoles(): Promise<TenantRole[]> {
    const response = await api.get('/tenants/roles');
    return response.data.data;
  }

  /**
   * 创建租户角色
   */
  async createTenantRole(roleData: Omit<TenantRole, 'id' | 'tenantId' | 'isSystemRole'>): Promise<TenantRole> {
    const response = await api.post('/tenants/roles', roleData);
    return response.data.data;
  }

  /**
   * 更新当前租户设置
   */
  async updateCurrentTenantSettings(settings: Partial<Tenant['settings']>): Promise<Tenant> {
    const response = await api.put('/tenants', { settings });
    return response.data.data;
  }

  /**
   * 格式化存储大小
   */
  formatStorageSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 计算存储使用百分比
   */
  calculateStorageUsagePercentage(used: number, quota: number): number {
    if (quota === 0) return 0;
    return Math.min((used / quota) * 100, 100);
  }

  /**
   * 获取计划信息
   */
  getPlanInfo(plan: Tenant['plan']) {
    const plans = {
      basic: {
        name: '基础版',
        price: '免费',
        features: [
          '最多10个用户',
          '最多50个项目',
          '1GB存储空间',
          '基础AI功能'
        ],
        color: 'blue'
      },
      professional: {
        name: '专业版',
        price: '¥99/月',
        features: [
          '最多100个用户',
          '最多1000个项目',
          '10GB存储空间',
          '完整AI功能',
          '自定义品牌',
          'API访问'
        ],
        color: 'purple'
      },
      enterprise: {
        name: '企业版',
        price: '¥499/月',
        features: [
          '无限用户',
          '无限项目',
          '100GB存储空间',
          '所有AI功能',
          '自定义品牌',
          '高级API访问',
          '单点登录(SSO)',
          '优先技术支持'
        ],
        color: 'gold'
      }
    };

    return plans[plan];
  }

  /**
   * 获取状态信息
   */
  getStatusInfo(status: Tenant['status']) {
    const statuses = {
      active: {
        name: '活跃',
        color: 'green',
        description: '租户正常运行'
      },
      suspended: {
        name: '暂停',
        color: 'red',
        description: '租户已被暂停'
      },
      trial: {
        name: '试用',
        color: 'yellow',
        description: '租户处于试用期'
      }
    };

    return statuses[status];
  }

  /**
   * 获取角色信息
   */
  getRoleInfo(role: UserTenant['role']) {
    const roles = {
      owner: {
        name: '所有者',
        color: 'red',
        description: '拥有所有权限'
      },
      admin: {
        name: '管理员',
        color: 'orange',
        description: '拥有管理权限'
      },
      user: {
        name: '用户',
        color: 'blue',
        description: '基础用户权限'
      },
      viewer: {
        name: '查看者',
        color: 'gray',
        description: '只读权限'
      }
    };

    return roles[role];
  }
}

export const tenantService = new TenantService();
export default tenantService;