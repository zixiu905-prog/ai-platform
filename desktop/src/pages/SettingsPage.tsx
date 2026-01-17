import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Form, 
  Switch, 
  Input, 
  Button, 
  Select, 
  Slider, 
  Space,
  Divider,
  message,
  Row,
  Col,
  InputNumber
} from 'antd';
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiService } from '../services/apiService';
import { notificationManager } from '../services/notificationManager';

const { Title, Text } = Typography;
const { Option } = Select;

interface Settings {
  // 通用设置
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  
  // API设置
  apiBaseUrl: string;
  requestTimeout: number;
  autoRetry: boolean;
  retryCount: number;
  
  // 通知设置
  enableNotifications: boolean;
  notificationTimeout: number;
  enableSound: boolean;
  
  // 文件设置
  defaultUploadPath: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  
  // AI设置
  aiModel: string;
  maxTokens: number;
  temperature: number;
}

const defaultSettings: Settings = {
  theme: 'auto',
  language: 'zh-CN',
  apiBaseUrl: 'http://localhost:3001/api',
  requestTimeout: 30000,
  autoRetry: true,
  retryCount: 3,
  enableNotifications: true,
  notificationTimeout: 5000,
  enableSound: false,
  defaultUploadPath: '',
  maxFileSize: 100,
  allowedFileTypes: ['*'],
  aiModel: 'gpt-3.5-turbo',
  maxTokens: 1000,
  temperature: 0.7
};

export const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
        form.setFieldsValue({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const saveSettings = async (values: Settings) => {
    setLoading(true);
    try {
      // 保存到本地存储
      localStorage.setItem('app_settings', JSON.stringify(values));
      setSettings(values);
      
      // 更新API服务配置
      apiService.baseUrl = values.apiBaseUrl;
      
      // 应用主题设置
      if (values.theme !== 'auto') {
        document.body.setAttribute('data-theme', values.theme);
      } else {
        // 自动检测系统主题
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      }
      
      message.success('设置已保存');
      
      await notificationManager.showSuccess('设置保存', '应用设置已成功保存');
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    setTestLoading(true);
    try {
      const isConnected = await apiService.checkConnection();
      if (isConnected) {
        message.success('API连接测试成功');
      } else {
        message.error('API连接测试失败');
      }
    } catch (error) {
      message.error('API连接测试异常');
    } finally {
      setTestLoading(false);
    }
  };

  const resetSettings = () => {
    form.setFieldsValue(defaultSettings);
    setSettings(defaultSettings);
    message.info('设置已重置为默认值');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-design-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('设置已导出');
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        const mergedSettings = { ...defaultSettings, ...importedSettings };
        form.setFieldsValue(mergedSettings);
        setSettings(mergedSettings);
        message.success('设置已导入');
      } catch (error) {
        message.error('导入设置失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings-page">
      <Title level={2}>
        <SettingOutlined /> 应用设置
      </Title>

      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onFinish={saveSettings}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="通用设置" size="small">
              <Form.Item label="主题" name="theme">
                <Select>
                  <Option value="light">浅色</Option>
                  <Option value="dark">深色</Option>
                  <Option value="auto">自动</Option>
                </Select>
              </Form.Item>
              
              <Form.Item label="语言" name="language">
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="API设置" size="small">
              <Form.Item label="API基础URL" name="apiBaseUrl">
                <Input placeholder="http://localhost:3001/api" />
              </Form.Item>
              
              <Form.Item label="请求超时(毫秒)" name="requestTimeout">
                <InputNumber min={5000} max={300000} style={{ width: '100%' }} />
              </Form.Item>
              
              <Form.Item label="自动重试" name="autoRetry" valuePropName="checked">
                <Switch />
              </Form.Item>
              
              <Form.Item label="重试次数" name="retryCount">
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
              
              <Form.Item>
                <Button 
                  onClick={testApiConnection} 
                  loading={testLoading}
                  size="small"
                >
                  测试连接
                </Button>
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="通知设置" size="small">
              <Form.Item label="启用通知" name="enableNotifications" valuePropName="checked">
                <Switch />
              </Form.Item>
              
              <Form.Item label="通知超时(毫秒)" name="notificationTimeout">
                <InputNumber min={1000} max={30000} style={{ width: '100%' }} />
              </Form.Item>
              
              <Form.Item label="启用提示音" name="enableSound" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="AI设置" size="small">
              <Form.Item label="AI模型" name="aiModel">
                <Select>
                  <Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Option>
                  <Option value="gpt-4">GPT-4</Option>
                  <Option value="claude-3">Claude 3</Option>
                </Select>
              </Form.Item>
              
              <Form.Item label="最大Tokens" name="maxTokens">
                <InputNumber min={100} max={4000} style={{ width: '100%' }} />
              </Form.Item>
              
              <Form.Item label="Temperature" name="temperature">
                <Slider min={0} max={2} step={0.1} />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Space size="middle">
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<SaveOutlined />}
          >
            保存设置
          </Button>
          
          <Button 
            onClick={resetSettings}
            icon={<ReloadOutlined />}
          >
            重置默认
          </Button>
          
          <Button onClick={exportSettings}>
            导出设置
          </Button>
          
          <label>
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={importSettings}
            />
            <Button>
              导入设置
            </Button>
          </label>
        </Space>
      </Form>
    </div>
  );
};