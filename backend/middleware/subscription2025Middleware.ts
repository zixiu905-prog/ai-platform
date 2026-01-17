import { Request, Response, NextFunction } from 'express';
import { subscriptionService2025 } from '../services/subscriptionService2025';
import { logger } from '../utils/logger';

export interface ExtendedRequest extends Request {
  user?: any;
  subscription?: any;
  modelAccess?: any;
}

/**
 * 检查用户订阅状态和模型权限中间件
 */
export const checkSubscription2025 = (requiredModel?: string) => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
          code: 'UNAUTHORIZED'
        });
      }

      const userId = req.user.id;

      // 检查模型权限
      if (requiredModel) {
        const modelAccess = await subscriptionService2025.checkModelAccess(userId, requiredModel);
        req.modelAccess = modelAccess;

        if (!modelAccess.allowed) {
          return res.status(403).json({
            success: false,
            message: modelAccess.reason || '无权限使用此模型',
            code: 'MODEL_ACCESS_DENIED',
            availablePlans: await getUpgradeOptions(userId)
          });
        }
      }

      // 获取用户当前订阅信息
      try {
        const userSubscription = await getUserCurrentSubscription(userId);
        req.subscription = userSubscription;
      } catch (error) {
        logger.warn('获取用户订阅信息失败，使用免费版权限:', error);
        // 设置默认免费版权限
        req.subscription = {
          planType: 'FREE',
          maxTokens: 1000000,
          maxImages: 50,
          features: {
            aiModels: ['glm-4-flash', 'doubao-pro-32k', 'embedding-2']
          }
        };
      }

      next();
    } catch (error) {
      logger.error('订阅检查中间件错误:', error);
      res.status(500).json({
        success: false,
        message: '订阅验证失败',
        code: 'SUBSCRIPTION_CHECK_ERROR'
      });
    }
  };
};

/**
 * 检查Token使用量限制中间件
 */
export const checkTokenUsage = () => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.subscription) {
        return res.status(401).json({
          success: false,
          message: '用户认证或订阅信息缺失',
          code: 'AUTH_REQUIRED'
        });
      }

      const { estimatedTokens, modelName } = req.body;
      
      if (!estimatedTokens || !modelName) {
        return next(); // 没有token估算信息，跳过检查
      }

      // 检查模型权限
      const modelAccess = await subscriptionService2025.checkModelAccess(req.user.id, modelName);
      if (!modelAccess.allowed) {
        return res.status(403).json({
          success: false,
          message: modelAccess.reason || '无权限使用此模型',
          code: 'MODEL_ACCESS_DENIED'
        });
      }

      // 计算当前月使用量
      const currentUsage = await getCurrentMonthUsage(req.user.id);
      
      // 检查是否超出限制
      const remainingTokens = req.subscription.maxTokens - currentUsage.tokensUsed;
      
      if (remainingTokens <= 0) {
        // 检查是否允许超额使用（付费计划）
        if (req.subscription.features?.excessTokensPrice) {
          // 计算超额费用
          const excessTokens = Math.abs(remainingTokens);
          const excessCost = (excessTokens / 1000) * req.subscription.features.excessTokensPrice;
          
          // 在响应头中添加超额费用信息
          res.set('X-Excess-Tokens', excessTokens.toString());
          res.set('X-Excess-Cost', excessCost.toString());
        } else {
          // 免费用户，拒绝超额使用
          return res.status(429).json({
            success: false,
            message: 'Token使用量已达上限，请升级订阅计划',
            code: 'TOKEN_LIMIT_EXCEEDED',
            currentUsage: currentUsage.tokensUsed,
            limit: req.subscription.maxTokens,
            resetDate: getNextMonthReset()
          });
        }
      }

      // 检查图像生成限制（如果适用）
      if (req.body.imageGeneration && req.subscription.maxImages > 0) {
        const remainingImages = req.subscription.maxImages - currentUsage.imagesUsed;
        
        if (remainingImages <= 0) {
          if (req.subscription.features?.excessImagesPrice) {
            const excessImages = Math.abs(remainingImages);
            const excessCost = excessImages * req.subscription.features.excessImagesPrice;
            
            res.set('X-Excess-Images', excessImages.toString());
            res.set('X-Excess-Image-Cost', excessCost.toString());
          } else {
            return res.status(429).json({
              success: false,
              message: '图像生成次数已达上限，请升级订阅计划',
              code: 'IMAGE_LIMIT_EXCEEDED',
              currentUsage: currentUsage.imagesUsed,
              limit: req.subscription.maxImages,
              resetDate: getNextMonthReset()
            });
          }
        }
      }

      // 在响应头中添加使用量信息
      res.set('X-Tokens-Used', currentUsage.tokensUsed.toString());
      res.set('X-Tokens-Limit', req.subscription.maxTokens.toString());
      res.set('X-Tokens-Remaining', Math.max(0, remainingTokens).toString());

      next();
    } catch (error) {
      logger.error('Token使用量检查错误:', error);
      res.status(500).json({
        success: false,
        message: '使用量检查失败',
        code: 'USAGE_CHECK_ERROR'
      });
    }
  };
};

