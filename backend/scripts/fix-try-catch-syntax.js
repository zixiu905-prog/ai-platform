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

console.log('🔧 开始修复try-catch语法错误...\n');

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // 修复错误的catch块格式
    // 1. 移除多余的logger语句导致的语法错误
    content = content.replace(
      /logger\.error\('操作失败:',\s*error\);\s*catch\s*\(/g,
      'catch('
    );

    // 2. 修复try-catch结构
    content = content.replace(
      /try\s*\{[^}]*\}\s*logger\.error[^}]*catch\s*\(/g,
      'try {'
    );

    // 3. 修复嵌套的try块
    content = content.replace(
      /}\s*logger\.error[^}]*}\s*catch\s*\(/g,
      '} catch('
    );

    // 4. 修复socket.ts的特殊错误
    content = content.replace(
      /\}\)\s*;\s*\}\s*;\s*\n\s*;/g,
      '});\n\n'
    );

    // 5. 修复其他语法问题
    content = content.replace(
      /}\s*;\s*}\s*;/g,
      '});'
    );

    // 6. 修复空的catch块
    content = content.replace(
      /catch\s*\([^)]*\)\s*\{\s*\}/g,
      'catch (error) {\n        logger.error('操作失败:', error);\n      }'
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 已修复: ${relativePath}`);
      fixedCount++;
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
  console.log('\n🎉 try-catch语法修复完成！');
}