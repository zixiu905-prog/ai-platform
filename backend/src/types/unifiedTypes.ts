/**
 * 统一类型定义文件
 * 整合所有重复的类型定义，避免重复
 */

// ==================== 基础类型 ====================

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: string | number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 基础用户相关接口
 */
export interface BaseUser {
  id: string | number;
  email: string;
  username?: string | null;
  avatar?: string | null;
  bio?: string | null;
  company?: string | null;
  position?: string | null;
  website?: string | null;
  location?: string | null;
}

/**
 * 基础租户相关接口
 */
export interface BaseTenant {
  id: string;
  name: string;
  domain: string;
  settings: Record<string, any>;
}
/**
 * 基础审计日志接口
 */
export interface BaseAuditLog {
  id: string | number;
  userId: string | number | null;
  tenantId?: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity?: "low" | "medium" | "high" | "critical";
}
// ==================== 枚举定义 ====================

/**
 * 用户角色枚举
 */
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
  OWNER = "owner",
  MEMBER = "member",
}

/**
 * 用户状态枚举
 */
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BANNED = "banned",
  PENDING = "pending",
  SUSPENDED = "suspended",
}

/**
 * 订阅层级枚举
 */
export enum SubscriptionTier {
  FREE = "free",
  BASIC = "basic",
  PRO = "pro",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
}

/**
 * 订阅状态枚举
 */
export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  PENDING = "pending",
}

/**
 * 租户计划枚举
 */
export enum TenantPlan {
  FREE = "FREE",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
}

/**
 * 租户状态枚举
 */
export enum TenantStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING = "PENDING",
}

/**
 * 项目状态枚举
 */
export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
  DRAFT = "DRAFT",
}

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  INACTIVE = "inactive",
  ARCHIVED = "archived",
}

/**
 * 通知类型枚举
 */
export enum NotificationType {
  SYSTEM = "system",
  SECURITY = "security",
  BILLING = "billing",
  WORKFLOW = "workflow",
  AI = "ai",
  SOFTWARE = "software",
  GENERAL = "general",
}

/**
 * 通知优先级枚举
 */
export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",

  // ==================== 用户相关类型 ====================
}

/**
 * 完整用户接口
 */
export interface User extends BaseUser, BaseEntity {
  password?: string;
  role: UserRole;
  isEmailVerified: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: Date | null;
  agreeTerms: boolean;
  status: UserStatus;
  registrationSource: string;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  passwordChangedAt?: Date | null;
}

/**
 * 用户统计接口
 */
export interface UserStats extends BaseEntity {
  userId: string | number;
  loginCount: number;
  totalAiCalls: number;
  totalStorageUsed: number;
  lastActiveAt?: Date | null;
  lastLoginAt?: Date | null;
}

/**
 * API密钥接口
 */
export interface ApiKey extends BaseEntity {
  userId: string | number;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
}

/**
 * 用户权限接口
 */
export interface UserPermission {
  userId: string | number;
  tenantId?: string;
  permissions: string[];
  role?: UserRole;
  grantedAt: Date;
  expiresAt?: Date;

  // ==================== 租户相关类型 ====================
}

/**
 * 租户配置接口
 */
export interface TenantConfig extends BaseTenant {
  plan: TenantPlan;
  status: TenantStatus;
  expiresAt?: Date;
  billingInfo?: any;
  branding?: {
    logo?: string;
    theme?: string;
    primaryColor?: string;
    customCSS?: string;
  };
  security?: {
    allowedIPs?: string[];
    sessionTimeout?: number;
    require2FA?: boolean;
    passwordPolicy?: {
      minLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSymbols?: boolean;
    };
  };
  features?: {
    maxUsers?: number;
    maxProjects?: number;
    maxStorage?: number;
    allowedModels?: string[];
    customWorkflows?: boolean;
    apiAccess?: boolean;
    integrations?: string[];
    aiFeatures?: string[];
    customBranding?: boolean;
    apiRateLimit?: number;
    ssoEnabled?: boolean;
  };
  billing?: {
    plan: "free" | "professional" | "enterprise";
    overageAllowed?: boolean;
    billingCycle: "monthly" | "yearly";
    perUserPricing?: number;
  };
  compliance?: {
    dataResidency?: string;
    retentionDays?: number;
    auditLogEnabled?: boolean;
    encryptionEnabled?: boolean;
    gdprCompliant?: boolean;
  };
}
/**
 * 用户租户关联接口
 */
