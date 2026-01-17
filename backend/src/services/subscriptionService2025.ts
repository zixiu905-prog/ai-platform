import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { randomUUID } from 'crypto';

interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  paymentUrl?: string;
  error?: string;
}

interface CancelSubscriptionResult {
  success: boolean;
  cancelledAt?: Date;
  refundAmount?: number;
  effectiveDate?: Date;
  error?: string;
}

interface ResumeSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  paymentUrl?: string;
  reactivatedAt?: Date;
  error?: string;
}

interface UpdateAutoRenewalResult {
  success: boolean;
  autoRenew?: boolean;
  nextBillingDate?: Date;
  error?: string;
}

interface RequestInvoiceResult {
  success: boolean;
  invoiceId?: string;
  downloadUrl?: string;
  estimatedDelivery?: string;
  error?: string;
}

interface UsageStats {
  tokensUsed: number;
  tokensLimit: number;
  imagesUsed: number;
  imagesLimit: number;
  requestsUsed: number;
  requestsLimit: number;
}

interface BillingInfo {
  totalSpent: number;
  currentMonthSpent: number;
  pendingInvoices: any[];
  paymentHistory: any[];
}

interface SubscriptionHistory {
  subscriptions: any[];
  total: number;
  page: number;
  limit: number;
}

interface UsageTrend {
  date: string;
  tokens: number;
  images: number;
  requests: number;
}

interface UsageTrends {
  trends: UsageTrend[];
  summary: {
    totalTokens: number;
    totalImages: number;
    totalRequests: number;
    avgDailyTokens: number;
  };
}

