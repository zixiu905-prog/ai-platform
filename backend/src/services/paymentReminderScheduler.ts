import cron from 'node-cron';
import { emailService } from './emailService';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface ReminderSettings {
  enabled: boolean;
  threshold: number;
  schedule: string;
  customTemplate?: any;
}

export class PaymentReminderScheduler {
  private task: cron.ScheduledTask | null = null;
  private settings: ReminderSettings = {
    enabled: true,
    threshold: 10,
    schedule: '0 10 * * *', // 每天上午10点
    customTemplate: null
  };

  constructor() {
    this.loadSettings();
  }

  /**
   * 加载提醒设置
   */
  private async loadSettings(): Promise<void> {
    try {
      const config = await prisma.system_configs.findUnique({
        where: {
          key: 'payment_reminder_settings'
        }
      });

      if (config) {
        this.settings = { ...this.settings, ...(config.value as any) };
      }

      logger.info('Payment reminder settings loaded:', this.settings);
    } catch (error) {
      logger.error('Failed to load payment reminder settings:', error);
    }
  }

  /**
   * 保存提醒设置
   */
  async saveSettings(settings: Partial<ReminderSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings };

      await prisma.system_configs.upsert({
        where: {
          key: 'payment_reminder_settings'
        },
        update: {
          value: this.settings
        },
        create: {
          key: 'payment_reminder_settings',
          value: this.settings,
          category: 'payment'
        }
      } as any);

      logger.info('Payment reminder settings saved:', this.settings);