export interface UserTenant {
  userId: string | number;
  tenantId: string;
  role: UserRole;
  permissions: string[];
  joinedAt: Date;
  lastActiveAt: Date;
}

/**
 * 租户项目接口
 */
export interface TenantProject extends BaseEntity {
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  status: ProjectStatus;
  settings: any;
  createdBy: string | number;
}

/**
 * 租户文件接口
 */
export interface TenantFile extends BaseEntity {
  tenantId: string;
  name: string;
  originalName: string;
  path: string;
  mimeType?: string;
  size?: number;
  projectId?: string;
  uploadedBy: string | number;
  metadata?: any;
}

/**
 * 用户配额接口
 */
export interface UserQuota {
  tenantId: string;
  userId: string | number;
  quotas: {
    apiCalls: { limit: number; used: number; resetAt: Date };
    storage: { limit: number; used: number; unit: string };
    aiTokens: { limit: number; used: number; resetAt: Date };
    projects: { limit: number; used: number };
    workflows: { limit: number; used: number };
    bandwidth: { limit: number; used: number; resetAt: Date };
  };

  // ==================== 订阅相关类型 ====================
}

/**
 * 订阅计划接口
 */
export interface SubscriptionPlan {
  id: string | number;
  name: string;
  tier: SubscriptionTier;
  price: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  limits: {
    apiCalls: number;
    storage: number;
    aiTokens: number;
    projects: number;
    workflows: number;
    models: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 用户订阅接口
 */
export interface UserSubscription extends BaseEntity {
  userId: string | number;
  planId: string | number;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date | null;
  paymentMethodId?: string | number | null;
}

/**
 * 2025年订阅计划接口（向后兼容）
 */
export interface SubscriptionPlan2025 {
  id: string;
  name: string;
  tier: SubscriptionTier;
  price: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  description: string;
  features: string[];
  limits: {
    aiRequests: number;
    storage: number;
    projects: number;
    workspaces: number;
    apiCalls: number;
    supportLevel: "basic" | "priority" | "enterprise";
  };
  popular?: boolean;
  recommended?: boolean;
  trialDays?: number;
  setupFee?: number;

  // ==================== 审计日志相关类型 ====================
}

/**
 * 统一审计日志接口
 */
export interface UnifiedAuditLog extends BaseAuditLog {
  tenantId: string;

  // ==================== 通知相关类型 ====================
}

/**
 * 通知接口
 */
export interface Notification extends BaseEntity {
  userId: string | number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  priority: NotificationPriority;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  readAt?: Date | null;

  // ==================== API相关类型 ====================
}

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  errors?: Array<{
    field: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  offset?: number;
}

/**
 * 登录请求接口
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  captcha?: string;
}

/**
 * 注册请求接口
 */
export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  username?: string;
  agreeTerms: boolean;
  inviteCode?: string;
}

/**
 * 认证令牌接口
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string;

  // ==================== 文件上传相关类型 ====================
}

/**
 * 文件上传接口
 */
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  id: string | number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  uploadedBy: string | number;
  createdAt: Date;

  // ==================== AI相关类型 ====================
}

/**
 * AI模型接口
 */
export interface AiModel {
  id: string;
  name: string;
  provider: string;
  type: "text" | "multimodal" | "image" | "audio";
  description: string;
  maxTokens: number;
  supportedFormats: string[];
  pricing?: {
    inputTokenPrice: number;
    outputTokenPrice: number;
  };
  capabilities?: string[];
  isActive?: boolean;
}

/**
 * AI聊天请求接口
 */
export interface AiChatRequest {
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content:
      | string
      | Array<{
          type: "text" | "image_url";
          text?: string;
          image_url?: {
            url: string;
            detail?: "low" | "high" | "auto";
          };
        }>;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  context?: Record<string, any>;
}

/**
 * AI聊天响应接口
 */
export interface AiChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

