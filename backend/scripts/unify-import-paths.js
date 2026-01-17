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

// 计算相对路径深度
function calculateDepth(filePath, basePath) {
  const relative = path.relative(basePath, filePath);
  const parts = relative.split(path.sep);
  return parts.length - 1;
}

const srcDir = path.join(__dirname, '..', 'src');
const tsFiles = findFiles(srcDir, '.ts');

let fixedCount = 0;
let errorCount = 0;

console.log('🔧 开始统一导入路径...\n');

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // 跳过配置文件
    if (filePath.includes('config/')) {
      return;
    }

    let hasChanges = false;

    // 获取当前文件的深度
    const depth = calculateDepth(filePath, srcDir);
    const relativeFromSrc = path.relative(srcDir, filePath);
    const currentDir = path.dirname(relativeFromSrc);

    // 1. 替换相对导入为绝对路径导入
    const importRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    
    content = content.replace(importRegex, (match, importPath) => {
      // 跳过外部库导入
      if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
        return match;
      }

      // 跳过JSON文件导入
      if (importPath.endsWith('.json')) {
        return match;
      }

      // 解析绝对路径
      const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
      const absoluteImportRelative = path.relative(srcDir, absoluteImportPath);
      
      // 确定替换路径
      if (absoluteImportRelative.startsWith('services/')) {
        hasChanges = true;
        return match.replace(importPath, '@/services/' + absoluteImportRelative.slice(9));
      } else if (absoluteImportRelative.startsWith('controllers/')) {
        hasChanges = true;
        return match.replace(importPath, '@/controllers/' + absoluteImportRelative.slice(12));
      } else if (absoluteImportRelative.startsWith('middleware/')) {
        hasChanges = true;
        return match.replace(importPath, '@/middleware/' + absoluteImportRelative.slice(11));
      } else if (absoluteImportRelative.startsWith('utils/')) {
        hasChanges = true;
        return match.replace(importPath, '@/utils/' + absoluteImportRelative.slice(6));
      } else if (absoluteImportRelative.startsWith('types/')) {
        hasChanges = true;
        return match.replace(importPath, '@/types/' + absoluteImportRelative.slice(6));
      } else if (absoluteImportRelative.startsWith('config/')) {
        hasChanges = true;
        return match.replace(importPath, '@/config/' + absoluteImportRelative.slice(7));
      } else if (absoluteImportRelative.startsWith('adapters/')) {
        hasChanges = true;
        return match.replace(importPath, '@/adapters/' + absoluteImportRelative.slice(9));
      } else if (absoluteImportRelative.startsWith('routes/')) {
        hasChanges = true;
        return match.replace(importPath, '@/routes/' + absoluteImportRelative.slice(7));
      } else if (absoluteImportRelative.startsWith('data/')) {
        hasChanges = true;
        return match.replace(importPath, '@/data/' + absoluteImportRelative.slice(5));
      } else if (absoluteImportRelative.startsWith('jobs/')) {
        hasChanges = true;
        return match.replace(importPath, '@/jobs/' + absoluteImportRelative.slice(5));
      }

      return match;
    });

    // 2. 简化过度复杂的相对路径
    content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\//g, "from '@/");
    content = content.replace(/from\s+['"]\.\.\/\.\.\//g, "from '@/");
    content = content.replace(/from\s+['"]\.\.\//g, "from '@/");

    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 已统一: ${relativePath}`);
      fixedCount++;
    }

  } catch (error) {
    console.error(`❌ 统一失败 ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 统计完成统计:`);
console.log(`✅ 成功统一: ${fixedCount} 个文件`);
console.log(`❌ 统一失败: ${errorCount} 个文件`);
console.log(`📝 总计处理: ${tsFiles.length} 个文件`);

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 导入路径统一完成！');
}