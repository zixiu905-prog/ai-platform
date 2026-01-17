import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  durationDays: number;
  features: any;
  maxTokens: number;
  maxImages: number;
  aiModels: string[];
  isActive: boolean;
}

interface UsageStats {
  tokensUsed: number;
  imagesUsed: number;
  costIncurred: number;
  remainingTokens: number;
  remainingImages: number;
  excessCharges: number;
  daysRemaining: number;
  utilizationRate: number;
}

interface ModelPricing {
  id: string;
  model: string;
  provider: string;
  modelType: string;
  inputPricePerK: number;
  outputPricePerK: number;
  maxTokens: number;
  features: any;
}

export const useSubscription2025 = () => {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelPricing[]>([]);

  // 获取所有订阅计划
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription-2025/plans', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('获取订阅计划失败:', error);
      toast.error('获取订阅计划失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取当前订阅状态
  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription-2025/current', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setCurrentSubscription(data.data);
        if (data.data.subscriptionId) {
          fetchUsageStats(data.data.subscriptionId);
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('获取当前订阅失败:', error);
      toast.error('获取订阅状态失败');
    }
  }, []);

  // 获取使用统计
  const fetchUsageStats = useCallback(async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscription-2025/usage?subscriptionId=${subscriptionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsageStats(data.data);
      }
    } catch (error) {
      console.error('获取使用统计失败:', error);
    }
  }, []);

  // 获取可用模型
  const fetchAvailableModels = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription-2025/models', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setAvailableModels(data.data);
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  }, []);

  // 创建或升级订阅
  const createSubscription = useCallback(async (planId: string, paymentMethod: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription-2025/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId,
          paymentMethod,
          isAutoRenewal: true
        })
      });

      const data = await response.json();
      if (data.success && data.data.paymentUrl) {
        // 跳转到支付页面
        window.open(data.data.paymentUrl, '_blank');
        toast.success('正在跳转到支付页面...');
        return { success: true, paymentUrl: data.data.paymentUrl };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('创建订阅失败:', error);
      toast.error(error instanceof Error ? error.message : '创建订阅失败');
      return { success: false, error: error instanceof Error ? error.message : '未知错误' };
    } finally {
      setLoading(false);
    }
  }, []);

  // 检查模型权限
  const checkModelAccess = useCallback(async (modelName: string) => {
    try {
      const response = await fetch(`/api/subscription-2025/check-access/${modelName}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      return data.success ? data.data : { allowed: false, reason: data.message };
    } catch (error) {
      console.error('检查模型权限失败:', error);
      return { allowed: false, reason: '权限检查失败' };
    }
  }, []);

  // 计算成本
  const calculateCost = useCallback(async (modelName: string, inputTokens: number, outputTokens: number) => {
    try {
      const response = await fetch('/api/subscription-2025/calculate-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ modelName, inputTokens, outputTokens })
      });
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('计算成本失败:', error);
      return null;
    }
  }, []);

  // 获取推荐计划
  const getRecommendedPlan = useCallback(async (userUsage?: {
    monthlyTokens?: number;
    monthlyImages?: number;
    teamSize?: number;
    businessType?: 'personal' | 'startup' | 'enterprise';
  }) => {
    try {
      const params = new URLSearchParams();
      if (userUsage?.monthlyTokens) params.append('monthlyTokens', userUsage.monthlyTokens.toString());
      if (userUsage?.monthlyImages) params.append('monthlyImages', userUsage.monthlyImages.toString());
      if (userUsage?.teamSize) params.append('teamSize', userUsage.teamSize.toString());
      if (userUsage?.businessType) params.append('businessType', userUsage.businessType);

      const response = await fetch(`/api/subscription-2025/recommend?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('获取推荐计划失败:', error);
      return null;
    }
  }, []);

  // 升级订阅
  const upgradeSubscription = useCallback(async (targetPlanId: string, paymentMethod: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription-2025/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ targetPlanId, paymentMethod, immediateActivation: true })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('订阅升级订单创建成功');
        if (data.data.paymentUrl) {
          window.open(data.data.paymentUrl, '_blank');
        }
        return { success: true };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('升级订阅失败:', error);
      toast.error(error instanceof Error ? error.message : '升级订阅失败');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // 取消订阅
  const cancelSubscription = useCallback(async (reason?: string, feedback?: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription-2025/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason, feedback })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('订阅取消成功');
        await fetchCurrentSubscription(); // 刷新订阅状态
        return { success: true };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('取消订阅失败:', error);
      toast.error(error instanceof Error ? error.message : '取消订阅失败');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentSubscription]);

  // 更新自动续费
  const updateAutoRenewal = useCallback(async (autoRenewal: boolean, paymentMethod?: string) => {
    try {
      const response = await fetch('/api/subscription-2025/auto-renewal', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ autoRenewal, paymentMethod })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('自动续费设置更新成功');
        await fetchCurrentSubscription(); // 刷新订阅状态
        return { success: true };
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('更新自动续费失败:', error);
      toast.error(error instanceof Error ? error.message : '更新自动续费失败');
      return { success: false };
    }
  }, [fetchCurrentSubscription]);

  // 获取使用趋势
  const getUsageTrends = useCallback(async (period: string = '30days') => {
    try {
      const response = await fetch(`/api/subscription-2025/usage-trends?period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('获取使用趋势失败:', error);
      return null;
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    fetchAvailableModels();
  }, [fetchPlans, fetchCurrentSubscription, fetchAvailableModels]);

  return {
    // 状态
    loading,
    plans,
    currentSubscription,
    usageStats,
    availableModels,

    // 方法
    fetchPlans,
    fetchCurrentSubscription,
    fetchUsageStats,
    fetchAvailableModels,
    createSubscription,
    checkModelAccess,
    calculateCost,
    getRecommendedPlan,
    upgradeSubscription,
    cancelSubscription,
    updateAutoRenewal,
    getUsageTrends,

    // 便捷方法
    isPremium: currentSubscription?.planType !== 'FREE',
    isEnterprise: currentSubscription?.planType === 'ENTERPRISE',
    canUseAPI: currentSubscription?.features?.apiAccess || false,
    hasPrivateDeployment: currentSubscription?.features?.privateDeployment || false,
    remainingTokens: usageStats?.remainingTokens || 0,
    remainingImages: usageStats?.remainingImages || 0,
    utilizationRate: usageStats?.utilizationRate || 0,
    daysRemaining: usageStats?.daysRemaining || 0
  };
};

export default useSubscription2025;