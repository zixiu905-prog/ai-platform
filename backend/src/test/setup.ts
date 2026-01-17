// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/aidesign_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// 全局测试设置
beforeAll(async () => {
  // 暂时禁用数据库和Redis连接以专注于单元测试
  // 这些连接可以在集成测试中重新启用
  
  // 模拟prisma和redis对象
  (global as any).testPrisma = null;
  (global as any).testRedis = null;
});

afterAll(async () => {
  // 暂时不做任何清理，因为没有实际的数据库连接
});

beforeEach(async () => {
  // 每个测试前不做任何清理
});