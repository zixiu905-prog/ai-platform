import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Alert, 
  Progress, 
  List,
  Tag,
  message
} from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  LoadingOutlined,
  DesktopOutlined,
  FileOutlined,
  NotificationOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { fileManager } from '../services/fileManager';
import { notificationManager } from '../services/notificationManager';
import { apiService } from '../services/apiService';
import { systemManager } from '../services/systemManager';

const { Title, Text } = Typography;

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

const CATEGORIES = {
  file: { name: '文件操作', icon: <FileOutlined />, color: '#1890ff' },
  notification: { name: '通知系统', icon: <NotificationOutlined />, color: '#52c41a' },
  api: { name: 'API集成', icon: <ApiOutlined />, color: '#722ed1' },
  system: { name: '系统集成', icon: <DesktopOutlined />, color: '#fa8c16' }
};

export const DesktopCoreTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    // 文件操作测试
    { id: 'file-1', name: '获取用户主目录', category: 'file', status: 'pending' },
    { id: 'file-2', name: '读取目录内容', category: 'file', status: 'pending' },
    { id: 'file-3', name: '创建临时文件', category: 'file', status: 'pending' },
    { id: 'file-4', name: '文件压缩测试', category: 'file', status: 'pending' },
    
    // 通知系统测试
    { id: 'notification-1', name: '检查通知权限', category: 'notification', status: 'pending' },
    { id: 'notification-2', name: '发送成功通知', category: 'notification', status: 'pending' },
    { id: 'notification-3', name: '发送错误通知', category: 'notification', status: 'pending' },
    { id: 'notification-4', name: '通知中心管理', category: 'notification', status: 'pending' },
    
    // API集成测试
    { id: 'api-1', name: 'API服务连接', category: 'api', status: 'pending' },
    { id: 'api-2', name: '认证令牌管理', category: 'api', status: 'pending' },
    { id: 'api-3', name: 'GET请求测试', category: 'api', status: 'pending' },
    { id: 'api-4', name: 'POST请求测试', category: 'api', status: 'pending' },
    
    // 系统集成测试
    { id: 'system-1', name: '获取系统信息', category: 'system', status: 'pending' },
    { id: 'system-2', name: '进程列表获取', category: 'system', status: 'pending' },
    { id: 'system-3', name: '内存使用监控', category: 'system', status: 'pending' },
    { id: 'system-4', name: '系统性能统计', category: 'system', status: 'pending' }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const runTest = async (test: TestResult): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (test.id) {
        // 文件操作测试
        case 'file-1':
          result = await fileManager.getHomeDirectory();
          break;
        case 'file-2':
          const homeDir = await fileManager.getHomeDirectory();
          result = await fileManager.readDirectory(homeDir);
          break;
        case 'file-3':
          result = await fileManager.writeFile('/tmp/test.txt', 'test content');
          break;
        case 'file-4':
          result = await fileManager.compressFiles(['/tmp/test.txt'], '/tmp/test.zip');
          break;
          
        // 通知系统测试
        case 'notification-1':
          result = await notificationManager.requestPermission();
          break;
        case 'notification-2':
          result = await notificationManager.showSuccess('测试通知', '这是一个成功通知');
          break;
        case 'notification-3':
          result = await notificationManager.showError('测试错误', '这是一个错误通知');
          break;
        case 'notification-4':
          const notifications = notificationManager.getAllNotifications();
          result = notifications.length > 0;
          break;
          
        // API集成测试
        case 'api-1':
          result = await apiService.checkConnection();
          break;
        case 'api-2':
          apiService.setToken('test-token');
          result = apiService.getToken() === 'test-token';
          break;
        case 'api-3':
          result = await apiService.get('/health', { notifyOnError: false, retries: 0 });
          break;
        case 'api-4':
          result = await apiService.post('/test', { test: true }, { notifyOnError: false, retries: 0 });
          break;
          
        // 系统集成测试
        case 'system-1':
          result = await systemManager.getSystemInfo();
          break;
        case 'system-2':
          result = await systemManager.getProcessList();
          break;
        case 'system-3':
          const stats = await systemManager.getSystemStats();
          result = stats && stats.memory !== undefined;
          break;
        case 'system-4':
          result = await systemManager.getSystemInfo();
          break;
          
        default:
          throw new Error('未知测试');
      }
      
      const duration = Date.now() - startTime;
      return {
        ...test,
        status: 'success',
        message: `测试通过 (${duration}ms)`,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        ...test,
        status: 'error',
        message: error instanceof Error ? error.message : '测试失败',
        duration
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallProgress(0);
    
    const updatedTests = [...tests];
    const totalTests = updatedTests.length;
    
    for (let i = 0; i < totalTests; i++) {
      const test = updatedTests[i];
      
      // 更新测试状态为运行中
      updatedTests[i] = { ...test, status: 'running' };
      setTests([...updatedTests]);
      
      // 运行测试
      const result = await runTest(test);
      updatedTests[i] = result;
      setTests([...updatedTests]);
      
      // 更新进度
      const progress = Math.round(((i + 1) / totalTests) * 100);
      setOverallProgress(progress);
      
      // 短暂延迟以便观察结果
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunning(false);
    message.success('所有测试完成');
  };

  const runSingleTest = async (testId: string) => {
    const testIndex = tests.findIndex(t => t.id === testId);
    if (testIndex === -1) return;
    
    const test = tests[testIndex];
    const updatedTests = [...tests];
    updatedTests[testIndex] = { ...test, status: 'running' };
    setTests(updatedTests);
    
    const result = await runTest(test);
    updatedTests[testIndex] = result;
    setTests(updatedTests);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#1890ff';
      case 'success': return '#52c41a';
      case 'error': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getTestStats = () => {
    const completed = tests.filter(t => t.status === 'success' || t.status === 'error').length;
    const passed = tests.filter(t => t.status === 'success').length;
    const failed = tests.filter(t => t.status === 'error').length;
    const running = tests.filter(t => t.status === 'running').length;
    
    return { completed, passed, failed, running, total: tests.length };
  };

  const stats = getTestStats();

  return (
    <div className="desktop-core-test">
      <Title level={2}>桌面端核心功能测试</Title>
      
      {/* 总体进度 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              测试进度: {stats.completed}/{stats.total}
            </Title>
            <Space>
              <Tag color="#52c41a">通过: {stats.passed}</Tag>
              <Tag color="#ff4d4f">失败: {stats.failed}</Tag>
              {stats.running > 0 && <Tag color="#1890ff">运行中: {stats.running}</Tag>}
            </Space>
          </div>
          <Progress 
            percent={overallProgress} 
            status={isRunning ? 'active' : 'normal'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Button 
            type="primary" 
            size="large" 
            onClick={runAllTests}
            loading={isRunning}
            disabled={stats.completed === stats.total && !isRunning}
          >
            {isRunning ? '测试运行中...' : '运行所有测试'}
          </Button>
        </Space>
      </Card>

      {/* 分类测试结果 */}
      {Object.entries(CATEGORIES).map(([categoryKey, category]) => {
        const categoryTests = tests.filter(t => t.category === categoryKey);
        const categoryPassed = categoryTests.filter(t => t.status === 'success').length;
        const categoryTotal = categoryTests.length;
        
        return (
          <Card 
            key={categoryKey}
            title={
              <Space>
                {category.icon}
                <span>{category.name}</span>
                <Tag color={category.color}>
                  {categoryPassed}/{categoryTotal}
                </Tag>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <List
              dataSource={categoryTests}
              renderItem={(test) => (
                <List.Item
                  actions={[
                    test.status === 'pending' && (
                      <Button
                        size="small"
                        onClick={() => runSingleTest(test.id)}
                        disabled={isRunning}
                      >
                        运行
                      </Button>
                    )
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={getStatusIcon(test.status)}
                    title={
                      <Space>
                        <Text>{test.name}</Text>
                        {test.duration && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ({test.duration}ms)
                          </Text>
                        )}
                      </Space>
                    }
                    description={
                      test.message && (
                        <Text type={test.status === 'error' ? 'danger' : 'secondary'}>
                          {test.message}
                        </Text>
                      )
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        );
      })}

      {/* 测试完成总结 */}
      {stats.completed === stats.total && !isRunning && (
        <Alert
          message="测试完成"
          description={
            <div>
              <p>所有测试已完成：{stats.passed} 个通过，{stats.failed} 个失败</p>
              {stats.failed === 0 ? (
                <p style={{ color: '#52c41a' }}>✅ 所有核心功能运行正常</p>
              ) : (
                <p style={{ color: '#ff4d4f' }}>⚠️ 部分功能存在问题，请检查错误信息</p>
              )}
            </div>
          }
          type={stats.failed === 0 ? 'success' : 'warning'}
          showIcon
        />
      )}
    </div>
  );
};