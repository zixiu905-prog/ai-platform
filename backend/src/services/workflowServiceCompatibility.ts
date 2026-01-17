/**
 * 兼容性层 - WorkflowService
 * 为了向后兼容，此文件将请求转发到统一工作流服务
 * @deprecated 请使用 UnifiedWorkflowService
 */

import { UnifiedWorkflowService } from '../services/unifiedWorkflowService';
import type {
  UnifiedWorkflowNode,
  UnifiedWorkflowEdge,
  UnifiedWorkflowDefinition,
  UnifiedWorkflowExecution
} from './unifiedWorkflowService_new_types';

// 导出兼容的类和接口
export {
  UnifiedWorkflowService as WorkflowService
};

// 导出兼容的类型
export type {
  UnifiedWorkflowNode,
  UnifiedWorkflowEdge,
  UnifiedWorkflowDefinition,
  UnifiedWorkflowExecution
};

// 创建默认实例以保持向后兼容
const defaultInstance = new UnifiedWorkflowService();
export default defaultInstance;

// 添加弃用警告
const originalWarn = console.warn;
console.warn = function(...args) {
  if (args[0] && args[0].includes && args[0].includes('Service')) {
    originalWarn('\n⚠️  DEPRECATED WARNING:');
    originalWarn('您正在使用已弃用的旧版工作流服务。');
    originalWarn('请迁移到新的 UnifiedWorkflowService 以获得更好的性能和功能。');
    originalWarn('迁移指南: https://docs.aidesign.com/workflow-migration');
    originalWarn('');
  }
  originalWarn.apply(console, args);
};
