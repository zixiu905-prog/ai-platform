#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 只修复最关键的语法错误，让项目能够编译通过
const criticalFiles = [
  'src/adapters/blenderAdapter.ts',
  'src/adapters/illustratorAdvancedAdapter.ts',
  'src/adapters/photoshopAdvancedAdapter.ts',
  'src/services/aiDesignIntegrationService.ts',
  'src/services/unifiedWorkflowService.ts',
  'src/utils/socket.ts'
];

function fixTryCatch(content) {
  // 快速修复最常见的try-catch语法错误
  return content
    // 修复缺失的try关键字
    .replace(/^(\s*)} logger\.error.*catch\s*\(/gm, '$1} catch (')
    // 删除错误插入的logger行
    .replace(/logger\.error\('操作失败:',\s*error\);\s*/g, '')
    // 修复缺失的大括号
    .replace(/catch\s*\([^)]*\)\s*throw/g, 'catch (error) {\n      logger.error("操作失败:", error);\n      throw')
    // 修复多余的右大括号
    .replace(/};\s*}/g, '};\n  }')
    // 修复空catch块
    .replace(/catch\s*\([^)]*\)\s*\{\s*\}/g, 'catch (error) {\n      logger.error("操作失败:", error);\n    }');
}

console.log('🔧 开始最小化语法修复...\n');

let fixedCount = 0;

criticalFiles.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    content = fixTryCatch(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ 已快速修复: ${filePath}`);
      fixedCount++;
    } else {
      console.log(`ℹ️  无需修复: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ 修复失败 ${filePath}:`, error.message);
  }
});

console.log(`\n📊 快速修复完成: ${fixedCount} 个文件`);
console.log('\n🎉 尝试编译检查...');