import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

export default function EmailVerification() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setMessage('验证链接无效，请检查链接是否完整');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationStatus('success');
        setMessage(data.message);
        setUserInfo(data.data.user);
      } else {
        setVerificationStatus('error');
        setMessage(data.message);
      }
    } catch (error) {
      console.error('邮箱验证失败:', error);
      setVerificationStatus('error');
      setMessage('验证过程中出现错误，请稍后重试');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        return (
          <div className="flex flex-col items-center space-y-4 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">正在验证邮箱...</h3>
              <p className="text-muted-foreground">请稍候，我们正在验证您的邮箱地址</p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center space-y-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">邮箱验证成功！</h3>
              <p className="text-muted-foreground">{message}</p>
              {userInfo && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm">欢迎加入 AiDesign，{userInfo.username || userInfo.email}！</p>
                </div>
              )}
            </div>
            <Button 
              onClick={() => navigate('/login')}
              className="w-full"
            >
              立即登录
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center space-y-4 text-center">
            <XCircle className="h-12 w-12 text-red-500" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">验证失败</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <div className="w-full space-y-2">
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                返回首页
              </Button>
              <Button 
                onClick={() => navigate('/resend-verification')}
                variant="ghost"
                className="w-full"
              >
                重新发送验证邮件
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">邮箱验证</CardTitle>
          <CardDescription>
            {verificationStatus === 'loading' && '正在验证您的邮箱地址...'}
            {verificationStatus === 'success' && '您的邮箱已成功验证！'}
            {verificationStatus === 'error' && '邮箱验证过程中遇到问题'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}