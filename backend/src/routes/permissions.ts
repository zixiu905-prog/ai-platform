import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { PermissionService } from '../services/permissionService';
import { authenticate, authorize } from '../middleware/auth';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();
const permissionService = new PermissionService();

// 简单验证中间件函数
const validateSchema = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 获取所有角色
router.get('/roles',
  authenticate,
  authorize('role:read'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString()
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      let result = await permissionService.getRoles();

      // 应用搜索和分页
      if (search) {
        result = result.filter((role: any) =>
          role.name?.toLowerCase().includes(search.toLowerCase()) ||
          role.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      const startIndex = (page - 1) * limit;
      const paginatedResult = result.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        data: paginatedResult,
        pagination: {
          page,
          limit,
          total: result.length
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 创建角色
router.post('/roles',
  authenticate,
  authorize('role:create'),
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('角色名称长度必须在2-50个字符之间'),
    body('description')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('角色描述长度必须在5-200个字符之间'),
    body('permissions')
      .isArray()
      .withMessage('权限列表必须为数组'),
    body('permissions.*')
      .isString()
      .withMessage('权限标识符必须为字符串'),
    body('isSystem')
      .optional()
      .isBoolean()
      .withMessage('系统角色标识必须为布尔值')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const roleData = req.body;
      const result = await permissionService.createRole(roleData);

      res.status(201).json({
        success: true,
        data: result,
        message: '角色创建成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 获取角色详情
router.get('/roles/:id',
  authenticate,
  authorize('role:read'),
  [
    param('id').isUUID().withMessage('无效的角色ID')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const role = await permissionService.getRoleById(id);

      res.json({
        success: true,
        data: role
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 更新角色
router.put('/roles/:id',
  authenticate,
  authorize('role:update'),
  [
    param('id').isUUID().withMessage('无效的角色ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 }),
    body('permissions')
      .optional()
      .isArray(),
    body('permissions.*')
      .optional()
      .isString()
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await permissionService.updateRole(id, updateData);

      res.json({
        success: true,
        data: result,
        message: '角色更新成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 删除角色
router.delete('/roles/:id',
  authenticate,
  authorize('role:delete'),
  [
    param('id').isUUID().withMessage('无效的角色ID')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await permissionService.deleteRole(id);

      res.json({
        success: true,
        message: '角色删除成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 获取所有权限
router.get('/permissions',
  authenticate,
  authorize('permission:read'),
  [
    query('module').optional().isString(),
    query('category').optional().isIn(['basic', 'advanced', 'admin'])
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const module = req.query.module as string;
      const category = req.query.category as any;

      const allPermissions = await permissionService.getAllPermissions();
      let permissions = allPermissions;

      // 过滤权限
      if (module) {
        permissions = permissions.filter(p => p.module === module);
      }
      if (category) {
        permissions = permissions.filter(p => p.category === category);
      }

      res.json({
        success: true,
        data: permissions
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 检查用户权限
router.post('/check',
  authenticate,
  [
    body('permission')
      .isString()
      .withMessage('权限标识符必须为字符串'),
    body('resourceId')
      .optional()
      .isUUID()
      .withMessage('资源ID必须为有效的UUID')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { permission, resourceId } = req.body;

      const hasPermission = await permissionService.checkPermission(
        userId || '',
        permission
      );

      res.json({
        success: true,
        data: {
          hasPermission,
          permission,
          resourceId
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 为用户分配角色
router.post('/users/:userId/roles',
  authenticate,
  authorize('user:role:assign'),
  [
    param('userId').isUUID().withMessage('无效的用户ID'),
    body('roleIds')
      .isArray()
      .withMessage('角色ID列表必须为数组'),
    body('roleIds.*')
      .isUUID()
      .withMessage('角色ID必须为有效的UUID')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { roleIds } = req.body;

      await permissionService.assignRolesToUser(userId, roleIds);

      res.json({
        success: true,
        message: '角色分配成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 移除用户角色
router.delete('/users/:userId/roles/:roleId',
  authenticate,
  authorize('user:role:remove'),
  [
    param('userId').isUUID().withMessage('无效的用户ID'),
    param('roleId').isUUID().withMessage('无效的角色ID')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const { userId, roleId } = req.params;

      await permissionService.removeRoleFromUser(userId, roleId);

      res.json({
        success: true,
        message: '角色移除成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 获取用户权限
router.get('/users/:userId/permissions',
  authenticate,
  [
    param('userId').isUUID().withMessage('无效的用户ID')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const permissions = await permissionService.getUserPermissions(userId);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 创建自定义权限策略
router.post('/policies',
  authenticate,
  authorize('policy:create'),
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('策略名称长度必须在2-100个字符之间'),
    body('description')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('策略描述长度必须在5-500个字符之间'),
    body('effect')
      .isIn(['allow', 'deny'])
      .withMessage('策略效果必须为allow或deny'),
    body('actions')
      .isArray()
      .withMessage('操作列表必须为数组'),
    body('resources')
      .isArray()
      .withMessage('资源列表必须为数组'),
    body('conditions')
      .optional()
      .isObject()
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const policyData = req.body;
      const result = await permissionService.createPolicy(policyData);

      res.status(201).json({
        success: true,
        data: result,
        message: '权限策略创建成功'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 获取权限策略列表
router.get('/policies',
  authenticate,
  authorize('policy:read'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('effect').optional().isIn(['allow', 'deny'])
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const effect = req.query.effect as string;

      const result = await permissionService.getPolicies(effect || '');

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 权限审计日志
router.get('/audit/logs',
  authenticate,
  authorize('audit:read'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userId').optional().isUUID(),
    query('action').optional().isString(),
    query('resource').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        userId: req.query.userId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };

      const result = await permissionService.getPermissionAuditLogs(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 批量权限检查
router.post('/batch-check',
  authenticate,
  [
    body('checks')
      .isArray()
      .withMessage('权限检查列表必须为数组'),
    body('checks.*.permission')
      .isString()
      .withMessage('权限标识符必须为字符串'),
    body('checks.*.resourceId')
      .optional()
      .isUUID()
      .withMessage('资源ID必须为有效的UUID')
  ],
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || '';
      const { checks } = req.body;

      const results = await permissionService.batchCheckPermissions(userId, checks);

      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// 获取权限统计信息
router.get('/stats',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response) => {
    try {
      const stats = await permissionService.getPermissionStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

export default router;
