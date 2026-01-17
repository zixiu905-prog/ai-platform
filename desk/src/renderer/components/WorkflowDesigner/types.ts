// 工作流节点类型定义
export interface Node {
  id: string;
  type: 'start' | 'end' | 'operation' | 'condition' | 'validation' | 'data' | 'transform';
  position: { x: number; y: number };
  config: NodeConfig;
  status?: 'idle' | 'running' | 'completed' | 'error' | 'warning';
  data?: any;
  metadata?: NodeMetadata;
}

// 节点配置
export interface NodeConfig {
  title: string;
  description?: string;
  softwareId?: string;
  action?: string;
  parameters?: Record<string, any>;
  conditions?: ConditionRule[];
  rules?: ValidationRule[];
  variables?: Record<string, any>;
  timeout?: number;
  retryCount?: number;
  onError?: 'stop' | 'continue' | 'retry';
  [key: string]: any;
}

// 节点元数据
export interface NodeMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version?: string;
  tags?: string[];
  category?: string;
}

// 连接线类型定义
export interface Edge {
  id: string;
  from: string;
  to: string;
  condition?: string;
  label?: string;
  style?: EdgeStyle;
}

// 连接线样式
export interface EdgeStyle {
  color?: string;
  width?: number;
  dasharray?: string;
  animated?: boolean;
}

// 条件规则
export interface ConditionRule {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains';
  value: any;
  label?: string;
}

// 验证规则
export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  options?: any[];
  defaultValue?: any;
  description?: string;
}

// 工作流定义
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  nodes: Node[];
  edges: Edge[];
  variables?: WorkflowVariable[];
  settings?: WorkflowSettings;
  metadata?: WorkflowMetadata;
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

// 工作流变量
export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
  scope: 'global' | 'local';
  source?: 'input' | 'output' | 'computed';
}

// 工作流设置
export interface WorkflowSettings {
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  errorHandling?: {
    stopOnError: boolean;
    notifyOnError: boolean;
    fallbackAction?: string;
  };
  execution?: {
    parallel: boolean;
    maxConcurrency: number;
    priority: 'low' | 'normal' | 'high';
  };
  scheduling?: {
    enabled: boolean;
    cron?: string;
    timezone?: string;
  };
}

// 工作流元数据
export interface WorkflowMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version?: string;
  lastExecutedAt?: string;
  executionCount?: number;
  successRate?: number;
  averageDuration?: number;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  tags?: string[];
  thumbnail?: string;
}

// 工作流执行记录
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  nodeExecutions?: NodeExecution[];
  error?: string;
  triggeredBy?: string;
  environment?: 'development' | 'staging' | 'production';
}

// 节点执行记录
export interface NodeExecution {
  id: string;
  nodeId: string;
  executionId: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  logs?: ExecutionLog[];
}

// 执行日志
export interface ExecutionLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  data?: any;
  source?: string;
}

// 工作流模板
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  tags: string[];
  nodes: Node[];
  edges: Edge[];
  variables?: Record<string, WorkflowVariable>;
  preview?: string;
  author?: string;
  version?: string;
  downloads?: number;
  rating?: number;
}

// 拖拽项类型
export interface DragItem {
  type: string;
  nodeType: string;
}

// 画布视图状态
export interface CanvasView {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// 选择状态
export interface SelectionState {
  selectedNodes: string[];
  selectedEdges: string[];
  selectedType: 'node' | 'edge' | 'multiple' | null;
}

// 历史记录
export interface HistoryEntry {
  id: string;
  type: 'add' | 'remove' | 'move' | 'edit' | 'connect' | 'disconnect';
  target: 'node' | 'edge';
  targetId: string;
  data: any;
  timestamp: Date;
  description: string;
}

// 导出格式
export interface WorkflowExport {
  version: string;
  workflow: Workflow;
  metadata: {
    exportedAt: string;
    exportedBy?: string;
    format: 'json' | 'yaml' | 'xml';
  };
}

// 软件操作定义
export interface SoftwareAction {
  id: string;
  name: string;
  description: string;
  softwareId: string;
  category: string;
  parameters: SoftwareParameter[];
  returnType?: string;
  examples?: SoftwareActionExample[];
}

// 软件参数
export interface SoftwareParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'directory';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: ValidationRule[];
  options?: Array<{ label: string; value: any }>;
}

// 软件操作示例
export interface SoftwareActionExample {
  name: string;
  description: string;
  parameters: Record<string, any>;
  expectedResult?: any;
}