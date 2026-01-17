import { Request, Response } from 'express';
import { subscriptionService2025 } from '../services/subscriptionService2025';
import { logger } from '../utils/logger';

export class SubscriptionController2025 {
  
  /**
   * 获取用户当前订阅状态
   */
  static async getCurrentSubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // 获取用户当前的订阅信息
      const userSubscription = await subscriptionService2025.getUserCurrentSubscription(userId);
      
      if (!userSubscription) {
        return res.json({
          success: true,
          data: {
            planType: 'FREE',
            status: 'ACTIVE',
            features: {
              tokensIncluded: 1000000,
              imagesIncluded: 50,
              aiModels: ['glm-4-flash', 'doubao-pro-32k', 'embedding-2']
            }
          },
          message: '获取订阅状态成功'
        });
      }

      // 计算使用统计
      const usageStats = await subscriptionService2025.calculateUsageStats(
        userId,
        userSubscription.id
      );

      res.json({
        success: true,
        data: {
          ...userSubscription,
          usage: usageStats
        },
        message: '获取订阅状态成功'
      });
    } catch (error) {
      logger.error('获取当前订阅失败:', error);
      res.status(500).json({
        success: false,
        message: '获取订阅状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 升级订阅计划
   */
  static async upgradeSubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { targetPlanId, paymentMethod, immediateActivation = true } = req.body;

      if (!targetPlanId || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：targetPlanId, paymentMethod'
        });
      }

      // 检查目标计划是否存在
      const targetPlan = await subscriptionService2025.getPlanById(targetPlanId);
      if (!targetPlan) {
        return res.status(404).json({
          success: false,
          message: '目标订阅计划不存在'
        });
      }

      // 创建升级订单
      const result = await subscriptionService2025.createSubscription(
        userId,
        targetPlanId,
        paymentMethod,
        true // 升级通常开启自动续费
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            subscriptionId: result.subscriptionId,
            paymentUrl: result.paymentUrl,
            targetPlan: targetPlan
          },
          message: '订阅升级订单创建成功'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '创建升级订单失败'
        });
      }
    } catch (error) {
      logger.error('升级订阅失败:', error);
      res.status(500).json({
        success: false,
        message: '升级订阅失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 取消订阅
   */
  static async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { reason, feedback } = req.body;

      // 取消当前订阅
      const result = await subscriptionService2025.cancelSubscription(userId, reason, feedback);

      if (result.success) {
        res.json({
          success: true,
          data: {
            cancelledAt: result.cancelledAt,
            refundAmount: result.refundAmount,
            effectiveDate: result.effectiveDate
          },
          message: '订阅取消成功'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '取消订阅失败'
        });
      }
    } catch (error) {
      logger.error('取消订阅失败:', error);
      res.status(500).json({
        success: false,
        message: '取消订阅失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 恢复订阅
   */
  static async resumeSubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { paymentMethod } = req.body;

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: '缺少支付方式参数'
        });
      }

      const result = await subscriptionService2025.resumeSubscription(userId, paymentMethod);

      if (result.success) {
        res.json({
          success: true,
          data: {
            subscriptionId: result.subscriptionId,
            paymentUrl: result.paymentUrl,
            reactivatedAt: result.reactivatedAt
          },
          message: '订阅恢复成功'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '恢复订阅失败'
        });
      }
    } catch (error) {
      logger.error('恢复订阅失败:', error);
      res.status(500).json({
        success: false,
        message: '恢复订阅失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取订阅历史
   */
  static async getSubscriptionHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 10, status } = req.query;

      const history = await subscriptionService2025.getSubscriptionHistory(userId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string
      });

      res.json({
        success: true,
        data: history,
        message: '获取订阅历史成功'
      });
    } catch (error) {
      logger.error('获取订阅历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取订阅历史失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取账单信息
   */
  static async getBillingInfo(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { startDate, endDate } = req.query;

      const billingInfo = await subscriptionService2025.getBillingInfo(userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: billingInfo,
        message: '获取账单信息成功'
      });
    } catch (error) {
      logger.error('获取账单信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取账单信息失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 更新自动续费设置
   */
  static async updateAutoRenewal(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { autoRenewal, paymentMethod } = req.body;

      if (typeof autoRenewal !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'autoRenewal 参数必须是布尔值'
        });
      }

      const result = await subscriptionService2025.updateAutoRenewal(userId, autoRenewal, paymentMethod);

      if (result.success) {
        res.json({
          success: true,
          data: {
            autoRenewal: result.autoRenew,
            nextBillingDate: result.nextBillingDate
          },
          message: '自动续费设置更新成功'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '更新自动续费设置失败'
        });
      }
    } catch (error) {
      logger.error('更新自动续费设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新自动续费设置失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 申请发票
   */
  static async requestInvoice(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { 
        subscriptionId,
        invoiceType,
        companyInfo,
        email 
      } = req.body;

      if (!subscriptionId || !invoiceType || !email) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：subscriptionId, invoiceType, email'
        });
      }

      const result = await subscriptionService2025.requestInvoice(userId, {
        subscriptionId,
        invoiceType,
        companyInfo,
        email
      });

      if (result.success) {
        res.json({
          success: true,
          data: {
            invoiceId: result.invoiceId,
            downloadUrl: result.downloadUrl,
            estimatedDelivery: result.estimatedDelivery
          },
          message: '发票申请成功'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '发票申请失败'
        });
      }
    } catch (error) {
      logger.error('申请发票失败:', error);
      res.status(500).json({
        success: false,
        message: '申请发票失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }

  /**
   * 获取订阅使用趋势
   */
  static async getUsageTrends(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { period = '30days' } = req.query;

      const trends = await subscriptionService2025.getUsageTrends(userId, {
        period: period as string
      });

      res.json({
        success: true,
        data: trends,
        message: '获取使用趋势成功'
      });
    } catch (error) {
      logger.error('获取使用趋势失败:', error);
      res.status(500).json({
        success: false,
        message: '获取使用趋势失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
}
