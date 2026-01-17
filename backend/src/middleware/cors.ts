import cors from 'cors';
import { logger } from '../utils/logger';

// 允许的源列表
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  'https://localhost:3001',
  'https://ai.yourdomain.com',
  'https://www.ai.yourdomain.com',
  'https://app.ai.yourdomain.com'
];

// 开发环境允许的源
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// 动态CORS检查
const dynamicCorsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // 允许没有origin的请求（移动应用、Postman等）
    if (!origin) {
      return callback(null, true);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction ? ALLOWED_ORIGINS : [...ALLOWED_ORIGINS, ...DEV_ORIGINS];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS阻止了跨域请求', {
        origin,
        timestamp: new Date().toISOString(),
        userAgent: 'Unknown'
      });

      callback(new Error('CORS策略不允许此来源'));
    }
  },
  credentials: true,

  // 暴露的响应头
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],

  // 最大缓存时间（秒）
  maxAge: 86400, // 24小时

  // 预检请求的缓存时间
  preflightContinue: false,

  // 预检请求状态码
  optionsSuccessStatus: 204
};

// 静态CORS配置（用于静态资源）
const staticCorsOptions = {
  origin: ALLOWED_ORIGINS,
  credentials: false,
  optionsSuccessStatus: 204
};

// 自定义CORS中间件
export const corsMiddleware = cors(dynamicCorsOptions);

// API特定的CORS中间件
export const apiCorsMiddleware = (req: any, res: any, next: any) => {
  const origin = req.headers.origin;

  // 设置响应头
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-RateLimit-Remaining, X-RateLimit-Reset');

  // 检查来源
  if (origin) {
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction ? ALLOWED_ORIGINS : [...ALLOWED_ORIGINS, ...DEV_ORIGINS];

    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      logger.warn('API CORS阻止了跨域请求', {
        origin,
        method: req.method,
        url: req.url,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        error: 'CORS策略不允许此来源'
      });
    }
  }

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Max-Age', '86400'); // 24小时
    return res.status(204).end();
  }

  next();
};

// 静态资源CORS中间件
export const staticCorsMiddleware = cors(staticCorsOptions);

// 管理员API严格CORS
export const adminCorsMiddleware = (req: any, res: any, next: any) => {
  const origin = req.headers.origin;

  // 管理员接口只允许来自特定域名的请求
  const adminOrigins = [
    'https://admin.ai.yourdomain.com',
    'https://ai.yourdomain.com'
  ];

  if (origin && !adminOrigins.includes(origin)) {
    logger.warn('管理员API CORS阻止了跨域请求', {
      origin,
      method: req.method,
      url: req.url,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: '管理员接口不允许此来源'
    });
  }

  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};
