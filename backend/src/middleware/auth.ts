import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import authService from '../services/authService';

// 错误处理辅助函数
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "未知错误";
};

// 扩展Request接口
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

// 认证中间件
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '缺少认证令牌' ,
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);

    // 检查令牌格式
    if (!token || token.length < 10 || !token.includes('.')) {
      return res.status(401).json({
        success: false,
        error: '无效的令牌格式' ,
        timestamp: new Date().toISOString()
      });
    }

    const payload = authService.verifyAccessToken(token) as any;

    if (!payload || !payload.userId) {
      return res.status(401).json({
        success: false,
        error: '无效的认证令牌',
        timestamp: new Date().toISOString()
      });
    }

    // 检查用户是否仍然活跃
    const user = await prisma.users.findUnique({
      where: { id: payload.userId as string },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: '用户账户已被禁用' ,
        timestamp: new Date().toISOString()
      });
    }

    // 设置用户信息到请求对象
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.role === 'ADMIN' ? ['*'] : []
    };

    next();
  } catch (error) {
    logger.error('认证错误:', error);
    
    // 更详细的错误处理
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
        success: false,
        error: '令牌已过期' ,
        timestamp: new Date().toISOString()
      });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
        success: false,
        error: '无效的令牌格式' ,
        timestamp: new Date().toISOString()
      });
      }
    }
    
    return res.status(401).json({
        success: false,
        error: '认证失败' ,
        timestamp: new Date().toISOString()
      });
  }
};

// 权限检查中间件
export const authorize = (requiredPermissions: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '用户未认证' ,
        timestamp: new Date().toISOString()
      });
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userPermissions = req.user.permissions;

    // 管理员拥有所有权限
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // 检查是否有所需权限
    const hasPermission = permissions.some(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        error: '权限不足',
        required: permissions,
        userPermissions
      });
    }

    next();
  };
};

// 角色检查中间件
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '用户未认证' ,
        timestamp: new Date().toISOString()
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: '角色权限不足',
        required: allowedRoles,
        currentRole: req.user.role
      });
    }

    next();
  };
};

// API限流中间件
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) => {
  const { windowMs, maxRequests, message = '请求过于频繁，请稍后再试' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // 清理过期记录
    for (const [storeKey, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(storeKey);
      }
    }

    // 获取当前计数
    const current = rateLimitStore.get(key);
    
    if (!current) {
      // 首次请求
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (now > current.resetTime) {
      // 重置计数
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (current.count >= maxRequests) {
      // 超出限制
      const resetIn = Math.ceil((current.resetTime - now) / 1000);
      return res.status(429).json({
        error: message,
        retryAfter: resetIn
      });
    }

    // 增加计数
    current.count++;
    next();
  };
};

// 登录验证中间件（针对敏感操作）
export const requireFreshAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
        success: false,
        error: '需要重新认证' ,
        timestamp: new Date().toISOString()
      });
  }

  // 检查是否为刷新令牌
  try {
    const payload = JSON.parse(atob(authHeader.split('.')[1]));
    
    if (payload.type === 'refresh') {
      return res.status(401).json({
        success: false,
        error: '请使用访问令牌进行此操作' ,
        timestamp: new Date().toISOString()
      });
    }

    // 检查令牌是否在最近10分钟内签发
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - payload.iat;
    
    if (tokenAge > 600) { // 10分钟
      return res.status(401).json({
        success: false,
        error: '令牌过期，请重新登录' ,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return res.status(401).json({
        success: false,
        error: '令牌格式错误' ,
        timestamp: new Date().toISOString()
      });
  }

  next();
};

// 设备信任检查中间件（暂禁用 - 表不存在）
// export const checkDeviceTrust = async (req: Request, res: Response, next: NextFunction) => {
//   ... (待实现)
// };

// 多因素认证检查（暂禁用 - 字段不存在）
// export const require2FA = async (req: Request, res: Response, next: NextFunction) => {
//   ... (待实现)
// };

// 会话管理中间件（暂禁用 - 需要session ID）
// export const sessionManager = async (req: Request, res: Response, next: NextFunction) => {
//   ... (待实现)
// };

// 安全头中间件
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 设置安全头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.protocol === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // 隠除服务器信息
  res.removeHeader('X-Powered-By');

  next();
};

// CORS中间件
export const cors = (allowedOrigins: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin || '')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Device-ID, X-2FA-Token');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
    }

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  };
};

// 订阅级别检查中间件
export const requireSubscription = (requiredLevel: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '用户未认证' ,
        timestamp: new Date().toISOString()
      });
    }

    try {
      // 获取用户订阅信息
      const user = await prisma.users.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(401).json({
        success: false,
        error: '用户不存在' ,
        timestamp: new Date().toISOString()
      });
      }

      // 获取当前订阅
      const subscriptions = await prisma.subscriptions.findMany({
        where: { userId: user.id, isActive: true },
      });

      const subscription = subscriptions[0];

      // 检查订阅状态
      if (!subscription) {
        return res.status(402).json({
          error: '需要订阅才能使用此功能',
          requiredLevel,
          currentLevel: null
        });
      }

      if (!subscription.isActive) {
        return res.status(402).json({
          error: '订阅已过期，请续费',
          requiredLevel,
          currentLevel: subscription.planType
        });
      }

      if (subscription.endDate && subscription.endDate < new Date()) {
        return res.status(402).json({
          error: '订阅已过期，请续费',
          requiredLevel,
          currentLevel: subscription.planType
        });
      }

      // 定义订阅级别权限
      const subscriptionLevels = {
        'FREE': 0,
        'BASIC_MONTHLY': 1,
        'BASIC_YEARLY': 1,
        'PRO_MONTHLY': 2,
        'PRO_YEARLY': 2,
        'ENTERPRISE_MONTHLY': 3,
        'ENTERPRISE_YEARLY': 3
      };

      const userLevel = subscriptionLevels[subscription.planType as keyof typeof subscriptionLevels] || 0;
      const requiredLevelValue = subscriptionLevels[requiredLevel as keyof typeof subscriptionLevels] || 0;

      // 管理员拥有所有权限
      if (req.user.role === 'ADMIN') {
        return next();
      }

      // 检查订阅级别
      if (userLevel < requiredLevelValue) {
        return res.status(402).json({
          error: `需要${requiredLevel}及以上订阅才能使用此功能`,
          requiredLevel,
          currentLevel: subscription.planType,
          availablePlans: Object.keys(subscriptionLevels).filter(level =>
            subscriptionLevels[level as keyof typeof subscriptionLevels] >= requiredLevelValue,
          )
        });
      }

      // 更新最后使用时间（移除 lastUsedAt，因为表中可能没有该字段）
      await prisma.subscriptions.update({
        where: { id: subscription.id },
        data: { updatedAt: new Date() }
      });

      // 将订阅信息添加到请求对象中
      (req as any).subscription = subscription;
      
      next();
    } catch (error) {
      logger.error('订阅检查错误:', error);
      return res.status(500).json({
        error: '订阅检查失败',
        message: getErrorMessage(error)
      });
    }
  };
}
