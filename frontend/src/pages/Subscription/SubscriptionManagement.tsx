import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  Settings, 
  History, 
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  Plus,
  Edit,
  Trash2,
  DollarSign
} from 'lucide-react';
import PaymentMethod from '../../components/Payment/PaymentMethod';
import PaymentList from '../../components/Payment/PaymentList';
import PaymentStatus from '../../components/Payment/PaymentStatus';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  _count?: {
    payments: number;
    subscriptions: number;
  };
}

interface UserSubscription {
  subscriptionStatus: string;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionAutoRenewal: boolean;
  tokens: number;
}

const SubscriptionManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'plans' | 'history' | 'manage'>('current');
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // 获取用户订阅状态
  const fetchUserSubscription = async () => {
    try {
      const userId = localStorage.getItem('userId'); // 实际应该从认证状态获取
      if (!userId) return;

      const response = await fetch(`/api/subscription/user/${userId}`);
      const data = await response.json();

      if (data.success) {
        setUserSubscription(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订阅状态失败');
    }
  };

  // 获取订阅计划列表
  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription/plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订阅计划失败');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserSubscription(),
        fetchPlans()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // 处理支付成功
  const handlePaymentSuccess = async (paymentId: string, paymentMethod: string) => {
    setShowPayment(false);
    setSelectedPlan(null);
    
    // 刷新用户订阅状态
    await fetchUserSubscription();
    setActiveTab('current');
  };

  // 处理订阅续费
  const handleRenewal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  // 处理订阅升级/降级
  const handlePlanChange = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  // 切换自动续费
  const toggleAutoRenewal = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`/api/subscription/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionAutoRenewal: !userSubscription?.subscriptionAutoRenewal
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchUserSubscription();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新自动续费失败');
    }
  };

  // 取消订阅
  const cancelSubscription = async () => {
    if (!confirm('确定要取消订阅吗？取消后将立即生效。')) return;

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`/api/subscription/cancel/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: '用户主动取消'
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchUserSubscription();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消订阅失败');
    }
  };

  // 获取状态显示信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: '活跃',
          textColor: 'text-green-700'
        };
      case 'EXPIRED':
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          text: '已过期',
          textColor: 'text-gray-700'
        };
      case 'CANCELLED':
        return {
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          text: '已取消',
          textColor: 'text-red-700'
        };
      case 'PENDING_RENEWAL':
        return {
          icon: RefreshCw,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          text: '待续费',
          textColor: 'text-yellow-700'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          text: '未知状态',
          textColor: 'text-gray-700'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (showPayment && selectedPlan) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">订阅计划支付</h2>
          <button
            onClick={() => setShowPayment(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{selectedPlan.name}</h3>
          <div className="text-3xl font-bold text-blue-600 mb-4">¥{selectedPlan.price.toFixed(2)}</div>
          <div className="text-gray-600 mb-4">
            订阅期限：{selectedPlan.durationDays} 天
          </div>
          {selectedPlan.description && (
            <div className="text-sm text-gray-500 mb-4">{selectedPlan.description}</div>
          )}
        </div>

        <PaymentMethod
          amount={selectedPlan.price}
          subject={`订阅 ${selectedPlan.name}`}
          description={`${selectedPlan.durationDays}天订阅`}
          userId={localStorage.getItem('userId') || ''}
          planId={selectedPlan.id}
          onSuccess={handlePaymentSuccess}
          onError={setError}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">订阅管理</h1>
        <p className="text-gray-600 mt-2">管理您的订阅计划、查看历史记录和账户信息</p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">操作失败</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'current'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span>当前订阅</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'plans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>订阅计划</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>订阅历史</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>支付记录</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* 当前订阅内容 */}
      {activeTab === 'current' && userSubscription && (
        <div className="space-y-6">
          {/* 订阅状态卡片 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">订阅状态</h3>
              {userSubscription.subscriptionStatus === 'ACTIVE' && (
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userSubscription.subscriptionAutoRenewal}
                      onChange={toggleAutoRenewal}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">自动续费</span>
                  </label>
                </div>
              )}
            </div>

            {userSubscription.subscriptionPlan ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${getStatusInfo(userSubscription.subscriptionStatus).bgColor}`}>
                    {React.createElement(getStatusInfo(userSubscription.subscriptionStatus).icon, {
                      className: `w-6 h-6 ${getStatusInfo(userSubscription.subscriptionStatus).color}`
                    })}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {userSubscription.subscriptionPlan.name}
                    </div>
                    <div className={`text-sm ${getStatusInfo(userSubscription.subscriptionStatus).textColor}`}>
                      {getStatusInfo(userSubscription.subscriptionStatus).text}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">订阅期限</p>
                      <p className="font-medium">
                        {userSubscription.subscriptionStartDate && userSubscription.subscriptionEndDate
                          ? `${new Date(userSubscription.subscriptionStartDate).toLocaleDateString()} - ${new Date(userSubscription.subscriptionEndDate).toLocaleDateString()}`
                          : '未设置'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">点数余额</p>
                      <p className="font-medium">{userSubscription.tokens}</p>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex space-x-3 pt-4">
                  {userSubscription.subscriptionStatus === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleRenewal(userSubscription.subscriptionPlan!)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        立即续费
                      </button>
                      <button
                        onClick={cancelSubscription}
                        className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        取消订阅
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">您当前没有活跃的订阅</p>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  选择订阅计划
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 订阅计划内容 */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                {plan.description && (
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                )}
                
                <div className="text-3xl font-bold text-blue-600 mb-4">
                  ¥{plan.price.toFixed(2)}
                  <span className="text-sm text-gray-500 font-normal">/{plan.durationDays}天</span>
                </div>

                <div className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePlanChange(plan)}
                  className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={!plan.isActive}
                >
                  {plan.isActive ? '选择此计划' : '暂不可用'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 订阅历史内容 */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">订阅历史</h3>
          {/* 这里可以添加订阅历史组件 */}
          <p className="text-gray-500 text-center py-8">订阅历史记录功能开发中...</p>
        </div>
      )}

      {/* 支付记录内容 */}
      {activeTab === 'manage' && (
        <div>
          {userSubscription && (
            <PaymentList
              userId={localStorage.getItem('userId') || ''}
              onPaymentSelect={(payment) => console.log('Selected payment:', payment)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;