import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export interface PaymentException {
  id: string;
  paymentId: string;
  type: 'timeout' | 'insufficient_funds' | 'gateway_error' | 'validation_error' | 'network_error' | 'unknown';
  message: string;
  code?: string;
  details?: any;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
}

export interface PaymentExceptionHandler {
  canRetry(exception: PaymentException): boolean;
  handle(exception: PaymentException): Promise<void>;
  shouldRetry(exception: PaymentException): boolean;
  getBackoffTime(exception: PaymentException): Date;
}

// 内存存储支付异常
const exceptionsCache = new Map<string, PaymentException>();

export class PaymentExceptionHandlerService {
  private handlers: Map<string, PaymentExceptionHandler>;

  constructor() {
    this.handlers = new Map();
    this.initializeHandlers();
  }

  /**
   * 初始化处理器
   */
  private initializeHandlers(): void {
    this.handlers.set('timeout', new TimeoutExceptionHandler());
    this.handlers.set('insufficient_funds', new InsufficientFundsExceptionHandler());
    this.handlers.set('gateway_error', new GatewayErrorHandler());
    this.handlers.set('validation_error', new ValidationErrorHandler());
    this.handlers.set('network_error', new NetworkErrorHandler());
    this.handlers.set('unknown', new UnknownExceptionHandler());
  }

  /**
   * 处理支付异常
   */
  async handleException(paymentId: string, exception: PaymentException): Promise<{
    success: boolean;
    shouldRetry: boolean;
    message: string;
  }> {
    try {
      // 保存异常记录到内存
      await this.saveException(exception);

      // 获取处理器
      const handler = this.handlers.get(exception.type);

      if (!handler) {
        logger.warn(`No handler found for exception type: ${exception.type}`);
        return {
          success: false,
          shouldRetry: false,
          message: '未找到对应的异常处理器'
        };
      }

      // 执行处理
      await handler.handle(exception);

      const shouldRetry = handler.shouldRetry(exception);

      logger.info(`Payment exception handled: ${paymentId} - ${exception.type}`);

      return {
        success: true,
        shouldRetry,
        message: '异常已处理'
      };
    } catch (error) {
      logger.error('Failed to handle payment exception:', error);
      return {
        success: false,
        shouldRetry: false,
        message: '处理异常失败'
      };
    }
  }

  /**
   * 重试支付
   */
  async retryPayment(paymentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 检查异常是否可重试
      const exception = await this.getLatestException(paymentId);

      if (!exception || !this.canRetry(exception)) {
        return {
          success: false,
          message: '该支付不可重试'
        };
      }

      // 检查是否到了重试时间
      if (exception.nextRetryAt && exception.nextRetryAt > new Date()) {
        return {
          success: false,
          message: `请稍后重试（${exception.nextRetryAt.toLocaleString()}）`
        };
      }

      // 标记异常为解决中
      await this.markExceptionAsResolving(exception.id);

      // 更新支付状态
      try {
        await prisma.payments.update({
          where: { id: paymentId },
          data: { status: 'PENDING' }
        });
      } catch (error) {
        logger.warn('Failed to update payment status:', error);
      }

      logger.info(`Payment retry initiated: ${paymentId}`);

      return {
        success: true,
        message: '重试已发起'
      };
    } catch (error) {
      logger.error('Failed to retry payment:', error);
      return {
        success: false,
        message: '重试失败'
      };
    }
  }

  /**
   * 检查异常是否可重试
   */
  private canRetry(exception: PaymentException): boolean {
    const handler = this.handlers.get(exception.type);
    return handler ? handler.canRetry(exception) : false;
  }

  /**
   * 保存异常记录
   */
  private async saveException(exception: PaymentException): Promise<void> {
    try {
      exceptionsCache.set(exception.id, exception);
      logger.info(`Exception saved: ${exception.id}`);
    } catch (error) {
      logger.error('Failed to save exception:', error);
    }
  }

  /**
   * 获取最新异常
   */
  private async getLatestException(paymentId: string): Promise<PaymentException | null> {
    try {
      // 从内存中查找
      for (const [id, exception] of exceptionsCache.entries()) {
        if (exception.paymentId === paymentId) {
          return exception;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get exception:', error);
      return null;
    }
  }

  /**
   * 标记异常为解决中
   */
  private async markExceptionAsResolving(exceptionId: string): Promise<void> {
    try {
      const exception = exceptionsCache.get(exceptionId);
      if (exception) {
        exception.retryCount += 1;
        exceptionsCache.set(exceptionId, exception);
      }
    } catch (error) {
      logger.error('Failed to mark exception as resolving:', error);
    }
  }

  /**
   * 获取支付的所有异常
   */
  async getPaymentExceptions(paymentId: string): Promise<PaymentException[]> {
    try {
      const exceptions: PaymentException[] = [];
      for (const [id, exception] of exceptionsCache.entries()) {
        if (exception.paymentId === paymentId) {
          exceptions.push(exception);
        }
      }

      return exceptions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      logger.error('Failed to get payment exceptions:', error);
      return [];
    }
  }

  /**
   * 清理已解决的异常
   */
  async cleanupResolvedExceptions(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      let count = 0;

      for (const [id, exception] of exceptionsCache.entries()) {
        if (exception.resolved && exception.resolvedAt && exception.resolvedAt < cutoff) {
          exceptionsCache.delete(id);
          count++;
        }
      }

      logger.info(`Cleaned up ${count} resolved exceptions`);
      return count;
    } catch (error) {
      logger.error('Failed to cleanup exceptions:', error);
      return 0;
    }
  }
}

