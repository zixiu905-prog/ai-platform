import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      startMemory?: NodeJS.MemoryUsage;
    }
  }
}

// 性能监控中间件
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  // 记录请求开始
  req.startTime = startTime;
  req.startMemory = startMemory;

  // 监听响应完成
  res.on('finish', () => {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const responseTime = endTime - startTime;
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };

    // 记录性能指标
    logger.info('Performance metrics', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Math.round(responseTime * 100) / 100, // 保留2位小数
      memoryDelta,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // 设置性能响应头
    res.set({
      'X-Response-Time': `${Math.round(responseTime)}ms`,
      'X-Memory-Delta-RSS': `${memoryDelta.rss}`,
      'X-Memory-Delta-Heap': `${memoryDelta.heapUsed}`
    });
  });

  next();
};

// 响应缓存中间件
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const cacheMiddleware = (options: {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
} = {}) => {
  const { ttl = 60000, keyGenerator, skip } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // 跳过检查
    if (skip && skip(req)) {
      return next();
    }

    const key = keyGenerator ? keyGenerator(req) : `${req.method}:${req.path}`;

    // 检查缓存
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    res.set('X-Cache', 'MISS');

    // 拦截响应
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
      return originalJson(data);
    };

    next();
  };
}

// 清理过期缓存
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > value.ttl) {
      cache.delete(key);
    }
  }
}

// 定期清理缓存
setInterval(cleanCache, 60000); // 每分钟清理一次

// 请求限制中间件（基于内存的简单实现）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const memoryRateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    let counter = requestCounts.get(key);

    if (!counter || now > counter.resetTime) {
      counter = {
        count: 1,
        resetTime: now + windowMs
      };
      requestCounts.set(key, counter);
      return next();
    }

    counter.count++;

    if (counter.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: key,
        count: counter.count,
        maxRequests,
        windowMs
      });

      return res.status(429).json({
        success: false,
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((counter.resetTime - now) / 1000)
      });
    }

    next();
  };
};

// 响应压缩中间件
export const compressionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (acceptEncoding.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
  } else if (acceptEncoding.includes('deflate')) {
    res.setHeader('Content-Encoding', 'deflate');
  }

  next();
};

// 数据库连接池优化
export const dbOptimization = {
  // 连接池配置
  poolConfig: {
    min: 2,
    max: 10,
    acquire: 30000,
    idle: 10000,
    evict: 1000
  },

  // 查询优化
  optimizeQuery: (query: string) => {
    // 简单的查询优化提示
    const optimizations = [
      {
        pattern: /SELECT \*/g,
        suggestion: '避免使用SELECT *，明确指定需要的字段'
      },
      {
        pattern: /ORDER BY RAND\(\)/g,
        suggestion: '避免使用ORDER BY RAND()，使用更高效的随机方法'
      },
      {
        pattern: /LIKE '%.*%'/g,
        suggestion: '避免前缀通配符，考虑全文搜索'
      },
    ];

    const warnings = [];
    for (const optimization of optimizations) {
      if (optimization.pattern.test(query)) {
        warnings.push(optimization.suggestion);
      }
    }

    return warnings;
  }
};

// 内存使用监控
export const memoryMonitor = () => {
  const memoryUsage = process.memoryUsage();
  const memoryInfo = {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)}MB`
  };

  logger.info('Memory usage:', memoryInfo);

  // 如果内存使用过高，发出警告
  const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (heapUsedPercent > 90) {
    logger.warn('High memory usage:', {
      heapUsedPercent: `${heapUsedPercent.toFixed(2)}%`,
      ...memoryInfo
    });
  }

  return memoryInfo;
};

// 定期内存监控
setInterval(memoryMonitor, 300000); // 每5分钟检查一次

// CPU使用监控
export const cpuMonitor = {
  samples: [] as number[],
  lastSampleTime: Date.now(),
  lastCpuUsage: process.cpuUsage(),

  startMonitoring() {
    this.samples = [];
    this.lastSampleTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
  },

  getCurrentUsage(): number {
    const currentTime = Date.now();
    const currentCpuUsage = process.cpuUsage();

    const timeDelta = currentTime - this.lastSampleTime;
    const cpuDelta = currentCpuUsage;

    const cpuPercent = ((cpuDelta.user + cpuDelta.system) / 1000000) / timeDelta * 100;

    this.lastSampleTime = currentTime;
    this.lastCpuUsage = currentCpuUsage;

    this.samples.push(cpuPercent);

    // 保持最近100个样本
    if (this.samples.length > 100) {
      this.samples.shift();
    }

    return Math.round(cpuPercent * 100) / 100;
  },

  getAverageUsage(): number {
    if (this.samples.length === 0) return 0;

    const sum = this.samples.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.samples.length) * 100) / 100;
  },

  getMaxUsage(): number {
    if (this.samples.length === 0) return 0;
    return Math.max(...this.samples);
  }
};

// 性能报告生成
export const generatePerformanceReport = () => {
  const memory = memoryMonitor();
  const cpu = cpuMonitor.getCurrentUsage();
  const cpuAvg = cpuMonitor.getAverageUsage();
  const cpuMax = cpuMonitor.getMaxUsage();
  const memoryUsage = process.memoryUsage();

  return {
    timestamp: new Date().toISOString(),
    memory: memory,
    cpu: {
      current: cpu,
      average: cpuAvg,
      max: cpuMax
    },
    uptime: `${Math.round(process.uptime() / 60)}min`,
    recommendations: generateRecommendations(cpuAvg, memoryUsage.heapUsed)
  };
};

function generateRecommendations(cpuAvg: number, memoryUsed: number): string[] {
  const recommendations = [];

  if (cpuAvg > 80) {
    recommendations.push('CPU使用率过高，建议优化代码或增加服务器资源');
  }

  if (memoryUsed > 1000000000) { // 超过1GB
    recommendations.push('内存使用较高，建议检查内存泄漏或增加内存');
  }

  if (recommendations.length === 0) {
    recommendations.push('系统运行正常');
  }

  return recommendations;
}
