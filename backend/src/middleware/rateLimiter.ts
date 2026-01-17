import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// 基础速率限制配置
const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string,
  skipSuccessfulRequests = false
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req: Request, res: Response) => {
      logger.warn('速率限制触发', {
        ip: req.ip,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// 通用API速率限制
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15分钟
  100, // 100个请求
  '请求过于频繁，请稍后再试'
);

// 严格的认证路由限制
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15分钟
  5, // 5次尝试
  '登录尝试过于频繁，请15分钟后再试'
);

// AI接口速率限制
export const aiLimiter = createRateLimiter(
  60 * 1000, // 1分钟
  50, // 50次请求
  'AI接口调用过于频繁，请稍后再试'
);

// 文件上传速率限制
export const uploadLimiter = createRateLimiter(
  60 * 1000, // 1分钟
  10, // 10次上传
  '文件上传过于频繁，请稍后再试'
);

// 管理员接口严格限制
export const adminLimiter = createRateLimiter(
  60 * 1000, // 1分钟
  30, // 30次请求
  '管理员接口调用过于频繁'
);

// IP级别严格限制（用于防止DDoS）
export const ipStrictLimiter = createRateLimiter(
  60 * 1000, // 1分钟
  1000, // 1000次请求
  '您的请求过于频繁，已被临时限制'
);

// 基于用户ID的限制器
export const createUserLimiter = () => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: Function) => {
    if (!req.user?.id) {
      return next();
    }
    
    const userId = req.user.id;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1分钟窗口
    const maxRequests = 100; // 每分钟最多100个请求
    
    let userRequests = requests.get(userId);
    
    if (!userRequests || now > userRequests.resetTime) {
      userRequests = {
        count: 1,
        resetTime: now + windowMs
      };
      requests.set(userId, userRequests);
      return next();
    }
    
    userRequests.count++;
    
    if (userRequests.count > maxRequests) {
      logger.warn('用户速率限制触发', {
        userId,
        count: userRequests.count,
        url: req.url
      });
      
      return res.status(429).json({
        success: false,
        error: '用户请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }
    
    next();
  };
};

// 清理过期的限制记录
setInterval(() => {
  const now = Date.now();
  // 这里可以添加清理逻辑，防止内存泄漏
}, 5 * 60 * 1000); // 每5分钟清理一次