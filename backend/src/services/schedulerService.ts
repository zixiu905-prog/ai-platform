import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import PaymentReminderService from '../services/paymentReminderService';

export class SchedulerService {
  private paymentReminderService: PaymentReminderService;
  private tasks: cron.ScheduledTask[] = [];

  constructor() {
    this.paymentReminderService = new PaymentReminderService();
    this.setupScheduledTasks();
  }

  /**
   * 设置定时任务
   */
  private setupScheduledTasks(): void {
    logger.info('开始设置定时任务');

    // 1. 每天早上9点发送付款提醒
    const paymentReminderTask = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('开始执行定时付款提醒任务');
        const result = await this.paymentReminderService.sendPaymentReminders();
        logger.info(`付款提醒任务完成: 发送${result.sent}封，失败${result.failed}封`);
      } catch (error) {
        logger.error('付款提醒任务失败:', error);
      }
    }, {
      scheduled: false, // 先不启动，需要手动启动
      timezone: 'Asia/Shanghai'
    });

    this.tasks.push(paymentReminderTask);

    // 2. 每周一早上8点生成周报
    const weeklyReportTask = cron.schedule('0 8 * * 1', async () => {
      try {
        logger.info('开始生成周报统计');
        // 这里可以添加周报生成逻辑
        await this.generateWeeklyReport();
      } catch (error) {
        logger.error('周报生成失败:', error);
      }
    }, {
      scheduled: false,
        
        
      timezone: 'Asia/Shanghai'
    });

    this.tasks.push(weeklyReportTask);

    // 3. 每月1号清理过期数据
    const monthlyCleanupTask = cron.schedule('0 2 1 * *', async () => {
      try {
        logger.info('开始执行月度数据清理');
        await this.performMonthlyCleanup();
      } catch (error) {
        logger.error('月度数据清理失败:', error);
      }
    }, {
      scheduled: false,
        
        
      timezone: 'Asia/Shanghai'
    });

    this.tasks.push(monthlyCleanupTask);

    logger.info(`已设置 ${this.tasks.length} 个定时任务`);
  }

  /**
   * 启动所有定时任务
   */
  start(): void {
    logger.info('启动所有定时任务');
    this.tasks.forEach(task => {
      task.start();
    });
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    logger.info('停止所有定时任务');
    this.tasks.forEach(task => {
      task.stop();
    });
  }

  /**
   * 添加新的定时任务
   */
  addTask(cronExpression: string, taskFunction: () => Promise<void>, options?: any): cron.ScheduledTask {
    const task = cron.schedule(cronExpression, taskFunction, {
      scheduled: false,
        
        
      timezone: 'Asia/Shanghai',
        
        
      ...options
    });

    this.tasks.push(task);
    logger.info(`添加新定时任务: ${cronExpression}`);
    return task;
  }

  /**
   * 移除定时任务
   */
  removeTask(task: cron.ScheduledTask): void {
    task.stop();
    const index = this.tasks.indexOf(task);
    if (index > -1) {
      this.tasks.splice(index, 1);
      logger.info('移除定时任务');
    }
  }

  /**
   * 生成周报
   */
  private async generateWeeklyReport(): Promise<void> {
    // 这里可以实现周报生成逻辑
    logger.info('周报生成完成');
  }

  /**
   * 执行月度数据清理
   */
  private async performMonthlyCleanup(): Promise<void> {
    // 这里可以实现数据清理逻辑
    // 例如：清理30天前的日志、过期的提醒记录等
    logger.info('月度数据清理完成');
  }

  /**
   * 获取所有任务状态
   */
  getTasksStatus(): Array<{ name: string; running: boolean; nextExecution?: Date }> {
    return this.tasks.map((task, index) => ({
      name: `Task_${index + 1}`,
      running: (task as any).running || false,
      nextExecution: (task as any).nextDate?.toDate()
    }));
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    logger.info('清理定时任务服务');
    this.stop();
    await this.paymentReminderService.cleanupExpiredReminders();
  }
}

export default SchedulerService;