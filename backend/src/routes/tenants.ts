import { Router } from 'express';
import TenantController from '../controllers/tenantController';
import tenantMiddleware from '../middleware/tenantMiddleware';
import { authenticate } from '../middleware/auth';

const router = Router();
const tenantController = new TenantController();

// Public routes (需要认证但不需要租户上下文)
router.use(authenticate);

// 创建租户 (需要super admin权限)
router.post('/',
  tenantController.createTenant
);

// 获取用户的所有租户
router.get('/my-tenants',
  tenantController.getUserTenants
);

// 根据域名获取租户信息 (公开接口，用于租户识别)
router.get('/domain/:domain',
  tenantController.getTenantByDomain
);

// 租户管理路由 (需要租户上下文)
// 这些路由会自动应用租户识别和用户验证中间件
router.use('/',
  tenantMiddleware.tenantIdentification,
  tenantMiddleware.userTenantValidation
);

// 获取当前租户信息
router.get('/current',
  tenantController.getTenant
);

// 更新租户信息 (需要admin权限)
router.put('/',
  tenantMiddleware.requirePermission(['tenant.update']),
  tenantController.updateTenant
);

// 获取租户用户列表 (需要viewer权限)
router.get('/users',
  tenantMiddleware.requirePermission(['users.view']),
  tenantController.getTenantUsers
);

// 添加用户到租户 (需要admin权限)
router.post('/users',
  tenantMiddleware.requirePermission(['users.manage']),
  tenantController.addUserToTenant
);

// 更新用户角色 (需要admin权限)
router.put('/users/:userId/role',
  tenantMiddleware.requirePermission(['users.manage']),
  tenantController.updateUserRole
);

// 从租户移除用户 (需要admin权限)
router.delete('/users/:userId',
  tenantMiddleware.requirePermission(['users.manage']),
  tenantController.removeUserFromTenant
);

// 获取租户统计信息 (需要viewer权限)
router.get('/stats',
  tenantMiddleware.requirePermission(['stats.view']),
  tenantController.getTenantStats
);

// 检查租户配额 (需要viewer权限)
router.get('/quota',
  tenantMiddleware.requirePermission(['quota.view']),
  tenantController.checkTenantQuota
);

// 获取审计日志 (需要admin权限)
router.get('/audit-logs',
  tenantMiddleware.requirePermission(['audit.view']),
  tenantController.getAuditLogs
);

// Super admin routes
// 删除租户 (需要super admin权限)
router.delete('/:tenantId',
  (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Only super admin can delete tenants'
      });
    }
    next();
  },
  tenantController.deleteTenant
);

// 获取特定租户信息 (需要super admin权限)
router.get('/:tenantId',
  (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Only super admin can access any tenant'
      });
    }
    next();
  },
  tenantController.getTenant
);

export default router;