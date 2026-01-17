import React, { useState } from 'react';
import { Button, message, QRCode, Modal, Spin } from 'antd';
import { WechatOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

interface WeChatLoginProps {
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: string) => void;
  className?: string;
}

const WeChatLogin: React.FC<WeChatLoginProps> = ({
  onLoginSuccess,
  onLoginError,
  className
}) => {
  const [loading, setLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loginState, setLoginState] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { login } = useAuth();

  // 生成微信登录二维码
  const generateQRCode = async () => {
    try {
      setLoading(true);
      const redirectUri = `${window.location.origin}/auth/wechat/callback`;
      
      const response = await fetch('/api/oauth/wechat/authorize', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '生成二维码失败');
      }

      setQrCodeUrl(data.data.authorizeUrl);
      setLoginState(data.data.state);
      setQrModalVisible(true);
      
      // 开始轮询登录状态
      startPolling(data.data.state);
      
    } catch (error) {
      console.error('生成微信二维码失败:', error);
      const errorMessage = error instanceof Error ? error.message : '生成二维码失败';
      message.error(errorMessage);
      onLoginError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 开始轮询登录状态
  const startPolling = (state: string) => {
    const interval = setInterval(async () => {
      try {
        // 检查本地存储是否有登录结果
        const loginResult = localStorage.getItem(`wechat_login_${state}`);
        
        if (loginResult) {
          clearInterval(interval);
          setPollingInterval(null);
          localStorage.removeItem(`wechat_login_${state}`);
          
          const result = JSON.parse(loginResult);
          
          if (result.success) {
            message.success('微信登录成功');
            onLoginSuccess?.(result.data);
            setQrModalVisible(false);
          } else {
            throw new Error(result.error || '微信登录失败');
          }
        }
      } catch (error) {
        console.error('轮询登录状态失败:', error);
        clearInterval(interval);
        setPollingInterval(null);
        const errorMessage = error instanceof Error ? error.message : '登录失败';
        message.error(errorMessage);
        onLoginError?.(errorMessage);
      }
    }, 2000); // 每2秒轮询一次

    setPollingInterval(interval);

    // 5分钟后停止轮询
    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
    }, 5 * 60 * 1000);
  };

  // 关闭二维码弹窗
  const handleCloseQRModal = () => {
    setQrModalVisible(false);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // 处理微信移动端登录（在微信浏览器内）
  const handleMobileLogin = async () => {
    try {
      setLoading(true);
      const redirectUri = `${window.location.origin}/auth/wechat/mobile/callback`;
      
      const response = await fetch('/api/oauth/wechat/mobile/authorize', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '获取授权链接失败');
      }

      // 跳转到微信授权页面
      window.location.href = data.data.authorizeUrl;
      
    } catch (error) {
      console.error('微信移动端登录失败:', error);
      const errorMessage = error instanceof Error ? error.message : '移动端登录失败';
      message.error(errorMessage);
      onLoginError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 检测是否在微信浏览器中
  const isWeChatBrowser = () => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  };

  const handleWeChatLogin = () => {
    if (isWeChatBrowser()) {
      handleMobileLogin();
    } else {
      generateQRCode();
    }
  };

  return (
    <div className={className}>
      <Button
        type="primary"
        icon={<WechatOutlined />}
        loading={loading}
        onClick={handleWeChatLogin}
        style={{
          backgroundColor: '#07c160',
          borderColor: '#07c160',
          width: '100%',
          height: '40px',
        }}
      >
        {isWeChatBrowser() ? '微信快速登录' : '微信扫码登录'}
      </Button>

      {/* 二维码弹窗 */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <QrcodeOutlined style={{ marginRight: 8 }} />
            微信扫码登录
          </div>
        }
        open={qrModalVisible}
        onCancel={handleCloseQRModal}
        footer={null}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <Spin spinning={loading}>
              {qrCodeUrl && (
                <QRCode
                  value={qrCodeUrl}
                  size={256}
                  level="H"
                  style={{ margin: '0 auto' }}
                />
              )}
            </Spin>
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>
            <p>请使用微信扫描二维码登录</p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              二维码5分钟后失效，请及时扫码
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WeChatLogin;