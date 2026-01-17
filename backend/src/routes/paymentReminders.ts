import express from 'express';
import { emailService } from '../services/emailService';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/payment-reminders/overdue
 * 获取欠费用户列表
 */
router.get('/overdue', async (req: express.Request, res: express.Response) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 10;

    const overdueUsers = await emailService.getOverdueUsers(threshold);

    res.json({
      success: true,
      data: overdueUsers,
      count: overdueUsers.length,
      threshold
    });
  } catch (error) {
    logger.error('获取欠费用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取欠费用户列表失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/payment-reminders/send
 * 手动发送付费提醒邮件
 */
router.post('/send', async (req: express.Request, res: express.Response) => {
  try {
    const { threshold = 10, userIds } = req.body;

    let result;

    if (userIds && Array.isArray(userIds)) {
      // 发送给指定用户
      const reminders = await emailService.getOverdueUsers(threshold);
      const filteredReminders = reminders.filter((r: any) => userIds.includes(r.userId));

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const reminder of filteredReminders) {
        try {
          await emailService.sendPaymentReminder(reminder);
          success++;

          // 记录系统消息
          await prisma.system_messages.create({
            data: {
              userId: reminder.userId,
              title: '付费提醒邮件已发送',
              content: `我们已向您的邮箱发送了付费提醒邮件。当前余额：¥${reminder.currentBalance}`,
              type: 'PAYMENT_REMINDER',
              isRead: false
            }
          } as any);

          logger.info(`付费提醒发送成功: ${reminder.email}`);
        } catch (error) {
          failed++;
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      result = {
        success,
        failed,
        total: filteredReminders.length,
        errors
      };
    } else {
      // 批量发送给所有欠费用户
      result = await emailService.sendBulkPaymentReminders(threshold);
    }

    res.json({
      success: true,
      message: '付费提醒发送完成',
      data: result
    });
  } catch (error) {
    logger.error('发送付费提醒失败:', error);
    res.status(500).json({
      success: false,
      message: '发送付费提醒失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/payment-reminders/preview
 * 预览付费提醒邮件内容
 */
router.get('/preview/:userId', async (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const threshold = parseFloat(req.query.threshold as string) || 10;

    // 获取用户信息
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        conversations: {
          select: {
            totalTokens: true
          }
        },
        payments: {
          where: {
            status: 'COMPLETED'
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        timestamp: new Date().toISOString()
      });
    }

    const totalUsage = user.conversations.reduce((sum, conv) =>
      sum + Number(conv.totalTokens), 0);
    const lastPayment = user.payments[0];
    const daysOverdue = lastPayment
      ? Math.floor((Date.now() - lastPayment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const reminder = {
      userId: user.id,
      email: user.email,
      userName: user.username,
      currentBalance: user.tokenBalance,
      threshold,
      daysOverdue,
      lastPaymentDate: lastPayment?.createdAt,
      totalUsage
    };

    // 获取邮件模板
    const template = (emailService.constructor as any).getEmailTemplates().payment_reminder;
    let html = template.html;

    // 替换模板变量
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    template.variables?.forEach((variable: string) => {
      let value: string;
      if (variable === 'baseUrl') {
        value = baseUrl;
      } else if (variable === 'userName') {
        value = reminder.userName;
      } else if (variable === 'currentBalance') {
        value = String(reminder.currentBalance);
      } else if (variable === 'daysOverdue') {
        value = String(reminder.daysOverdue);
      } else {
        value = '';
      }
      html = html.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          currentBalance: user.tokenBalance
        },
        reminder,
        emailSubject: template.subject,
        emailHtml: html
      }
    });
  } catch (error) {
    logger.error('预览付费提醒邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '预览付费提醒邮件失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/payment-reminders/statistics
 * 获取付费提醒统计信息
 */
router.get('/statistics', async (req: express.Request, res: express.Response) => {
  try {
    const thresholds = [10, 50, 100];
    const statistics = await Promise.all(
      thresholds.map(async (threshold) => {
        const overdueUsers = await emailService.getOverdueUsers(threshold);
        return {
          threshold,
          count: overdueUsers.length,
          totalBalance: overdueUsers.reduce((sum: any, user: any) => sum + user.currentBalance, 0),
          avgDaysOverdue: overdueUsers.length > 0
            ? overdueUsers.reduce((sum: any, user: any) => sum + user.daysOverdue, 0) / overdueUsers.length
            : 0
        };
      })
    );

    // 获取总的用户统计
    const totalUsers = await prisma.users.count();
    const paidUsers = await prisma.users.count({
      where: {
        isActive: true,
        isPaid: true
      }
    });

    const avgBalance = await prisma.users.aggregate({
      where: {
        isActive: true
      },
      _avg: {
        tokenBalance: true
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        paidUsers,
        avgBalance: avgBalance._avg.tokenBalance || 0,
        overdueStatistics: statistics
      }
    });
  } catch (error) {
    logger.error('获取付费提醒统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取付费提醒统计失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/payment-reminders/settings
 * 更新付费提醒设置
 */
router.post('/settings', async (req: express.Request, res: express.Response) => {
  try {
    const { enabled, threshold, schedule, customTemplate } = req.body;

    // 保存设置到系统配置
    const settings = {
      enabled: enabled ?? true,
      threshold: threshold ?? 10,
      schedule: schedule ?? '0 10 * * *', // 默认每天上午10点
      customTemplate: customTemplate || null
    };

    await prisma.system_configs.upsert({
      where: {
        key: 'payment_reminder_settings'
      },
      update: {
        value: settings
      },
      create: {
        key: 'payment_reminder_settings',
        value: settings,
        category: 'payment'
      }
    } as any);

    logger.info('付费提醒设置已更新:', settings);

    res.json({
      success: true,
      message: '付费提醒设置已更新',
      data: settings
    });
  } catch (error) {
    logger.error('更新付费提醒设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新付费提醒设置失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/payment-reminders/settings
 * 获取付费提醒设置
 */
router.get('/settings', async (req: express.Request, res: express.Response) => {
  try {
    const config = await prisma.system_configs.findUnique({
      where: {
        key: 'payment_reminder_settings'
      }
    });

    const defaultSettings = {
      enabled: true,
      threshold: 10,
      schedule: '0 10 * * *',
      customTemplate: null
    };

    const settings = config ? { ...defaultSettings, ...(config.value as any) } : defaultSettings;

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('获取付费提醒设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取付费提醒设置失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