/**
 * 超时异常处理器
 */
class TimeoutExceptionHandler implements PaymentExceptionHandler {
  canRetry(exception: PaymentException): boolean {
    return exception.retryCount < exception.maxRetries;
  }

  async handle(exception: PaymentException): Promise<void> {
    logger.info(`Handling timeout exception: ${exception.paymentId}`);
  }

  shouldRetry(exception: PaymentException): boolean {
    return exception.retryCount < 3;
  }

  getBackoffTime(exception: PaymentException): Date {
    const delay = Math.pow(2, exception.retryCount) * 1000;
    return new Date(Date.now() + delay);
  }
}

/**
 * 余额不足异常处理器
 */
class InsufficientFundsExceptionHandler implements PaymentExceptionHandler {
  canRetry(): boolean {
    return false;
  }

  async handle(exception: PaymentException): Promise<void> {
    logger.info(`Handling insufficient funds exception: ${exception.paymentId}`);
  }

  shouldRetry(): boolean {
    return false;
  }

  getBackoffTime(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}

/**
 * 网关错误异常处理器
 */
class GatewayErrorHandler implements PaymentExceptionHandler {
  canRetry(exception: PaymentException): boolean {
    return exception.retryCount < exception.maxRetries;
  }

  async handle(exception: PaymentException): Promise<void> {
    logger.info(`Handling gateway error exception: ${exception.paymentId}`);
  }

  shouldRetry(exception: PaymentException): boolean {
    return exception.retryCount < 5;
  }

  getBackoffTime(exception: PaymentException): Date {
    const delay = Math.min(Math.pow(2, exception.retryCount) * 5000, 60000);
    return new Date(Date.now() + delay);
  }
}

/**
 * 验证错误异常处理器
 */
class ValidationErrorHandler implements PaymentExceptionHandler {
  canRetry(): boolean {
    return false;
  }

  async handle(exception: PaymentException): Promise<void> {
    logger.info(`Handling validation error exception: ${exception.paymentId}`);
  }

  shouldRetry(): boolean {
    return false;
  }

  getBackoffTime(): Date {
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}

/**
 * 网络错误异常处理器
 */
class NetworkErrorHandler implements PaymentExceptionHandler {
  canRetry(exception: PaymentException): boolean {
    return exception.retryCount < exception.maxRetries;
  }

  async handle(exception: PaymentException): Promise<void> {
    logger.info(`Handling network error exception: ${exception.paymentId}`);
  }

  shouldRetry(exception: PaymentException): boolean {
    return exception.retryCount < 3;
  }

  getBackoffTime(exception: PaymentException): Date {
    const delay = Math.min(Math.pow(2, exception.retryCount) * 2000, 30000);
    return new Date(Date.now() + delay);
  }
}

/**
 * 未知异常处理器
 */
class UnknownExceptionHandler implements PaymentExceptionHandler {
  canRetry(): boolean {
    return false;
  }

  async handle(exception: PaymentException): Promise<void> {
    logger.warn(`Handling unknown exception: ${exception.paymentId}`);
  }

  shouldRetry(): boolean {
    return false;
  }

  getBackoffTime(): Date {
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}

export const paymentExceptionHandlerService = new PaymentExceptionHandlerService();
