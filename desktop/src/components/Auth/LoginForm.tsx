import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message, Alert } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  MailOutlined,
  LockOutlined,
  UserOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LinkOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onLoginSuccess?: (user: any) => void;
  onSwitchToRegister?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export default function LoginForm({ onLoginSuccess, onSwitchToRegister, onSwitchToForgotPassword }: LoginFormProps) {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      // TODO: 实现登录逻辑
      message.success('登录功能开发中...');
      onLoginSuccess?.({ email: values.email });
    } catch (error) {
      message.error('登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form-container" style={{ maxWidth: 400, margin: '0 auto', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>AiDesign 桌面版</h1>
        <p style={{ color: '#666' }}>欢迎回来</p>
      </div>

      <Form
        form={form}
        name="login"
        onFinish={handleSubmit}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="请输入邮箱地址"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码长度至少6位' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="请输入密码"
            size="large"
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>

        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Button
              type="link"
              onClick={onSwitchToForgotPassword}
              style={{ padding: 0 }}
            >
              忘记密码？
            </Button>
          </div>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isLoading}
          >
            登录
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          还没有账号？
          <Button
            type="link"
            onClick={onSwitchToRegister}
            style={{ padding: 0 }}
          >
            立即注册
          </Button>
        </div>
      </Form>
    </div>
  );
}
