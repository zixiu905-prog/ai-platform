#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findFiles(dir, extension) {
  let files = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files = files.concat(findFiles(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // 忽略权限错误等
  }
  return files;
}

const srcDir = path.join(__dirname, '..', 'src');
const tsFiles = findFiles(srcDir, '.ts');

let fixedCount = 0;
let errorCount = 0;

console.log('🔧 开始标准化错误处理...\n');

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // 跳过配置文件和工具文件
    if (filePath.includes('config/') || filePath.includes('utils/') || filePath.includes('types/')) {
      return;
    }

    let hasChanges = false;

    // 1. 检查是否有logger导入，如果没有则添加
    if (content.includes('catch') && !content.includes('import { logger }')) {
      // 查找第一个import语句
      const importMatch = content.match(/^import\s+.*$/m);
      if (importMatch) {
        const insertIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
        content = content.slice(0, insertIndex) + 
                  '\nimport { logger } from \'../utils/logger\';' + 
                  content.slice(insertIndex);
        hasChanges = true;
      }
    }

    // 2. 将 console.error 替换为 logger.error
    if (content.includes('console.error')) {
      content = content.replace(
        /console\.error\s*\(\s*([^)]+)\s*\)/g,
        'logger.error($1)'
      );
      hasChanges = true;
    }

    // 3. 将 console.warn 替换为 logger.warn
    if (content.includes('console.warn')) {
      content = content.replace(
        /console\.warn\s*\(\s*([^)]+)\s*\)/g,
        'logger.warn($1)'
      );
      hasChanges = true;
    }

    // 4. 将 console.log 替换为 logger.info（仅在错误处理上下文中）
    if (content.includes('console.log')) {
      // 在catch块内的console.log替换为logger.info
      content = content.replace(
        /catch\s*\([^)]*\)\s*\{[^}]*console\.log\s*\([^)]*\)[^}]*\}/gs,
        (match) => {
          return match.replace(/console\.log\s*\(/g, 'logger.info(');
        }
      );
      hasChanges = true;
    }

    // 5. 标准化错误响应格式
    content = content.replace(
      /res\.status\s*\(\s*(\d+)\s*\)\.json\s*\(\s*\{\s*(?:success\s*:\s*false\s*,?\s*)?(?:message\s*:\s*([^,}]+)\s*,?\s*)?(?:error\s*:\s*([^,}]+)\s*)?\}\s*\)/g,
      (match, statusCode, message, error) => {
        let result = `res.status(${statusCode}).json({\n        success: false,`;
        if (message) {
          result += `\n        message: ${message},`;
        }
        if (error) {
          result += `\n        error: ${error},`;
        }
        result += `\n        timestamp: new Date().toISOString()\n      })`;
        return result;
      }
    );

    // 6. 在catch块中添加日志记录
    const catchBlocks = content.match(/catch\s*\([^)]*\)\s*\{[^}]*\}/gs);
    if (catchBlocks) {
      catchBlocks.forEach(block => {
        if (!block.includes('logger.error')) {
          const errorParam = block.match(/catch\s*\(([^)]*)\)/);
          const paramName = errorParam ? errorParam[1] : 'error';
          const newBlock = block.replace(
            'catch',
            `logger.error('操作失败:', ${paramName});\n    catch`
          );
          content = content.replace(block, newBlock);
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 已标准化: ${relativePath}`);
      fixedCount++;
    }

  } catch (error) {
    console.error(`❌ 标准化失败 ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 标准化完成统计:`);
console.log(`✅ 成功标准化: ${fixedCount} 个文件`);
console.log(`❌ 标准化失败: ${errorCount} 个文件`);
console.log(`📝 总计处理: ${tsFiles.length} 个文件`);

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 错误处理标准化完成！');
}