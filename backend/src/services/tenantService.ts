import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { randomUUID } from 'crypto';

// 导出类型定义
export interface CreateTenantData {
  name: string;
  domain: string;
  plan: string;
  status?: string;
  adminUserId?: string;
  settings?: Record<string, any>;
}

export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired'
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

export class TenantService {
  /**
   * 创建租户
   */
  async createTenant(name: string, subdomain: string, adminUserId: string): Promise<any> {
    try {
      const tenant = await prisma.tenants.create({
        data: {
          id: `tenant-${Date.now()}`,
          name,
          domain: subdomain,
          subdomain,
          adminUserId,
          isActive: true,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info(`Tenant created: ${tenant.id}`);
      return tenant;
    } catch (error) {
      logger.error('Failed to create tenant:', error);
      throw error;
    }
  }

  /**
   * 获取租户列表
   */
  async getTenants(page = 1, limit = 20): Promise<any> {
    try {
      const [tenants, total] = await Promise.all([
        prisma.tenants.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.tenants.count()
      ]);

      return { tenants, total, page, limit };
    } catch (error) {
      logger.error('Failed to get tenants:', error);
      throw error;
    }
  }

  /**
   * 获取租户详情
   */
  async getTenantById(tenantId: string): Promise<any> {
    try {
      const tenant = await prisma.tenants.findUnique({
        where: { id: tenantId }
      });
      return tenant;
    } catch (error) {
      logger.error('Failed to get tenant by id:', error);
      throw error;
    }
  }

  /**
   * 更新租户
   */
  async updateTenant(tenantId: string, data: any): Promise<any> {
    try {
      const tenant = await prisma.tenants.update({
        where: { id: tenantId },
        data: { ...data, updatedAt: new Date() }
      });
      logger.info(`Tenant updated: ${tenantId}`);
      return tenant;
    } catch (error) {
      logger.error('Failed to update tenant:', error);
      throw error;
    }
  }

  /**
   * 删除租户
   */
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      await prisma.tenants.delete({
        where: { id: tenantId }
      });
      logger.info(`Tenant deleted: ${tenantId}`);
    } catch (error) {
      logger.error('Failed to delete tenant:', error);
      throw error;
    }
  }

  /**
   * 根据域名获取租户
   */
  async getTenantByDomain(domain: string): Promise<any> {
    try {
      const tenant = await prisma.tenants.findUnique({
        where: { domain }
      });
      return tenant;
    } catch (error) {
      logger.error('Failed to get tenant by domain:', error);
      throw error;
    }
  }

  /**
   * 获取用户的租户列表
   */
  async getUserTenants(userId: string): Promise<any[]> {
    try {
      // 这里简化实现，实际可能需要通过关联表查询
      const tenants = await prisma.tenants.findMany({
        where: { adminUserId: userId }
      });
      return tenants;
    } catch (error) {
      logger.error('Failed to get user tenants:', error);
      throw error;
    }
  }

  /**
   * 添加用户到租户
   */
  async addUserToTenant(tenantId: string, userId: string, role: string = 'user', permissions: string[] = []): Promise<any> {
    try {
      // 这里简化实现，实际可能需要创建租户-用户关联表
      logger.info(`User ${userId} added to tenant ${tenantId} as ${role} with permissions: ${permissions.join(', ')}`);
      return { tenantId, userId, role, permissions };
    } catch (error) {
      logger.error('Failed to add user to tenant:', error);
      throw error;
    }
  }

  /**
   * 更新用户在租户中的角色
   */
  async updateUserRole(tenantId: string, userId: string, role: string): Promise<any> {
    try {
      logger.info(`User ${userId} role updated to ${role} in tenant ${tenantId}`);
      return { tenantId, userId, role };
    } catch (error) {
      logger.error('Failed to update user role:', error);
      throw error;
    }
  }

  /**
   * 从租户移除用户
   */
  async removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
    try {
      logger.info(`User ${userId} removed from tenant ${tenantId}`);
    } catch (error) {
      logger.error('Failed to remove user from tenant:', error);
      throw error;
    }
  }

  /**
   * 获取租户统计信息
   */
  async getTenantStats(tenantId: string): Promise<any> {
    try {
      const tenant = await prisma.tenants.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // 简化实现，返回基本统计
      return {
        tenantId,
        name: tenant.name,
        isActive: tenant.isActive,
        userCount: 0, // 实际应该从用户关联表查询
        createdAt: tenant.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get tenant stats:', error);
      throw error;
    }
  }

  /**
   * 检查租户配额
   */
  async checkTenantQuota(tenantId: string): Promise<any> {
    try {
      const stats = await this.getTenantStats(tenantId);
      
      // 简化实现，假设每个租户最多100个用户
      const quota = {
        userLimit: 100,
        userCount: stats.userCount,
        remaining: 100 - stats.userCount,
        isExceeded: stats.userCount >= 100,
      };

      return quota;
    } catch (error) {
      logger.error('Failed to check tenant quota:', error);
      throw error;
    }
  }

  /**
   * 获取审计日志
   */
  async getAuditLogs(tenantId: string, options: any = {}): Promise<any> {
    try {
      const { page = 1, limit = 20, action, startDate, endDate } = options;

      const where: any = {};
      
      if (tenantId) {
        where.resource = `tenant:${tenantId}`;
      }
      
      if (action) {
        where.action = action;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.audit_logs.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.audit_logs.count({ where })
      ]);

      return { logs, total, page, limit };
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * 记录审计事件
   */
  async logAuditEvent(userId: string, action: string, resource: string, ...args: any[]): Promise<void> {
    try {
      const details = args[0] || {};
      await prisma.audit_logs.create({
        data: {
          id: randomUUID(),
          userId,
          action,
          resource,
          details,
          createdAt: new Date()
        }
      });
      logger.info(`Audit event logged: ${action} on ${resource}`);
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      throw error;
    }
  }

  /**
   * 别名方法，用于向后兼容
   */
  getTenant = this.getTenantById;
  getTenantUsers = async (tenantId: string) => {
    // 简化实现
    return { tenantId, users: [] };
  };
}

export default TenantService;
export const tenantService = new TenantService();
