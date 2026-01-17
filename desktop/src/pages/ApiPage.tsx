import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Form, 
  Input, 
  Upload, 
  message,
  Space,
  Statistic,
  Row,
  Col,
  Tabs,
  Alert,
  Spin,
  Progress
} from 'antd';
import { 
  UploadOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ApiOutlined,
  FileOutlined,
  AudioOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { apiService, authApi, fileApi, aiApi, systemApi } from '../services/apiService';
import { notificationManager } from '../services/notificationManager';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const ApiPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [activeTab, setActiveTab] = useState('test');

  // 检查API连接状态
  const checkApiConnection = async () => {
    setConnectionStatus('checking');
    try {
      const isConnected = await apiService.checkConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch {
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    checkApiConnection();
    const interval = setInterval(checkApiConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // 测试API表单提交
  const handleApiTest = async (values: any) => {
    setLoading(true);
    try {
      const { method, endpoint, body } = values;
      let result;

      switch (method) {
        case 'GET':
          result = await apiService.get(endpoint);
          break;
        case 'POST':
          result = await apiService.post(endpoint, body ? JSON.parse(body) : undefined);
          break;
        case 'PUT':
          result = await apiService.put(endpoint, body ? JSON.parse(body) : undefined);
          break;
        case 'DELETE':
          result = await apiService.delete(endpoint);
          break;
        default:
          throw new Error('不支持的HTTP方法');
      }

      if (result.success) {
        message.success('API请求成功');
        console.log('API响应:', result.data);
      } else {
        message.error(`API请求失败: ${result.error}`);
      }
    } catch (error) {
      message.error(`API请求异常: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const result = await fileApi.upload(file);
      if (result.success) {
        message.success('文件上传成功');
        await notificationManager.showSuccess('文件上传', `${file.name} 已成功上传到服务器`);
      } else {
        message.error(`文件上传失败: ${result.error}`);
      }
    } catch (error) {
      message.error(`文件上传异常: ${error}`);
    } finally {
      setLoading(false);
    }
    return false; // 阻止默认上传行为
  };

  // 处理AI文本生成
  const handleAIGenerate = async (values: any) => {
    setLoading(true);
    try {
      const result = await aiApi.generateContent(values.prompt, {
        model: values.model,
        maxTokens: values.maxTokens
      });
      
      if (result.success) {
        message.success('AI内容生成成功');
        console.log('生成的内容:', result.data);
      } else {
        message.error(`AI生成失败: ${result.error}`);
      }
    } catch (error) {
      message.error(`AI生成异常: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#52c41a';
      case 'disconnected': return '#ff4d4f';
      default: return '#faad14';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '已连接';
      case 'disconnected': return '未连接';
      default: return '检查中';
    }
  };

  const renderConnectionStatus = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={12}>
          <Statistic
            title="API连接状态"
            value={getConnectionStatusText()}
            valueStyle={{ color: getConnectionStatusColor() }}
            prefix={
              connectionStatus === 'connected' ? 
                <CheckCircleOutlined /> : 
                connectionStatus === 'disconnected' ? 
                <ExclamationCircleOutlined /> : 
                <Spin size="small" />
            }
          />
        </Col>
        <Col span={12}>
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button onClick={checkApiConnection} size="small">
              刷新状态
            </Button>
          </div>
        </Col>
      </Row>
    </Card>
  );

  const renderApiTest = () => (
    <Card title="API测试工具" extra={<ApiOutlined />}>
      <Form
        layout="vertical"
        onFinish={handleApiTest}
        initialValues={{ method: 'GET' }}
      >
        <Form.Item label="HTTP方法" name="method">
          <Input placeholder="GET, POST, PUT, DELETE" />
        </Form.Item>
        
        <Form.Item label="API端点" name="endpoint">
          <Input placeholder="/users/list" />
        </Form.Item>
        
        <Form.Item label="请求体 (JSON格式)" name="body">
          <TextArea rows={4} placeholder='{"name": "test"}' />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<PlayCircleOutlined />}
          >
            发送请求
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderFileUpload = () => (
    <Card title="文件上传测试" extra={<FileOutlined />}>
      <Upload
        beforeUpload={handleFileUpload}
        showUploadList={false}
        accept="*/*"
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          选择文件上传
        </Button>
      </Upload>
      
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">
          支持所有文件类型，单文件上传测试
        </Text>
      </div>
    </Card>
  );

  const renderAITest = () => (
    <Card title="AI功能测试" extra={<RobotOutlined />}>
      <Form layout="vertical" onFinish={handleAIGenerate}>
        <Form.Item 
          label="生成提示" 
          name="prompt" 
          rules={[{ required: true, message: '请输入生成提示' }]}
        >
          <TextArea 
            rows={3} 
            placeholder="请输入AI生成提示..." 
          />
        </Form.Item>
        
        <Form.Item label="模型" name="model" initialValue="gpt-3.5-turbo">
          <Input placeholder="gpt-3.5-turbo" />
        </Form.Item>
        
        <Form.Item label="最大Token数" name="maxTokens" initialValue={1000}>
          <Input type="number" placeholder="1000" />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<RobotOutlined />}
          >
            生成内容
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderSystemInfo = () => (
    <Card title="系统信息" extra={<ApiOutlined />}>
      <Button 
        onClick={async () => {
          setLoading(true);
          try {
            const result = await systemApi.getSystemInfo();
            if (result.success) {
              console.log('系统信息:', result.data);
              message.success('系统信息获取成功');
            } else {
              message.error(`获取系统信息失败: ${result.error}`);
            }
          } catch (error) {
            message.error(`获取系统信息异常: ${error}`);
          } finally {
            setLoading(false);
          }
        }}
        loading={loading}
      >
        获取系统信息
      </Button>
    </Card>
  );

  return (
    <div className="api-page">
      <Title level={2}>API 集成测试</Title>
      
      {renderConnectionStatus()}
      
      {connectionStatus === 'disconnected' && (
        <Alert
          message="API服务未连接"
          description="无法连接到后端API服务，请检查服务是否正在运行。"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="API测试" key="test">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {renderApiTest()}
          </Space>
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="文件上传" key="upload">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {renderFileUpload()}
          </Space>
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="AI功能" key="ai">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {renderAITest()}
          </Space>
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="系统信息" key="system">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {renderSystemInfo()}
          </Space>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};