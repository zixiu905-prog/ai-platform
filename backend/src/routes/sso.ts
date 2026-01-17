import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { SSOService } from '../services/ssoService';
import { authenticate, authorize } from '../middleware/auth';
import { body, param, query } from 'express-validator';

const router = Router();
const ssoService = new SSOService();

// SSO登录页面
router.get('/login',
  [
    query('provider').isIn(['google', 'microsoft', 'github', 'oidc']).withMessage('不支持的SSO提供商'),
    query('redirect_uri').optional().isURL().withMessage('无效的重定向URI'),
    query('state').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const { provider, redirect_uri, state } = req.query;

      const authUrl = await ssoService.getAuthorizationUrl(
        provider as any,
        redirect_uri as string || 'http://localhost:3000/callback'
      );

      res.json({
        success: true,
        data: {
          authUrl,
          state
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

// SSO回调处理
router.get('/callback/:provider',
  [
    param('provider').isIn(['google', 'microsoft', 'github', 'oidc']).withMessage('不支持的SSO提供商'),
    query('code').isString().withMessage('缺少授权码'),
    query('state').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      const result = await ssoService.handleCallback(
        provider as any,
        code as string
      );

      res.json({
        success: true,
        data: result
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

// SSO用户信息获取
router.get('/userinfo',
  authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      // 暂时忽略provider字段，使用默认值
      const provider = 'google';

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '用户未认证',
          timestamp: new Date().toISOString()
        });
      }
      const userInfo = await ssoService.getUserInfo(userId);

      res.json({
        success: true,
        data: userInfo
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

// 断开SSO连接
router.post('/disconnect',
  authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      // 暂时忽略provider字段，使用默认值
      const provider = 'google';

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '用户未认证',
          timestamp: new Date().toISOString()
        });
      }
      await ssoService.disconnectSSO(userId, provider);

      res.json({
        success: true,
        message: 'SSO连接已断开'
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

// 获取SSO提供商配置
router.get('/providers',
  authenticate,
  authorize('admin'), async (req: Request, res: Response) => {
    try {
      const providers = await ssoService.getSSOProviders();

      res.json({
        success: true,
        data: providers
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

// 配置SSO提供商
router.post('/providers/:provider/config',
  authenticate,
  authorize('admin'),
  [
    param('provider').isIn(['google', 'microsoft', 'github', 'oidc']).withMessage('不支持的SSO提供商'),
    body('clientId').isString().withMessage('客户端ID不能为空'),
    body('clientSecret').isString().withMessage('客户端密钥不能为空'),
    body('enabled').isBoolean().withMessage('启用状态必须为布尔值'),
    body('additionalConfig').optional().isObject()
  ],
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const config = req.body;
      const userId = req.user?.id || 'admin';

      await ssoService.configureProvider(userId, provider as any, config);

      res.json({
        success: true,
        message: `${provider} SSO提供商配置成功`
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

// 启用/禁用SSO提供商
router.put('/providers/:provider/toggle',
  authenticate,
  authorize('admin'),
  [
    param('provider').isIn(['google', 'microsoft', 'github', 'oidc']).withMessage('不支持的SSO提供商'),
    body('enabled').isBoolean().withMessage('启用状态必须为布尔值')
  ],
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { enabled } = req.body;

      await ssoService.toggleProvider(provider as any, enabled);

      res.json({
        success: true,
        message: `${provider} SSO提供商已${enabled ? '启用' : '禁用'}`
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

// SAML2元数据获取
router.get('/saml/metadata/:tenantId',
  [
    param('tenantId').isUUID().withMessage('无效的租户ID')
  ],
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const metadata = await ssoService.getSAMLMetadata();

      res.json({
        success: true,
        data: {
          tenantId,
          metadata
        }
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

// SAML2断言消费
router.post('/saml/acs/:tenantId',
  [
    param('tenantId').isUUID().withMessage('无效的租户ID')
  ],
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const samlResponse = req.body.SAMLResponse;

      const result = await ssoService.consumeSAMLAssertion(samlResponse);

      res.json({
        success: true,
        data: result
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

// 获取SSO会话信息
router.get('/session',
  authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '用户未认证',
          timestamp: new Date().toISOString()
        });
      }
      const provider = 'google';
      const session = await ssoService.getSSOSession(userId, provider);

      res.json({
        success: true,
        data: session
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

// SSO登出
router.post('/logout',
  authenticate,
  [
    body('redirect_uri').optional().isURL().withMessage('无效的重定向URI')
  ],
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const provider = 'google';

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '用户未认证',
          timestamp: new Date().toISOString()
        });
      }

      const result = await ssoService.ssoLogout(userId, provider);

      res.json({
        success: true,
        data: result
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

// 单点登出所有会话
router.post('/logout/all',
  authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '用户未认证',
          timestamp: new Date().toISOString()
        });
      }

      await ssoService.ssoLogoutAll(userId);

      res.json({
        success: true,
        message: '所有会话已退出'
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

// 获取SSO统计信息
router.get('/stats',
  authenticate,
  authorize('admin'), async (req: Request, res: Response) => {
    try {
      const stats = await ssoService.getSSOStats();

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
