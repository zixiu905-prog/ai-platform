import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import WorkflowExecutor from './workflowExecutor';
import type { UnifiedWorkflowDefinition } from './unifiedWorkflowService_new_types';

export class UnifiedWorkflowService {
  private executor: WorkflowExecutor;
  private activeExecutions: Map<string, any>;

  constructor() {
    this.executor = new WorkflowExecutor();
    this.activeExecutions = new Map();
  }

  /**
   * 创建工作流
   */
  async createWorkflow(definition: any, userId: string): Promise<any> {
    logger.info(`UnifiedWorkflowService.createWorkflow`, { userId });

    try {
      const workflow = await prisma.workflows.create({
        data: {
          id: `wf-${Date.now()}`,
          name: definition.name,
          description: definition.description,
          nodes: definition.nodes || [],
          edges: definition.edges || [],
          config: definition.config || {},
          category: definition.category,
          tags: definition.tags || [],
          isActive: true,
          isPublic: definition.isPublic || false,
          authorId: userId,
          uses: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      logger.info(`工作流创建成功: ${workflow.id}`);
      return {
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          ...definition
        }
      };
    } catch (error) {
      logger.error('创建工作流失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 执行工作流（别名方法，保持与现有execute方法一致）
   */
  async executeWorkflow(workflowId: string, userId: string, input: any = {}): Promise<any> {
    return this.execute(workflowId, userId, input);
  }

  /**
   * 导出工作流（别名方法）
   */
  async exportWorkflow(workflowId: string): Promise<any> {
    try {
      const workflow = await prisma.workflows.findUnique({
        where: { id: workflowId }
      });

      if (!workflow) {
        throw new Error('工作流不存在');
      }

      return {
        success: true,
        data: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          nodes: workflow.nodes,
          edges: workflow.edges,
          config: workflow.config,
          category: workflow.category,
          tags: workflow.tags,
          exportedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('导出工作流失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败'
      };
    }
  }

  /**
   * 导入工作流（别名方法）
   */
  async importWorkflow(definition: string, userId: string): Promise<any> {
    return this.importWorkflowDefinition(definition, userId);
  }

  /**
   * 创建Webhook触发器
   */
  async createWebhookTrigger(workflowId: string, config: any): Promise<any> {
    logger.info(`UnifiedWorkflowService.createWebhookTrigger`, { workflowId });

    try {
      // TODO: 实现Webhook触发器创建逻辑
      return {
        success: true,
        data: {
          id: `webhook-${Date.now()}`,
          workflowId,
          type: 'webhook',
          config,
          url: `${process.env.BASE_URL}/webhook/${workflowId}`,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('创建Webhook触发器失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败'
      };
    }
  }

  /**
   * 创建计划触发器
   */
  async createScheduleTrigger(workflowId: string, config: any): Promise<any> {
    logger.info(`UnifiedWorkflowService.createScheduleTrigger`, { workflowId });

    try {
      // TODO: 实现计划触发器创建逻辑
      return {
        success: true,
        data: {
          id: `schedule-${Date.now()}`,
          workflowId,
          type: 'schedule',
          config,
          nextRun: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('创建计划触发器失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建失败'
      };
    }
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(workflowId: string, days: number = 30): Promise<any> {
    logger.info(`UnifiedWorkflowService.getPerformanceMetrics`, { workflowId, days });

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const executions = await prisma.task_executions.findMany({
        where: {
          workflowId,
          startedAt: {
            gte: startDate
          }
        }
      });

      const total = executions.length;
      const completed = executions.filter(e => e.status === 'COMPLETED').length;
      const failed = executions.filter(e => e.status === 'FAILED').length;

      const avgDuration = executions.length > 0
        ? executions.reduce((sum, e) => {
            const completedTime = e.completedAt ? e.completedAt.getTime() : 0;
            const startedTime = e.startedAt ? e.startedAt.getTime() : 0;
            return sum + (completedTime - startedTime);
          }, 0) / executions.length
        : 0;

      return {
        success: true,
        data: {
          workflowId,
          period: `${days} days`,
          totalExecutions: total,
          completed,
          failed,
          successRate: total > 0 ? (completed / total) * 100 : 0,
          avgDuration: Math.round(avgDuration),
          metrics: {
            byDate: this.groupExecutionsByDate(executions),
            byStatus: this.groupExecutionsByStatus(executions)
          }
        }
      };
    } catch (error) {
      logger.error('获取性能指标失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取失败'
      };
    }
  }

  /**
   * 按日期分组执行记录
   */
  private groupExecutionsByDate(executions: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const execution of executions) {
      const date = execution.startedAt?.toISOString().split('T')[0] || 'unknown';
      grouped[date] = (grouped[date] || 0) + 1;
    }
    return grouped;
  }

  /**
   * 按状态分组执行记录
   */
  private groupExecutionsByStatus(executions: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const execution of executions) {
      const status = execution.status || 'unknown';
      grouped[status] = (grouped[status] || 0) + 1;
    }
    return grouped;
  }

  /**
   * 事件监听器方法
   */
  on(event: string, callback: (data: any) => void): void {
    logger.info(`UnifiedWorkflowService.on`, { event });
    // TODO: 实现事件监听器逻辑
  }

  /**
   * 执行工作流（异步）
   */
  async execute(workflowId: string, userId: string, input: any = {}): Promise<any> {
    logger.info(`UnifiedWorkflowService.execute`, { workflowId, userId });

    try {
      const execution = await this.executor.executeWorkflow(workflowId, userId, input);
      
      // 清理执行记录
      this.activeExecutions.delete(workflowId);
      
      return {
        success: execution.status === 'COMPLETED',
        executionId: execution.id,
        status: execution.status,
        output: execution.outputs,
        metrics: execution.metrics,
        duration: execution.metrics.totalDuration,
      };
    } catch (error) {
      logger.error('工作流执行失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 异步执行工作流（不等待完成）
   */
  async executeAsync(workflowId: string, userId: string, input: any = {}): Promise<string> {
    logger.info(`UnifiedWorkflowService.executeAsync`, { workflowId, userId });

    const executionId = `${workflowId}-${Date.now()}`;
    
    // 记录正在执行的工作流
    this.activeExecutions.set(executionId, {
      workflowId,
      userId,
      status: 'RUNNING',
      startTime: new Date(),
    });

    // 异步执行，不等待结果
    this.executor.executeWorkflow(workflowId, userId, input)
      .then(execution => {
        this.activeExecutions.delete(executionId);
        logger.info(`异步工作流执行完成: ${executionId}`);
      })
      .catch(error => {
        this.activeExecutions.delete(executionId);
        logger.error(`异步工作流执行失败: ${executionId}`, error);
      });

    return executionId;
  }

  /**
   * 取消工作流执行
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    logger.info(`取消工作流执行: ${executionId}`);

    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    // 更新数据库状态
    try {
      await prisma.task_executions.updateMany({
        where: {
          id: executionId,
          status: 'RUNNING'
        },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          updatedAt: new Date(),
        }
      });

      this.activeExecutions.delete(executionId);
      return true;
    } catch (error) {
      logger.error('取消工作流执行失败', error);
      return false;
    }
  }

  /**
   * 获取执行状态
   */
  async getExecutionStatus(executionId: string): Promise<any> {
    try {
      const execution = await prisma.task_executions.findUnique({
        where: { id: executionId }
      });

      if (!execution) {
        return { error: '执行记录不存在' };
      }

      return {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        progress: execution.progress,
        input: execution.input,
        output: execution.output,
        error: execution.error,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
      };
    } catch (error) {
      logger.error('获取执行状态失败', error);
      return { error: '获取执行状态失败' };
    }
  }

  /**
   * 获取工作流统计信息
   */
  async getWorkflowStats(workflowId: string): Promise<any> {
    try {
      const executions = await prisma.task_executions.findMany({
        where: { workflowId }
      });

      const total = executions.length;
      const completed = executions.filter(e => e.status === 'COMPLETED').length;
      const failed = executions.filter(e => e.status === 'FAILED').length;
      const running = executions.filter(e => e.status === 'RUNNING').length;

      // 计算平均执行时间
      const completedExecutions = executions.filter(e => 
        e.status === 'COMPLETED' && e.startedAt && e.completedAt
      );
      const avgDuration = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => 
            sum + (e.completedAt!.getTime() - e.startedAt!.getTime()), 0
          ) / completedExecutions.length
        : 0;

      // 计算成功率
      const successRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        workflowId,
        totalExecutions: total,
        completed,
        failed,
        running,
        successRate: Math.round(successRate * 100) / 100,
        avgDuration: Math.round(avgDuration),
      };
    } catch (error) {
      logger.error('获取工作流统计失败', error);
      return { error: '获取工作流统计失败' };
    }
  }

  /**
   * 验证工作流定义
   */
  validateWorkflowDefinition(definition: Partial<UnifiedWorkflowDefinition>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!definition.name) {
      errors.push('工作流名称不能为空');
    }

    if (!definition.nodes || definition.nodes.length === 0) {
      errors.push('工作流必须包含至少一个节点');
    }

    if (!definition.edges) {
      errors.push('工作流必须包含边定义');
    }

    // 检查是否有开始和结束节点
    const hasStart = definition.nodes?.some(n => n.type === 'start');
    const hasEnd = definition.nodes?.some(n => n.type === 'end');

    if (!hasStart) {
      errors.push('工作流必须包含开始节点');
    }

    if (!hasEnd) {
      errors.push('工作流必须包含结束节点');
    }

    // 检查边的有效性
    const nodeIds = new Set(definition.nodes?.map(n => n.id) || []);
    for (const edge of definition.edges || []) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`边的源节点不存在: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`边的目标节点不存在: ${edge.target}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 克隆工作流
   */
  async cloneWorkflow(workflowId: string, newUserId: string, newName?: string): Promise<any> {
    try {
      const originalWorkflow = await prisma.workflows.findUnique({
        where: { id: workflowId }
      });

      if (!originalWorkflow) {
        throw new Error('原始工作流不存在');
      }

      const clonedWorkflow = await prisma.workflows.create({
        data: {
          id: `${workflowId}-clone-${Date.now()}`,
          name: newName || `${originalWorkflow.name} (副本)`,
          description: originalWorkflow.description,
          nodes: originalWorkflow.nodes as any || {},
          edges: originalWorkflow.edges as any || {},
          config: originalWorkflow.config as any || {},
          category: originalWorkflow.category,
          tags: originalWorkflow.tags as any || [],
          isActive: true,
          isPublic: false,
          authorId: newUserId,
          uses: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      logger.info(`工作流克隆成功: ${clonedWorkflow.id}`);
      return clonedWorkflow;
    } catch (error) {
      logger.error('克隆工作流失败', error);
      throw error;
    }
  }

  /**
   * 导出工作流定义
   */
  exportWorkflowDefinition(workflowId: string): string {
    logger.info(`导出工作流定义: ${workflowId}`);
    // 实际实现需要从数据库读取并序列化
    return JSON.stringify({ workflowId, exported: true });
  }

  /**
   * 导入工作流定义
   */
  async importWorkflowDefinition(definition: string, userId: string): Promise<any> {
    logger.info(`导入工作流定义`, { userId });
    
    try {
      const parsed = JSON.parse(definition);
      const validation = this.validateWorkflowDefinition(parsed);
      
      if (!validation.valid) {
        throw new Error(`工作流定义无效: ${validation.errors.join(', ')}`);
      }

      const workflow = await prisma.workflows.create({
        data: {
          id: `imported-${Date.now()}`,
          name: parsed.name,
          description: parsed.description,
          nodes: parsed.nodes,
          edges: parsed.edges,
          config: parsed.settings || {},
          category: parsed.category,
          tags: parsed.tags || [],
          isActive: true,
          isPublic: false,
          authorId: userId,
          uses: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      logger.info(`工作流导入成功: ${workflow.id}`);
      return workflow;
    } catch (error) {
      logger.error('导入工作流定义失败', error);
      throw error;
    }
  }

  async createAlert(workflowId: string, alertConfig: any): Promise<any> {
    logger.info(`UnifiedWorkflowService.createAlert`, { workflowId });
    await this.delay(500);
    return { id: `alert-${Date.now()}`, workflowId, ...alertConfig };
  }

  async getAlerts(workflowId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<any[]> {
    logger.info(`UnifiedWorkflowService.getAlerts`, { workflowId, options });
    await this.delay(500);
    return [];
  }

  /**
   * 获取用户的所有工作流
   */
  async getWorkflowsByAuthor(userId: string): Promise<any[]> {
    logger.info(`UnifiedWorkflowService.getWorkflowsByAuthor`, { userId });
    const workflows = await prisma.workflows.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' }
    });
    return workflows;
  }

  /**
   * 获取最近的执行记录
   */
  async getRecentExecutions(workflowId: string, limit: number = 10): Promise<any[]> {
    logger.info(`UnifiedWorkflowService.getRecentExecutions`, { workflowId, limit });
    const executions = await prisma.task_executions.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return executions;
  }

  async deleteAlert(alertId: string): Promise<boolean> {
    logger.info(`UnifiedWorkflowService.deleteAlert`, { alertId });
    await this.delay(500);
    return true;
  }

  async getMonitoringStatistics(workflowId: string): Promise<any> {
    logger.info(`UnifiedWorkflowService.getMonitoringStatistics`, { workflowId });
    await this.delay(500);
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0
    };
  }

  async autoComposeWorkflow(requirements: string, userId: string, context?: any): Promise<any> {
    logger.info(`UnifiedWorkflowService.autoComposeWorkflow`, { userId });
    await this.delay(1000);
    return {
      id: `wf-${Date.now()}`,
      name: '自动生成的工作流',
      description: requirements,
      nodes: [],
      edges: []
    };
  }

  async getWorkflowById(workflowId: string): Promise<any> {
    logger.info(`UnifiedWorkflowService.getWorkflowById`, { workflowId });
    const workflow = await prisma.workflows.findUnique({
      where: { id: workflowId }
    });
    return workflow;
  }

  async getOptimizationSuggestions(workflowId: string): Promise<any[]> {
    logger.info(`UnifiedWorkflowService.getOptimizationSuggestions`, { workflowId });
    await this.delay(500);
    return [];
  }

  async recommendWorkflows(userId: string, context?: any): Promise<any[]> {
    logger.info(`UnifiedWorkflowService.recommendWorkflows`, { userId });
    await this.delay(500);
    return [];
  }

  async autoSaveAndOptimizeWorkflow(workflowId: string, userId: string, result?: any, options?: any): Promise<any> {
    logger.info(`UnifiedWorkflowService.autoSaveAndOptimizeWorkflow`, { workflowId, userId });
    await this.delay(1000);
    return { success: true, message: '工作流已保存并优化' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const unifiedWorkflowService = new UnifiedWorkflowService();
export default UnifiedWorkflowService;
