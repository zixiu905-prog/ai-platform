#!/usr/bin/env node

/**
 * 工作流服务迁移脚本
 * 将所有使用旧工作流服务的代码迁移到统一工作流服务
 */

const fs = require('fs');
const path = require('path');

// 需要更新的文件和对应的导入映射
const serviceMappings = {
  'WorkflowEngine': 'UnifiedWorkflowService',
  'N8NWorkflowService': 'UnifiedWorkflowService', 
  'N8NNodeExecutor': 'UnifiedWorkflowService',
  'WorkflowMonitorService': 'UnifiedWorkflowService',
  'WorkflowOptimizationService': 'UnifiedWorkflowService'
};

// 类型映射
const typeMappings = {
  'WorkflowNode': 'UnifiedWorkflowNode',
  'WorkflowEdge': 'UnifiedWorkflowEdge',
  'WorkflowDefinition': 'UnifiedWorkflowDefinition',
  'WorkflowExecution': 'UnifiedWorkflowExecution',
  'WorkflowExecutionResult': 'UnifiedWorkflowExecution',
  'N8NNode': 'UnifiedWorkflowNode',
  'N8NWorkflow': 'UnifiedWorkflowDefinition',
  'WorkflowMonitor': 'UnifiedWorkflowExecution', // 合并到执行中
  'WorkflowOptimizationResult': 'WorkflowOptimizationMetrics'
};

// 方法映射
const methodMappings = {
  'executeWorkflow': 'executeWorkflow',
  'createWorkflow': 'createWorkflow',
  'getWorkflowStatistics': 'getPerformanceMetrics',
  'optimizeWorkflowForTokenSaving': 'optimizeWorkflow',
  'startMonitoring': undefined, // 监控功能现在集成在执行中
  'updateNodeStatus': undefined // 节点状态现在自动更新
};

function updateFile(filePath) {
  try {
    console.log(`正在处理文件: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // 更新导入语句
    for (const [oldImport, newImport] of Object.entries(serviceMappings)) {
      const importRegex = new RegExp(`import.*${oldImport}.*from.*['"]\.\/.*${oldImport.toLowerCase()}Service['"];?`, 'g');
      const newImportStatement = `import { ${oldImport} } from './unifiedWorkflowService';`;
      
      if (importRegex.test(content)) {
        content = content.replace(importRegex, newImportStatement);
        updated = true;
        console.log(`  更新导入: ${oldImport} -> UnifiedWorkflowService`);
      }
    }

    // 更新类型定义
    for (const [oldType, newType] of Object.entries(typeMappings)) {
      const typeRegex = new RegExp(`\\b${oldType}\\b`, 'g');
      if (typeRegex.test(content) && oldType !== newType) {
        content = content.replace(typeRegex, newType);
        updated = true;
        console.log(`  更新类型: ${oldType} -> ${newType}`);
      }
    }

    // 更新方法调用
    for (const [oldMethod, newMethod] of Object.entries(methodMappings)) {
      if (newMethod) {
        const methodRegex = new RegExp(`\\.${oldMethod}\\(`, 'g');
        if (methodRegex.test(content)) {
          content = content.replace(methodRegex, `.${newMethod}(`);
          updated = true;
          console.log(`  更新方法: ${oldMethod} -> ${newMethod}`);
        }
      } else {
        // 如果方法被弃用，添加注释
        const methodRegex = new RegExp(`(\\s*\\.?${oldMethod}\\([^)]*\\))`, 'g');
        if (methodRegex.test(content)) {
          content = content.replace(methodRegex, ' // TODO: 此方法已被弃用，请使用新的统一API $1');
          updated = true;
          console.log(`  标记弃用方法: ${oldMethod}`);
        }
      }
    }

    // 更新实例化
    const instantiationRegex = /new (WorkflowEngine|N8NWorkflowService|N8NNodeExecutor|WorkflowMonitorService|WorkflowOptimizationService)\(\)/g;
    if (instantiationRegex.test(content)) {
      content = content.replace(instantiationRegex, 'new UnifiedWorkflowService()');
      updated = true;
      console.log(`  更新实例化 -> UnifiedWorkflowService`);
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ 已更新: ${filePath}`);
    } else {
      console.log(`- 无需更新: ${filePath}`);
    }

  } catch (error) {
    console.error(`处理文件失败 ${filePath}:`, error.message);
  }
}

function findFilesToUpdate(dir, extensions = ['.ts', '.js']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和 dist
        if (!['node_modules', 'dist', '.git'].includes(item)) {
          traverse(fullPath);
        }
      } else if (extensions.includes(path.extname(item))) {
        // 只处理可能使用工作流服务的文件
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const usesWorkflowService = Object.keys(serviceMappings).some(service => 
            content.includes(service)
          );
          
          if (usesWorkflowService) {
            files.push(fullPath);
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

// 创建迁移报告
function generateMigrationReport(updatedFiles, totalFiles) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFilesScanned: totalFiles,
      filesUpdated: updatedFiles.length,
      successRate: ((updatedFiles.length / totalFiles) * 100).toFixed(2) + '%'
    },
    updatedFiles,
    nextSteps: [
      '1. 检查所有更新后的文件，确保功能正常',
      '2. 运行测试套件验证迁移结果',
      '3. 更新相关的API文档',
      '4. 检查弃用的方法调用并替换为新API',
      '5. 验证工作流执行功能',
      '6. 测试新的优化和监控功能'
    ],
    notes: [
      '所有旧的工作流服务已合并到 UnifiedWorkflowService',
      '监控功能现在集成在工作流执行中',
      '部分方法参数可能需要调整以适应新的统一API',
      '类型定义已统一，可能需要更新相关的接口定义'
    ]
  };

  const reportPath = './workflow-migration-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n迁移报告已生成: ${reportPath}`);
}

// 主函数
function main() {
  console.log('开始工作流服务迁移...\n');
  
  const projectDir = path.join(__dirname, '..');
  const srcDir = path.join(projectDir, 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('src 目录不存在，请确保在正确的项目目录中运行此脚本');
    process.exit(1);
  }

  // 查找需要更新的文件
  const filesToUpdate = findFilesToUpdate(srcDir);
  const totalFiles = filesToUpdate.length;
  
  console.log(`找到 ${totalFiles} 个需要检查的文件\n`);

  if (filesToUpdate.length === 0) {
    console.log('没有找到需要更新的文件');
    return;
  }

  // 更新文件
  const updatedFiles = [];
  for (const file of filesToUpdate) {
    updateFile(file);
    updatedFiles.push(file);
  }

  // 生成报告
  generateMigrationReport(updatedFiles, totalFiles);
  
  console.log('\n迁移完成！');
  console.log(`\n统计: ${updatedFiles.length}/${totalFiles} 个文件已更新`);
  console.log('\n请检查迁移报告并根据后续步骤进行验证。');
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  updateFile,
  findFilesToUpdate,
  generateMigrationReport
};