// 从统一类型导出，保持向后兼容
export {
  Workflow,
  WorkflowConfig,
  RetryPolicy,
  ErrorHandling,
  WorkflowTrigger,
  TriggerType,
  WorkflowAction,
  ActionType,
  WorkflowCondition,
  WorkflowSchedule,
  WorkflowExecution,
  ExecutionStatus,
} from "./unifiedTypes";

export interface ExecutionLog {
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  actionId?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionMetrics {
  actionsExecuted: number;
  actionsSucceeded: number;
  actionsFailed: number;
  tokensUsed: number;
  apiCallsMade: number;
  processingTime: number;
  memoryUsed: number;
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  config: any; // 暂时使用any，避免类型循环引用
  usageCount: number;
  rating: number;
  isPublic: boolean;
  authorId: number;
  createdAt: Date;
  updatedAt: Date;
}
