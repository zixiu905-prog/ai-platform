import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { SoftwareIntegrationService } from '../services/softwareIntegrationService';
import { ScriptExecutor } from '../services/scriptExecutor';
import { AIDesignIntegrationService } from '../services/aiDesignIntegrationService';
import { UnifiedAIService } from '../services/unifiedAIService';

// 从现有服务导入类型定义，并统一扩展
export interface UnifiedWorkflowNode {
  id: string;
  type: 'start' | 'end' | 'webhook' | 'http_request' | 'schedule' |
        'operation' | 'validation' | 'ai_processing' | 'condition' | 'loop' |
        'transform' | 'merge' | 'split' | 'delay' | 'email' | 'webhook_response' |
        'code_execution' | 'database_query' | 'file_operation' | 'api_call' |
        'ai_design_concept' | 'ai_design_layout' | 'ai_design_color' |
        'ai_design_typography' | 'ai_design_mockup' | 'ai_design_enhance';
  position: { x: number; y: number };
  name?: string;
  description?: string;
  parameters?: Record<string, any>;
  config?: any;
  credentials?: Record<string, string>;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  continueOnFail?: boolean;
  softwareId?: string;
  scriptId?: string;
  cache?: {
    enabled: boolean;
    ttl: number;
    key: string;
    strategy: string;
  };
}

export interface UnifiedWorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface UnifiedWorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: number;
  status: 'draft' | 'active' | 'archived' | 'deprecated';
  nodes: UnifiedWorkflowNode[];
  edges: UnifiedWorkflowEdge[];
  variables?: Record<string, any>;
  settings: {
    timezone?: string;
    saveManualExecutions?: boolean;
    saveDataErrorExecution?: boolean;
    saveDataSuccessExecution?: boolean;
    executionTimeout?: number;
    retryPolicy?: {
      maxRetries: number;
      retryDelay: number;
      exponentialBackoff: boolean;
    };
    parallelExecution?: boolean;
    batchSize?: number;
  };
  tags: string[];
  metadata?: {
    author?: string;
    createdAt?: Date;
    updatedAt?: Date;
    lastExecutedAt?: Date;
    executionCount?: number;
    averageExecutionTime?: number;
    successRate?: number;
  };
  triggers?: Array<{
    type: 'webhook' | 'schedule' | 'manual' | 'event';
    config: any;
    enabled: boolean;
  }>;
}

export interface UnifiedWorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  userId: string;
  tenantId?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  mode: 'manual' | 'trigger' | 'retry' | 'scheduled';
  startTime: Date;
  endTime?: Date;
  inputs?: any;
  outputs?: any;
  context: any;
  nodeResults: Record<string, any>;
  currentNode?: string;
  completedNodes: string[];
  failedNodes: string[];
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    nodeId?: string;
    data?: any;
  }>;
  error?: string;
  metrics: {
    totalDuration?: number;
    nodeExecutions: number;
    averageNodeTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    tokensUsed?: number;
    costEstimate?: number;
  };
  parentExecutionId?: string;
  childExecutionIds?: string[];
  retryCount: number;
  maxRetries: number;
}

export interface WorkflowOptimizationMetrics {
  workflowId: string;
  version: number;
  analysisDate: Date;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  performanceScore: number; // 0-100
  optimizationOpportunities: Array<{
    type: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    estimatedSavings: number;
  }>;
  recommendations: string[];
}

export interface WorkflowPerformanceMetrics {
  workflowId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  executions: {
    total: number;
    successful: number;
    failed: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  };
  nodes: {
    totalExecutions: number;
    averageExecutionTime: number;
    mostFrequentErrors: Array<{
      error: string;
      count: number;
      nodeTypes: string[];
    }>;
    slowestNodes: Array<{
      nodeId: string;
      nodeType: string;
      averageTime: number;
      executions: number;
    }>;
  };
  resources: {
    memoryUsage: number[];
    cpuUsage: number[];
    ioOperations: number;
    tokensUsed: number;
    costs: number;
  };
}
