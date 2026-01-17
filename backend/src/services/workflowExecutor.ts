import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { randomUUID } from 'crypto';
import { SoftwareIntegrationService } from './softwareIntegrationService';
import { ScriptExecutor } from './scriptExecutor';
import { UnifiedAIService } from './unifiedAIService';
import type {
  UnifiedWorkflowNode,
  UnifiedWorkflowEdge,
  UnifiedWorkflowDefinition,
  UnifiedWorkflowExecution
} from './unifiedWorkflowService_new_types';

/**
 * 工作流执行引擎
 * 负责执行工作流定义，管理节点执行顺序，处理错误和重试
 */
export class WorkflowExecutor {
  private aiService: UnifiedAIService;
  private softwareService: SoftwareIntegrationService;
  private scriptExecutor: ScriptExecutor;

  constructor() {
    this.aiService = new UnifiedAIService();
    this.softwareService = new SoftwareIntegrationService();
    this.scriptExecutor = new ScriptExecutor();
  }

  /**
   * 执行工作流
   */
  async executeWorkflow(
    workflowId: string,
    userId: string,
    inputVariables: Record<string, any> = {}
  ): Promise<UnifiedWorkflowExecution> {
    logger.info(`开始执行工作流: ${workflowId}`, { userId });

    try {
      // 1. 获取工作流定义
      const workflow = await prisma.workflows.findUnique({
        where: { id: workflowId }
      });

      if (!workflow) {
        throw new Error(`工作流不存在: ${workflowId}`);
      }

      // 2. 解析工作流定义
      const workflowDefinition = this.parseWorkflowDefinition(workflow);
      
      // 3. 创建执行记录
      const executionId = randomUUID();
      const execution: UnifiedWorkflowExecution = {
        id: executionId,
        workflowId,
        workflowVersion: 1,
        userId,
        status: 'RUNNING',
        mode: 'manual',
        startTime: new Date(),
        inputs: inputVariables,
        outputs: {},
        context: this.createExecutionContext(workflowDefinition, inputVariables),
        nodeResults: {},
        completedNodes: [],
        failedNodes: [],
        logs: [],
        metrics: {
          nodeExecutions: 0
        },
        retryCount: 0,
        maxRetries: workflowDefinition.settings.retryPolicy?.maxRetries || 3
      };

      // 4. 创建数据库执行记录
      await this.createExecutionRecord(execution);

      // 5. 执行工作流节点
      await this.executeNodes(execution, workflowDefinition);

      // 6. 更新执行记录
      execution.endTime = new Date();
      execution.metrics.totalDuration = execution.endTime.getTime() - execution.startTime.getTime();
      
      if (execution.failedNodes.length > 0) {
        execution.status = 'FAILED';
        execution.error = `工作流执行失败，失败节点: ${execution.failedNodes.join(', ')}`;
      } else {
        execution.status = 'COMPLETED';
      }

      await this.updateExecutionRecord(execution);

      logger.info(`工作流执行完成: ${workflowId}`, {
        executionId,
        status: execution.status,
        duration: execution.metrics.totalDuration
      });

      return execution;
    } catch (error) {
      logger.error(`工作流执行失败: ${workflowId}`, error);
      throw error;
    }
  }

