import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Progress,
  Avatar,
  Statistic,
  List,
  Badge,
  Divider
} from 'antd';
import {
  RobotOutlined,
  FileTextOutlined,
  PictureOutlined,
  AudioOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  TrophyOutlined,
  FireOutlined,
  BulbOutlined,
  MessageOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

const ModernHomePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    runningTasks: 0,
    totalFiles: 0
  });

  // 快速操作配置
  const quickActions: QuickAction[] = [
    {
      id: 'ai-chat',
      title: 'AI 智能对话',
      description: '与AI助手进行智能对话，获取设计建议',
      icon: <RobotOutlined style={{ fontSize: '24px' }} />,
      color: '#3b82f6',
      action: () => console.log('打开AI对话')
    },
    {
      id: 'file-upload',
      title: '文件智能处理',
      description: '上传图片、文档进行AI智能分析',
      icon: <FileTextOutlined style={{ fontSize: '24px' }} />,
      color: '#10b981',
      action: () => console.log('打开文件上传')
    },
    {
      id: 'image-design',
      title: '图像设计生成',
      description: '使用AI生成专业的设计图像',
      icon: <PictureOutlined style={{ fontSize: '24px' }} />,
      color: '#f59e0b',
      action: () => console.log('打开图像设计')
    },
    {
      id: 'voice-input',
      title: '语音智能输入',
      description: '语音输入转文字，AI智能处理',
      icon: <AudioOutlined style={{ fontSize: '24px' }} />,
      color: '#8b5cf6',
      action: () => console.log('打开语音输入')
    }
  ];

  // 统计卡片配置
  const statCards: StatCard[] = [
    {
      title: '总任务数',
      value: stats.totalTasks,
      icon: <TrophyOutlined />,
      color: '#3b82f6',
      trend: {
        value: 12,
        isUp: true
      }
    },
    {
      title: '已完成',
      value: stats.completedTasks,
      icon: <CheckCircleOutlined />,
      color: '#10b981',
      trend: {
        value: 8,
        isUp: true
      }
    },
    {
      title: '进行中',
      value: stats.runningTasks,
      icon: <ThunderboltOutlined />,
      color: '#f59e0b',
      trend: {
        value: -2,
        isUp: false
      }
    },
    {
      title: '文件总数',
      value: stats.totalFiles,
      icon: <FileTextOutlined />,
      color: '#8b5cf6',
      trend: {
        value: 5,
        isUp: true
      }
    }
  ];

  // 最近活动列表
  const recentActivities = [
    {
      id: '1',
      title: '完成Logo设计任务',
      description: '为公司X成功设计现代化Logo',
      time: '10分钟前',
      status: 'completed',
      icon: <CheckCircleOutlined style={{ color: '#10b981' }} />
    },
    {
      id: '2',
      title: 'AI图像生成',
      description: '生成了3张高质量设计图像',
      time: '25分钟前',
      status: 'completed',
      icon: <PictureOutlined style={{ color: '#f59e0b' }} />
    },
    {
      id: '3',
      title: '文件智能分析',
      description: '分析了5个设计文档',
      time: '1小时前',
      status: 'completed',
      icon: <FileTextOutlined style={{ color: '#8b5cf6' }} />
    },
    {
      id: '4',
      title: '工作流自动化',
      description: '执行了自动化设计流程',
      time: '2小时前',
      status: 'running',
      icon: <ClockCircleOutlined style={{ color: '#3b82f6' }} />
    }
  ];

  useEffect(() => {
    // 模拟加载统计数据
    const loadStats = async () => {
      setLoading(true);
      // 模拟API调用
      setTimeout(() => {
        setStats({
          totalTasks: 156,
          completedTasks: 128,
          runningTasks: 3,
          totalFiles: 234
        });
        setLoading(false);
      }, 1000);
    };

    loadStats();
  }, []);

  // 渲染快速操作卡片
  const renderQuickActionCard = (action: QuickAction) => (
    <Card
      key={action.id}
      className="modern-card modern-card-hoverable modern-card-standard"
      hoverable
      onClick={action.action}
      style={{ 
        background: `linear-gradient(135deg, ${action.color}15 0%, ${action.color}05 100%)`,
        borderColor: `${action.color}30`
      }}
    >
      <div className="modern-quick-action">
        <div 
          className="modern-quick-action-icon"
          style={{ color: action.color }}
        >
          {action.icon}
        </div>
        <div className="modern-quick-action-content">
          <Title level={5} className="modern-heading-5" style={{ marginBottom: '8px' }}>
            {action.title}
          </Title>
          <Text className="modern-text-secondary modern-text-sm">
            {action.description}
          </Text>
        </div>
      </div>
    </Card>
  );

  // 渲染统计卡片
  const renderStatCard = (stat: StatCard) => (
    <Card
      key={stat.title}
      className="modern-card modern-card-standard"
      style={{ background: `${stat.color}08` }}
    >
      <div className="modern-stat-card">
        <div className="modern-stat-icon" style={{ color: stat.color }}>
          {stat.icon}
        </div>
        <div className="modern-stat-content">
          <Statistic
            title={stat.title}
            value={stat.value}
            valueStyle={{ 
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--color-text-primary)'
            }}
          />
          {stat.trend && (
            <div className="modern-stat-trend">
              <Badge 
                count={`${stat.trend.isUp ? '+' : ''}${stat.trend.value}%`}
                style={{ 
                  backgroundColor: stat.trend.isUp ? '#10b981' : '#ef4444',
                  color: 'white'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  // 渲染活动项
  const renderActivityItem = (activity: any) => (
    <List.Item key={activity.id}>
      <List.Item.Meta
        avatar={activity.icon}
        title={
          <Space>
            <Text strong>{activity.title}</Text>
            {activity.status === 'running' && (
              <Badge status="processing" text="进行中" />
            )}
          </Space>
        }
        description={
          <div>
            <Text className="modern-text-secondary modern-text-sm">
              {activity.description}
            </Text>
            <br />
            <Text className="modern-text-tertiary modern-text-xs">
              {activity.time}
            </Text>
          </div>
        }
      />
    </List.Item>
  );

  return (
    <div className="modern-home-page">
      {/* 欢迎区域 */}
      <div className="modern-welcome-section">
        <Card className="modern-card modern-card-spacious">
          <div className="modern-welcome-content">
            <div className="modern-welcome-text">
              <Title level={2} className="modern-heading-2">
                欢迎使用 AI Design 🚀
              </Title>
              <Paragraph className="modern-text-base modern-text-secondary" style={{ fontSize: '16px', lineHeight: 1.6 }}>
                您的智能设计助手已准备就绪。开始探索强大的AI功能，让设计工作更高效、更智能。
              </Paragraph>
            </div>
            <div className="modern-welcome-actions">
              <Space size="large">
                <Button 
                  type="primary" 
                  size="large"
                  icon={<RocketOutlined />}
                  className="modern-btn modern-btn-lg"
                >
                  开始新项目
                </Button>
                <Button 
                  size="large"
                  icon={<BulbOutlined />}
                  className="modern-btn modern-btn-secondary modern-btn-lg"
                >
                  查看教程
                </Button>
              </Space>
            </div>
          </div>
        </Card>
      </div>

      {/* 快速操作区域 */}
      <div className="modern-section">
        <Title level={3} className="modern-heading-3" style={{ marginBottom: '24px' }}>
          <Space>
            <ThunderboltOutlined />
            快速操作
          </Space>
        </Title>
        <Row gutter={[24, 24]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} lg={6} key={action.id}>
              {renderQuickActionCard(action)}
            </Col>
          ))}
        </Row>
      </div>

      {/* 统计概览 */}
      <div className="modern-section">
        <Title level={3} className="modern-heading-3" style={{ marginBottom: '24px' }}>
          <Space>
            <StarOutlined />
            数据概览
          </Space>
        </Title>
        <Row gutter={[24, 24]}>
          {statCards.map((stat) => (
            <Col xs={24} sm={12} lg={6} key={stat.title}>
              {renderStatCard(stat)}
            </Col>
          ))}
        </Row>
      </div>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {/* 最近活动 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <ClockCircleOutlined />
                <span>最近活动</span>
              </Space>
            }
            className="modern-card modern-card-standard"
            extra={
              <Button type="link" className="modern-text-primary">
                查看全部
              </Button>
            }
          >
            <List
              dataSource={recentActivities}
              renderItem={renderActivityItem}
              className="modern-activity-list"
            />
          </Card>
        </Col>

        {/* 快速提示 */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <FireOutlined />
                <span>今日提示</span>
              </Space>
            }
            className="modern-card modern-card-standard"
          >
            <div className="modern-tips">
              <div className="modern-tip-item">
                <div className="modern-tip-icon">
                  <BulbOutlined style={{ color: '#f59e0b' }} />
                </div>
                <div className="modern-tip-content">
                  <Title level={5} className="modern-heading-5">
                    提升设计效率
                  </Title>
                  <Text className="modern-text-secondary modern-text-sm">
                    使用工作流自动化功能，可以将重复性任务的处理时间减少60%。
                  </Text>
                </div>
              </div>
              
              <Divider style={{ margin: '16px 0' }} />
              
              <div className="modern-tip-item">
                <div className="modern-tip-icon">
                  <MessageOutlined style={{ color: '#3b82f6' }} />
                </div>
                <div className="modern-tip-content">
                  <Title level={5} className="modern-heading-5">
                    AI模型选择
                  </Title>
                  <Text className="modern-text-secondary modern-text-sm">
                    根据任务类型自动选择最适合的AI模型，可以获得更好的结果。
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ModernHomePage;