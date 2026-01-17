import { createClient, RedisClientType } from 'redis';

// 简化logger导入
const logger = {
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args)
};

let redisClient: RedisClientType;

/**
 * Redis服务类
 */
export class RedisService {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
      }
    });

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.client.on('error', (err) => {
      logger.error('Redis连接错误:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis连接成功');
    });

    this.client.on('ready', () => {
      logger.info('Redis就绪');
    });

    this.client.on('end', () => {
      logger.warn('Redis连接断开');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis重新连接中...');
    });
  }

  /**
   * 连接Redis
   */
  async connect(): Promise<RedisClientType> {
    try {
      await this.client.connect();
      redisClient = this.client;
      return this.client;
    } catch (error) {
      logger.error('Redis连接失败:', error);
      throw error;
    }
  }

  /**
   * 设置键值对
   */
  async set(key: string, value: any, expireSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (expireSeconds) {
      await this.client.setEx(key, expireSeconds, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  /**
   * 获取值
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    
    try {
      return JSON.parse(value || '{}');
    } catch {
      return value as T;
    }
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return Boolean(result);
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  /**
   * 推送到列表
   */
  async lpush(key: string, ...values: any[]): Promise<number> {
    const serializedValues = values.map(v => JSON.stringify(v));
    return await this.client.lPush(key, serializedValues);
  }

  /**
   * 从列表弹出
   */
  async rpop<T>(key: string): Promise<T | null> {
    const value = await this.client.rPop(key);
    if (value === null) return null;
    
    try {
      return JSON.parse(value || '{}');
    } catch {
      return value as T;
    }
  }

  /**
   * 哈希操作 - 设置字段
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    return await this.client.hSet(key, field, JSON.stringify(value));
  }

  /**
   * 哈希操作 - 获取字段
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hGet(key, field);
    if (value === null || value === undefined) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  /**
   * 哈希操作 - 删除字段
   */
  async hdel(key: string, field: string): Promise<number> {
    return await this.client.hDel(key, field);
  }

  /**
   * 哈希操作 - 获取所有字段
   */
  async hgetall(key: string): Promise<Record<string, any>> {
    const hash = await this.client.hGetAll(key);
    const result: Record<string, any> = {};
    
    for (const [field, value] of Object.entries(hash)) {
      try {
        result[field] = JSON.parse(value as string);
      } catch {
        result[field] = value;
      }
    }
    
    return result;
  }

  /**
   * 集合操作 - 添加成员
   */
  async sadd(key: string, ...members: any[]): Promise<number> {
    const serializedMembers = members.map(m => JSON.stringify(m));
    return await this.client.sAdd(key, serializedMembers);
  }

  /**
   * 集合操作 - 获取所有成员
   */
  async smembers<T>(key: string): Promise<T[]> {
    const members = await this.client.sMembers(key);
    
    try {
      return members.map(m => JSON.parse(m as string));
    } catch {
      return members as T[];
    }
  }

  /**
   * 集合操作 - 移除成员
   */
  async srem(key: string, ...members: any[]): Promise<number> {
    const serializedMembers = members.map(m => JSON.stringify(m));
    return await this.client.sRem(key, serializedMembers);
  }

  /**
   * 集合操作 - 检查成员是否存在
   */
  async sismember(key: string, member: any): Promise<boolean> {
    const serializedMember = JSON.stringify(member);
    const result = await this.client.sIsMember(key, serializedMember);
    return Boolean(result);
  }

  /**
   * 设置用户在线状态
   */
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    await this.set(`user:${userId}:online`, { socketId, timestamp: Date.now() }, 3600);
  }

  /**
   * 设置用户离线状态
   */
  async setUserOffline(userId: string): Promise<void> {
    await this.del(`user:${userId}:online`);
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.ping();
      logger.info('Redis连接测试成功');
      return true;
    } catch (error) {
      logger.error('Redis连接失败:', error);
      return false;
    }
  }

  /**
   * 获取客户端实例
   */
  getClient(): RedisClientType {
    return this.client;
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}

/**
 * 连接Redis
 */
export const connectRedis = async (): Promise<RedisClientType> => {
  try {
    const service = new RedisService();
    return await service.connect();
  } catch (error) {
    logger.error('Redis连接失败:', error);
    throw error;
  }
}

// 创建默认实例
export const redisService = new RedisService();

export default redisService;