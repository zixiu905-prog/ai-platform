import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('请输入邮箱地址');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus('success');
        setMessage(data.message);
      } else {
        setSubmitStatus('error');
        setMessage(data.message);
      }
    } catch (error) {
      console.error('请求密码重置失败:', error);
      setSubmitStatus('error');
      setMessage('发送失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">邮件已发送</CardTitle>
            <CardDescription>
              如果该邮箱存在，重置密码链接已发送
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {message}
              </p>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>• 请检查您的收件箱和垃圾邮件文件夹</p>
                <p>• 重置链接将在1小时后失效</p>
                <p>• 如果没有收到邮件，请检查邮箱地址是否正确</p>
              </div>
            </div>
            
            <div className="w-full space-y-2">
              <Button 
                onClick={() => {
                  setSubmitStatus('idle');
                  setMessage('');
                  setEmail('');
                }}
                className="w-full"
              >
                重新发送
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/login')}
                className="w-full"
              >
                返回登录
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">忘记密码</CardTitle>
          <CardDescription>
            输入您的邮箱地址，我们将发送重置密码的链接
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入您的邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {message && (
              <Alert variant={submitStatus === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !email}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                '发送重置链接'
              )}
            </Button>

            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="p-0 h-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
              <span>或</span>
              <Link to="/register" className="text-primary hover:underline">
                注册新账户
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}