import { api } from './api';
import { 
  Workflow, 
  WorkflowDefinition, 
  WorkflowTemplate, 
  NodeType, 
  WorkflowExecution, 
  WorkflowStatistics 
} from '../types/workflow';

export const workflowApi = {
  // 获取工作流列表
  async getWorkflows(params?: {
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/workflows', { params });
    return response.data;
  },

  // 获取N8N工作流列表
  async getN8nWorkflows(params?: {
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/n8n-workflows', { params });
    return response.data;
  },

  // 获取工作流详情
  async getWorkflow(id: string) {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  // 创建工作流
  async createWorkflow(data: {
    name: string;
    description?: string;
    category?: string;
    definition: WorkflowDefinition;
    settings?: any;
    tags?: string[];
  }) {
    const response = await api.post('/workflows', data);
    return response.data;
  },

  // 创建N8N工作流
  async createN8nWorkflow(data: {
    name: string;
    description?: string;
    category?: string;
    definition: WorkflowDefinition;
    settings?: any;
    tags?: string[];
  }) {
    const response = await api.post('/n8n-workflows', data);
    return response.data;
  },

  // 更新工作流
  async updateWorkflow(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    definition?: WorkflowDefinition;
    settings?: any;
    status?: string;
    tags?: string[];
  }) {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
  },

  // 删除工作流
  async deleteWorkflow(id: string) {
    const response = await api.delete(`/workflows/${id}`);
    return response.data;
  },

  // 执行工作流
  async executeWorkflow(id: string, options?: {
    mode?: 'manual' | 'trigger';
    startNode?: string;
    data?: any;
    retryOf?: string;
  }) {
    const response = await api.post(`/workflows/${id}/execute`, options);
    return response.data;
  },

  // 执行N8N工作流
  async executeN8nWorkflow(id: string, options?: {
    mode?: 'manual' | 'trigger';
    startNode?: string;
    data?: any;
    retryOf?: string;
  }) {
    const response = await api.post(`/n8n-workflows/${id}/execute`, options);
    return response.data;
  },

  // 克隆工作流
  async cloneWorkflow(id: string, newName?: string) {
    const response = await api.post(`/workflows/${id}/clone`, { newName });
    return response.data;
  },

  // 克隆N8N工作流
  async cloneN8nWorkflow(id: string, newName?: string) {
    const response = await api.post(`/n8n-workflows/${id}/clone`, { newName });
    return response.data;
  },

  // 复制工作流（别名）
  async duplicateWorkflow(id: string, newName?: string) {
    return this.cloneWorkflow(id, newName);
  },

  // 更新工作流状态
  async updateWorkflowStatus(id: string, status: string) {
    const response = await api.patch(`/workflows/${id}/status`, { status });
    return response.data;
  },

  // 导出工作流
  async exportWorkflow(id: string) {
    const response = await api.get(`/workflows/${id}/export`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // 导出N8N工作流
  async exportN8nWorkflow(id: string) {
    const response = await api.get(`/n8n-workflows/${id}/export`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // 导入工作流
  async importWorkflow(data: any) {
    const formData = new FormData();
    formData.append('file', data);
    
    const response = await api.post('/workflows/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // 导入N8N工作流
  async importN8nWorkflow(data: any) {
    const response = await api.post('/n8n-workflows/import', data);
    return response.data;
  },

  // 获取工作流模板
  async getTemplates(params?: { category?: string }) {
    const response = await api.get('/workflows/templates', { params });
    return response.data;
  },

  // 获取N8N工作流模板
  async getN8nTemplates(params?: { category?: string }) {
    const response = await api.get('/n8n-workflows/templates', { params });
    return response.data;
  },

  // 从模板创建工作流
  async createFromTemplate(templateId: string, data: {
    name: string;
    description?: string;
  }) {
    const response = await api.post('/workflows/from-template', {
      templateId,
      ...data
    });
    return response.data;
  },

  // 获取工作流执行历史
  async getExecutions(id: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const response = await api.get(`/workflows/${id}/executions`, { params });
    return response.data;
  },

  // 获取N8N工作流执行历史
  async getN8nExecutions(id: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const response = await api.get(`/n8n-workflows/${id}/executions`, { params });
    return response.data;
  },

  // 获取执行状态
  async getExecutionStatus(executionId: string) {
    const response = await api.get(`/workflows/executions/${executionId}/status`);
    return response.data;
  },

  // 获取N8N执行状态
  async getN8nExecutionStatus(executionId: string) {
    const response = await api.get(`/n8n-workflows/executions/${executionId}/status`);
    return response.data;
  },

  // 停止执行
  async stopExecution(executionId: string) {
    const response = await api.post(`/workflows/executions/${executionId}/stop`);
    return response.data;
  },

  // 停止N8N执行
  async stopN8nExecution(executionId: string) {
    const response = await api.post(`/n8n-workflows/executions/${executionId}/stop`);
    return response.data;
  },

  // 获取活跃执行
  async getActiveExecutions() {
    const response = await api.get('/workflows/active/executions');
    return response.data;
  },

  // 获取N8N活跃执行
  async getN8nActiveExecutions() {
    const response = await api.get('/n8n-workflows/active/executions');
    return response.data;
  },

  // 获取节点类型
  async getNodeTypes() {
    const response = await api.get('/n8n-workflows/node-types');
    return response.data;
  },

  // 创建Webhook触发器
  async createWebhookTrigger(workflowId: string, nodeId: string, options: {
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path?: string;
    authentication?: 'none' | 'basic' | 'header';
    credentials?: Record<string, string>;
  }) {
    const response = await api.post(`/n8n-workflows/${workflowId}/nodes/${nodeId}/webhooks`, options);
    return response.data;
  },

  // 创建定时触发器
  async createScheduleTrigger(workflowId: string, nodeId: string, config: {
    cronExpression: string;
    timezone?: string;
    enabled?: boolean;
  }) {
    const response = await api.post(`/n8n-workflows/${workflowId}/nodes/${nodeId}/schedules`, config);
    return response.data;
  },

  // 获取工作流统计
  async getStatistics(workflowId: string) {
    const response = await api.get(`/workflows/${workflowId}/statistics`);
    return response.data;
  },

  // 获取N8N工作流统计
  async getN8nStatistics(workflowId: string) {
    const response = await api.get(`/n8n-workflows/${workflowId}/statistics`);
    return response.data;
  },

  // 上传工作流文件
  async uploadWorkflowFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/workflows/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // 验证工作流
  async validateWorkflow(definition: WorkflowDefinition) {
    const response = await api.post('/workflows/validate', { definition });
    return response.data;
  },

  // 预览工作流执行
  async previewExecution(id: string, data?: any) {
    const response = await api.post(`/workflows/${id}/preview`, { data });
    return response.data;
  },

  // 获取工作流日志
  async getExecutionLogs(executionId: string) {
    const response = await api.get(`/workflows/executions/${executionId}/logs`);
    return response.data;
  },

  // 重试执行
  async retryExecution(executionId: string) {
    const response = await api.post(`/workflows/executions/${executionId}/retry`);
    return response.data;
  },

  // 导出执行结果
  async exportExecutionResult(executionId: string, format: 'json' | 'csv' | 'xlsx' = 'json') {
    const response = await api.get(`/workflows/executions/${executionId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
};

export default workflowApi;