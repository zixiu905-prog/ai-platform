import { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
import { prisma } from "@/config/database";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// 测试数据生成器
export class TestDataGenerator {
  static generateUser(overrides = {}) {
    return {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      role: "user",
      tenantId: "test-tenant-id",
      ...overrides,
    };
  }

  static generateTenant(overrides = {}) {
    return {
      name: "Test Tenant",
      domain: "test",
      description: "Test tenant description",
      status: "active",
      subscription: {
        plan: "basic",
        maxUsers: 10,
        maxStorage: 1024,
      },
      settings: {},
      ...overrides,
    };
  }

  static generateChatSession(overrides = {}) {
    return {
      title: "Test Chat Session",
      model: "gpt-3.5-turbo",
      userId: "test-user-id",
      tenantId: "test-tenant-id",
      ...overrides,
    };
  }

  static generateWorkflow(overrides = {}) {
    return {
      name: "Test Workflow",
      description: "Test workflow description",
      definition: {
        nodes: [],
        edges: [],
      },
      userId: "test-user-id",
      tenantId: "test-tenant-id",
      status: "active",
      ...overrides,
    };
  }

  static generateFileUpload(overrides = {}) {
    return {
      originalName: "test-file.txt",
      filename: "test-file-123.txt",
      mimetype: "text/plain",
      size: 1024,
      path: "/uploads/test-file.txt",
      userId: "test-user-id",
      tenantId: "test-tenant-id",
      ...overrides,
    };
  }
}
// 测试请求创建器
export class TestRequestBuilder {
  private req: Partial<Request>;

  constructor() {
    this.req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: undefined,
    };
  }

  withBody(body: any): TestRequestBuilder {
    this.req.body = body;
    return this;
  }

  withParams(params: any): TestRequestBuilder {
    this.req.params = params;
    return this;
  }

  withQuery(query: any): TestRequestBuilder {
    this.req.query = query;
    return this;
  }

  withHeaders(headers: any): TestRequestBuilder {
    this.req.headers = headers;
    return this;
  }

  withUser(user: any): TestRequestBuilder {
    this.req.user = user;
    return this;
  }

  build(): Request {
    return this.req as Request;
  }

  // 模拟响应对象
}
export class MockResponse {
  private statusCode: number = 200;
  private responseData: any;
  private headers: any = {};

  status(code: number): MockResponse {
    this.statusCode = code;
    return this;
  }

  json(data: any): MockResponse {
    this.responseData = data;
    return this;
  }

  send(data: any): MockResponse {
    this.responseData = data;
    return this;
  }

  setHeader(key: string, value: string): MockResponse {
    this.headers[key] = value;
    return this;
  }

  getStatusCode(): number {
    return this.statusCode;
  }

  getData(): any {
    return this.responseData;
  }

  getHeaders(): any {
    return this.headers;
  }

  // JWT工具函数
}
export class JWTUtils {
  static generateTestToken(payload: any): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1h" });
  }

  static generateTestUser(user: any = TestDataGenerator.generateUser()): any {
    return {
      ...user,
      id: "test-user-id",
      password: bcrypt.hashSync(user.password, 10),
    };
  }

  // Redis工具函数
}
export class RedisUtils {
  static async clearTestRedis(): Promise<void> {
    const redis = (global as any).testRedis;
    if (redis) {
      await redis.flushAll();
    }
  }

  static async setTestKey(key: string, value: any): Promise<void> {
    const redis = (global as any).testRedis;
    if (redis) {
      await redis.set(key, JSON.stringify(value));
    }
  }

  static async getTestKey(key: string): Promise<any> {
    const redis = (global as any).testRedis;
    if (redis) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    }
    return null;
  }

  // 数据库工具函数
}
export class DBUtils {
  static async createTestUser(
    user: any = TestDataGenerator.generateUser(),
  ): Promise<any> {
    const prisma = (global as any).testPrisma;
    if (prisma) {
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      return await prisma.users.create({
        data: {
          ...user,
          password: hashedPassword,
        },
      });
    }
    return null;
  }

  static async createTestTenant(
    tenant: any = TestDataGenerator.generateTenant(),
  ): Promise<any> {
    const prisma = (global as any).testPrisma;
    if (prisma) {
      return await prisma.tenant.create({
        data: tenant,
      });
    }
    return null;
  }

  static async cleanupTestData(): Promise<void> {
    const prisma = (global as any).testPrisma;
    if (prisma) {
      const deleteOrder = [
        "WorkflowExecution",
        "WorkflowNode",
        "ChatSession",
        "ChatMessage",
        "FileUpload",
        "User",
        "Tenant",
      ];

      for (const model of deleteOrder) {
        try {
          await (prisma as any)[model.toLowerCase()].deleteMany({});
        } catch (error) {
          logger.warn(`Failed to clean ${model}:`, error);
        }
      }
    }
  }

  // 断言辅助函数
}
export class AssertionHelpers {
  static expectSuccess(response: MockResponse, expectedData?: any): void {
    expect(response.getStatusCode()).toBe(200);
    expect(response.getData()).toHaveProperty("success", true);
    if (expectedData) {
      expect(response.getData()).toMatchObject(expectedData);
    }
  }

  static expectError(
    response: MockResponse,
    expectedStatus: number = 400,
  ): void {
    expect(response.getStatusCode()).toBe(expectedStatus);
    expect(response.getData()).toHaveProperty("success", false);
    expect(response.getData()).toHaveProperty("error");
  }

  static expectValidationError(response: MockResponse): void {
    expect(response.getStatusCode()).toBe(400);
    expect(response.getData()).toHaveProperty("success", false);
    expect(response.getData()).toHaveProperty("error");
    expect(response.getData().error).toContain("validation");
  }

  static expectUnauthorized(response: MockResponse): void {
    expect(response.getStatusCode()).toBe(401);
    expect(response.getData()).toHaveProperty("success", false);
    expect(response.getData()).toHaveProperty("error");
    expect(response.getData().error).toContain("unauthorized");
  }

  static expectForbidden(response: MockResponse): void {
    expect(response.getStatusCode()).toBe(403);
    expect(response.getData()).toHaveProperty("success", false);
    expect(response.getData()).toHaveProperty("error");
    expect(response.getData().error).toContain("forbidden");
  }

  static expectNotFound(response: MockResponse): void {
    expect(response.getStatusCode()).toBe(404);
    expect(response.getData()).toHaveProperty("success", false);
    expect(response.getData()).toHaveProperty("error");
    expect(response.getData().error).toContain("not found");
  }

  // 中间件测试辅助函数
}
export async function testMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response,
): Promise<void> {
  return new Promise((resolve) => {
    const next = () => {
      resolve();
    };
    middleware(req, res, next);
  });
}
