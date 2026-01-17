import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Globe, 
  QrCode,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AlipayPaymentProps {
  amount: number;
  subject: string;
  description?: string;
  userId: string;
  planId?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  onPaymentCreate?: (paymentUrl: string, paymentId: string) => void;
}

const AlipayPayment: React.FC<AlipayPaymentProps> = ({
  amount,
  subject,
  description,
  userId,
  planId,
  onSuccess,
  onError,
  onPaymentCreate
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'web' | 'wap' | 'app'>('web');

  // 生成订单号
  const generateOrderNo = (): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ALI${timestamp}${random}`;
  };

  // 创建支付宝支付订单
  const createPayment = async (method: 'web' | 'wap' | 'app') => {
    try {
      setLoading(true);
      setError('');

      const outTradeNo = generateOrderNo();
      const endpoint = method === 'web' ? '/web' : method === 'wap' ? '/wap' : '/app';

      const response = await fetch(`/api/payment/alipay${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outTradeNo,
          totalAmount: amount,
          subject,
          body: description,
          userId,
          planId
        })
      });

      const data = await response.json();

      if (data.success) {
        setPaymentUrl(data.data.paymentUrl);
        setPaymentId(data.data.paymentId);
        onPaymentCreate?.(data.data.paymentUrl, data.data.paymentId);
        
        // 如果是网页或手机支付，直接跳转
        if (method !== 'app') {
          window.open(data.data.paymentUrl, '_blank');
        }
      } else {
        const errorMsg = data.message || '创建支付订单失败';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '网络错误';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 处理支付方式选择
  const handlePaymentMethodChange = (method: 'web' | 'wap' | 'app') => {
    setPaymentMethod(method);
    setPaymentUrl('');
    setPaymentId('');
    setError('');
  };

  // 复制支付链接
  const copyPaymentUrl = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      // 这里可以添加复制成功的提示
    }
  };

  const paymentMethods = [
    {
      key: 'web' as const,
      name: '网页支付',
      description: '在PC浏览器中完成支付',
      icon: Globe,
      color: 'bg-blue-500'
    },
    {
      key: 'wap' as const,
      name: '手机支付',
      description: '在手机浏览器中完成支付',
      icon: Smartphone,
      color: 'bg-green-500'
    },
    {
      key: 'app' as const,
      name: 'APP支付',
      description: '在支付宝APP中完成支付',
      icon: QrCode,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      {/* 头部信息 */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">支付宝支付</h3>
            <p className="text-sm text-gray-500">安全、便捷的支付方式</p>
          </div>
        </div>

        {/* 订单信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">支付金额：</span>
            <span className="text-2xl font-bold text-gray-900">¥{amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">订单描述：</span>
            <span className="text-gray-900">{subject}</span>
          </div>
          {description && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-600">备注：</span>
              <span className="text-gray-900 text-sm">{description}</span>
            </div>
          )}
        </div>
      </div>

      {/* 支付方式选择 */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-4">选择支付方式</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.key}
                onClick={() => handlePaymentMethodChange(method.key)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === method.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`p-3 rounded-lg ${method.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{method.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{method.description}</div>
                  </div>
                </div>
                {paymentMethod === method.key && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 支付操作按钮 */}
      <div className="mb-6">
        <button
          onClick={() => createPayment(paymentMethod)}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>处理中...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>
                {paymentMethod === 'web' ? '创建网页支付' : 
                 paymentMethod === 'wap' ? '创建手机支付' : '创建APP支付'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">支付失败</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 支付成功信息 */}
      {paymentUrl && paymentMethod !== 'app' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-700 font-medium">支付链接已创建</p>
              <p className="text-green-600 text-sm mt-1">
                请在新打开的页面中完成支付，或复制链接在其他设备中打开
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <input
                  type="text"
                  value={paymentUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                />
                <button
                  onClick={copyPaymentUrl}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                >
                  <span>复制</span>
                </button>
                <button
                  onClick={() => window.open(paymentUrl, '_blank')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>打开</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APP支付信息 */}
      {paymentUrl && paymentMethod === 'app' && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <QrCode className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-orange-700 font-medium">APP支付信息已生成</p>
              <p className="text-orange-600 text-sm mt-1">
                请使用生成的订单字符串在移动端APP中调起支付
              </p>
              <div className="mt-3">
                <div className="p-3 bg-white border border-gray-300 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">订单字符串：</p>
                  <p className="text-sm font-mono break-all">{paymentUrl}</p>
                </div>
                <button
                  onClick={copyPaymentUrl}
                  className="mt-2 w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  复制订单字符串
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 安全提示 */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>• 请确保在官方支付宝页面完成支付</p>
        <p>• 支付过程中请勿关闭页面</p>
        <p>• 如遇问题请联系客服</p>
      </div>
    </div>
  );
};

export default AlipayPayment;