/**
 * AI使用统计接口
 */
export interface AiUsageStats {
  userId: string | number;
  model: string;
  tokensUsed: number;
  requestsCount: number;
  cost: number;
  date: Date;
  tenantId?: string;
}

/**
 * AI订阅限制接口
 */
export interface AiSubscriptionLimits {
  tier: SubscriptionTier;
  dailyTokens: number;
  monthlyTokens: number;
  maxRequestsPerHour: number;
  supportedModels: string[];
  features: string[];

  // ==================== 第三方服务相关类型 ====================
}

/**
 * 微信用户信息接口
 */
export interface WeChatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

/**
 * SSO用户信息接口
 */
export interface SSOUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
  providerId: string;
  permissions?: string[];

  // ==================== 系统配置相关类型 ====================
}

/**
 * 系统配置接口
 */
export interface SystemConfig extends BaseEntity {
  key: string;
  value: any;
  category: string;
  description: string | null;
  isPublic: boolean;

  // ==================== 错误类型 ====================
}

/**
 * 错误响应接口
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;

  // ==================== 工作流相关类型 ====================
}

/**
 * 工作流接口
 */
export interface Workflow {
  id: string | number;
  userId: string | number;
  name: string;
  description?: string | null;
  category?: string;
  status: WorkflowStatus;
  config: WorkflowConfig;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  schedule?: WorkflowSchedule | null;
  isPublic?: boolean;
  tags?: string[];
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工作流配置接口
 */
export interface WorkflowConfig {
  timeout: number;
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandling;
  logging: boolean;
}

/**
 * 重试策略接口
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffType: "linear" | "exponential" | "fixed";
  backoffInterval: number;
  maxInterval: number;
}

/**
 * 错误处理接口
 */
export interface ErrorHandling {
  strategy: "stop" | "continue" | "retry";
  notifyOnError: boolean;
  errorEmails: string[];
}

/**
 * 工作流触发器接口
 */
export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
}

/**
 * 触发器类型枚举
 */
export enum TriggerType {
  WEBHOOK = "webhook",
  SCHEDULE = "schedule",
  EVENT = "event",
  MANUAL = "manual",
  FILE_UPLOAD = "file_upload",
  EMAIL = "email",
}

/**
 * 工作流动作接口
 */
export interface WorkflowAction {
  id: string;
  type: ActionType;
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
  order: number;
}

/**
 * 动作类型枚举
 */
export enum ActionType {
  SEND_EMAIL = "send_email",
  CALL_API = "call_api",
  EXECUTE_SCRIPT = "execute_script",
  TRANSFORM_DATA = "transform_data",
  SAVE_TO_DATABASE = "save_to_database",
  CALL_AI_MODEL = "call_ai_model",
  NOTIFY_USER = "notify_user",
  CREATE_FILE = "create_file",
  PROCESS_IMAGE = "process_image",
}

/**
 * 工作流条件接口
 */
export interface WorkflowCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than";
  value: any;
  logicalOperator?: "and" | "or";
}

/**
 * 工作流调度接口
 */
export interface WorkflowSchedule {
  type: "cron" | "interval" | "once";
  expression: string;
  timezone: string;
  nextRun: Date;
}

/**
 * 工作流执行接口
 */
export interface WorkflowExecution {
  id: string | number;
  workflowId: string | number;
  userId: string | number;
  status: ExecutionStatus;
  input?: any;
  output?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  logs?: any[];
}

/**
 * 执行状态枚举
 */
export enum ExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",

  // ==================== 实用类型 ====================
}

/**
 * 通用键值对类型
 */
export type KeyValue = Record<string, any>;

/**
 * ID类型
 */
export type ID = string | number;

/**
 * 可选字段类型
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必需字段类型
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 选择性字段类型
 */
export type SelectFields<T, K extends keyof T> = Pick<T, K>;

/**
 * 排除字段类型
 */
export type ExcludeFields<T, K extends keyof T> = Omit<T, K>;

// ==================== 软件相关类型 ====================

/**
 * 软件接口
 */
