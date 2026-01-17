import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Space, 
  Button,
  List,
  Avatar,
  Progress,
  Divider
} from 'antd';
import { 
  FileOutlined,
  ApiOutlined,
  DesktopOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { FileUploader } from '../components/FileUploader';
import { systemManager } from '../services/systemManager';
import { aiManager } from '../services/aiManager';
import { softwareManager } from '../services/softwareManager';
import { notificationManager } from '../services/notificationManager';

const { Title, Text } = Typography;

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  totalMemory: number;
  freeMemory: number;
  cpuUsage: number;
}

interface RecentActivity {
  id: string;
  type: 'file' | 'api' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'error';
}

export const HomePage: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载系统信息
  const loadSystemInfo = async () => {
    try {
      const info = await systemManager.getSystemInfo();
      setSystemInfo({
        platform: info.platform,
        arch: info.arch,
        nodeVersion: info.versions?.node || 'Unknown',
        electronVersion: info.versions?.electron || 'Unknown',
        totalMemory: info.totalMemory,
        freeMemory: info.freeMemory,
        cpuUsage: info.cpuUsage || 0
      });
    } catch (error) {
      console.error('加载系统信息失败:', error);
    }
  };

  // 加载最近活动
  const loadRecentActivities = () => {
    // 模拟最近活动数据
    const activities: RecentActivity[] = [
      {
        id: '1',
        type: 'file',
        title: '文件上传',
        description: '成功上传 3 个文件到云存储',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        status: 'success'
      },
      {
        id: '2',
        type: 'api',
        title: 'AI 处理',
        description: '图像识别任务完成',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'success'
      },
      {
        id: '3',
        type: 'system',
        title: '系统检查',
        description: '正在检查系统状态...',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        status: 'pending'
      }
    ];
    setRecentActivities(activities);
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadSystemInfo();
      loadRecentActivities();
      setLoading(false);
    };

    initialize();

    // 定期更新系统信息
    const interval = setInterval(loadSystemInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatMemory = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'error') return <WarningOutlined style={{ color: '#ff4d4f' }} />;
    if (status === 'pending') return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    
    switch (type) {
      case 'file': return <FileOutlined style={{ color: '#52c41a' }} />;
      case 'api': return <ApiOutlined style={{ color: '#1890ff' }} />;
      case 'system': return <DesktopOutlined style={{ color: '#722ed1' }} />;
      default: return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  return (
    <div className="home-page">
      <Title level={2}>欢迎使用 AI Design Desktop</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 系统状态统计 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="内存使用"
                value={systemInfo ? ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory * 100).toFixed(1) : 0}
                suffix="%"
                prefix={<DesktopOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              {systemInfo && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatMemory(systemInfo.totalMemory - systemInfo.freeMemory)} / {formatMemory(systemInfo.totalMemory)}
                </Text>
              )}
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="CPU 使用率"
                value={systemInfo?.cpuUsage || 0}
                suffix="%"
                prefix={<RocketOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="系统平台"
                value={systemInfo?.platform || 'Unknown'}
                prefix={<DesktopOutlined />}
                valueStyle={{ color: '#722ed1', fontSize: 16 }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Electron 版本"
                value={systemInfo?.electronVersion || 'Unknown'}
                prefix={<RocketOutlined />}
                valueStyle={{ color: '#fa8c16', fontSize: 16 }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* 快速操作 */}
          <Col xs={24} lg={12}>
            <Card title="快速操作" extra={<Button type="link">更多</Button>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" block size="large" icon={<FileOutlined />}>
                  上传文件
                </Button>
                <Button block size="large" icon={<ApiOutlined />}>
                  AI 处理
                </Button>
                <Button block size="large" icon={<DesktopOutlined />}>
                  系统工具
                </Button>
              </Space>
            </Card>
          </Col>

          {/* 最近活动 */}
          <Col xs={24} lg={12}>
            <Card title="最近活动" extra={<Button type="link">查看全部</Button>}>
              <List
                dataSource={recentActivities}
                renderItem={(activity) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar icon={getActivityIcon(activity.type, activity.status)} />
                      }
                      title={activity.title}
                      description={
                        <div>
                          <Text>{activity.description}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatTimestamp(activity.timestamp)}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* 文件上传区域 */}
        <Card title="快速上传" extra={<Button type="link">查看文件管理</Button>}>
          <FileUploader
            accept={['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt']}
            maxSize={50}
            maxFiles={5}
            onUploadComplete={(files) => {
              notificationManager.showSuccess('文件上传完成', `成功上传 ${files.length} 个文件`);
            }}
          />
        </Card>
      </Space>
    </div>
  );
};