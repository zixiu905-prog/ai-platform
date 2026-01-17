const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrateSubscription2025() {
  console.log('开始迁移2025年订阅数据...');
  
  try {
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, 'subscriptionPlans2025.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 执行SQL语句
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('执行SQL:', statement.substring(0, 100) + '...');
        await prisma.$executeRawUnsafe(statement);
      }
    }
    
    console.log('✅ 2025年订阅计划数据迁移完成');
    
    // 验证数据
    const planCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "subscription_plans" WHERE "isActive" = true`;
    const modelCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ai_model_pricing_2025" WHERE "isActive" = true`;
    
    console.log(`✅ 创建了 ${planCount[0].count} 个订阅计划`);
    console.log(`✅ 创建了 ${modelCount[0].count} 个AI模型价格配置`);
    
    // 显示部分数据作为验证
    const samplePlans = await prisma.$queryRaw`SELECT "id", "name", "price", "durationDays" FROM "subscription_plans" LIMIT 3`;
    console.log('📋 订阅计划样例:', samplePlans);
    
    const sampleModels = await prisma.$queryRaw`SELECT "model", "provider", "inputPricePerK" FROM "ai_model_pricing_2025" LIMIT 5`;
    console.log('🤖 AI模型价格样例:', sampleModels);
    
  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  migrateSubscription2025()
    .then(() => {
      console.log('🎉 迁移完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateSubscription2025 };