  /**
   * 执行工作流的所有节点
   */
  private async executeNodes(
    execution: UnifiedWorkflowExecution,
    workflowDefinition: UnifiedWorkflowDefinition
  ): Promise<void> {
    const { nodes, edges } = workflowDefinition;

    // 构建节点依赖图
    const nodeMap = new Map<string, UnifiedWorkflowNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));

    const adjacencyList = this.buildAdjacencyList(edges);

    // 拓扑排序，确定执行顺序
    const executionOrder = this.topologicalSort(nodes, edges);

    logger.info(`工作流执行顺序: ${executionOrder.join(' -> ')}`);

    // 按顺序执行节点
    for (const nodeId of executionOrder) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      // 检查是否可以执行该节点
      const canExecute = await this.canExecuteNode(node, execution, adjacencyList);
      if (!canExecute) {
        logger.warn(`节点无法执行，跳过: ${nodeId}`);
        continue;
      }

      try {
        await this.executeNode(node, execution);
        execution.completedNodes.push(nodeId);
        execution.currentNode = undefined;
      } catch (error) {
        logger.error(`节点执行失败: ${nodeId}`, error);
        execution.failedNodes.push(nodeId);
        execution.error = error instanceof Error ? error.message : '未知错误';

        // 检查是否应该继续
        if (!node.continueOnFail) {
          throw error;
        }
      }

      // 更新执行进度
      execution.metrics.nodeExecutions = execution.completedNodes.length;
      execution.metrics.averageNodeTime = 
        execution.metrics.totalDuration ? execution.metrics.totalDuration / execution.completedNodes.length : 0;

      await this.updateExecutionRecord(execution);
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<void> {
    const startTime = Date.now();
    execution.currentNode = node.id;

    execution.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `开始执行节点: ${node.id} (${node.type})`,
      nodeId: node.id
    });

    try {
      let result: any;

      // 根据节点类型执行不同的逻辑
      switch (node.type) {
        case 'start':
          result = await this.executeStartNode(node, execution);
          break;
        case 'end':
          result = await this.executeEndNode(node, execution);
          break;
        case 'operation':
          result = await this.executeOperationNode(node, execution);
          break;
        case 'ai_processing':
          result = await this.executeAIProcessingNode(node, execution);
          break;
        case 'validation':
          result = await this.executeValidationNode(node, execution);
          break;
        case 'condition':
          result = await this.executeConditionNode(node, execution);
          break;
        case 'loop':
          result = await this.executeLoopNode(node, execution);
          break;
        case 'delay':
          result = await this.executeDelayNode(node, execution);
          break;
        case 'transform':
          result = await this.executeTransformNode(node, execution);
          break;
        case 'file_operation':
          result = await this.executeFileOperationNode(node, execution);
          break;
        default:
          throw new Error(`不支持的节点类型: ${node.type}`);
      }

      // 保存节点执行结果
      execution.nodeResults[node.id] = result;

      const duration = Date.now() - startTime;
      execution.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `节点执行完成: ${node.id}, 耗时: ${duration}ms`,
        nodeId: node.id,
        data: { duration, result }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      execution.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `节点执行失败: ${node.id}, 错误: ${error instanceof Error ? error.message : '未知错误'}`,
        nodeId: node.id,
        data: { duration, error: error instanceof Error ? error.message : error }
      });
      throw error;
    }
  }

  /**
   * 执行开始节点
   */
  private async executeStartNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行开始节点: ${node.id}`);
    return { status: 'started', timestamp: new Date() };
  }

  /**
   * 执行结束节点
   */
  private async executeEndNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行结束节点: ${node.id}`);

    // 收集所有节点的输出
    const outputs: Record<string, any> = {};
    Object.entries(execution.nodeResults).forEach(([nodeId, result]) => {
      if (nodeId !== node.id) {
        outputs[nodeId] = result;
      }
    });

    execution.outputs = outputs;
    return { status: 'completed', outputs };
  }

  /**
   * 执行操作节点（软件操作、脚本执行等）
   */
  private async executeOperationNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行操作节点: ${node.id}`, { softwareId: node.softwareId });

    const parameters = this.resolveParameters(node.parameters || {}, execution.context);

    // 如果指定了软件ID，调用软件集成服务
    if (node.softwareId) {
      return await this.executeSoftwareOperation(node.softwareId, node.config?.action, parameters, execution);
    }

    // 如果指定了脚本ID，执行脚本
    if (node.scriptId) {
      return await this.scriptExecutor.execute(node.scriptId, parameters);
    }

    // 通用操作（文件操作等）
    if (node.config?.action) {
      return await this.executeGenericAction(node.config.action, parameters);
    }

    throw new Error(`操作节点缺少必要的配置: ${node.id}`);
  }

  /**
   * 执行AI处理节点
   */
  private async executeAIProcessingNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行AI处理节点: ${node.id}`);

    const model = node.config?.model || 'glm-4';
    const promptTemplate = node.config?.prompt || '';
    const inputKey = node.config?.input || 'input';

    // 获取输入数据
    const inputValue = execution.context[inputKey];
    const prompt = this.replaceVariables(promptTemplate, execution.context);

    logger.info(`调用AI模型: ${model}`, { promptLength: prompt.length });

    // 调用AI服务
    const result = await this.aiService.chat([{ role: 'user', content: prompt }], {
      maxTokens: node.parameters?.maxTokens || 2000,
      temperature: node.parameters?.temperature || 0.7
    });

    // 更新指标
    execution.metrics.tokensUsed = (execution.metrics.tokensUsed || 0) + (result.tokens || 0);
    execution.metrics.costEstimate = (execution.metrics.costEstimate || 0) + (result.cost || 0);

    return {
      model,
      response: result.message,
      tokensUsed: result.tokensUsed,
      cost: result.cost
    };
  }

  /**
   * 执行验证节点
   */
  private async executeValidationNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行验证节点: ${node.id}`);

    const rules = node.config?.rules || [];
    const context = execution.context;
    const errors: string[] = [];

    for (const rule of rules) {
      const value = context[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`字段 ${rule.field} 是必填的`);
        continue;
      }

      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`字段 ${rule.field} 必须是字符串`);
      }

      if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`字段 ${rule.field} 必须是数字`);
      }

      if (rule.min !== undefined && value < rule.min) {
        errors.push(`字段 ${rule.field} 不能小于 ${rule.min}`);
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push(`字段 ${rule.field} 不能大于 ${rule.max}`);
      }

      if (rule.options && !rule.options.includes(value)) {
        errors.push(`字段 ${rule.field} 必须是以下值之一: ${rule.options.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`验证失败: ${errors.join(', ')}`);
    }

    return { status: 'validated', validatedFields: rules.length };
  }

  /**
   * 执行条件节点
   */
  private async executeConditionNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行条件节点: ${node.id}`);

    const conditionExpression = node.config?.condition;
    if (!conditionExpression) {
      throw new Error(`条件节点缺少条件表达式: ${node.id}`);
    }

    // 解析条件表达式（简单实现）
    const result = this.evaluateCondition(conditionExpression, execution.context);

    return { status: 'evaluated', result };
  }

  /**
   * 执行循环节点
   */
  private async executeLoopNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行循环节点: ${node.id}`);

    const itemsKey = node.config?.items || 'items';
    const variableName = node.config?.variable || 'item';
    const subNodeId = node.config?.subNodeId;
    const maxIterations = node.config?.maxIterations || 100;

    const items = execution.context[itemsKey];
    if (!Array.isArray(items)) {
      throw new Error(`循环数据必须是数组: ${itemsKey}`);
    }

    if (items.length > maxIterations) {
      throw new Error(`循环次数超过最大限制: ${items.length} > ${maxIterations}`);
    }

    const results = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      execution.context[variableName] = item;
      execution.context[`${variableName}Index`] = i;

      // 执行子节点（简化实现，实际需要递归执行）
      if (subNodeId) {
        logger.info(`循环迭代 ${i + 1}/${items.length}, 子节点: ${subNodeId}`);
        // 这里应该执行子节点，但需要额外的逻辑
      }

      results.push({ index: i, value: item });
    }

    return { status: 'completed', iterations: items.length, results };
  }

  /**
   * 执行延迟节点
   */
  private async executeDelayNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    const delayMs = node.parameters?.delay || 1000;
    logger.info(`执行延迟节点: ${node.id}, 延迟: ${delayMs}ms`);

    await new Promise(resolve => setTimeout(resolve, delayMs));

    return { status: 'delayed', delayMs };
  }

  /**
   * 执行转换节点
   */
  private async executeTransformNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行转换节点: ${node.id}`);

    const transformFunction = node.config?.transform;
    if (!transformFunction) {
      throw new Error(`转换节点缺少转换函数: ${node.id}`);
    }

    // 简化的转换实现
    const input = execution.context;
    const output: any = {};

    if (typeof transformFunction === 'string') {
      // 简单的赋值操作，如 "output = input.field1 + input.field2"
      const matches = transformFunction.match(/(\w+)\s*=\s*(.+)/);
      if (matches) {
        const [, targetKey, expression] = matches;
        output[targetKey] = this.evaluateExpression(expression, input);
      }
    } else if (typeof transformFunction === 'function') {
      output.result = transformFunction(input);
    }

    return { status: 'transformed', output };
  }

  /**
   * 执行文件操作节点
   */
  private async executeFileOperationNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行文件操作节点: ${node.id}`);

    const action = node.config?.action;
    const parameters = this.resolveParameters(node.parameters || {}, execution.context);

    switch (action) {
      case 'readFile':
        return { status: 'read', content: '文件内容占位符' };
      case 'writeFile':
        return { status: 'written', path: parameters.path };
      case 'deleteFile':
        return { status: 'deleted', path: parameters.path };
      case 'createFolder':
        return { status: 'created', path: parameters.path };
      case 'deleteFolder':
        return { status: 'deleted', path: parameters.path };
      default:
        throw new Error(`不支持的文件操作: ${action}`);
    }
  }

  /**
   * 执行软件操作
   */
  private async executeSoftwareOperation(
    softwareId: string,
    action: string,
    parameters: Record<string, any>,
    execution: UnifiedWorkflowExecution
  ): Promise<any> {
    logger.info(`执行软件操作: ${softwareId}.${action}`);

    try {
      // 调用软件集成服务
      const result = await this.softwareService.integrate(softwareId);
      return result;
    } catch (error) {
      logger.error(`软件操作失败: ${softwareId}.${action}`, error);
      throw error;
    }
  }

  /**
   * 执行通用操作
   */
  private async executeGenericAction(
    action: string,
    parameters: Record<string, any>
  ): Promise<any> {
    logger.info(`执行通用操作: ${action}`, parameters);

    // 根据操作类型执行不同的逻辑
    switch (action) {
      case 'resizeImage':
        return { status: 'resized', width: parameters.width, height: parameters.height };
      case 'applyFilter':
        return { status: 'filter_applied', filter: parameters.filterName };
      case 'saveDocument':
        return { status: 'saved', format: parameters.format };
      case 'batchConvert':
        return { status: 'converted', format: parameters.targetFormat };
      case 'layerCleanup':
        return { status: 'cleaned', layersRemoved: 5 };
      case 'renderScene':
        return { status: 'rendered', samples: parameters.samples };
      default:
        return { status: 'executed', action, parameters };
    }
  }

  /**
   * 解析参数，替换变量
   */
  private resolveParameters(
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string') {
        resolved[key] = this.replaceVariables(value, context);
      } else if (Array.isArray(value)) {
        resolved[key] = value.map(item => 
          typeof item === 'string' ? this.replaceVariables(item, context) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveParameters(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 替换字符串中的变量
   */
  private replaceVariables(template: string, context: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(expression: string, context: Record<string, any>): boolean {
    // 简化实现，实际应该使用更安全的表达式求值器
    const resolvedExpression = this.replaceVariables(expression, context);
    
    // 简单的比较运算
    const comparisons = [
      { regex: /(\w+)\s*==\s*(.+)/, evaluate: (a: any, b: any) => a === b },
      { regex: /(\w+)\s*!=\s*(.+)/, evaluate: (a: any, b: any) => a !== b },
      { regex: /(\w+)\s*>\s*(.+)/, evaluate: (a: any, b: any) => Number(a) > Number(b) },
      { regex: /(\w+)\s*<\s*(.+)/, evaluate: (a: any, b: any) => Number(a) < Number(b) },
      { regex: /(\w+)\s*>=\s*(.+)/, evaluate: (a: any, b: any) => Number(a) >= Number(b) },
      { regex: /(\w+)\s*<=\s*(.+)/, evaluate: (a: any, b: any) => Number(a) <= Number(b) },
    ];

    for (const { regex, evaluate } of comparisons) {
      const match = resolvedExpression.match(regex);
      if (match) {
        const [, varName, value] = match;
        return evaluate(context[varName], value);
      }
    }

    return false;
  }

  /**
   * 评估表达式
   */
  private evaluateExpression(expression: string, context: Record<string, any>): any {
    // 简化实现，仅支持简单的变量访问
    return this.replaceVariables(expression, context);
  }

  /**
   * 检查节点是否可以执行
   */
  private async canExecuteNode(
    node: UnifiedWorkflowNode,
    execution: UnifiedWorkflowExecution,
    adjacencyList: Map<string, string[]>
  ): Promise<boolean> {
    // 跳过已经完成的节点
    if (execution.completedNodes.includes(node.id)) {
      return false;
    }

    // 检查所有前置节点是否已完成
    const predecessors = adjacencyList.get(node.id) || [];
    for (const predId of predecessors) {
      if (!execution.completedNodes.includes(predId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 构建邻接表
   */
  private buildAdjacencyList(edges: UnifiedWorkflowEdge[]): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    for (const edge of edges) {
      const targets = adjacencyList.get(edge.target) || [];
      targets.push(edge.source);
      adjacencyList.set(edge.target, targets);
    }

    return adjacencyList;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(
    nodes: UnifiedWorkflowNode[],
    edges: UnifiedWorkflowEdge[]
  ): string[] {
    const inDegree = new Map<string, number>();
    const nodeSet = new Set(nodes.map(n => n.id));

    // 初始化入度
    for (const node of nodes) {
      inDegree.set(node.id, 0);
    }

    // 计算入度
    for (const edge of edges) {
      if (inDegree.has(edge.target)) {
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    // 找到所有入度为0的节点
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // 拓扑排序
    const result: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      // 找到所有以当前节点为起点的边，减少目标节点的入度
      for (const edge of edges) {
        if (edge.source === nodeId) {
          inDegree.set(edge.target, (inDegree.get(edge.target) || 0) - 1);
          if (inDegree.get(edge.target) === 0) {
            queue.push(edge.target);
          }
        }
      }
    }

    // 检查是否有环
    if (result.length !== nodes.length) {
      throw new Error('工作流包含循环依赖');
    }

    return result;
  }

  /**
   * 解析工作流定义
   */
  private parseWorkflowDefinition(workflow: any): UnifiedWorkflowDefinition {
    const definition: UnifiedWorkflowDefinition = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      version: 1,
      status: workflow.isActive ? 'active' : 'draft',
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      variables: workflow.config?.variables || {},
      settings: {
        timezone: workflow.config?.timezone || 'Asia/Shanghai',
        saveManualExecutions: workflow.config?.saveManualExecutions ?? true,
        saveDataErrorExecution: workflow.config?.saveDataErrorExecution ?? true,
        saveDataSuccessExecution: workflow.config?.saveDataSuccessExecution ?? true,
        executionTimeout: workflow.config?.executionTimeout || 300000, // 5分钟
        retryPolicy: {
          maxRetries: workflow.config?.retryPolicy?.maxRetries || 3,
          retryDelay: workflow.config?.retryPolicy?.retryDelay || 1000,
          exponentialBackoff: workflow.config?.retryPolicy?.exponentialBackoff || false,
        },
        parallelExecution: workflow.config?.parallelExecution || false,
        batchSize: workflow.config?.batchSize || 10,
      },
      tags: workflow.tags || [],
      metadata: {
        author: workflow.authorId,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      },
      triggers: workflow.config?.triggers || [],
    };

    return definition;
  }

  /**
   * 创建执行上下文
   */
  private createExecutionContext(
    workflowDefinition: UnifiedWorkflowDefinition,
    inputVariables: Record<string, any>
  ): Record<string, any> {
    return {
      ...workflowDefinition.variables,
      ...inputVariables,
      workflow: {
        id: workflowDefinition.id,
        name: workflowDefinition.name,
        category: workflowDefinition.category,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 创建执行记录（数据库）
   */
  private async createExecutionRecord(execution: UnifiedWorkflowExecution): Promise<void> {
    try {
      await prisma.task_executions.create({
        data: {
          id: execution.id,
          userId: execution.userId,
          workflowId: execution.workflowId,
          input: execution.inputs,
          output: execution.outputs,
          status: execution.status,
          progress: 0,
          startedAt: execution.startTime,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      logger.error('创建执行记录失败', error);
      throw error;
    }
  }

  /**
   * 更新执行记录（数据库）
   */
  private async updateExecutionRecord(execution: UnifiedWorkflowExecution): Promise<void> {
    try {
      const progress = execution.completedNodes.length / (execution.nodeResults?.size || 1) * 100;

      await prisma.task_executions.update({
        where: { id: execution.id },
        data: {
          output: execution.outputs,
          status: execution.status as any,
          progress,
          error: execution.error,
          completedAt: execution.endTime,
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      logger.error('更新执行记录失败', error);
      // 不抛出错误，避免影响工作流执行
    }
  }
}

export default WorkflowExecutor;
