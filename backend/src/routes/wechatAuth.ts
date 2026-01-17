import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { WechatOAuthService } from '../services/wechatOAuthService';
import { authenticate } from '../middleware/auth';
import { body, validationResult, query } from 'express-validator';

const router = express.Router();

/**
 * 生成微信OAuth授权URL
 */
router.get('/auth-url', async (req: Request, res: Response) => {
  try {
    const { redirect_uri, state } = req.query;

    const config = WechatOAuthService.getOAuthConfig();

    if (!config.isConfigured) {
      return res.status(500).json({
        success: false,
        error: '微信OAuth未配置',
        timestamp: new Date().toISOString()
      });
    }
    const authState = state as string || WechatOAuthService.generateState();
    const authUrl = WechatOAuthService.generateAuthUrl(authState);

    res.json({
      success: true,
      data: {
        authUrl,
        state: authState,
        expiresAt: new Date(Date.now() + 300000).toISOString() // 5分钟后过期
      }
    });
  } catch (error) {
    logger.error('生成微信授权URL失败:', error);
    res.status(500).json({
      success: false,
      error: '生成授权URL失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 微信OAuth回调处理
 */
router.get('/callback', [
  query('code').notEmpty().withMessage('授权码不能为空'),
  query('state').notEmpty().withMessage('状态参数不能为空')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { code, state } = req.query as { code: string; state: string };

    // 获取当前用户ID（如果已登录）
    const currentUserId = (req as any).user?.id;

    const result = await WechatOAuthService.handleWechatLogin(code, state, currentUserId);

    // 如果是当前用户的微信绑定，生成JWT token
    if (currentUserId && result.user.id === currentUserId) {
      const authService = require('../services/authService');
      const token = authService.generateToken(result.user);

      res.json({
        success: true,
        message: '微信账号绑定成功',
        data: {
          user: result.user,
          token,
          isNewUser: result.isNewUser
        }
      });
    } else {
      res.json({
        success: true,
        message: result.isNewUser ? '微信注册成功' : '微信登录成功',
        data: {
          user: result.user,
          isNewUser: result.isNewUser
        }
      });
    }
  } catch (error) {
    logger.error('微信OAuth回调处理失败:', error);
    res.status(500).json({
      success: false,
      error: '登录处理失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 绑定微信账号（需要已登录用户）
 */
router.post('/bind', authenticate, [
  body('code').notEmpty().withMessage('授权码不能为空'),
  body('state').notEmpty().withMessage('状态参数不能为空')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    const { code, state } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '请先登录后再绑定微信账号',
        timestamp: new Date().toISOString()
      });
    }
    const result = await WechatOAuthService.handleWechatLogin(code, state, req.user!.id);

    res.json({
      success: true,
      message: '微信账号绑定成功',
      data: {
        user: result.user,
        wechatInfo: {
          openid: result.user.wechatId,
          nickname: result.user.username
        }
      }
    });
  } catch (error) {
    logger.error('绑定微信账号失败:', error);
    res.status(500).json({
      success: false,
      error: '绑定微信账号失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 解绑微信账号
 */
router.post('/unbind', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '请先登录',
        timestamp: new Date().toISOString()
      });
    }
    await WechatOAuthService.unlinkWechatAccount(req.user!.id);

    res.json({
      success: true,
      message: '微信账号解绑成功'
    });
  } catch (error) {
    logger.error('解绑微信账号失败:', error);
    res.status(500).json({
      success: false,
      error: '解绑微信账号失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 获取微信绑定状态
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const bindingStatus = await WechatOAuthService.checkWechatBinding(req.user!.id);

    res.json({
      success: true,
      data: bindingStatus
    });
  } catch (error) {
    logger.error('获取微信绑定状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取绑定状态失败',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 刷新微信访问令牌
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: '刷新令牌不能为空',
        timestamp: new Date().toISOString()
      });
    }
    const newToken = await WechatOAuthService.refreshAccessToken(refreshToken);

    // 更新数据库中的token信息
    const authService = require('../services/authService');
    await authService.updateUserToken(req.user!.id, newToken.access_token);

    res.json({
      success: true,
      message: '微信访问令牌刷新成功',
      data: {
        accessToken: newToken.access_token,
        expires: newToken.expires_in
      }
    });
  } catch (error) {
    logger.error('刷新微信令牌失败:', error);
    res.status(500).json({
      success: false,
      error: '刷新令牌失败',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
