export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'webhook' | 'http_request' | 'schedule' | 
        'operation' | 'validation' | 'ai_processing' | 'condition' | 'loop' |
        'transform' | 'merge' | 'split' | 'delay' | 'email' | 'webhook_response' |
        'code_execution' | 'database_query' | 'file_operation' | 'api_call';
  position: { x: number; y: number };
  config?: {
    title?: string;
    description?: string;
    softwareId?: string;
    action?: string;
    parameters?: Record<string, any>;
    [key: string]: any;
  };
  parameters?: Record<string, any>;
  credentials?: Record<string, string>;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  continueOnFail?: boolean;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, any>;
  settings?: {
    timezone?: string;
    saveManualExecutions?: boolean;
    saveDataErrorExecution?: boolean;
    saveDataSuccessExecution?: boolean;
    executionTimeout?: number;
  };
  tags?: string[];
  versionId?: string;
  version?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  definition: WorkflowDefinition;
  settings?: any;
  status: 'draft' | 'active' | 'archived';
  isPublic: boolean;
  tags: string[];
  version: number;
  authorId: string;
  uses: number;
  createdAt: string;
  updatedAt: string;
  executions?: TaskExecution[];
}

export interface TaskExecution {
  id: string;
  userId: string;
  workflowId?: string;
  inputs?: any;
  settings?: any;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: any;
  error?: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  preview?: string;
}

export interface NodeType {
  type: string;
  displayName: string;
  description: string;
  group: 'trigger' | 'action' | 'transform' | 'communication';
  version: number;
  defaults: {
    name: string;
    type: string;
    position: [number, number];
    parameters: Record<string, any>;
  };
  inputs: string[];
  outputs: string[];
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'canceled';
  startedAt: string;
  finishedAt?: string;
  data?: any;
  resultData?: {
    runData: Record<string, any>;
    error?: any;
  };
  mode: 'manual' | 'trigger' | 'retry';
  retryOf?: string;
  stoppedAt?: string;
  duration?: number;
}

export interface WorkflowStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: string;
  lastExecutionStatus?: string;
}

export interface NodeParameter {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'json' | 'file';
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  placeholder?: string;
}

export interface NodeParameterGroup {
  name: string;
  displayName: string;
  parameters: NodeParameter[];
  collapsed?: boolean;
}

export interface WebhookConfig {
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path?: string;
  authentication?: 'none' | 'basic' | 'header';
  credentials?: Record<string, string>;
  response?: {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: any;
  };
}

export interface ScheduleConfig {
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
}

export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    credentials: Record<string, string>;
  };
}

export interface AIProcessingConfig {
  model: string;
  prompt: string;
  input?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TransformConfig {
  mapping?: Record<string, string>;
  filters?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value?: any;
  }>;
  aggregation?: {
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    field: string;
  };
}

export interface EmailConfig {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding?: string;
  }>;
}

export interface DatabaseQueryConfig {
  query: string;
  database?: string;
  parameters?: Record<string, any>;
}

export interface FileOperationConfig {
  operation: 'read' | 'write' | 'delete' | 'exists' | 'copy' | 'move';
  path: string;
  content?: string;
  destination?: string;
}

export interface CodeExecutionConfig {
  code: string;
  language?: 'javascript' | 'python' | 'typescript';
  timeout?: number;
}

export interface ValidationNodeConfig {
  rules: Array<{
    field: string;
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    value?: any;
    min?: number;
    max?: number;
    pattern?: string;
    optional?: boolean;
  }>;
  input?: any;
}

export interface ConditionNodeConfig {
  condition: string;
  truePath?: string;
  falsePath?: string;
}

export interface LoopNodeConfig {
  items: any;
  variable: string;
  subNodeId: string;
  maxIterations?: number;
}

export interface DelayNodeConfig {
  milliseconds: number;
}

export interface MergeNodeConfig {
  mode: 'combine' | 'merge_by_key' | 'append';
  mergeKey?: string;
}

export interface SplitNodeConfig {
  batchSize: number;
  field?: string;
}