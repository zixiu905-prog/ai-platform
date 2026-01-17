#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'backend/src/test/setup.ts',
  'backend/src/routes/adminFeatureControl.ts',
  'backend/src/routes/taskManagement.ts',
  'backend/src/routes/adminWorkflows.ts',
  'backend/src/routes/oauth.ts',
  'backend/src/routes/alerts.ts',
  'backend/src/routes/softwareApiManagement.ts',
  'backend/src/routes/n8nWorkflows.ts',
  'backend/src/routes/subscription.ts',
  'backend/src/routes/voice.ts',
  'backend/src/routes/upload.ts',
  'backend/src/routes/settings.ts',
  'backend/src/routes/project.ts',
  'backend/src/routes/payment/query.ts',
  'backend/src/routes/payment/alipay.ts',
  'backend/src/routes/payment/wechatPay.ts',
  'backend/src/routes/dashboard.ts',
  'backend/src/routes/chat.ts',
  'backend/src/routes/recommendations.ts',
  'backend/src/routes/admin.ts',
  'backend/src/routes/script.ts',
  'backend/src/routes/software.ts',
  'backend/src/routes/workflow.ts',
  'backend/src/routes/ai.ts',
  'backend/src/services/authService.ts',
  'backend/src/services/unifiedWorkflowService.ts',
  'backend/src/services/unifiedTenantService.ts',
  'backend/src/services/unifiedSpeechService.ts',
  'backend/src/services/softwareCompatibilityService.ts',
  'backend/src/services/paymentReminderService.ts',
  'backend/src/services/comInterfaceManagementService.ts',
  'backend/src/services/softwareVersionManagementService.ts',
  'backend/src/services/scriptCategoryService.ts',
  'backend/src/services/subscriptionService2025.ts',
  'backend/src/services/analyticsService.ts',
  'backend/src/services/paymentExceptionHandlerService.ts',
  'backend/src/services/appStoreService.ts',
  'backend/src/services/documentService.ts',
  'backend/src/services/comRepairService.ts',
  'backend/src/services/permissionService.ts',
  'backend/src/services/ssoService.ts',
  'backend/src/services/aiDesignIntegrationService.ts',
  'backend/src/services/softwareApiManagementService.ts',
  'backend/src/services/softwareIntegrationService.ts',
  'backend/src/services/scriptExecutor.ts',
  'backend/src/services/backupService.ts',
  'backend/src/services/recommendationService.ts',
  'backend/src/middleware/featureCheck.ts',
  'backend/src/services/metricsService.ts',
  'backend/src/middleware/auth.ts',
  'backend/src/controllers/chatController.ts'
];

let fixedCount = 0;
let errorCount = 0;

console.log('🔧 开始修复Prisma导入问题...\n');

filesToFix.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // 1. 修复导入路径 - 将 "../prisma/client" 改为 "../config/database"
    content = content.replace(
      /from\s+['"]\.\.\/prisma\/client['"]/g,
      "from '../config/database'"
    );

    // 2. 修复其他可能的相对路径
    content = content.replace(
      /from\s+['"]\.\.\/\.\.\/prisma\/client['"]/g,
      "from '../config/database'"
    );

    // 3. 删除 "new PrismaClient()" 实例化，统一使用共享实例
    content = content.replace(
      /const\s+prisma\s*=\s*new\s+PrismaClient\(\s*\);?\s*/g,
      ''
    );

    content = content.replace(
      /const\s+prisma\s*=\s*new\s+PrismaClient\(\{[^}]*\}\);?\s*/g,
      ''
    );

    // 4. 如果文件中有 "import { PrismaClient }" 但没有使用，并且有 "prisma" 变量使用，
    //    则添加正确的导入
    if (content.includes('import { PrismaClient }') && 
        !content.includes('import { prisma }') &&
        content.includes('prisma.')) {
      content = content.replace(
        /import\s*\{\s*PrismaClient[^}]*\}\s*from\s*['"]@prisma\/client['"];?\s*/g,
        "import { prisma } from '../config/database';\n"
      );
    }

    // 5. 对于已经在使用 prisma 变量的文件，确保导入正确
    if (content.includes('prisma.') && !content.includes('import { prisma }')) {
      // 在文件开头添加导入
      const firstImportIndex = content.indexOf('import');
      if (firstImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', firstImportIndex);
        content = content.slice(0, endOfLine + 1) + 
                  "import { prisma } from '../config/database';\n" + 
                  content.slice(endOfLine + 1);
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ 已修复: ${filePath}`);
      fixedCount++;
    } else {
      console.log(`ℹ️  无需修复: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ 修复失败 ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 修复完成统计:`);
console.log(`✅ 成功修复: ${fixedCount} 个文件`);
console.log(`❌ 修复失败: ${errorCount} 个文件`);
console.log(`📝 总计处理: ${filesToFix.length} 个文件`);

if (errorCount > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 所有Prisma导入问题修复完成！');
}