export class SubscriptionService2025 {
  /**
   * 获取用户当前订阅
   */
  async getUserCurrentSubscription(userId: string): Promise<any> {
    try {
      const subscription = await prisma.subscriptions.findFirst({
        where: {
          userId,
          status: 'ACTIVE'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return subscription;
    } catch (error) {
      logger.error('获取用户订阅失败:', error);
      throw error;
    }
  }

  /**
   * 计算使用统计
   */
  async calculateUsageStats(userId: string, subscriptionId: string): Promise<UsageStats> {
    try {
      // 获取订阅计划信息
      const subscription = await prisma.subscriptions.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription || !subscription) {
        return {
          tokensUsed: 0,
          tokensLimit: 0,
          imagesUsed: 0,
          imagesLimit: 0,
          requestsUsed: 0,
          requestsLimit: 0
        };
      }

      // 获取使用记录（这里需要根据实际数据库结构调整）
      const usageRecords = await prisma.usage_records.findMany({
        where: {
          userId,
          subscriptionId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000
      });

      const tokensUsed = usageRecords.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
      const imagesUsed = usageRecords.filter((r: any) => r.resourceType === 'image').length;
      const requestsUsed = usageRecords.length;

      const plan = subscription;
      const features = plan.features as any;

      return {
        tokensUsed,
        tokensLimit: features?.tokensIncluded || 0,
        imagesUsed,
        imagesLimit: features?.imagesIncluded || 0,
        requestsUsed,
        requestsLimit: features?.requestsLimit || 0
      };
    } catch (error) {
      logger.error('计算使用统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取计划信息
   */
  async getPlanById(planId: string): Promise<any> {
    try {
      const plan = await prisma.subscriptions.findUnique({
        where: { id: planId }
      });
      return plan;
    } catch (error) {
      logger.error('获取计划信息失败:', error);
      throw error;
    }
  }

  /**
   * 创建订阅
   */
  async createSubscription(
    userId: string,
    planId: string,
    paymentMethod: string,
    autoRenew: boolean = false
  ): Promise<CreateSubscriptionResult> {
    try {
      const plan = await this.getPlanById(planId);
      if (!plan) {
        return { success: false, error: '订阅计划不存在' };
      }

      const subscriptionId = randomUUID();
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 默认一个月

      const subscription = await prisma.subscriptions.create({
        data: {
          id: subscriptionId,
          userId,
          planId,
          planType: 'BASIC',
          price: 99,
          duration: 30,
          features: {},
          status: 'PENDING_PAYMENT',
          startDate,
          endDate,
          autoRenew: false,
          createdAt: startDate,
          updatedAt: new Date()
        }
      });

      // 生成支付链接（这里需要集成实际的支付系统）
      const paymentUrl = `/payment/subscribe/${subscriptionId}`;

      return {
        success: true,
        subscriptionId: subscription.id,
        paymentUrl
      };
    } catch (error) {
      logger.error('创建订阅失败:', error);
      return {
        success: false,
        error: '创建订阅失败'
      };
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(
    userId: string,
    reason?: string,
    feedback?: string
  ): Promise<CancelSubscriptionResult> {
    try {
      const subscription = await this.getUserCurrentSubscription(userId);
      if (!subscription) {
        return { success: false, error: '没有找到活动的订阅' };
      }

      const updatedSubscription = await prisma.subscriptions.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          cancelFeedback: feedback,
          cancelledAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 计算退款金额（如果有）
      const refundAmount = 0;

      return {
        success: true,
        cancelledAt: updatedSubscription.cancelledAt || undefined,
        refundAmount,
        effectiveDate: updatedSubscription.endDate
      };
    } catch (error) {
      logger.error('取消订阅失败:', error);
      return {
        success: false,
        error: '取消订阅失败'
      };
    }
  }

  /**
   * 恢复订阅
   */
  async resumeSubscription(
    userId: string,
    paymentMethod: string
  ): Promise<ResumeSubscriptionResult> {
    try {
      // 查找已取消的订阅
      const subscription = await prisma.subscriptions.findFirst({
        where: {
          userId,
          status: 'CANCELLED'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!subscription) {
        return { success: false, error: '没有找到可恢复的订阅' };
      }

      const reactivatedAt = new Date();
      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      // 创建新的订阅
      const newSubscription = await prisma.subscriptions.create({
        data: {
          id: randomUUID(),
          userId: subscription.userId,
          planId: subscription.planId,
          planType: 'BASIC',
          price: 99,
          duration: 30,
          features: {},
          status: 'PENDING_PAYMENT',
          startDate: reactivatedAt,
          endDate: newEndDate,
          autoRenew: true,
          createdAt: reactivatedAt,
          updatedAt: new Date()
        }
      });

      const paymentUrl = `/payment/resume/${newSubscription.id}`;

      return {
        success: true,
        subscriptionId: newSubscription.id,
        paymentUrl,
        reactivatedAt
      };
    } catch (error) {
      logger.error('恢复订阅失败:', error);
      return {
        success: false,
        error: '恢复订阅失败'
      };
    }
  }

  /**
   * 获取订阅历史
   */
  async getSubscriptionHistory(
    userId: string,
    options: { page: number; limit: number; status?: string }
  ): Promise<SubscriptionHistory> {
    try {
      const where: any = { userId };
      if (options.status) {
        where.status = options.status;
      }

      const [subscriptions, total] = await Promise.all([
        prisma.subscriptions.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (options.page - 1) * options.limit,
          take: options.limit
        }),
        prisma.subscriptions.count({ where })
      ]);

      return {
        subscriptions,
        total,
        page: options.page,
        limit: options.limit
      };
    } catch (error) {
      logger.error('获取订阅历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取账单信息
   */
  async getBillingInfo(
    userId: string,
    options: { startDate?: Date; endDate?: Date }
  ): Promise<BillingInfo> {
    try {
      const where: any = { userId };
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = options.startDate;
        if (options.endDate) where.createdAt.lte = options.endDate;
      }

      // 获取所有支付记录
      const payments = await prisma.payment_records.findMany({
        where: {
          ...where,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalSpent = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // 计算当月花费
      const now = new Date();
      const currentMonthPayments = payments.filter((p: any) => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate.getMonth() === now.getMonth() &&
               paymentDate.getFullYear() === now.getFullYear();
      });
      const currentMonthSpent = currentMonthPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // 获取待处理的发票
      const pendingInvoices = await prisma.invoices.findMany({
        where: {
          userId,
          status: 'PENDING'
        }
      });

      return {
        totalSpent,
        currentMonthSpent,
        pendingInvoices,
        paymentHistory: payments
      };
    } catch (error) {
      logger.error('获取账单信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新自动续费设置
   */
  async updateAutoRenewal(
    userId: string,
    autoRenew: boolean,
    paymentMethod?: string
  ): Promise<UpdateAutoRenewalResult> {
    try {
      const subscription = await this.getUserCurrentSubscription(userId);
      if (!subscription) {
        return { success: false, error: '没有找到活动的订阅' };
      }

      const updateData: any = {
        autoRenew,
        updatedAt: new Date()
      };

      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }

      const updated = await prisma.subscriptions.update({
        where: { id: subscription.id },
        data: updateData
      });

      return {
        success: true,
        autoRenew: updated.autoRenew,
        nextBillingDate: updated.endDate
      };
    } catch (error) {
      logger.error('更新自动续费设置失败:', error);
      return {
        success: false,
        error: '更新自动续费设置失败'
      };
    }
  }

  /**
   * 申请发票
   */
  async requestInvoice(
    userId: string,
    options: {
      subscriptionId: string;
      invoiceType: string;
      companyInfo?: any;
      email: string;
    }
  ): Promise<RequestInvoiceResult> {
    try {
      const subscription = await prisma.subscriptions.findFirst({
        where: {
          id: options.subscriptionId,
          userId
        }
      });

      if (!subscription) {
        return { success: false, error: '订阅不存在' };
      }

      const invoiceId = randomUUID();
      const invoice = await prisma.invoices.create({
        data: {
          id: invoiceId,
          userId,
          amount: subscription.price || 0,
          currency: 'CNY',
          status: 'PENDING',
          invoiceNumber: `INV-${Date.now()}`,
          items: (options as any).items || [],
          metadata: {
            subscriptionId: options.subscriptionId,
            invoiceType: (options as any).invoiceType,
            companyInfo: (options as any).companyInfo,
            email: (options as any).email
          } as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const downloadUrl = `/invoices/download/${invoice.id}`;
      const estimatedDelivery = '3个工作日';

      return {
        success: true,
        invoiceId: invoice.id,
        downloadUrl,
        estimatedDelivery
      };
    } catch (error) {
      logger.error('申请发票失败:', error);
      return {
        success: false,
        error: '申请发票失败'
      };
    }
  }

  /**
   * 获取使用趋势
   */
  async getUsageTrends(
    userId: string,
    options: { period: string }
  ): Promise<UsageTrends> {
    try {
      const days = options.period === '30days' ? 30 :
                    options.period === '7days' ? 7 : 90;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usageRecords = await prisma.usage_records.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // 按日期分组统计
      const trendsMap = new Map<string, UsageTrend>();

      for (const record of usageRecords) {
        const date = new Date(record.createdAt).toISOString().split('T')[0];
        const existing = trendsMap.get(date) || {
          date,
          tokens: 0,
          images: 0,
          requests: 0
        };

        trendsMap.set(date, {
          date,
          tokens: existing.tokens + (record.quantity || 0),
          images: existing.images + (record.resourceType === 'image' ? record.quantity : 0),
          requests: existing.requests + 1
        });
      }

      const trends = Array.from(trendsMap.values());

      // 计算汇总
      const summary = {
        totalTokens: trends.reduce((sum, t) => sum + t.tokens, 0),
        totalImages: trends.reduce((sum, t) => sum + t.images, 0),
        totalRequests: trends.reduce((sum, t) => sum + t.requests, 0),
        avgDailyTokens: trends.length > 0 ?
          Math.round(trends.reduce((sum, t) => sum + t.tokens, 0) / trends.length) : 0
      };

      return {
        trends,
        summary
      };
    } catch (error) {
      logger.error('获取使用趋势失败:', error);
      throw error;
    }
  }

  /**
   * 获取活跃订阅数
   */
  static async getActiveSubscriptionCount(): Promise<number> {
    try {
      const count = await prisma.subscriptions.count({
        where: {
          status: 'ACTIVE'
        }
      });
      return count;
    } catch (error) {
      logger.error('获取活跃订阅数失败:', error);
      return 0;
    }
  }

  async getAvailablePlans(filters?: { type?: string; activeOnly?: boolean }): Promise<any[]> {
    await this.delay(500);
    return [
      {
        id: 'free',
        name: '免费版',
        price: 0,
        duration: 0,
        features: ['基础功能', '有限使用次数'],
        popular: true
      },
      {
        id: 'pro',
        name: '专业版',
        price: 99,
        duration: 30,
        features: ['全部功能', '无限制使用', '优先支持'],
        popular: false
      },
      {
        id: 'enterprise',
        name: '企业版',
        price: 999,
        duration: 365,
        features: ['团队协作', '专属客服', '自定义配置', 'SLA保障'],
        popular: false
      }
    ];
  }

  async recommendPlan(userId: string, usageData?: any): Promise<any> {
    await this.delay(500);
    return {
      recommendedPlan: 'pro',
      reason: '基于您的使用情况，推荐专业版',
      savings: '相比企业版节省 900 元/年'
    };
  }

  async getAvailableModels(): Promise<any[]> {
    await this.delay(500);
    return [
      { id: 'glm-4', name: 'GLM-4', provider: 'zhipu', available: true },
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai', available: true },
      { id: 'claude-3', name: 'Claude 3', provider: 'anthropic', available: true }
    ];
  }

  async subscribe(userId: string, options: { planId: string; billingCycle?: string }): Promise<CreateSubscriptionResult> {
    return this.createSubscription(
      userId,
      options.planId,
      options.billingCycle || 'wechat',
      false
    );
  }

  async updatePaymentMethod(userId: string, paymentMethod: any): Promise<any> {
    await this.delay(500);
    return { success: true, message: '支付方式已更新' };
  }

  async getInvoices(userId: string): Promise<any[]> {
    await this.delay(500);
    return [
      { id: '1', date: '2024-01-01', amount: 99, status: 'paid' },
      { id: '2', date: '2024-02-01', amount: 99, status: 'paid' }
    ];
  }

  async downloadInvoice(userId: string, invoiceId: string): Promise<string> {
    await this.delay(500);
    return `https://example.com/invoices/${invoiceId}.pdf`;
  }

  async getUpgradeOptions(userId: string): Promise<any> {
    await this.delay(500);
    return {
      currentPlan: 'free',
      availableUpgrades: [
        { planId: 'pro', discount: 0, billing: 'monthly' },
        { planId: 'pro', discount: 0.2, billing: 'yearly' }
      ]
    };
  }

  async getUserUsage(userId: string): Promise<any> {
    const [tokens, images] = await Promise.all([
      prisma.usage_records.findMany({
        where: { userId, resourceType: 'token' },
        take: 100
      }),
      prisma.usage_records.findMany({
        where: { userId, resourceType: 'image' },
        take: 100
      })
    ]);

    return {
      tokens: tokens.reduce((sum: number, r: any) => sum + r.quantity, 0),
      images: images.reduce((sum: number, r: any) => sum + r.quantity, 0),
      total: tokens.length + images.length
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const subscriptionService2025 = new SubscriptionService2025();
