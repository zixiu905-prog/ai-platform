import React, { useState } from 'react';
import { 
  CreditCard, 
  QrCode, 
  Smartphone, 
  Globe,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import PaymentStatus from './PaymentStatus';
import AlipayPayment from './AlipayPayment';

interface PaymentMethodProps {
  amount: number;
  subject: string;
  description?: string;
  userId: string;
  planId?: string;
  onSuccess?: (paymentId: string, paymentMethod: string) => void;
  onError?: (error: string) => void;
}

const PaymentMethod: React.FC<PaymentMethodProps> = ({
  amount,
  subject,
  description,
  userId,
  planId,
  onSuccess,
  onError
}) => {
  const [selectedProvider, setSelectedProvider] = useState<'wechat' | 'alipay'>('wechat');
  const [paymentId, setPaymentId] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(false);

  // 处理支付创建成功
  const handlePaymentCreate = (paymentUrl: string, newPaymentId: string) => {
    setPaymentId(newPaymentId);
    setShowStatus(true);
  };

  // 处理支付状态变化
  const handleStatusChange = (status: string) => {
    if (status === 'SUCCESS') {
      onSuccess?.(paymentId, selectedProvider);
    }
  };

  // 处理错误
  const handleError = (error: string) => {
    onError?.(error);
  };

  const paymentProviders = [
    {
      key: 'wechat' as const,
      name: '微信支付',
      description: '使用微信扫码或APP支付',
      icon: QrCode,
      color: 'bg-green-500',
      methods: [
        { key: 'native', name: '扫码支付', description: '使用微信扫码支付' },
        { key: 'h5', name: 'H5支付', description: '在手机浏览器中支付' },
        { key: 'jsapi', name: '公众号支付', description: '在微信内支付' }
      ]
    },
    {
      key: 'alipay' as const,
      name: '支付宝',
      description: '使用支付宝安全支付',
      icon: CreditCard,
      color: 'bg-blue-500',
      methods: [
        { key: 'web', name: '网页支付', description: '在PC浏览器中支付' },
        { key: 'wap', name: '手机支付', description: '在手机浏览器中支付' },
        { key: 'app', name: 'APP支付', description: '在支付宝APP中支付' }
      ]
    }
  ];

  // 创建微信支付订单
  const createWechatPayment = async (method: 'native' | 'h5' | 'jsapi') => {
    try {
      const outTradeNo = `WX${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const endpoint = method === 'native' ? '/native' : method === 'h5' ? '/h5' : '/jsapi';
      const payload: any = {
        outTradeNo,
        description: subject,
        amount,
        userId,
        planId
      };

      if (method === 'jsapi') {
        payload.openid = 'test_openid'; // 实际需要获取用户的openid
      }

      const response = await fetch(`/api/payment/wechat${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        if (method === 'native' && data.data.codeUrl) {
          window.open(data.data.codeUrl, '_blank');
        } else if (method === 'h5' && data.data.h5Url) {
          window.open(data.data.h5Url, '_blank');
        } else if (method === 'jsapi' && data.data) {
          // JSAPI支付需要在页面中调用微信支付JS
          console.log('JSAPI支付参数:', data.data);
          alert('请在微信环境中完成支付');
        }
        
        setPaymentId(data.data.paymentId);
        setShowStatus(true);
      } else {
        handleError(data.message || '创建微信支付订单失败');
      }
    } catch (err) {
      handleError(err instanceof Error ? err.message : '网络错误');
    }
  };

  if (showStatus && paymentId) {
    return (
      <div className="max-w-2xl mx-auto">
        <PaymentStatus
          paymentId={paymentId}
          onStatusChange={handleStatusChange}
          showDetails={true}
        />
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowStatus(false)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            返回支付选择
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 订单信息 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">订单信息</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">支付金额：</span>
            <span className="text-3xl font-bold text-gray-900">¥{amount.toFixed(2)}</span>
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

      {/* 支付平台选择 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">选择支付平台</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paymentProviders.map((provider) => {
            const Icon = provider.icon;
            return (
              <button
                key={provider.key}
                onClick={() => setSelectedProvider(provider.key)}
                className={`relative p-6 rounded-lg border-2 transition-all ${
                  selectedProvider === provider.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`p-4 rounded-lg ${provider.color}`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{provider.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{provider.description}</div>
                  </div>
                </div>
                {selectedProvider === provider.key && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 支付方式选择 */}
      {selectedProvider === 'wechat' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">选择微信支付方式</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentProviders[0].methods.map((method) => (
              <button
                key={method.key}
                onClick={() => createWechatPayment(method.key as any)}
                className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-2 bg-green-100 rounded">
                    <Smartphone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">{method.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{method.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProvider === 'alipay' && (
        <AlipayPayment
          amount={amount}
          subject={subject}
          description={description}
          userId={userId}
          planId={planId}
          onPaymentCreate={handlePaymentCreate}
          onError={handleError}
        />
      )}

      {/* 安全提示 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-blue-700 font-medium">安全提示</p>
            <div className="text-blue-600 text-sm mt-1 space-y-1">
              <p>• 请在官方支付页面完成支付，勿在其他网站输入支付密码</p>
              <p>• 支付金额与订单金额不符时，请立即停止支付</p>
              <p>• 支付完成后请勿立即关闭页面，等待跳转回商家页面</p>
              <p>• 如遇问题请及时联系客服</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;