/**
 * API调用限制中间件
 */
export const checkApiAccess = () => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.subscription) {
        return res.status(401).json({
          success: false,
          message: '用户认证或订阅信息缺失',
          code: 'AUTH_REQUIRED'
        });
      }

      // 检查是否有API访问权限
      if (!req.subscription.features?.apiAccess) {
        return res.status(403).json({
          success: false,
          message: '当前订阅计划不支持API访问',
          code: 'API_ACCESS_DENIED',
          requiredPlan: '专业版或企业版'
        });
      }

      // 检查API调用频率限制
      const rateLimitResult = await checkApiRateLimit(req.user.id, req.subscription);
      
      if (!rateLimitResult.allowed) {
        res.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
        res.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        res.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

        return res.status(429).json({
          success: false,
          message: 'API调用频率超限，请稍后再试',
          code: 'API_RATE_LIMIT_EXCEEDED',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        });
      }

      next();
    } catch (error) {
      logger.error('API访问检查错误:', error);
      res.status(500).json({
        success: false,
        message: 'API访问检查失败',
        code: 'API_CHECK_ERROR'
      });
    }
  };
};

/**
 * 企业功能权限检查中间件
 */
export const checkEnterpriseFeatures = (feature: string) => {
  return async (req: ExtendedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.subscription) {
        return res.status(401).json({
          success: false,
          message: '用户认证或订阅信息缺失',
          code: 'AUTH_REQUIRED'
        });
      }

      // 检查是否为企业版用户
      if (req.subscription.planType !== 'ENTERPRISE') {
        return res.status(403).json({
          success: false,
          message: `${feature}功能仅限企业版用户使用`,
          code: 'ENTERPRISE_FEATURE_REQUIRED',
          currentPlan: req.subscription.planType,
          requiredPlan: 'ENTERPRISE'
        });
      }

      // 检查具体功能权限
      const enterpriseFeatures = req.subscription.features;
      
      switch (feature) {
        case 'privateDeployment':
          if (!enterpriseFeatures?.privateDeployment) {
            return res.status(403).json({
              success: false,
              message: '当前企业版不支持私有化部署',
              code: 'PRIVATE_DEPLOYMENT_NOT_SUPPORTED'
            });
          }
          break;
          
        case 'customTraining':
          if (!enterpriseFeatures?.customTraining) {
            return res.status(403).json({
              success: false,
              message: '当前企业版不支持定制化训练',
              code: 'CUSTOM_TRAINING_NOT_SUPPORTED'
            });
          }
          break;
          
        case 'multiTenant':
          if (!enterpriseFeatures?.multiTenant) {
            return res.status(403).json({
              success: false,
              message: '当前企业版不支持多租户功能',
              code: 'MULTI_TENANT_NOT_SUPPORTED'
            });
          }
          break;
          
        default:
          // 未知功能，默认允许
          break;
      }

      next();
    } catch (error) {
      logger.error('企业功能检查错误:', error);
      res.status(500).json({
        success: false,
        message: '企业功能检查失败',
        code: 'ENTERPRISE_FEATURE_CHECK_ERROR'
      });
    }
  };
};

// 辅助函数

async function getUserCurrentSubscription(userId: string) {
  try {
    // 这里应该从数据库获取用户当前的订阅信息
    // 暂时返回示例数据
    return {
      planType: 'FREE',
      maxTokens: 1000000,
      maxImages: 50,
      features: {
        aiModels: ['glm-4-flash', 'doubao-pro-32k', 'embedding-2'],
        excessTokensPrice: 0.008,
        excessImagesPrice: 0.015,
        apiAccess: false,
        privateDeployment: false,
        customTraining: false,
        multiTenant: false
      }
    };
  } catch (error) {
    throw new Error('获取用户订阅信息失败');
  }
}

async function getCurrentMonthUsage(userId: string) {
  try {
    // 这里应该从数据库获取用户当前月的使用统计
    // 暂时返回示例数据
    return {
      tokensUsed: 500000,
      imagesUsed: 20
    };
  } catch (error) {
    throw new Error('获取使用统计失败');
  }
}

async function checkApiRateLimit(userId: string, subscription: any) {
  try {
    // 这里应该实现API调用频率限制逻辑
    // 暂时返回示例数据
    return {
      allowed: true,
      limit: 1000,
      remaining: 950,
      resetTime: Date.now() + 3600000 // 1小时后重置
    };
  } catch (error) {
    throw new Error('API频率限制检查失败');
  }
}

async function getUpgradeOptions(userId: string) {
  try {
    const plans = await subscriptionService2025.getAvailablePlans();
    return plans.filter(plan => plan.price > 0);
  } catch (error) {
    return [];
  }
}

function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}