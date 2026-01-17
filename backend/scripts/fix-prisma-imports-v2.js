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
let skippedCount = 0;

console.log('🔧 开始修复Prisma导入问题...\n');

tsFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // 跳过配置文件本身
    if (filePath.includes('config/database.ts')) {
      console.log(`⏭️  跳过配置文件: ${relativePath}`);
      skippedCount++;
      return;
    }

    let hasChanges = false;

    // 1. 替换 "../prisma/client" 导入为 "../config/database"
    if (content.includes('../prisma/client')) {
      content = content.replace(
        /from\s+['"]\.\.\/prisma\/client['"]/g,
        "from '../config/database'"
      );
      content = content.replace(
        /from\s+['"]\.\.\/\.\.\/prisma\/client['"]/g,
        "from '../config/database'"
      );
      hasChanges = true;
    }

    // 2. 删除重复的PrismaClient实例化
    if (content.includes('new PrismaClient()')) {
      // 删除实例化行
      content = content.replace(
        /^\s*const\s+prisma\s*=\s*new\s+PrismaClient\([^)]*\);?\s*$/gm,
        ''
      );
      content = content.replace(
        /^\s*export\s+const\s+prisma\s*=\s*new\s+PrismaClient\([^)]*\);?\s*$/gm,
        ''
      );
      hasChanges = true;
    }

    // 3. 如果文件使用了prisma但没有正确导入，添加导入
    if (content.includes('prisma.') && !content.includes('import { prisma }')) {
      // 查找第一个import语句
      const importMatch = content.match(/^import\s+.*$/m);
      if (importMatch) {
        const insertIndex = content.indexOf(importMatch[0]) + importMatch[0].length;
        content = content.slice(0, insertIndex) + 
                  '\nimport { prisma } from \'../config/database\';' + 
                  content.slice(insertIndex);
        hasChanges = true;
      }
    }

    // 4. 对于只导入PrismaClient但不使用的文件，完全移除导入
    if (content.includes('import { PrismaClient }') && 
        !content.includes('new PrismaClient()') &&
        !content.includes('PrismaClient.')) {
      content = content.replace(
        /import\s*\{\s*PrismaClient[^}]*\}\s*from\s*['"]@prisma\/client['"];?\s*\n?/g,
        ''
      );
      hasChanges = true;
    }

    // 5. 确保使用prisma变量而不是其他变量名
    if (content.includes('prismaClient.') || content.includes('PrismaClient.')) {
      content = content.replace(/\bprismaClient\./g, 'prisma.');
      content = content.replace(/\bPrismaClient\./g, 'prisma.');
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ 已修复: ${relativePath}`);
      fixedCount++;
    } else {
      console.log(`ℹ️  无需修复: ${relativePath}`);
      skippedCount++;
    }

  } catch (error) {
    console.error(`❌ 修复失败 ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 修复完成统计:`);
console.log(`✅ 成功修复: ${fixedCount} 个文件`);
console.log(`⏭️  跳过文件: ${skippedCount} 个文件`);
console.log(`❌ 修复失败: ${errorCount} 个文件`);
console.log(`📝 总计处理: ${tsFiles.length} 个文件`);

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 Prisma导入问题修复完成！');
}