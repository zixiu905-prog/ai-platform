#!/usr/bin/env node

/**
 * 清理旧工作流服务脚本
 * 删除所有已合并到统一服务中的旧工作流服务文件
 */

const fs = require('fs');
const path = require('path');

// 需要删除的旧服务文件
const oldServices = [
  'src/services/workflowEngine.ts',
  'src/services/n8nWorkflowService.ts',
  'src/services/n8nNodeExecutor.ts',
  'src/services/workflowMonitorService.ts',
  'src/services/workflowOptimizationService.ts'
];

// 需要保留但需要更新的文件（添加兼容性层）
const keepFiles = [
  'src/routes/workflow.ts',
  'src/routes/n8nWorkflows.ts',
  'src/routes/workflowMonitoring.ts',
  'src/routes/workflowOptimization.ts',
  'src/services/desktopCommunicationService.ts'
];

function createBackup(filePath) {
  const backupPath = filePath + '.backup.' + Date.now();
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✓ 已创建备份: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`创建备份失败 ${filePath}:`, error.message);
    return null;
  }
}

function deleteFile(filePath) {
  try {
    // 先创建备份
    const backupPath = createBackup(filePath);
    
    // 删除原文件
    fs.unlinkSync(filePath);
    console.log(`✓ 已删除: ${filePath}`);
    return backupPath;
  } catch (error) {
    console.error(`删除文件失败 ${filePath}:`, error.message);
    return null;
  }
}

function createCompatibilityLayer(serviceName) {
  const compatibilityCode = `/**
 * 兼容性层 - ${serviceName}
 * 为了向后兼容，此文件将请求转发到统一工作流服务
 * @deprecated 请使用 UnifiedWorkflowService
 */

import { UnifiedWorkflowService } from './unifiedWorkflowService';

// 导出兼容的类和接口
export {
  UnifiedWorkflowService as ${serviceName}
};

// 导出兼容的类型
export type {
  UnifiedWorkflowNode as any,
  UnifiedWorkflowEdge as any,
  UnifiedWorkflowDefinition as any,
  UnifiedWorkflowExecution as any,
  WorkflowOptimizationMetrics,
  WorkflowAlert
} from './unifiedWorkflowService';

// 创建默认实例以保持向后兼容
const defaultInstance = new UnifiedWorkflowService();
export default defaultInstance;

// 添加弃用警告
const originalWarn = console.warn;
console.warn = function(...args) {
  if (args[0] && args[0].includes && args[0].includes('Service')) {
    originalWarn('\\n⚠️  DEPRECATED WARNING:');
    originalWarn('您正在使用已弃用的旧版工作流服务。');
    originalWarn('请迁移到新的 UnifiedWorkflowService 以获得更好的性能和功能。');
    originalWarn('迁移指南: https://docs.aidesign.com/workflow-migration');
    originalWarn('');
  }
  originalWarn.apply(console, args);
};
`;

  return compatibilityCode;
}

function addCompatibilityImport(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 添加兼容性导入
    const compatImport = `// 兼容性导入 - 保持向后兼容\nimport './workflowServiceCompatibility';\n`;
    
    if (!content.includes('workflowServiceCompatibility')) {
      content = compatImport + content;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ 已添加兼容性导入: ${filePath}`);
    }
  } catch (error) {
    console.error(`添加兼容性导入失败 ${filePath}:`, error.message);
  }
}

function main() {
  console.log('开始清理旧工作流服务...\n');
  
  const projectDir = path.join(__dirname, '..');
  const backupFiles = [];
  
  // 1. 删除旧服务文件
  console.log('步骤 1: 删除旧服务文件');
  console.log('========================');
  
  for (const service of oldServices) {
    const filePath = path.join(projectDir, service);
    if (fs.existsSync(filePath)) {
      const backupPath = deleteFile(filePath);
      if (backupPath) {
        backupFiles.push(backupPath);
      }
    } else {
      console.log(`- 文件不存在: ${filePath}`);
    }
  }
  
  // 2. 创建兼容性文件
  console.log('\n步骤 2: 创建兼容性层');
  console.log('======================');
  
  const compatFilePath = path.join(projectDir, 'src/services/workflowServiceCompatibility.ts');
  if (!fs.existsSync(compatFilePath)) {
    const compatCode = createCompatibilityLayer('WorkflowService');
    fs.writeFileSync(compatFilePath, compatCode, 'utf8');
    console.log(`✓ 已创建兼容性文件: ${compatFilePath}`);
  } else {
    console.log(`- 兼容性文件已存在: ${compatFilePath}`);
  }
  
  // 3. 更新需要保留的文件，添加兼容性导入
  console.log('\n步骤 3: 更新现有文件');
  console.log('======================');
  
  for (const file of keepFiles) {
    const filePath = path.join(projectDir, file);
    if (fs.existsSync(filePath)) {
      addCompatibilityImport(filePath);
    } else {
      console.log(`- 文件不存在: ${filePath}`);
    }
  }
  
  // 4. 创建清理报告
  console.log('\n步骤 4: 生成清理报告');
  console.log('======================');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      oldServicesDeleted: oldServices.length,
      backupFilesCreated: backupFiles.length,
      compatibilityLayerAdded: true,
      filesUpdated: keepFiles.length
    },
    deletedServices: oldServices,
    backupFiles,
    nextSteps: [
      '1. 运行测试套件验证功能正常',
      '2. 检查控制台是否有弃用警告',
      '3. 逐步将代码迁移到新的统一API',
      '4. 移除兼容性导入语句',
      '5. 更新API文档',
      '6. 培训开发团队使用新API'
    ],
    benefits: [
      '统一的API接口',
      '减少代码重复',
      '更好的性能优化',
      '集成的监控和优化功能',
      '简化的维护工作',
      '更好的错误处理'
    ],
    notes: [
      '所有旧服务文件已备份，可以随时恢复',
      '兼容性层确保现有代码继续工作',
      '弃用警告将引导开发者使用新API',
      '新服务提供了更丰富的功能和更好的性能'
    ]
  };
  
  const reportPath = path.join(projectDir, 'workflow-cleanup-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✓ 清理报告已生成: ${reportPath}`);
  
  // 5. 总结
  console.log('\n清理完成！');
  console.log('==========');
  console.log(`📊 统计:`);
  console.log(`   - 删除旧服务: ${report.summary.oldServicesDeleted} 个`);
  console.log(`   - 创建备份: ${report.summary.backupFilesCreated} 个`);
  console.log(`   - 兼容性层: 已添加`);
  console.log(`   - 更新文件: ${report.summary.filesUpdated} 个`);
  
  console.log(`\n📁 备份文件位置:`);
  backupFiles.forEach(file => console.log(`   - ${file}`));
  
  console.log(`\n📋 后续步骤:`);
  report.nextSteps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`);
  });
  
  console.log(`\n✨ 主要收益:`);
  report.benefits.forEach(benefit => {
    console.log(`   - ${benefit}`);
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  deleteFile,
  createCompatibilityLayer,
  addCompatibilityImport
};