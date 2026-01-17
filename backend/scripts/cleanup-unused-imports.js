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

// 提取导入的标识符
function extractImports(content) {
  const imports = [];
  
  // 匹配 import { ... } from '...' 格式
  const namedImports = content.match(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"];?/g);
  if (namedImports) {
    namedImports.forEach(imp => {
      const names = imp.match(/\{([^}]+)\}/)[1];
      const identifiers = names.split(',').map(name => {
        const trimmed = name.trim();
        if (trimmed.includes(' as ')) {
          return trimmed.split(' as ')[1].trim();
        }
        return trimmed;
      });
      imports.push(...identifiers);
    });
  }
  
  // 匹配 import * as ... from '...' 格式
  const starImports = content.match(/import\s*\*\s+as\s+(\w+)\s*from\s*['"][^'"]+['"];?/g);
  if (starImports) {
    starImports.forEach(imp => {
      const match = imp.match(/import\s*\*\s+as\s+(\w+)/);
      if (match) imports.push(match[1]);
    });
  }
  
  // 匹配 import ... from '...' 格式
  const defaultImports = content.match(/import\s+(\w+)\s*from\s*['"][^'"]+['"];?/g);
  if (defaultImports) {
    defaultImports.forEach(imp => {
      const match = imp.match(/import\s+(\w+)\s*from/);
      if (match) imports.push(match[1]);
    });
  }
  
  return imports;
}

// 检查标识符是否在代码中使用
function isUsed(identifier, content) {
  // 创建正则表达式，匹配标识符的使用
  const regex = new RegExp(`\\b${identifier}\\b`, 'g');
  const matches = content.match(regex);
  
  if (!matches) return false;
  
  // 计算使用次数，排除导入语句中的使用
  const lines = content.split('\n');
  let usageCount = 0;
  
  lines.forEach(line => {
    // 跳过导入行
    if (line.trim().startsWith('import ')) return;
    
    // 跳过注释行
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    
    // 跳过export语句中的使用（如重新导出）
    if (line.includes('export ') && line.includes(identifier)) return;
    
    // 检查标识符是否在行中使用
    const lineRegex = new RegExp(`\\b${identifier}\\b`);
    if (lineRegex.test(line)) {
      usageCount++;
    }
  });
  
  return usageCount > 0;
}

const srcDir = path.join(__dirname, '..', 'src');
const tsFiles = findFiles(srcDir, '.ts');

let fixedCount = 0;
let errorCount = 0;

console.log('🔧 开始清理未使用的导入...\n');

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // 跳过某些特殊文件
    if (filePath.includes('types/') || filePath.includes('__tests__')) {
      return;
    }

    // 提取所有导入
    const imports = extractImports(content);
    
    // 检查每个导入是否被使用
    const unusedImports = imports.filter(imp => !isUsed(imp, content));
    
    if (unusedImports.length > 0) {
      // 移除未使用的导入
      unusedImports.forEach(unusedImport => {
        // 创建更精确的正则表达式来匹配未使用的导入
        const importRegex = new RegExp(
          `import\\s*\\{[^}]*\\b${unusedImport}\\b[^}]*\\}\\s*from\\s*['"][^'"]+['"];?\\s*\\n?`,
          'g'
        );
        
        // 对于单个导入的特殊处理
        const singleImportRegex = new RegExp(
          `import\\s*\\{\\s*${unusedImport}\\s*\\}\\s*from\\s*['"][^'"]+['"];?\\s*\\n?`,
          'g'
        );
        
        content = content.replace(importRegex, (match) => {
          // 移除未使用的标识符，保留其他可能使用的
          const innerContent = match.match(/\{([^}]+)\}/)[1];
          const names = innerContent.split(',').map(name => name.trim());
          const usedNames = names.filter(name => {
            const identifier = name.includes(' as ') ? name.split(' as ')[1].trim() : name;
            return identifier !== unusedImport;
          });
          
          if (usedNames.length === 0) {
            return ''; // 完全删除导入
          }
          
          // 重建导入语句
          const fromMatch = match.match(/from\s*['"][^'"]+['"]/);
          const fromStatement = fromMatch ? fromMatch[0] : '';
          return `import { ${usedNames.join(', ')} } ${fromStatement};\n`;
        });
      });
      
      // 清理多余的空行
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ 已清理: ${relativePath} (移除 ${unusedImports.length} 个未使用导入)`);
        fixedCount++;
      }
    }

  } catch (error) {
    console.error(`❌ 清理失败 ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 清理完成统计:`);
console.log(`✅ 成功清理: ${fixedCount} 个文件`);
console.log(`❌ 清理失败: ${errorCount} 个文件`);
console.log(`📝 总计处理: ${tsFiles.length} 个文件`);

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 未使用导入清理完成！');
}