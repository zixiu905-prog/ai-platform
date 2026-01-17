import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

interface FeatureCheckOptions {
  featureKey: string;
  required?: boolean;
  fallbackAction?: 'redirect' | 'error' | 'pass';
  errorMessage?: string;
  redirectUrl?: string;
}

/**
 * 功能开关检查中间件
 */
export function checkFeature(options: FeatureCheckOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 从数据库获取功能状态
      const config = await prisma.system_configs.findUnique({
        where: {
          key: options.featureKey,
        }
      });

      // 默认功能状态（如果数据库中没有配置）
      const defaultStatus = getDefaultFeatureStatus(options.featureKey);
      const isEnabled = config ? (typeof config.value === 'boolean' ? config.value : defaultStatus) : defaultStatus;

      // 如果功能启用，直接通过
      if (isEnabled === true) {
        // 将功能状态添加到请求对象中，供后续中间件使用
        (req as any).featureStatus = { [options.featureKey]: true };
        return next();
      }

      // 处理功能禁用的情况
      if (options.required !== false) {
        const action = options.fallbackAction || 'error';

        switch (action) {
          case 'redirect':
            return res.redirect(options.redirectUrl || '/');

          case 'error':
            return res.status(403).json({
              success: false,
              error: 'FEATURE_DISABLED',
              message: options.errorMessage || '该功能暂时不可用',
              featureKey: options.featureKey
            });

          case 'pass':
          default:
            (req as any).featureStatus = { [options.featureKey]: false };
            return next();
        }
      }

      (req as any).featureStatus = { [options.featureKey]: false };
      next();

    } catch (error) {
      logger.error(`功能检查失败 (${options.featureKey}):`, error);

      // 默认在错误时允许通过，避免阻断整个系统
      (req as any).featureStatus = { [options.featureKey]: true };
      next();
    }
  };
}

/**
 * 批量功能检查中间件
 */
export function checkFeatures(featureKeys: string[], options: {
  required?: boolean;
  fallbackAction?: 'redirect' | 'error' | 'pass';
  errorMessage?: string;
  redirectUrl?: string;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configs = await prisma.system_configs.findMany({
        where: {
          key: { in: featureKeys },
        }
      });

      const statusMap: Record<string, boolean> = {};

      featureKeys.forEach(key => {
        const config = configs.find(c => c.key === key);
        statusMap[key] = config ? (typeof config.value === 'boolean' ? config.value : getDefaultFeatureStatus(key)) : getDefaultFeatureStatus(key);
      });

      // 检查是否所有必需功能都启用
      const requiredFeatures = featureKeys.filter(key => statusMap[key] === false);

      if (requiredFeatures.length > 0 && options.required !== false) {
        const action = options.fallbackAction || 'error';

        switch (action) {
          case 'redirect':
            return res.redirect(options.redirectUrl || '/');

          case 'error':
            return res.status(403).json({
              success: false,
              error: 'FEATURES_DISABLED',
              message: options.errorMessage || '以下功能暂时不可用',
              disabledFeatures: requiredFeatures,
              timestamp: new Date().toISOString()
            });

          case 'pass':
          default:
            (req as any).featureStatus = statusMap;
            return next();
        }
      }

      (req as any).featureStatus = statusMap;
      next();

    } catch (error) {
      logger.error('批量功能检查失败:', error);

      // 默认在错误时允许所有功能通过
      const defaultStatus: Record<string, boolean> = {};
      featureKeys.forEach(key => {
        defaultStatus[key] = true;
      });

      (req as any).featureStatus = defaultStatus;
      next();
    }
  };
}

/**
 * 获取功能的默认状态
 */
function getDefaultFeatureStatus(featureKey: string): boolean {
  const defaults: Record<string, boolean> = {
    // AI功能默认启用
    'ai.chat.enabled': true,
    'ai.image_generation.enabled': true,
    'ai.voice_recognition.enabled': true,
    'ai.document_analysis.enabled': true,
    'ai.multi_modal.enabled': true,

    // 设计软件集成默认启用
    'software.photoshop.enabled': true,
    'software.autocad.enabled': true,
    'software.blender.enabled': true,
    'software.illustrator.enabled': true,
    'software.indesign.enabled': true,

    // 工作流功能默认启用
    'workflow.automation.enabled': true,
    'workflow.scheduling.enabled': true,
    'workflow.templates.enabled': true,

    // 脚本管理默认启用
    'scripts.user_upload.enabled': true,
    'scripts.marketplace.enabled': true,
    'scripts.auto_categorization.enabled': true,

    // 用户功能默认启用
    'user.registration.enabled': true,
    'user.email_verification.enabled': true,
    'user.wechat_login.enabled': true,
    'user.guest_access.enabled': false, // 访客访问默认禁用

    // 支付功能默认启用
    'payment.wechat.enabled': true,
    'payment.alipay.enabled': true,
    'payment.subscriptions.enabled': true,
    'payment.trial_period.enabled': true,

    // 安全功能默认启用
    'security.two_factor_auth.enabled': true,
    'security.session_timeout.enabled': true,
    'security.rate_limiting.enabled': true,
    'security.audit_logging.enabled': true,

    // 系统功能
    'system.maintenance_mode.enabled': false, // 维护模式默认禁用
    'system.backup.enabled': true,
    'system.notifications.enabled': true,
    'system.email_service.enabled': true,

    // 桌面端功能默认启用
    'desktop.auto_update.enabled': true,
    'desktop.software_detection.enabled': true,
    'desktop.local_cache.enabled': true,
    'desktop.offline_mode.enabled': true
  };

  return defaults[featureKey] !== undefined ? defaults[featureKey] : true;
}

/**
 * 检查维护模式的中间件
 */
export function checkMaintenanceMode(req: Request, res: Response, next: NextFunction) {
  return checkFeature({
    featureKey: 'system.maintenance_mode.enabled',
    required: false,
    fallbackAction: 'error',
    errorMessage: '系统正在维护中，请稍后再试'
  })(req, res, next);
}

/**
 * 检查用户注册功能
 */
export function checkUserRegistration(req: Request, res: Response, next: NextFunction) {
  return checkFeature({
    featureKey: 'user.registration.enabled',
    fallbackAction: 'error',
    errorMessage: '用户注册功能暂时关闭'
  })(req, res, next);
}

/**
 * 检查AI聊天功能
 */
export function checkAIChat(req: Request, res: Response, next: NextFunction) {
  return checkFeature({
    featureKey: 'ai.chat.enabled',
    fallbackAction: 'error',
    errorMessage: 'AI聊天功能暂时不可用'
  })(req, res, next);
}

/**
 * 检查图像生成功能
 */
export function checkImageGeneration(req: Request, res: Response, next: NextFunction) {
  return checkFeature({
    featureKey: 'ai.image_generation.enabled',
    fallbackAction: 'error',
    errorMessage: '图像生成功能暂时不可用'
  })(req, res, next);
}

/**
 * 检查支付功能
 */
export function checkPayment(req: Request, res: Response, next: NextFunction) {
  return checkFeatures(['payment.wechat.enabled', 'payment.alipay.enabled'], {
    fallbackAction: 'error',
    errorMessage: '支付功能暂时不可用'
  })(req, res, next);
}
