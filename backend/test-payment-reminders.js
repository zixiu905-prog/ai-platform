const { emailService } = require('./dist/services/emailService');
const { prisma } = require('./dist/utils/prisma');

/**
 * 测试付费提醒功能
 */
async function testPaymentReminders() {
  try {
    console.log('🚀 开始测试付费提醒功能...');

    // 1. 测试获取欠费用户列表
    console.log('\n📊 获取欠费用户列表...');
    const overdueUsers = await emailService.getOverdueUsers(10);
    console.log(`找到 ${overdueUsers.length} 个欠费用户`);
    
    if (overdueUsers.length > 0) {
      console.log('欠费用户示例:', overdueUsers[0]);
    }

    // 2. 测试发送一封付费提醒邮件（如果有欠费用户）
    if (overdueUsers.length > 0) {
      console.log('\n📧 发送测试付费提醒邮件...');
      await emailService.sendPaymentReminder(overdueUsers[0]);
      console.log('✅ 付费提醒邮件发送成功');
    }

    // 3. 测试批量发送（限制数量避免发送太多）
    console.log('\n📨 测试批量发送付费提醒...');
    const result = await emailService.sendBulkPaymentReminders(10);
    console.log('批量发送结果:', result);

    // 4. 测试完整的检查流程
    console.log('\n🔍 执行完整的付费提醒检查...');
    await emailService.checkAndSendPaymentReminders();
    console.log('✅ 付费提醒检查完成');

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭数据库连接
    await prisma.$disconnect();
  }
}

// 运行测试
if (require.main === module) {
  testPaymentReminders();
}

module.exports = { testPaymentReminders };