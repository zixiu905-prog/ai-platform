import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { paymentExceptionHandlerService, PaymentException } from '../services/paymentExceptionHandlerService';

export interface PaymentError {
  paymentId?: string;
  outTradeNo?: string;
  userId?: string;
  paymentMethod: string;
  error: any;
  context?: any;
}

/**
 * 支付错误处理中间件
 */
export const handlePaymentError = async (
  error: PaymentError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 分析错误类型
    const errorType = determineErrorType(error.error);

    // 构造支付异常对象
    const paymentException: PaymentException = {
      id: `exc_${Date.now()}`,
      paymentId: error.paymentId || '',
      type: errorType as 'timeout' | 'insufficient_funds' | 'gateway_error' | 'validation_error' | 'network_error' | 'unknown',
      message: error.error?.message || error.error?.toString() || 'Unknown error',
      code: undefined,
      details: error.context,
      retryCount: 0,
      maxRetries: 3,
      resolved: false,
      createdAt: new Date()
    };

    // 处理异常
    const result = await paymentExceptionHandlerService.handleException(paymentException.paymentId, paymentException);

    // 返回处理结果
    if (result.success) {
      if (result.shouldRetry) {
        res.json({
          success: false,
          shouldRetry: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          shouldRetry: false,
          message: result.message
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: '支付异常处理失败',
        timestamp: new Date().toISOString()
      });
    }

  } catch (err) {
    logger.error('支付错误处理中间件失败:', err);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 支付重试装饰器
 */
export function withPaymentRetry(paymentMethod: string, maxRetries: number = 3) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const [req, res, next] = args;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          logger.info(`支付尝试 ${attempt}/${maxRetries} 失败:`, error.message);

          if (attempt === maxRetries) {
            // 最后一次尝试失败，记录异常
            const paymentException: any = {
              paymentId: req.body.paymentId,
              outTradeNo: req.body.outTradeNo,
              userId: req.body.userId,
              paymentMethod,
              errorType: determineErrorType(error),
              errorMessage: error.message,
              retryCount: attempt,
              maxRetries,
              context: { requestBody: req.body, attempt }
            };

            await paymentExceptionHandlerService.handleException(req.body.outTradeNo || '', paymentException);

            throw error;
          }

          // 等待一段时间后重试
          const delay = calculateDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    return descriptor;
  };
}

/**
 * 支付超时处理
 */
export class PaymentTimeoutHandler {
  private static readonly TIMEOUTS = {
    'WECHAT_NATIVE': 5 * 60 * 1000, // 5分钟
    'WECHAT_H5': 3 * 60 * 1000, // 3分钟
    'ALIPAY_NATIVE': 5 * 60 * 1000, // 5分钟
    'ALIPAY_H5': 3 * 60 * 1000, // 3分钟
    'ALIPAY_WEB': 10 * 60 * 1000 // 10分钟
  };

  /**
   * 创建超时Promise
   */
  static createTimeoutPromise(paymentMethod: string): Promise<never> {
    const timeout = this.TIMEOUTS[paymentMethod as keyof typeof this.TIMEOUTS] || 5 * 60 * 1000;

    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`支付超时 (${timeout / 1000}秒)`));
      }, timeout);
    });
  }

  /**
   * 带超时的支付操作
   */
  static async withTimeout<T>(
    paymentMethod: string,
    operation: Promise<T>
  ): Promise<T> {
    return Promise.race([
      operation,
      this.createTimeoutPromise(paymentMethod)
    ]);
  }
}

/**
 * 支付状态验证
 */
export class PaymentStatusValidator {
  /**
   * 验证支付状态转换
   */
  static validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['PROCESSING', 'CANCELLED', 'FAILED'],
      'PROCESSING': ['SUCCESS', 'FAILED', 'CANCELLED'],
      'RETRYING': ['PROCESSING', 'FAILED', 'CANCELLED'],
      'SUCCESS': ['REFUNDED'],
      'FAILED': ['RETRYING', 'CANCELLED'],
      'CANCELLED': [],
      'REFUNDED': ['PARTIALLY_REFUNDED'],
      'PARTIALLY_REFUNDED': ['REFUNDED'],
      'MANUAL_REVIEW': ['SUCCESS', 'FAILED', 'CANCELLED']
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * 更新支付状态
   */
  static async updatePaymentStatus(
    paymentId: string,
    newStatus: string,
    reason?: string
  ): Promise<void> {
    const prisma = require('../prisma/client').prisma;

    // 获取当前状态
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new Error('支付记录不存在');
    }

    // 验证状态转换
    if (!this.validateStatusTransition(payment.status, newStatus)) {
      throw new Error(`无效的状态转换: ${payment.status} -> ${newStatus}`);
    }

    // 更新状态
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
        errorMessage: reason
      }
    });
  }
}

/**
 * 确定错误类型
 */
function determineErrorType(error: any): string {
  const errorMessage = (error.message || error.toString()).toLowerCase();

  if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
    return 'TIMEOUT';
  } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return 'NETWORK_ERROR';
  } else if (errorMessage.includes('duplicate') || errorMessage.includes('重复')) {
    return 'DUPLICATE_ORDER';
  } else if (errorMessage.includes('insufficient') || errorMessage.includes('余额不足')) {
    return 'INSUFFICIENT_BALANCE';
  } else if (errorMessage.includes('verification') || errorMessage.includes('verification')) {
    return 'VERIFICATION_FAILED';
  } else if (errorMessage.includes('system')) {
    return 'SYSTEM_ERROR';
  } else {
    return 'API_ERROR';
  }
}

/**
 * 计算重试延迟
 */
function calculateDelay(attempt: number): number {
  const baseDelay = 1000; // 1秒
  const maxDelay = 30000; // 30秒
  const multiplier = 2;

  const delay = baseDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * 支付健康检查
 */
export class PaymentHealthChecker {
  private static healthStatus: Map<string, any> = new Map();

  /**
   * 记录支付尝试
   */
  static recordAttempt(paymentMethod: string, success: boolean, responseTime: number): void {
    if (!this.healthStatus.has(paymentMethod)) {
      this.healthStatus.set(paymentMethod, {
        attempts: 0,
        successes: 0,
        failures: 0,
        totalResponseTime: 0,
        lastCheck: new Date()
      });
    }

    const status = this.healthStatus.get(paymentMethod);
    status.attempts++;
    status.totalResponseTime += responseTime;

    if (success) {
      status.successes++;
    } else {
      status.failures++;
    }

    status.lastCheck = new Date();
    status.successRate = status.successes / status.attempts;
    status.averageResponseTime = status.totalResponseTime / status.attempts;
  }

  /**
   * 获取健康状态
   */
  static getHealthStatus(): any {
    const result: any = {};

    this.healthStatus.forEach((status, method) => {
      result[method] = {
        ...status,
        healthy: status.successRate > 0.95 && status.averageResponseTime < 5000
      };
    });

    return result;
  }

  /**
   * 清理过期状态
   */
  static cleanupOldStatus(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前

    this.healthStatus.forEach((status, method) => {
      if (status.lastCheck < cutoff) {
        this.healthStatus.delete(method);
      }
    });
  }
}
