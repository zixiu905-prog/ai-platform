import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { TenantService, CreateTenantData, TenantStatus, UserRole } from '../services/tenantService';
import type { AuthenticatedRequest } from '../middleware/tenantMiddleware';
export class TenantController {
  private tenantService: TenantService;

  constructor() {
    this.tenantService = new TenantService();
  }

  /**
   * 创建新租户
   */
  createTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantData: CreateTenantData = req.body;

      // 验证必填字段
      if (!tenantData.name || !tenantData.domain || !tenantData.plan) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Name, domain, and plan are required'
        });
        return;
      }

      // 验证域名格式
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(tenantData.domain)) {
        res.status(400).json({
          success: false,
          error: 'Invalid domain format',
          message: 'Domain must be a valid hostname'
        });
        return;
      }

      // 设置默认设置
      const defaultSettings = {
        maxUsers: 10,
        maxProjects: 50,
        storageQuota: 1073741824, // 1GB
        aiFeatures: ['text'],
        customBranding: false,
        apiRateLimit: 1000,
        ssoEnabled: false,
        ...tenantData.settings
      };

      tenantData.settings = defaultSettings;
      tenantData.status = tenantData.status || TenantStatus.TRIAL;

      const tenant = await this.tenantService.createTenant(
        tenantData.name,
        tenantData.domain,
        tenantData.adminUserId || req.user?.id || ''
      );

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant created successfully'
      });
    } catch (error) {
      logger.error('❌ Create tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create tenant',
        message: error.message
      });
    }
  };

  /**
   * 获取租户信息
   */
  getTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing tenant ID',
          message: 'Tenant ID is required'
        });
        return;
      }

      const tenant = await this.tenantService.getTenant(tenantId);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found',
          message: `Tenant with ID ${tenantId} does not exist`
        });
        return;
      }

      res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      logger.error('❌ Get tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant',
        message: error.message
      });
    }
  };

  /**
   * 根据域名获取租户信息
   */
  getTenantByDomain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { domain } = req.params;

      if (!domain) {
        res.status(400).json({
          success: false,
          error: 'Missing domain',
          message: 'Domain is required'
        });
        return;
      }

      const tenant = await this.tenantService.getTenantByDomain(domain);

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found',
          message: `Tenant with domain ${domain} does not exist`
        });
        return;
      }

      res.json({
        success: true,
        data: tenant
      });
    } catch (error) {
      logger.error('❌ Get tenant by domain error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant by domain',
        message: error.message
      });
    }
  };

  /**
   * 更新租户信息
   */
  updateTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const updates = req.body;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing tenant ID',
          message: 'Tenant ID is required'
        });
        return;
      }

      // 验证权限
      if (!req.userTenant || (req.userTenant.role !== 'owner' && req.userTenant.role !== 'admin')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Only owner or admin can update tenant information'
        });
        return;
      }

      const updatedTenant = await this.tenantService.updateTenant(tenantId, updates);

      if (!updatedTenant) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found',
          message: `Tenant with ID ${tenantId} does not exist`
        });
        return;
      }

      // 记录审计日志
      await this.tenantService.logAuditEvent(
        tenantId,
        req.user!.id,
        'TENANT_UPDATED',
        'tenant',
        tenantId,
        updates
      );

      res.json({
        success: true,
        data: updatedTenant,
        message: 'Tenant updated successfully'
      });
    } catch (error) {
      logger.error('❌ Update tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tenant',
        message: error.message
      });
    }
  };

  /**
   * 删除租户
   */
  deleteTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing tenant ID',
          message: 'Tenant ID is required'
        });
        return;
      }

      // 只有super admin才能删除租户
      if (!req.user || req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Only super admin can delete tenants'
        });
        return;
      }

      await this.tenantService.deleteTenant(tenantId);

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });
    } catch (error) {
      logger.error('❌ Delete tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete tenant',
        message: error.message
      });
    }
  };

  /**
   * 获取用户的所有租户
   */
  getUserTenants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate to access this resource'
        });
        return;
      }

      const userTenants = await this.tenantService.getUserTenants(req.user.id);

      res.json({
        success: true,
        data: userTenants
      });
    } catch (error) {
      logger.error('❌ Get user tenants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user tenants',
        message: error.message
      });
    }
  };

  /**
   * 获取租户的所有用户
   */
  getTenantUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      const users = await this.tenantService.getTenantUsers(req.tenant.id);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      logger.error('❌ Get tenant users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant users',
        message: error.message
      });
    }
  };

  /**
   * 添加用户到租户
   */
  addUserToTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      const { userId, role = UserRole.USER, permissions = [] } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'Missing user ID',
          message: 'User ID is required'
        });
        return;
      }

      // 验证权限
      if (!req.userTenant || (req.userTenant.role !== 'owner' && req.userTenant.role !== 'admin')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Only owner or admin can add users to tenant'
        });
        return;
      }

      const userTenant = await this.tenantService.addUserToTenant(
        req.tenant.id,
        userId,
        role,
        permissions
      );

      // 记录审计日志
      await this.tenantService.logAuditEvent(
        req.user!.id,
        'USER_ADDED_TO_TENANT',
        'user',
        { userId, role, permissions }
      );

      res.status(201).json({
        success: true,
        data: userTenant,
        message: 'User added to tenant successfully'
      });
    } catch (error) {
      logger.error('❌ Add user to tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add user to tenant',
        message: error.message
      });
    }
  };

  /**
   * 更新用户角色
   */
  updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      const { userId } = req.params;
      const { role, permissions } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'Missing user ID',
          message: 'User ID is required'
        });
        return;
      }

      // 验证权限
      if (!req.userTenant || (req.userTenant.role !== 'owner' && req.userTenant.role !== 'admin')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Only owner or admin can update user roles'
        });
        return;
      }

      const updatedUserTenant = await this.tenantService.updateUserRole(
        req.tenant.id,
        userId,
        role
      );

      if (!updatedUserTenant) {
        res.status(404).json({
          success: false,
          error: 'User not found in tenant',
          message: `User ${userId} is not a member of this tenant`
        });
        return;
      }

      // 记录审计日志
      await this.tenantService.logAuditEvent(
        req.user!.id,
        'UPDATE_ROLE',
        'TENANT_USER',
        { role, permissions }
      );

      res.json({
        success: true,
        data: updatedUserTenant,
        message: 'User role updated successfully'
      });
    } catch (error) {
      logger.error('❌ Update user role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
        message: error.message
      });
    }
  };

  /**
   * 从租户移除用户
   */
  removeUserFromTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'Missing user ID',
          message: 'User ID is required'
        });
        return;
      }

      // 验证权限
      if (!req.userTenant || (req.userTenant.role !== 'owner' && req.userTenant.role !== 'admin')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Only owner or admin can remove users from tenant'
        });
        return;
      }

      // 不能移除租户所有者

      await this.tenantService.removeUserFromTenant(userId, req.tenant.id);

      res.json({
        success: true,
        message: 'User removed from tenant successfully'
      });




      // 记录审计日志
      await this.tenantService.logAuditEvent(
        req.tenant.id,
        req.user!.id,
        'USER_REMOVED_FROM_TENANT',
        'user',
        userId
      );

      res.json({
        success: true,
        message: 'User removed from tenant successfully'
      });
    } catch (error) {
      logger.error('❌ Remove user from tenant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove user from tenant',
        message: error.message
      });
    }
  };

  /**
   * 获取租户统计信息
   */
  getTenantStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      const stats = await this.tenantService.getTenantStats(req.tenant.id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('❌ Get tenant stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant stats',
        message: error.message
      });
    }
  };

  /**
   * 检查租户配额
   */
  checkTenantQuota = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      const quotaCheck = await this.tenantService.checkTenantQuota(req.tenant.id);

      res.json({
        success: true,
        data: quotaCheck
      });
    } catch (error) {
      logger.error('❌ Check tenant quota error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check tenant quota',
        message: error.message
      });
    }
  };

  /**
   * 获取审计日志
   */
  getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      const filters = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        resourceType: req.query.resourceType as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const logs = await this.tenantService.getAuditLogs(req.tenant.id, filters);

      res.json({
        success: true,
        data: logs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: logs.length
        }
      });
    } catch (error) {
      logger.error('❌ Get audit logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit logs',
        message: error.message
      });
    }
  };
}

export default TenantController;