export interface Software {
  id: string | number;
  userId: string | number;
  name: string;
  category: SoftwareCategory;
  version: string;
  status: SoftwareStatus;
  config: SoftwareConfig;
  apiCredentials?: ApiCredential[] | null;
  lastConnectedAt?: Date | null;
  usageStats?: SoftwareUsageStats | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 软件分类枚举
 */
export enum SoftwareCategory {
  DESIGN = "design",
  CAD = "cad",
  VIDEO = "video",
  AUDIO = "audio",
  PRODUCTIVITY = "productivity",
  DEVELOPMENT = "development",
  OTHER = "other",
}

/**
 * 软件状态枚举
 */
export enum SoftwareStatus {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
  PENDING = "pending",
}

/**
 * 软件配置接口
 */
export interface SoftwareConfig {
  executablePath?: string;
  apiEndpoint?: string;
  apiVersion?: string;
  timeout: number;
  retryAttempts: number;
  customSettings: Record<string, any>;
}

/**
 * API凭据接口
 */
export interface ApiCredential {
  id: string | number;
  softwareId: string | number;
  type: CredentialType;
  name: string;
  value: string;
  expiresAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * 凭据类型枚举
 */
export enum CredentialType {
  API_KEY = "api_key",
  OAUTH = "oauth",
  BASIC_AUTH = "basic_auth",
  CERTIFICATE = "certificate",
}

/**
 * 软件使用统计接口
 */
export interface SoftwareUsageStats {
  totalUses: number;
  successRate: number;
  averageResponseTime: number;
  lastUsed: Date;
  errorCount: number;
  features: Record<string, number>;

  // ==================== 推荐系统相关类型 ====================
}

/**
 * 推荐类型枚举
 */
export enum RecommendationType {
  CODE_SUGGESTION = "code_suggestion",
  PROJECT_TEMPLATE = "project_template",
  WORKFLOW_RECOMMENDATION = "workflow_recommendation",
  SCRIPT_RECOMMENDATION = "script_recommendation",
  BEST_PRACTICE = "best_practice",
  RESOURCE_SUGGESTION = "resource_suggestion",
  LEARNING_PATH = "learning_path",
}

/**
 * 推荐优先级枚举
 */
export enum RecommendationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * 推荐项接口
 */
export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  content: any;
  priority: RecommendationPriority;
  relevanceScore: number;
  userId: string | number;
  context?: RecommendationContext;
  metadata?: any;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 推荐上下文接口
 */
export interface RecommendationContext {
  currentProject?: string;
  currentFile?: string;
  currentWorkflow?: string;
  userActivity?: string[];
  recentActions?: Array<{
    type: string;
    timestamp: Date;
    data: any;
  }>;
  sessionDuration?: number;
  skillLevel?: "beginner" | "intermediate" | "advanced";
  preferences?: any;
}

/**
 * 用户行为数据接口
 */
export interface UserBehavior {
  userId: string | number;
  action: string;
  target: string;
  targetType: string;
  timestamp: Date;
  duration?: number;
  metadata?: any;
}

/**
 * 软件模板接口
 */
export interface SoftwareTemplate {
  id: string | number;
  name: string;
  category: SoftwareCategory;
  description: string;
  supportedVersions: string[];
  configTemplate: SoftwareConfig;
  connectionGuide: ConnectionStep[];
  iconUrl?: string;
  documentationUrl?: string;
  isPopular?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 连接步骤接口
 */
export interface ConnectionStep {
  order: number;
  title: string;
  description: string;
  type: "instruction" | "input" | "validation";
  config: Record<string, any>;
}

/**
 * 软件命令接口
 */
export interface SoftwareCommand {
  id: string | number;
  softwareId: string | number;
  name: string;
  description: string;
  command: string;
  parameters: CommandParameter[];
  category?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 命令参数接口
 */
export interface CommandParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  defaultValue?: any;
  options?: any[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };

