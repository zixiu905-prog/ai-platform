import { Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { permissionService } from '../services/permissionService';
import { AuthenticatedRequest } from './tenantMiddleware';

export interface PermissionRequirement {
  resource: string;
  action: string;
  conditions?: any;
  requireAll?: boolean; // 是否需要所有权限都满足
}

export interface PermissionOptions {
  allowOwner?: boolean; // 是否允许租户所有者绕过权限检查
  allowAdmin?: boolean; // 是否允许管理员绕过权限检查
  customCheck?: (req: AuthenticatedRequest) => Promise<boolean>; // 自定义权限检查
  errorMessage?: string; // 自定义错误消息
}

/**
 * 权限检查中间件生成器
 */
export function requirePermission(
  requirement: PermissionRequirement | PermissionRequirement[],
  options: PermissionOptions = {}
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 确保用户已认证
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate to access this resource'
        });
        return;
      }

      // 确保租户上下文存在
      if (!req.tenant) {
        res.status(400).json({
          success: false,
          error: 'Tenant context required',
          message: 'This endpoint requires tenant context'
        });
        return;
      }

      // 确保用户租户关联存在
      if (!req.userTenant) {
        res.status(403).json({
          success: false,
          error: 'User is not a member of this tenant',
          message: 'You do not have access to this tenant'
        });
        return;
      }

      // 允许租户所有者或管理员绕过权限检查
      if ((options.allowOwner && req.userTenant.role === 'owner') ||
          (options.allowAdmin && req.user.role === 'admin')) {
        return next();
      }

      // 自定义权限检查
      if (options.customCheck) {
        const hasCustomPermission = await options.customCheck(req);
        if (!hasCustomPermission) {
          res.status(403).json({
            success: false,
            error: 'Permission denied',
            message: options.errorMessage || 'You do not have permission to perform this action'
          });
          return;
        }
      }

      // 标准权限检查
      const requirements = Array.isArray(requirement) ? requirement : [requirement];
      const requireAll = options.requireAll !== false; // 默认需要所有权限都满足

      let hasPermission = false;

      if (requireAll) {
        // 需要所有权限都满足
        const allChecks = await Promise.all(
          requirements.map(req => checkSinglePermission(req, requirement))
        );
        hasPermission = allChecks.every(result => result === true);
      } else {
        // 只需要至少一个权限满足
        const anyCheck = await Promise.race(
          requirements.map(async req => {
            const result = await checkSinglePermission(req, requirement);
            return result ? req : null;
          })
        );
        hasPermission = anyCheck !== null;
      }

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: options.errorMessage || 'You do not have permission to access this resource'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
        message: 'An error occurred while checking permissions'
      });
    }
  };
}

/**
 * 检查单个权限
 */
async function checkSinglePermission(
  req: AuthenticatedRequest,
  requirement: PermissionRequirement
): Promise<boolean> {
  try {
    const hasPermission = await permissionService.checkPermission(
      req.user!.id,
      req.tenant!.id,
      requirement.resource,
      requirement.action,
      requirement.conditions
    );

    return hasPermission;
  } catch (error) {
    logger.error('Single permission check failed:', error);
    return false;
  }
}

/**
 * 创建角色检查中间件
 */
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userTenant) {
      res.status(403).json({
        success: false,
        error: 'Tenant membership required',
        message: 'You must be a member of this tenant'
      });
      return;
    }

    if (!roles.includes(req.userTenant.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient role',
        message: `This action requires one of the following roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
}

/**
 * 创建所有者检查中间件
 */
export function requireOwner() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.userTenant) {
      res.status(403).json({
        success: false,
        error: 'Tenant membership required',
        message: 'You must be a member of this tenant'
      });
      return;
    }

    if (req.userTenant.role !== 'owner') {
      res.status(403).json({
        success: false,
        error: 'Owner role required',
        message: 'This action can only be performed by the tenant owner'
      });
      return;
    }

    next();
  };
}
