import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Spin, message, Result, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuthActions } from '../../hooks/useAuth';

const WeChatMobileCallback: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { search } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuthActions();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code || !state) {
          throw new Error('缺少必要的参数');
        }

        const redirectUri = `${window.location.origin}/auth/wechat/mobile/callback`;

        const response = await fetch('/api/oauth/wechat/mobile/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            redirect_uri: redirectUri,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || '微信登录失败');
        }

        // 登录成功
        setSuccess(true);
        message.success('微信登录成功');
        
        // 更新认证状态
        if (data.data.tokens) {
          localStorage.setItem('access_token', data.data.tokens.accessToken);
          localStorage.setItem('refresh_token', data.data.tokens.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }

        // 3秒后跳转到首页
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);

      } catch (error) {
        console.error('微信移动端回调处理失败:', error);
        const errorMessage = error instanceof Error ? error.message : '微信登录失败';
        setError(errorMessage);
        setSuccess(false);
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [search, navigate, login]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column' 
      }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>正在处理微信登录...</p>
      </div>
    );
  }

  if (success) {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="微信登录成功！"
        subTitle="即将跳转到首页..."
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            立即跳转
          </Button>,
        ]}
      />
    );
  }

  return (
    <Result
      icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
      title="微信登录失败"
      subTitle={error}
      extra={[
        <Button key="retry" onClick={() => navigate('/login')}>
          重新登录
        </Button>,
        <Button type="primary" key="home" onClick={() => navigate('/')}>
          返回首页
        </Button>,
      ]}
    />
  );
};

export default WeChatMobileCallback;