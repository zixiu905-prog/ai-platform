import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

// 创建Prisma客户端实例
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://aidesign_user:vI0UoRhgEmPj_1VDObdaFhk6ZCV_4qLy4Pa_qJmWw88@localhost:5432/aidesign'
    }
  },
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    }
  ],
});

/**
 * 数据库连接测试
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('数据库连接测试成功');
    return true;
  } catch (error) {
    logger.error('数据库连接测试失败:', error);
    return false;
  }
};

/**
 * 数据库健康检查
 */
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * 初始化数据库
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    // 连接数据库
    await prisma.$connect();
    
    // 运行迁移（生产环境需要手动运行）
    if (process.env.NODE_ENV === 'development') {
      logger.info('开发环境 - 检查是否需要数据库迁移');
    }
    
    // 创建默认系统配置
    await createDefaultSystemConfigs();
    
    logger.info('数据库初始化完成');
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  }
};

/**
 * 创建默认系统配置
 */
const createDefaultSystemConfigs = async (): Promise<void> => {
  const defaultConfigs = [
    {
      key: 'system_name',
      value: 'AiDesign',
      category: 'general'
    },
    {
      key: 'system_version',
      value: '1.0.0',
      category: 'general'
    },
    {
      key: 'max_file_upload_size',
      value: 100 * 1024 * 1024, // 100MB
      category: 'upload'
    },
    {
      key: 'supported_image_formats',
      value: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
      category: 'upload'
    },
    {
      key: 'supported_document_formats',
      value: ['pdf', 'doc', 'docx', 'txt', 'md'],
      category: 'upload'
    },
    {
      key: 'default_ai_model',
      value: 'glm-4',
      category: 'ai'
    },
    {
      key: 'token_cost_per_1k',
      value: 0.01,
      category: 'billing'
    },
    {
      key: 'free_trial_days',
      value: 7,
      category: 'subscription'
    },
    {
      key: 'system_maintenance',
      value: false,
      category: 'system'
    },
    {
      key: 'registration_enabled',
      value: true,
      category: 'system'
    },
    {
      key: 'email_verification_required',
      value: true,
      category: 'security'
    }
  ];

  for (const config of defaultConfigs) {
    try {
      await prisma.system_configs.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: {
          id: crypto.randomUUID(),
          key: config.key,
          value: config.value,
          category: config.category,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.warn(`创建系统配置失败: ${config.key}`, error);
    }
  }

  logger.info('默认系统配置创建完成');
};

/**
 * 优雅关闭数据库连接
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接时出错:', error);
  }
};

// 优雅退出处理
process.on('beforeExit', async () => {
  await closeDatabaseConnection();
});

process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，正在关闭数据库连接...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，正在关闭数据库连接...');
  await closeDatabaseConnection();
  process.exit(0);
});

export default prisma;