      // 如果定时任务正在运行，重新启动
      if (this.task) {
        this.stop();
        if (this.settings.enabled) {
          this.start();
        }
      }
    } catch (error) {
      logger.error('Failed to save payment reminder settings:', error);
      throw error;
    }
  }

  /**
   * 获取欠费用户列表
   */
  private async getOverdueUsers(): Promise<any[]> {
    try {
      // 查询余额低于阈值的用户
      const users = await prisma.users.findMany({
        where: {
          isActive: true,
          tokenBalance: {
            lt: this.settings.threshold
          }
        },
        include: {
          payments: {
            where: {
              status: 'COMPLETED'
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          },
          conversations: {
            select: {
              totalTokens: true
            }
          }
        }
      });

      // 计算每个用户的详细信息
      const overdueUsers = users.map(user => {
        const lastPayment = user.payments[0];
        const daysOverdue = lastPayment
          ? Math.floor((Date.now() - lastPayment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 30;

        const totalUsage = user.conversations.reduce((sum, conv) =>
          sum + Number(conv.totalTokens), 0);

        return {
          userId: user.id,
          email: user.email,
          userName: user.username,
          currentBalance: user.tokenBalance,
          threshold: this.settings.threshold,
          daysOverdue,
          lastPaymentDate: lastPayment?.createdAt,
          totalUsage,
          isActive: user.isActive,
          isPaid: user.isPaid
        };
      });

      return overdueUsers;
    } catch (error) {
      logger.error('Failed to get overdue users:', error);
      return [];
    }
  }

  /**
   * 执行发送提醒任务
   */
  private async executeReminderTask(): Promise<void> {
    try {
      logger.info('Starting payment reminder task execution...');

      const overdueUsers = await this.getOverdueUsers();

      if (overdueUsers.length === 0) {
        logger.info('No overdue users found. Task completed.');
        return;
      }

      logger.info(`Found ${overdueUsers.length} overdue users. Sending reminders...`);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const user of overdueUsers) {
        try {
          // 发送邮件
          const result = await emailService.sendPaymentReminder(user);

          if (result.success) {
            successCount++;

            // 记录系统消息
            await prisma.system_messages.create({
              data: {
                userId: user.userId,
                title: '付费提醒邮件已发送',
                content: `我们已向您的邮箱发送了付费提醒邮件。当前余额：¥${user.currentBalance}，建议及时充值以避免影响使用。`,
                type: 'PAYMENT_REMINDER',
                isRead: false,
                metadata: {
                  threshold: user.threshold,
                  daysOverdue: user.daysOverdue
                }
              }
            } as any);

            logger.info(`Payment reminder sent successfully: ${user.email}`);
          } else {
            failedCount++;
            errors.push(`${user.email}: ${result.error}`);
          }
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          errors.push(`${user.email}: ${errorMsg}`);
          logger.error(`Failed to send payment reminder to ${user.email}:`, error);
        }

        // 防止被邮件服务器限制，添加延迟
        await this.delay(200);
      }

      logger.info(`Payment reminder task completed: ${successCount} success, ${failedCount} failed`);

      // 记录任务执行历史
      await this.logTaskExecution(overdueUsers.length, successCount, failedCount, errors);

    } catch (error) {
      logger.error('Payment reminder task execution failed:', error);
      await this.logTaskExecution(0, 0, 0, [error instanceof Error ? error.message : '未知错误']);
    }
  }

  /**
   * 记录任务执行历史
   */
  private async logTaskExecution(
    totalUsers: number,
    successCount: number,
    failedCount: number,
    errors: string[]
  ): Promise<void> {
    try {
      // 使用system_configs记录任务执行历史
      const timestamp = new Date().toISOString();
      const executionRecord = {
        totalUsers,
        successCount,
        failedCount,
        errors: errors.slice(0, 10), // 只记录前10个错误
        threshold: this.settings.threshold,
        schedule: this.settings.schedule,
        timestamp
      };

      await prisma.system_configs.create({
        data: {
          key: `payment_reminder_execution_${timestamp}`,
          value: executionRecord,
          category: 'task_execution'
        }
      } as any);

      logger.info('Task execution logged successfully');
    } catch (error) {
      logger.error('Failed to log task execution:', error);
    }
  }

  /**
   * 启动定时任务
   */
  start(): void {
    if (this.task) {
      logger.warn('Payment reminder task is already running');
      return;
    }

    if (!this.settings.enabled) {
      logger.info('Payment reminder task is disabled');
      return;
    }

    try {
      // 验证cron表达式
      if (!cron.validate(this.settings.schedule)) {
        logger.error(`Invalid cron schedule: ${this.settings.schedule}`);
        return;
      }

      // 启动定时任务
      this.task = cron.schedule(this.settings.schedule, async () => {
        await this.executeReminderTask();
      }, {
        scheduled: false
      });

      this.task.start();

      logger.info(`Payment reminder task started with schedule: ${this.settings.schedule}`);
    } catch (error) {
      logger.error('Failed to start payment reminder task:', error);
      throw error;
    }
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Payment reminder task stopped');
    }
  }

  /**
   * 手动执行任务
   */
  async executeNow(): Promise<{ success: number; failed: number; total: number; errors: string[] }> {
    logger.info('Manually executing payment reminder task...');
    await this.executeReminderTask();

    const overdueUsers = await this.getOverdueUsers();
    // 返回结果（实际结果已在executeReminderTask中记录）
    return {
      total: overdueUsers.length,
      success: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * 获取任务状态
   */
  getStatus(): {
    isRunning: boolean;
    settings: ReminderSettings;
    nextExecution?: Date;
  } {
    return {
      isRunning: this.task !== null,
      settings: this.settings,
      nextExecution: this.task ? this.getNextExecutionDate() : undefined
    };
  }

  /**
   * 获取下一次执行时间
   */
  private getNextExecutionDate(): Date | undefined {
    if (!this.task || !this.settings.enabled) {
      return undefined;
    }

    try {
      const now = new Date();
      const cronExpression = this.settings.schedule;
      // 简单计算：实际应该使用更精确的cron解析库
      // 这里返回一个估算值
      const nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(10, 0, 0, 0);
      return nextRun;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 更新设置并重启任务
   */
  async updateSettings(newSettings: Partial<ReminderSettings>): Promise<void> {
    await this.saveSettings(newSettings);

    if (this.settings.enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  /**
   * 获取任务执行历史
   */
  async getExecutionHistory(limit: number = 10): Promise<any[]> {
    try {
      const configs = await prisma.system_configs.findMany({
        where: {
          category: 'task_execution',
          key: {
            startsWith: 'payment_reminder_execution_'
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return configs.map(config => ({
        id: config.id,
        createdAt: config.createdAt,
        ...(config.value as any)
      }));
    } catch (error) {
      logger.error('Failed to get task execution history:', error);
      return [];
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    overdueUsers: number;
    executionHistory: any[];
    settings: ReminderSettings;
  }> {
    try {
      const totalUsers = await prisma.users.count({
        where: { isActive: true }
      });

      const overdueUsers = await prisma.users.count({
        where: {
          isActive: true,
          tokenBalance: {
            lt: this.settings.threshold
          }
        }
      });

      const executionHistory = await this.getExecutionHistory(5);

      return {
        totalUsers,
        overdueUsers,
        executionHistory,
        settings: this.settings
      };
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      return {
        totalUsers: 0,
        overdueUsers: 0,
        executionHistory: [],
        settings: this.settings
      };
    }
  }
}

// 导出单例
export const paymentReminderScheduler = new PaymentReminderScheduler();
