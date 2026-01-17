import cron from 'node-cron';
import { paymentExceptionHandlerService } from '../services/paymentExceptionHandlerService';
import { logger } from '../utils/logger';

/**
 * 支付重试定时任务
 * 每分钟执行一次，检查需要重试的支付
 */
export class PaymentRetryJob {
  private static instance: PaymentRetryJob;
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): PaymentRetryJob {
    if (!PaymentRetryJob.instance) {
      PaymentRetryJob.instance = new PaymentRetryJob();
    }
    return PaymentRetryJob.instance;
  }

  /**
   * 启动定时任务
   */
  public start(): void {
    if (this.task) {
      console.log('⚠️  支付重试任务已经在运行中');
      return;
    }

    console.log('🔄 启动支付重试定时任务...');

    // 每分钟执行一次
    this.task = cron.schedule('* * * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️  支付重试任务正在运行，跳过本次执行');
        return;
      }

      try {
        this.isRunning = true;
        await this.executeRetryJob();
      } catch (error) {
        logger.error('❌ 支付重试任务执行失败:', error);
        logger.error('支付重试任务执行失败', { error: error.message });
      } finally {
        this.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    console.log('✅ 支付重试定时任务已启动');
  }

  /**
   * 停止定时任务
   */
  public stop(): void {
    if (this.task) {
      this.task.destroy();
      this.task = null;
      console.log('⏹️  支付重试定时任务已停止');
    }
  }

  /**
   * 执行重试任务
   */
  private async executeRetryJob(): Promise<void> {
    try {
      console.log('🔄 执行支付重试检查...');

      await paymentExceptionHandlerService.scheduleRetries();

      console.log('✅ 支付重试检查完成');

    } catch (error) {
      logger.error('❌ 支付重试检查失败:', error);
      throw error;
    }
  }

  /**
   * 手动触发重试
   */
  public async triggerRetry(): Promise<void> {
    console.log('🔄 手动触发支付重试...');
    await this.executeRetryJob();
    console.log('✅ 手动支付重试完成');
  }

  /**
   * 获取任务状态
   */
  public getStatus(): { isRunning: boolean; isScheduled: boolean } {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.task
    };
  }
}

// 创建单例实例
export const paymentRetryJob = PaymentRetryJob.getInstance();
