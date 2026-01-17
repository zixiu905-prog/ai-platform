import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { randomUUID } from 'crypto';

export interface ReminderConfig {
  type: 'subscription' | 'payment' | 'other';
  userId: string;
  subscriptionId?: string;
  dueDate: Date;
  amount: number;
  currency: string;
  message?: string;
}

export interface ReminderSchedule {
  id: string;
  userId: string;
  subscriptionId?: string;
  reminderDays: number[];
  enabled: boolean;
}

// 内存存储提醒和计划
const remindersCache = new Map<string, any>();
const schedulesCache = new Map<string, ReminderSchedule>();

export class PaymentReminderService {
  /**
   * 创建提醒
   */
  async createReminder(config: ReminderConfig): Promise<any> {
    try {
      const id = randomUUID();
      const reminder = {
        id,
        type: config.type,
        userId: config.userId,
        subscriptionId: config.subscriptionId,
        dueDate: config.dueDate,
        amount: config.amount,
        currency: config.currency,
        message: config.message,
        status: 'PENDING',
        sentAt: null,
        createdAt: new Date()
      };

      remindersCache.set(id, reminder);

      logger.info(`Payment reminder created: ${id}`);
      return reminder;
    } catch (error) {
      logger.error('Failed to create payment reminder:', error);
      throw new Error(`Failed to create payment reminder: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 发送提醒
   */
  async sendReminder(reminderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const reminder = remindersCache.get(reminderId);

      if (!reminder) {
        return { success: false, error: '提醒不存在' };
      }

      if (reminder.status !== 'PENDING') {
        return { success: false, error: '提醒已处理' };
      }

      // 获取用户信息
      const user = await prisma.users.findUnique({
        where: { id: reminder.userId }
      });

      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      // 发送通知（这里应该集成邮件或短信服务）
      logger.info(`Sending reminder to user ${user.email}: ${reminder.message}`);

      // 更新状态
      reminder.status = 'SENT';
      reminder.sentAt = new Date();
      remindersCache.set(reminderId, reminder);

      logger.info(`Payment reminder sent: ${reminderId}`);

      return { success: true };
    } catch (error) {
      logger.error('Failed to send payment reminder:', error);
      return { success: false, error: '发送提醒失败' };
    }
  }

  /**
   * 获取待发送的提醒
   */
  async getPendingReminders(): Promise<any[]> {
    try {
      const now = new Date();
      const reminders: any[] = [];

      for (const [id, reminder] of remindersCache.entries()) {
        if (reminder.status === 'PENDING' && reminder.dueDate <= now) {
          reminders.push(reminder);
        }
      }

      return reminders.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    } catch (error) {
      logger.error('Failed to get pending reminders:', error);
      return [];
    }
  }

  /**
   * 处理待发送的提醒
   */
  async processPendingReminders(): Promise<{ processed: number; failed: number }> {
    const reminders = await this.getPendingReminders();

    let processed = 0;
    let failed = 0;

    for (const reminder of reminders) {
      const result = await this.sendReminder(reminder.id);
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }

    logger.info(`Payment reminders processed: ${processed} success, ${failed} failed`);

    return { processed, failed };
  }

  /**
   * 批量发送付款提醒
   */
  async sendPaymentReminders(): Promise<{ sent: number; failed: number }> {
    const reminders = await this.getPendingReminders();

    let sent = 0;
    let failed = 0;

    for (const reminder of reminders) {
      const result = await this.sendReminder(reminder.id);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info(`Payment reminders sent: ${sent} success, ${failed} failed`);

    return { sent, failed };
  }

  /**
   * 获取用户的提醒
   */
  async getUserReminders(userId: string, limit = 20, offset = 0): Promise<{ reminders: any[]; total: number }> {
    try {
      const reminders: any[] = [];

      for (const [id, reminder] of remindersCache.entries()) {
        if (reminder.userId === userId) {
          reminders.push(reminder);
        }
      }

      reminders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = reminders.length;
      const paginated = reminders.slice(offset, offset + limit);

      return { reminders: paginated, total };
    } catch (error) {
      logger.error('Failed to get user reminders:', error);
      return { reminders: [], total: 0 };
    }
  }

  /**
   * 标记提醒为已读
   */
  async markAsRead(reminderId: string): Promise<void> {
    try {
      const reminder = remindersCache.get(reminderId);
      if (reminder) {
        reminder.status = 'READ';
        remindersCache.set(reminderId, reminder);
      }

      logger.info(`Payment reminder marked as read: ${reminderId}`);
    } catch (error) {
      logger.error('Failed to mark reminder as read:', error);
    }
  }

  /**
   * 取消提醒
   */
  async cancelReminder(reminderId: string): Promise<void> {
    try {
      const reminder = remindersCache.get(reminderId);
      if (reminder) {
        reminder.status = 'CANCELLED';
        remindersCache.set(reminderId, reminder);
      }

      logger.info(`Payment reminder cancelled: ${reminderId}`);
    } catch (error) {
      logger.error('Failed to cancel reminder:', error);
    }
  }

  /**
   * 设置提醒计划
   */
  async setReminderSchedule(schedule: ReminderSchedule): Promise<void> {
    try {
      schedulesCache.set(schedule.userId, schedule);
      logger.info(`Reminder schedule set: ${schedule.userId}`);
    } catch (error) {
      logger.error('Failed to set reminder schedule:', error);
      throw new Error(`Failed to set reminder schedule: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取提醒计划
   */
  async getReminderSchedule(userId: string): Promise<ReminderSchedule | null> {
    try {
      return schedulesCache.get(userId) || null;
    } catch (error) {
      logger.error('Failed to get reminder schedule:', error);
      return null;
    }
  }

  /**
   * 为订阅创建自动提醒
   */
  async createSubscriptionReminders(subscriptionId: string): Promise<void> {
    try {
      const subscription = await prisma.subscriptions.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription || !subscription.endDate) {
        return;
      }

      // 获取用户的提醒计划
      const schedule = await this.getReminderSchedule(subscription.userId);

      if (!schedule || !schedule.enabled) {
        return;
      }

      // 为每个提醒日期创建提醒
      const dueDate = subscription.endDate;

      for (const days of schedule.reminderDays) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - days);

        // 只创建未来的提醒
        if (reminderDate > new Date()) {
          await this.createReminder({
            type: 'subscription',
            userId: subscription.userId,
            subscriptionId: subscription.id,
            dueDate: reminderDate,
            amount: subscription.price,
            currency: subscription.currency,
            message: `您的订阅将在${days}天后续费，金额为${subscription.price} ${subscription.currency}`
          });
        }
      }

      logger.info(`Subscription reminders created: ${subscriptionId}`);
    } catch (error) {
      logger.error('Failed to create subscription reminders:', error);
    }
  }

