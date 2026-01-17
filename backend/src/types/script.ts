// 从统一类型导入，保持向后兼容
import {
  Script,
  ScriptCategory,
  ScriptLanguage,
  ScriptStatus,
  ScriptVisibility,
} from "./unifiedTypes";

// 再导出以保持向后兼容
export {
  Script,
  ScriptCategory,
  ScriptLanguage,
  ScriptStatus,
  ScriptVisibility,
};

// 本地定义的接口（避免循环引用）
export interface ScriptConfig {
  timeout: number;
  retryPolicy: RetryPolicy;
  environment: Record<string, any>;
  dependencies: string[];
  requiredPermissions: string[];
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: "linear" | "exponential" | "fixed";
  backoffInterval: number;
  maxInterval: number;
}

export interface JSONSchema {
  type: string;
  properties: Record<string, any>;
  required: string[];
  additionalProperties: boolean;
}

export interface ScriptMetadata {
  author: string;
  license: string | null;
  repositoryUrl: string | null;
  documentationUrl: string | null;
  changelog: string | null;
  requirements: string[];
  compatibility: string[];
  lastTestedVersion: string | null;
}

export interface ScriptExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutedAt: Date | null;
  errorRate: number;
}

export interface ScriptExecution {
  id: number;
  scriptId: number;
  userId: number;
  status: ExecutionStatus;
  input: Record<string, any>;
  output: Record<string, any> | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  logs: ExecutionLog[];
  metrics: ExecutionMetrics;
  environment: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  TIMEOUT = "timeout",
}

export interface ExecutionLog {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  metadata: Record<string, any>;
}

export interface ExecutionMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIO: number;
  networkIO: number;
  apiCalls: number;
  tokensUsed: number;
}

export interface ScriptTemplate {
  id: number;
  name: string;
  description: string;
  category: ScriptCategory;
  language: ScriptLanguage;
  code: string;
  config: Omit<any, "environment">;
  metadata: Omit<any, "author">;
  tags: string[];
  usageCount: number;
  rating: number;
  isOfficial: boolean;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptVersion {
  id: number;
  scriptId: number;
  version: string;
  code: string;
  config: any;
  changelog: string;
  isCurrent: boolean;
  createdAt: Date;
}

export interface ScriptSchedule {
  id: number;
  scriptId: number;
  userId: number;
  name: string;
  scheduleType: ScheduleType;
  cronExpression: string | null;
  interval: number | null;
  timezone: string;
  nextRunAt: Date;
  lastRunAt: Date | null;
  isActive: boolean;
  input: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ScheduleType {
  CRON = "cron",
  INTERVAL = "interval",
  ONCE = "once",
}

export interface ScriptComment {
  id: number;
  scriptId: number;
  userId: number;
  content: string;
  parentId: number | null;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptRating {
  id: number;
  scriptId: number;
  userId: number;
  rating: number;
  review: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptBookmark {
  id: number;
  userId: number;
  scriptId: number;
  folder: string | null;
  createdAt: Date;
}

export interface ScriptFolder {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  parentId: number | null;
  color: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptShare {
  id: number;
  scriptId: number;
  ownerId: number;
  sharedWithUserId: number | null;
  shareType: ShareType;
  permissions: string[];
  expiresAt: Date | null;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum ShareType {
  USER = "user",
  TEAM = "team",
  PUBLIC = "public",
  TOKEN = "token",
}
