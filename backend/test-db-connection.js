const { testDatabaseConnection, prisma } = require('./dist/config/database.js');

async function testConnection() {
  console.log('🔍 开始测试数据库连接...');
  
  try {
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      console.log('✅ 数据库连接测试成功');
      
      // 测试基本查询
      const result = await prisma.$queryRaw`SELECT version()`;
      console.log('📊 数据库版本:', result[0].version);
      
      // 测试表连接
      try {
        const userCount = await prisma.user.count();
        console.log('👥 用户总数:', userCount);
      } catch (tableError) {
        console.warn('⚠️  表访问警告:', tableError.message);
      }
      
    } else {
      console.log('❌ 数据库连接测试失败');
    }
  } catch (error) {
    console.error('💥 数据库测试异常:', error.message);
  } finally {
    // 确保连接关闭
    try {
      await prisma.$disconnect();
      console.log('🔌 数据库连接已关闭');
    } catch (disconnectError) {
      console.warn('⚠️  关闭连接时出错:', disconnectError.message);
    }
  }
}

testConnection();