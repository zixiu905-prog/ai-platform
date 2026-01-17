import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Calendar,
  DollarSign,
  CreditCard
} from 'lucide-react';

interface Payment {
  id: string;
  outTradeNo: string;
  amount: number;
  status: string;
  paymentMethod: string;
  description?: string;
  transactionId?: string;
  paymentUrl?: string;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: string;
    name: string;
    description: string;
  };
  refunds: Array<{
    id: string;
    refundAmount: number;
    status: string;
    createdAt: string;
  }>;
}

interface PaymentStatusProps {
  paymentId?: string;
  outTradeNo?: string;
  onStatusChange?: (status: string) => void;
  showDetails?: boolean;
  compact?: boolean;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({
  paymentId,
  outTradeNo,
  onStatusChange,
  showDetails = true,
  compact = false
}) => {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 获取支付状态
  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = paymentId 
        ? `/api/payment/query/payment/${paymentId}`
        : `/api/payment/query/order/${outTradeNo}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setPayment(data.data);
        onStatusChange?.(data.data.status);
      } else {
        setError(data.message || '查询失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 刷新支付状态
  const refreshStatus = async () => {
    await fetchPaymentStatus();
  };

  // 自动刷新
  useEffect(() => {
    if (!paymentId && !outTradeNo) return;

    fetchPaymentStatus();

    let interval: NodeJS.Timeout;
    if (autoRefresh && payment?.status === 'PENDING') {
      interval = setInterval(fetchPaymentStatus, 5000); // 每5秒刷新一次
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentId, outTradeNo, autoRefresh, payment?.status]);

  // 获取状态图标和颜色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          text: '支付成功',
          textColor: 'text-green-700'
        };
      case 'PENDING':
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          text: '等待支付',
          textColor: 'text-yellow-700'
        };
      case 'CANCELLED':
        return {
          icon: XCircle,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: '已取消',
          textColor: 'text-gray-700'
        };
      case 'REFUNDED':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          text: '已退款',
          textColor: 'text-blue-700'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: '未知状态',
          textColor: 'text-gray-700'
        };
    }
  };

  if (!payment && !loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">暂无支付信息</p>
      </div>
    );
  }

  if (loading && !payment) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">{error || '加载失败'}</p>
      </div>
    );
  }

  const statusInfo = getStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
        <span className={`text-sm ${statusInfo.textColor}`}>{statusInfo.text}</span>
        {payment.status === 'PENDING' && (
          <button
            onClick={refreshStatus}
            className="p-1 hover:bg-gray-100 rounded"
            title="刷新状态"
          >
            <RefreshCw className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* 状态头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-full ${statusInfo.bgColor}`}>
            <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{statusInfo.text}</h3>
            <p className="text-sm text-gray-500">
              订单号: {payment.outTradeNo}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {payment.status === 'PENDING' && (
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                autoRefresh 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {autoRefresh ? '自动刷新中' : '自动刷新'}
            </button>
          )}
          
          <button
            onClick={refreshStatus}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} text-gray-600`} />
          </button>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* 支付信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">支付金额</p>
            <p className="font-semibold">¥{payment.amount.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <CreditCard className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">支付方式</p>
            <p className="font-medium">
              {payment.paymentMethod.replace('_', ' ')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">创建时间</p>
            <p className="font-medium">
              {new Date(payment.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {payment.transactionId && (
          <div className="flex items-center space-x-3">
            <ExternalLink className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">交易号</p>
              <p className="font-mono text-sm">{payment.transactionId}</p>
            </div>
          </div>
        )}
      </div>

      {/* 计划信息 */}
      {payment.plan && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">订阅计划</h4>
          <p className="text-sm font-medium">{payment.plan.name}</p>
          {payment.plan.description && (
            <p className="text-sm text-gray-600 mt-1">{payment.plan.description}</p>
          )}
        </div>
      )}

      {/* 描述信息 */}
      {payment.description && (
        <div className="mb-6">
          <h4 className="font-medium mb-2">备注</h4>
          <p className="text-sm text-gray-600">{payment.description}</p>
        </div>
      )}

      {/* 详细信息 */}
      {showDetails && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">详细信息</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">支付ID:</span>
              <span className="font-mono">{payment.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">商户订单号:</span>
              <span className="font-mono">{payment.outTradeNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">更新时间:</span>
              <span>{new Date(payment.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 退款信息 */}
      {payment.refunds && payment.refunds.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-3">退款记录</h4>
          <div className="space-y-2">
            {payment.refunds.map((refund) => (
              <div key={refund.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">退款金额: ¥{refund.refundAmount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(refund.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  refund.status === 'SUCCESS' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {refund.status === 'SUCCESS' ? '退款成功' : '退款处理中'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-6 flex space-x-3">
        {payment.status === 'PENDING' && payment.paymentUrl && (
          <button
            onClick={() => window.open(payment.paymentUrl, '_blank')}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            继续支付
          </button>
        )}
        
        <button
          onClick={() => navigator.clipboard.writeText(payment.outTradeNo)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          复制订单号
        </button>
      </div>
    </div>
  );
};

export default PaymentStatus;