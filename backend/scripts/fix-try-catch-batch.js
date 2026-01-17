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

console.log('🔧 开始批量修复try-catch语法错误...\n');

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // 跳过某些特定文件
    if (filePath.includes('types/') || filePath.includes('__tests__') || filePath.includes('config/')) {
      return;
    }

    let hasChanges = false;

    // 1. 修复错误的 try-catch 结构 - 捕获特定的错误模式
    content = content.replace(
      /try\s*\{[^}]*\}\s*logger\.error\([^)]*\);\s*catch\s*\(/g,
      (match) => {
        hasChanges = true;
        // 移除错误插入的logger语句
        return match.replace(/}\s*logger\.error\([^)]*\);\s*catch\s*\(/, '} catch(');
      }
    );

    // 2. 修复多行 try-catch 错误
    const lines = content.split('\n');
    let newLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // 检测错误模式：一行包含 } logger.error('操作失败:', error);
      if (line.trim().includes('} logger.error('操作失败:", error)')) {
        // 删除这一行，下一行应该是 catch
        hasChanges = true;
        i++; // 跳过这一行
        if (i < lines.length && lines[i].trim().startsWith('catch')) {
          newLines.push(lines[i]);
        }
      } else {
        newLines.push(line);
      }
      i++;
    }
    
    content = newLines.join('\n');

    // 3. 修复其他可能的语法错误
    // 修复额外的右大括号
    content = content.replace(/}\s*;\s*}/g, '});');
    
    // 修复空的catch块
    content = content.replace(
      /catch\s*\([^)]*\)\s*\{\s*\}/g,
      'catch (error) {\n        logger.error("操作失败:", error);\n      }'
    );

    if (hasChanges || content !== originalContent) {
      fs.writeFileSync(filePath, content);
      if (hasChanges) {
        console.log(`✅ 已修复: ${relativePath}`);
        fixedCount++;
      }
    }

  } catch (error) {
    console.error(`❌ 修复失败 ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 修复完成统计:`);
console.log(`✅ 成功修复: ${fixedCount} 个文件`);
console.log(`❌ 修复失败: ${errorCount} 个文件`);
console.log(`📝 总计处理: ${tsFiles.length} 个文件`);

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 批量try-catch语法修复完成！');
}