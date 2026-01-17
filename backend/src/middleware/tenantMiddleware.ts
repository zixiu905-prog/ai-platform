import { Request, Response, NextFunction } from 'express';
import { unifiedTenantService } from '../services/unifiedTenantService';
import { logger } from '../utils/logger';

// 导出 AuthenticatedRequest 类型
export interface AuthenticatedRequest extends Request {
  user?: any;
  tenant?: any;
  userTenant?: any;
}

/**
 * 租户中间件
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = extractTenantId(req);
    
    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: '租户ID缺失',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const tenant = await unifiedTenantService.getTenantById(tenantId);
    
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: '租户不存在',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({
        success: false,
        error: '租户已被禁用',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 将租户信息添加到请求对象
    (req as any).tenant = tenant;
    
    next();
  } catch (error) {
    logger.error('租户中间件错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 提取租户ID
 */
function extractTenantId(req: Request): string | null {
  // 从Header中获取
  const tenantHeader = req.headers['x-tenant-id'];
  if (tenantHeader) {
    return typeof tenantHeader === 'string' ? tenantHeader : tenantHeader.toString();
  }

  // 从子域名获取
  const host = req.headers.host;
  if (host) {
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
  }

  // 从路径参数获取
  const tenantId = (req.params as any)?.tenantId;
  if (tenantId) {
    return tenantId;
  }

  return null;
}

/**
 * 租户配额检查中间件
 */
export const quotaCheckMiddleware = (resource: string, limit?: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = (req as any).tenant;
      
      if (!tenant) {
        res.status(401).json({
          success: false,
          error: '租户信息缺失',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: '用户信息缺失',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const quota = await unifiedTenantService.checkAndUpdateQuota(
        tenant.id,
        userId,
        resource,
        limit || 0
      );

      if (!quota.allowed) {
        res.status(429).json({
          success: false,
          error: '配额已超出限制',
          resource,
          limit: quota.limit,
          used: quota.used,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 将配额信息添加到请求对象
      (req as any).quota = quota;
      
      next();
    } catch (error) {
      logger.error('配额检查中间件错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * 租户隔离中间件
 */
export const tenantIsolationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const tenant = (req as any).tenant;
    
    if (!tenant) {
      res.status(401).json({
        success: false,
        error: '租户信息缺失',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 设置租户隔离配置
    const isolation = getTenantIsolation(tenant.id);
    
    // 将隔离配置添加到请求对象
    (req as any).isolation = isolation;
    
    next();
  } catch (error) {
    logger.error('租户隔离中间件错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 获取租户隔离配置
 */
function getTenantIsolation(tenantId: string): any {
  // 返回租户特定的隔离配置
  return {
    database: 'partial', // 'strict' | 'shared' | 'partial'
    fileStorage: 'strict',
    api: 'partial',
    logging: 'isolated',
    cache: 'tenant_specific',
    quota: {
      enabled: true,
      enforcement: 'soft', // 'soft' | 'hard'
      reset_cycle: 'monthly'
    }
  };
};

/**
 * 租户统计中间件
 */
export const tenantStats = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = (req as any).tenant;
      
      if (!tenant) {
        res.status(401).json({
          success: false,
          error: '租户信息缺失',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const stats = await unifiedTenantService.getTenantStats(tenant.id);
      
      // 将统计信息添加到请求对象
      (req as any).tenantStats = stats;
      
      next();
    } catch (error) {
      logger.error('租户统计中间件错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * 租户日志中间件
 */
export const tenantLogging = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send.bind(res);
    
    (res as any).send = function(data: any) {
      // 记录租户操作日志
      const tenant = (req as any).tenant;
      const user = (req as any).user;
      
      if (tenant && user) {
        unifiedTenantService.logAudit(
          tenant.id,
          user.id,
          action,
          req.path,
          {
            method: req.method,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            statusCode: res.statusCode,
            responseSize: JSON.stringify(data).length
          }
        ).catch((error: Error) => {
          logger.error('审计日志记录失败:', error);
        });
      }
      
      // 调用原始send方法
      originalSend.call(res, data);
    };
    
    next();
  };
};

/**
 * JWT令牌验证辅助函数
 */
function verifyJWTToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // 检查令牌是否过期
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
};

/**
 * 租户识别中间件别名
 */
export const tenantIdentification = tenantMiddleware;

/**
 * 用户租户验证中间件别名
 */
export const userTenantValidation = tenantMiddleware;

/**
 * 权限检查中间件
 */
export const requirePermission = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = (req as any).tenant;

      if (!tenant) {
        res.status(401).json({
          success: false,
          error: '租户信息缺失',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // TODO: 实现权限检查
      next();
    } catch (error) {
      logger.error('权限检查中间件错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
        timestamp: new Date().toISOString()
      });
    }
  };
};

export default {
  tenantMiddleware,
  tenantIdentification,
  userTenantValidation,
  quotaCheckMiddleware,
  tenantIsolationMiddleware,
  tenantStats,
  tenantLogging,
  requirePermission
};