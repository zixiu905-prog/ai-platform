import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { connectRedis } from './utils/redis';
import { initSocketIO } from './utils/socket';

// 临时直接定义错误处理函数
const errorHandler = (error: Error, req: any, res: any, next: any) => {
  logger.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    timestamp: new Date().toISOString()
  });
};

const notFoundHandler = (req: any, res: any, next: any) => {
  res.status(404).json({
    success: false,
    message: '路由不存在',
    timestamp: new Date().toISOString()
  });
};

// 加载环境变量
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
    }
  }
}));

// CORS配置
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 登录接口特殊限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次登录尝试
  skipSuccessfulRequests: true,
});

app.use('/api/auth/login', loginLimiter);

// 解析中间件
app.use(express.json({
  limit: '100mb',
  verify: (req: any, res: any, buf: any) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '100mb'
}));

// 请求日志中间件
app.use((req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    });
  });

  next();
});

// 健康检查
app.get('/health', (req: any, res: any) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API路由
app.use('/api/auth', require('./routes/auth').default);
app.use('/api/oauth', require('./routes/oauth').default);
app.use('/api/wechat', require('./routes/wechatAuth').default);
// app.use('/api/tenants', require('./routes/tenants').default); // 暂时禁用多租户功能
app.use('/api/com-repair', require('./routes/comRepair').default);
app.use('/api/document', require('./routes/document').default);
app.use('/api/script-category', require('./routes/scriptCategory').default);
app.use('/api/ai', require('./routes/ai').default);
app.use('/api/chat', require('./routes/chat').default);
app.use('/api/workflows', require('./routes/workflow').default);
app.use('/api/n8n-workflows', require('./routes/n8nWorkflows').default);
app.use('/api/monitoring', require('./routes/workflowMonitoring').default);
app.use('/api/softwares', require('./routes/software').default);
app.use('/api/photoshop', require('./routes/photoshopAutomation').default);
app.use('/api/autocad', require('./routes/autocadAutomation').default);
app.use('/api/scripts', require('./routes/script').default);
app.use('/api/recommendations', require('./routes/recommendations').default);
app.use('/api/dashboard', require('./routes/dashboard').default);
app.use('/api/projects', require('./routes/project').default);
app.use('/api/settings', require('./routes/settings').default);
app.use('/api/upload', require('./routes/upload').default);
app.use('/api/voice', require('./routes/voice').default);
app.use('/api/payment', require('./routes/payment').default);
app.use('/api/subscription', require('./routes/subscription').default);
// app.use('/api/admin', require('./routes/admin').default); // 暂时禁用以调试
app.use('/api/software-api', require('./routes/softwareApiManagement').default);
app.use('/api/documentation', require('./routes/documentation').default);
app.use('/api/multi-model', require('./routes/multiModelCollaboration').default);
app.use('/api/validation', require('./routes/apiValidation').default);
app.use('/api/payment-reminders', require('./routes/paymentReminders').default);
app.use('/api/payment-reminder-scheduler', require('./routes/paymentReminderScheduler').default);
app.use('/api/app-store', require('./routes/appStore').default);
app.use('/api/speech', require('./routes/speech').default);
// app.use('/api/admin/workflows', require('./routes/adminWorkflows').default); // Temporarily disabled due to compilation errors
app.use('/api/softwares', require('./routes/softwareDownload').default);
app.use('/api/desktop', require('./routes/desktop').default);
app.use('/api/whisper', require('./routes/whisperAdvanced').default);
// app.use('/api/advanced-ai', require('./routes/advancedAI').default); // Temporarily disabled due to compilation errors
app.use('/api/enterprise', require('./routes/enterprise').default);
app.use('/api/zhipu-ai-test', require('./routes/zhipuAITest').default);
app.use('/api/doubao-ai-test', require('./routes/doubaoAITest').default);
app.use('/api/task-management', require('./routes/taskManagement').default);
app.use('/api/software-management', require('./routes/softwareManagement').default);
app.use('/api/script-management', require('./routes/scriptManagement').default);
// app.use('/api/test', require('./routes/test').default); // Test route not found - temporarily disabled

// 文件上传静态服务
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    // 安全头设置
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 初始化Socket.IO
initSocketIO(io);

// 启动服务器
async function startServer() {
  try {
    // 连接Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // 启动HTTP服务器
    server.listen(Number(PORT), '0.0.0.0', async () => {
      logger.info(`🚀 AiDesign Backend Server running on port ${PORT}`);
      logger.info(`📡 WebSocket server ready`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);

      // 启动定时任务服务
      try {
        const { default: SchedulerService } = await import('./services/schedulerService');
        const scheduler = new SchedulerService();
        scheduler.start();
        logger.info('✅ Scheduler service started successfully');
      } catch (error) {
        logger.error('❌ Scheduler service failed to start:', error);
      }

      // 启动付费提醒定时任务
      try {
        const { paymentReminderScheduler } = await import('./services/paymentReminderScheduler');
        paymentReminderScheduler.start();
        logger.info('✅ Payment reminder scheduler started successfully');
      } catch (error) {
        logger.error('❌ Payment reminder scheduler failed to start:', error);
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭处理
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    // 这里可以添加其他清理逻辑
    // 比如关闭数据库连接等

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // 强制退出超时
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

// 监听关闭信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise, reason });
  process.exit(1);
});

// 启动服务器
startServer();

export default app;