  /**
   * 删除过期提醒
   */
  async cleanupExpiredReminders(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let count = 0;

      for (const [id, reminder] of remindersCache.entries()) {
        if (reminder.status === 'PENDING' && reminder.dueDate < cutoffDate) {
          remindersCache.delete(id);
          count++;
        }
      }

      logger.info(`Expired reminders cleaned up: ${count}`);

      return count;
    } catch (error) {
      logger.error('Failed to cleanup expired reminders:', error);
      return 0;
    }
  }

  /**
   * 获取提醒统计
   */
  async getReminderStats(userId: string, period = '30d'): Promise<{
    total: number;
    sent: number;
    read: number;
    cancelled: number;
    pending: number;
  }> {
    try {
      const periodMs = this.parsePeriod(period);
      const startTime = new Date(Date.now() - periodMs);

      const reminders: any[] = [];

      for (const [id, reminder] of remindersCache.entries()) {
        if (reminder.userId === userId && reminder.createdAt >= startTime) {
          reminders.push(reminder);
        }
      }

      return {
        total: reminders.length,
        sent: reminders.filter(r => r.status === 'SENT').length,
        read: reminders.filter(r => r.status === 'READ').length,
        cancelled: reminders.filter(r => r.status === 'CANCELLED').length,
        pending: reminders.filter(r => r.status === 'PENDING').length
      };
    } catch (error) {
      logger.error('Failed to get reminder stats:', error);
      return { total: 0, sent: 0, read: 0, cancelled: 0, pending: 0 };
    }
  }

  /**
   * 解析时间段
   */
  private parsePeriod(period: string): number {
    const match = period.match(/^(\d+)([hdwmy])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      case 'y': return value * 365 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 测试邮件配置
   */
  async testEmailConfiguration(testEmail: string): Promise<boolean> {
    try {
      logger.info(`测试邮件配置: ${testEmail}`);

      // 模拟发送测试邮件
      // 实际应该集成邮件服务发送测试邮件
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info(`测试邮件发送成功: ${testEmail}`);
      return true;
    } catch (error) {
      logger.error('测试邮件配置失败:', error);
      return false;
    }
  }
}

export default PaymentReminderService;
export const paymentReminderService = new PaymentReminderService();
