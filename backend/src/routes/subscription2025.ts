import express from 'express';
import { authenticate } from '../middleware/auth';
import { subscriptionService2025 } from '../services/subscriptionService2025';
import { logger } from '../utils/logger';

const router = express.Router();

// 所有订阅路由都需要认证
router.use(authenticate);

/**
 * @route GET /api/subscription-2025/plans
 * @desc 获取所有可用的2025年订阅计划
 * @access Private
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService2025.getAvailablePlans();
    res.json({
      success: true,
      data: plans,
      message: '获取订阅计划成功'
    });
  } catch (error) {
    logger.error('获取订阅计划失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订阅计划失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/subscription-2025/recommend
 * @desc 根据用户使用情况推荐订阅计划
 * @access Private
 */
router.get('/recommend', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { monthlyTokens, monthlyImages, teamSize, businessType } = req.query;

    const recommendation = await subscriptionService2025.recommendPlan(userId, {
      monthlyTokens: monthlyTokens ? parseInt(monthlyTokens as string) : undefined,
      monthlyImages: monthlyImages ? parseInt(monthlyImages as string) : undefined,
      teamSize: teamSize ? parseInt(teamSize as string) : undefined,
      businessType: businessType as 'personal' | 'startup' | 'enterprise'
    });

    res.json({
      success: true,
      data: recommendation,
      message: '获取推荐计划成功'
    });
  } catch (error) {
    logger.error('获取推荐计划失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐计划失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/subscription-2025/models
 * @desc 获取所有可用的AI模型及其价格
 * @access Private
 */
router.get('/models', async (req, res) => {
  try {
    const models = await subscriptionService2025.getAvailableModels();
    res.json({
      success: true,
      data: models,
      message: '获取AI模型列表成功'
    });
  } catch (error) {
    logger.error('获取AI模型列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取AI模型列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/subscription-2025/subscription
 * @desc 获取当前用户的订阅信息
 * @access Private
 */
router.get('/subscription', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const subscription = await subscriptionService2025.getUserCurrentSubscription(userId);

    res.json({
      success: true,
      data: subscription,
      message: '获取订阅信息成功'
    });
  } catch (error) {
    logger.error('获取订阅信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订阅信息失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/subscription-2025/subscribe
 * @desc 创建或更新用户订阅
 * @access Private
 */
router.post('/subscribe', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { planId, billingCycle } = req.body;

    const subscription = await subscriptionService2025.subscribe(userId, {
      planId,
      billingCycle
    });

    res.json({
      success: true,
      data: subscription,
      message: '订阅成功'
    });
  } catch (error) {
    logger.error('订阅失败:', error);
    res.status(500).json({
      success: false,
      message: '订阅失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/subscription-2025/cancel
 * @desc 取消用户订阅
 * @access Private
 */
router.post('/cancel', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    await subscriptionService2025.cancelSubscription(userId);

    res.json({
      success: true,
      message: '取消订阅成功'
    });
  } catch (error) {
    logger.error('取消订阅失败:', error);
    res.status(500).json({
      success: false,
      message: '取消订阅失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/subscription-2025/usage
 * @desc 获取用户资源使用情况
 * @access Private
 */
router.get('/usage', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const usage = await subscriptionService2025.getUserUsage(userId);

    res.json({
      success: true,
      data: usage,
      message: '获取使用情况成功'
    });
  } catch (error) {
    logger.error('获取使用情况失败:', error);
    res.status(500).json({
      success: false,
      message: '获取使用情况失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/subscription-2025/billing
 * @desc 获取用户账单信息
 * @access Private
 */
router.get('/billing', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { startDate, endDate } = req.query;
    const billing = await subscriptionService2025.getBillingInfo(userId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json({
      success: true,
      data: billing,
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
});

/**
 * @route POST /api/subscription-2025/billing/method
 * @desc 更新支付方式
 * @access Private
 */
router.post('/billing/method', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { paymentMethod } = req.body;

    await subscriptionService2025.updatePaymentMethod(userId, paymentMethod);

    res.json({
      success: true,
      message: '更新支付方式成功'
    });
  } catch (error) {
    logger.error('更新支付方式失败:', error);
    res.status(500).json({
      success: false,
      message: '更新支付方式失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/subscription-2025/billing/invoices
 * @desc 获取发票列表
 * @access Private
 */
router.get('/billing/invoices', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const invoices = await subscriptionService2025.getInvoices(userId);

    res.json({
      success: true,
      data: invoices,
      message: '获取发票列表成功'
    });
  } catch (error) {
    logger.error('获取发票列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取发票列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/subscription-2025/billing/invoices/:id/download
 * @desc 下载发票
 * @access Private
 */
router.post('/billing/invoices/:id/download', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const invoiceId = req.params.id;

    const invoiceUrl = await subscriptionService2025.downloadInvoice(userId, invoiceId);

    res.json({
      success: true,
      data: { url: invoiceUrl },
      message: '生成发票下载链接成功'
    });
  } catch (error) {
    logger.error('下载发票失败:', error);
    res.status(500).json({
      success: false,
      message: '下载发票失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/subscription-2025/upgrade-options
 * @desc 获取升级选项
 * @access Private
 */
router.get('/upgrade-options', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const options = await subscriptionService2025.getUpgradeOptions(userId);

    res.json({
      success: true,
      data: options,
      message: '获取升级选项成功'
    });
  } catch (error) {
    logger.error('获取升级选项失败:', error);
    res.status(500).json({
      success: false,
      message: '获取升级选项失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/subscription-2025/upgrade
 * @desc 升级订阅
 * @access Private
 */
router.post('/upgrade', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { targetPlanId } = req.body;

    const subscription = await subscriptionService2025.createSubscription(
      userId,
      targetPlanId,
      'wechat',
      false
    );

    res.json({
      success: true,
      data: subscription,
      message: '升级订阅成功'
    });
  } catch (error) {
    logger.error('升级订阅失败:', error);
    res.status(500).json({
      success: false,
      message: '升级订阅失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
