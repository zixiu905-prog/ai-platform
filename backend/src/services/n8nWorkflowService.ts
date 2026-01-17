import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { randomUUID } from 'crypto';

// N8N配置接口
interface N8NConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  nodes: any[];
  edges: any[];
  settings?: any;
  tags?: string[];
  version?: number;
}

export class N8NWorkflowService {
  private config: N8NConfig | null = null;

  constructor() {
    // 延迟加载配置
    setTimeout(() => this.loadConfig(), 0);
  }

  /**
   * 加载N8N配置
   */
  private loadConfig() {
    const n8nUrl = process.env.N8N_URL;
    const n8nApiKey = process.env.N8N_API_KEY;
    const n8nEnabled = process.env.N8N_ENABLED === 'true';

    if (n8nUrl && n8nApiKey) {
      this.config = {
        url: n8nUrl,
        apiKey: n8nApiKey,
        enabled: n8nEnabled
      };
      logger.info('N8N configuration loaded', { enabled: n8nEnabled, url: n8nUrl });
    } else {
      logger.warn('N8N configuration not found, using local storage only');
    }
  }

  /**
   * 检查N8N连接状态
   */
  async checkConnection(): Promise<boolean> {
    if (!this.config?.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.url}/rest/workflows`, {
        headers: {
          'X-N8N-API-KEY': this.config.apiKey
        }
      });

      return response.ok;
    } catch (error) {
      logger.error('Failed to connect to N8N:', error);
      return false;
    }
  }

  /**
   * 将工作流同步到N8N
   */
  async syncToN8N(workflowId: string): Promise<any> {
    if (!this.config?.enabled) {
      throw new Error('N8N integration is not enabled');
    }

    try {
      // 从数据库获取工作流定义
      const workflow = await prisma.workflows.findUnique({
        where: { id: workflowId }
      });

      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // 准备N8N格式的工作流
      const n8nWorkflow = {
        name: workflow.name,
        nodes: workflow.nodes || [],
        connections: workflow.edges || [],
        settings: {
          executionOrder: 'v1'
        },
        staticData: null,
        meta: {
          instanceId: workflowId,
          tags: workflow.tags || []
        },
        pinData: {}
      };

      // 发送到N8N API
      const response = await fetch(`${this.config.url}/rest/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': this.config.apiKey
        },
        body: JSON.stringify(n8nWorkflow)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to sync to N8N: ${error}`);
      }

      const result = await response.json();
      const n8nId = result.id;
      logger.info(`Workflow synced to N8N: ${workflowId}`, { n8nId });

      // 更新数据库中的N8N ID
      const currentConfig = workflow.config as any || {};
      await prisma.workflows.update({
        where: { id: workflowId },
        data: {
          config: {
            ...currentConfig,
            n8nId: n8nId,
            syncedAt: new Date().toISOString()
          } as any
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to sync workflow to N8N:', error);
      throw error;
    }
  }

  /**
   * 从N8N执行工作流
   */
  async executeFromN8N(workflowId: string, inputData?: any): Promise<any> {
    if (!this.config?.enabled) {
      throw new Error('N8N integration is not enabled');
    }

    try {
      const workflow = await prisma.workflows.findUnique({
        where: { id: workflowId }
      });

      const config = workflow?.config as any;
      if (!config?.n8nId) {
        throw new Error('Workflow not synced to N8N');
      }

      const n8nId = config.n8nId;

      // 触发N8N工作流执行
      const response = await fetch(`${this.config.url}/webhook/${n8nId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputData || {})
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to execute N8N workflow: ${error}`);
      }

      const result = await response.json();
      logger.info(`N8N workflow executed: ${workflowId}`, { executionId: result.executionId });

      return result;
    } catch (error) {
      logger.error('Failed to execute N8N workflow:', error);
      throw error;
    }
  }

  /**
   * 从N8N获取执行状态
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    if (!this.config?.enabled) {
      throw new Error('N8N integration is not enabled');
    }

    try {
      const response = await fetch(`${this.config.url}/rest/executions/${executionId}`, {
        headers: {
          'X-N8N-API-KEY': this.config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get execution status');
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get N8N execution status:', error);
      throw error;
    }
  }

  /**
   * 创建工作流
   */
  async createWorkflow(userId: string, workflowDefinition: WorkflowDefinition): Promise<any> {
    try {
      const workflow = await prisma.workflows.create({
        data: {
          id: workflowDefinition.id || randomUUID(),
          name: workflowDefinition.name,
          description: workflowDefinition.description,
          category: workflowDefinition.category,
          nodes: workflowDefinition.nodes,
          edges: workflowDefinition.edges,
          config: workflowDefinition.settings || {},
          tags: workflowDefinition.tags || [],
          authorId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 如果N8N已启用,自动同步
      if (this.config?.enabled) {
        try {
          await this.syncToN8N(workflow.id);
        } catch (syncError) {
          logger.warn('Failed to auto-sync workflow to N8N:', syncError);
        }
      }

      logger.info(`Workflow created: ${workflow.id}`);
      return workflow;
    } catch (error) {
      logger.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * 获取工作流统计数
   */
  static async getWorkflowCount(): Promise<number> {
    try {
      const count = await prisma.workflows.count();
      return count;
    } catch (error) {
      logger.error('Failed to get workflow count:', error);
      return 0;
    }
  }

  /**
   * 获取用户的工作流列表
   */
  async getUserWorkflows(userId: string, page = 1, limit = 20): Promise<any> {
    try {
      const [workflows, total] = await Promise.all([
        prisma.workflows.findMany({
          where: { authorId: userId },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.workflows.count({ where: { authorId: userId } })
      ]);

      return { workflows, total, page, limit };
    } catch (error) {
      logger.error('Failed to get user workflows:', error);
      throw error;
    }
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      // 先尝试从N8N删除
      if (this.config?.enabled) {
        try {
          const workflow = await prisma.workflows.findUnique({
            where: { id: workflowId }
          });

          const config = workflow?.config as any;
          if (config?.n8nId) {
            await fetch(`${this.config.url}/rest/workflows/${config.n8nId}`, {
              method: 'DELETE',
              headers: {
                'X-N8N-API-KEY': this.config.apiKey
              }
            });
            logger.info(`Workflow deleted from N8N: ${config.n8nId}`);
          }
        } catch (n8nError) {
          logger.warn('Failed to delete from N8N:', n8nError);
        }
      }

      // 从数据库删除
      await prisma.workflows.delete({
        where: { id: workflowId }
      });
      logger.info(`Workflow deleted: ${workflowId}`);
    } catch (error) {
      logger.error('Failed to delete workflow:', error);
      throw error;
    }
  }
}

export default N8NWorkflowService;