  // ==================== 脚本相关类型 ====================
}

/**
 * 脚本接口
 */
export interface Script {
  id: string | number;
  userId: string | number;
  name: string;
  description?: string | null;
  category: ScriptCategory;
  language: ScriptLanguage;
  code: string;
  version: string;
  status: ScriptStatus;
  visibility: ScriptVisibility;
  tags?: string[];
  config: ScriptConfig;
  metadata: ScriptMetadata;
  executionStats?: ScriptExecutionStats;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 脚本分类枚举
 */
export enum ScriptCategory {
  AUTOMATION = "automation",
  DATA_PROCESSING = "data_processing",
  AI_INTEGRATION = "ai_integration",
  FILE_MANAGEMENT = "file_management",
  API_INTEGRATION = "api_integration",
  DESIGN_WORKFLOW = "design_workflow",
  UTILITY = "utility",
  OTHER = "other",
}

/**
 * 脚本语言枚举
 */
export enum ScriptLanguage {
  JAVASCRIPT = "javascript",
  PYTHON = "python",
  SHELL = "shell",
  POWERSHELL = "powershell",
  BATCH = "batch",
  AUTOHOTKEY = "autohotkey",
  APPLESCRIPT = "applescript",
}

/**
 * 脚本状态枚举
 */
export enum ScriptStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  INACTIVE = "inactive",
  DEPRECATED = "deprecated",
  ARCHIVED = "archived",
}

/**
 * 脚本可见性枚举
 */
export enum ScriptVisibility {
  PRIVATE = "private",
  PUBLIC = "public",
  SHARED = "shared",
}

/**
 * 脚本配置接口
 */
export interface ScriptConfig {
  timeout: number;
  retryAttempts: number;
  environment: Record<string, string>;
  dependencies: string[];
  parameters: CommandParameter[];
}

/**
 * 脚本元数据接口
 */
export interface ScriptMetadata {
  author: string;
  version: string;
  description?: string;
  documentation?: string;
  examples?: Array<{
    title: string;
    description: string;
    code: string;
  }>;
  requirements: string[];
  compatibility: string[];
}

/**
 * 脚本执行统计接口
 */
export interface ScriptExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutedAt: Date;
  errorRate: number;
  popularParameters: Record<string, number>;
}

/**
 * 脚本执行器选项接口
 */
export interface ScriptExecutorOptions {
  timeout?: number;
  maxMemory?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
  allowFileAccess?: boolean;
  allowNetworkAccess?: boolean;
}

/**
 * 脚本执行上下文接口
 */
export interface ExecutionContext {
  userId: string;
  scriptId: string;
  parameters?: any;
  timeout?: number;
  maxMemory?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
  softwareContext?: any;
}

/**
 * 脚本执行结果接口
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  logs: string[];
  duration: number;
  memoryUsage?: number;
  cpuUsage?: number;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

/**
 * 脚本模板接口
 */
export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  template: string;
  parameters: CommandParameter[];
  tags?: string[];
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;

  // ==================== 适配器相关类型 ====================
}

/**
 * 软件适配器接口
 */
export interface SoftwareAdapter {
  /**
   * 连接到软件
   */
  connect(apiKey?: string, settings?: any): Promise<boolean>;

  /**
   * 执行软件命令
   */
  execute(action: string, parameters?: any): Promise<any>;

  /**
   * 发送命令到软件
   */
  sendCommand(action: string, parameters?: any): Promise<any>;

  /**
   * 获取软件状态
   */
  getStatus(): Promise<AdapterSoftwareStatus>;

  /**
   * 断开连接
   */
  disconnect(): Promise<void>;
}

/**
 * 软件状态接口（适配器用）
 */
export interface AdapterSoftwareStatus {
  isOnline: boolean;
  version: string | null;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * 文档信息接口
 */
export interface DocumentInfo {
  name: string;
  width: string;
  height: string;
  mode: string;
  channels: number;
}

/**
 * 图层信息接口
 */
export interface LayerInfo {
  name: string;
  index: number;
  visible: boolean;
  opacity: number;
  blendMode: string;
}

/**
 * 滤镜参数接口
 */
export interface FilterParams {
  radius?: number;
  amount?: number;
  threshold?: number;
  quality?: string;
}

// CAD相关类型定义
export interface CADLayerInfo extends LayerInfo {
  layerType: 'layer' | 'block' | 'xref';
}

export interface CADBlockInfo {
  name: string;
  layer: string;
  insertPoint: { x: number; y: number; z: number };
}
