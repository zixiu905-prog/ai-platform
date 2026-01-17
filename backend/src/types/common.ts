// 从统一类型导出，保持向后兼容
export {
  ApiResponse,
  PaginationParams,
  FileUpload,
  SystemConfig,
  Notification,
  NotificationType,
  NotificationPriority,
} from "./unifiedTypes";

// 使用统一类型中的SubscriptionStatus枚举，避免重复定义
export { SubscriptionStatus } from "./unifiedTypes";

export interface Invoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  items: InvoiceItem[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum InvoiceStatus {
  DRAFT = "draft",
  OPEN = "open",
  PAID = "paid",
  VOID = "void",
  UNCOLLECTIBLE = "uncollectible",
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  metadata: Record<string, any>;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  memberCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: TeamRole;
  permissions: string[];
  joinedAt: Date;
}

export enum TeamRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
}

export interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface ErrorReport {
  id: number;
  userId: number | null;
  type: ErrorType;
  message: string;
  stack: string | null;
  context: Record<string, any>;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum ErrorType {
  CLIENT = "client",
  SERVER = "server",
  DATABASE = "database",
  EXTERNAL_API = "external_api",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
}
