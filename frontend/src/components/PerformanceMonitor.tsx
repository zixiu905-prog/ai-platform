import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Alert,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  List,
  Badge,
  Modal,
  Switch
} from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  SettingOutlined,
  RocketOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { performanceService } from '../services/performanceService';
import './PerformanceMonitor.css';

const { Title, Text } = Typography;

interface PerformanceReport {
  metrics: any;
  score: number;
  thresholds: any[];
  recommendations: string[];
  timestamp: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<any>({});
  const [score, setScore] = useState<number>(0);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadCurrentMetrics();
    startMonitoring();
    
    const interval = autoRefresh ? setInterval(loadCurrentMetrics, 2000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
      cleanupMonitoring();
    };
  }, [autoRefresh]);

  const loadCurrentMetrics = () => {
    const currentMetrics = performanceService.getMetrics();
    const currentScore = performanceService.getPerformanceScore();
    const currentThresholds = performanceService['thresholds'] || [];
    const currentRecommendations = performanceService.getRecommendations();

    setMetrics(currentMetrics);
    setScore(currentScore);
    setThresholds(currentThresholds);
    setRecommendations(currentRecommendations);
  };

  const startMonitoring = () => {
    try {
      performanceService.startMonitoring();
      setIsMonitoring(true);
    } catch (error) {
      console.error('启动性能监控失败:', error);
    }
  };

  const cleanupMonitoring = () => {
    try {
      performanceService.stopMonitoring();
      setIsMonitoring(false);
    } catch (error) {
      console.error('停止性能监控失败:', error);
    }
  };

  const generateReport = () => {
    const report = performanceService.generateReport();
    setMetrics(report.metrics);
    setScore(report.score);
    setThresholds(report.thresholds);
    setRecommendations(report.recommendations);
    setShowReport(true);
  };

  const downloadReport = () => {
    const report = performanceService.generateReport();
    const reportData = JSON.stringify(report, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#faad14';
    if (score >= 50) return '#fa8c16';
    return '#ff4d4f';
  };

  const getScoreLevel = (score: number): { text: string; color: string; icon: React.ReactNode } => {
    if (score >= 90) {
      return {
        text: '优秀',
        color: 'success',
        icon: <RocketOutlined />
      };
    } else if (score >= 70) {
      return {
        text: '良好',
        color: 'warning',
        icon: <CheckCircleOutlined />
      };
    } else if (score >= 50) {
      return {
        text: '一般',
        color: 'default',
        icon: <WarningOutlined />
      };
    } else {
      return {
        text: '较差',
        color: 'error',
        icon: <CloseCircleOutlined />
      };
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatMemory = (mb: number): string => {
    if (mb < 1024) return `${mb}MB`;
    return `${(mb / 1024).toFixed(2)}GB`;
  };

  const getThresholdStatus = (threshold: any): { status: string; color: string } => {
    const { value, good, needsImprovement, poor } = threshold;
    if (value <= good) return { status: '良好', color: 'success' };
    if (value <= needsImprovement) return { status: '需改进', color: 'warning' };
    return { status: '较差', color: 'error' };
  };

  const thresholdColumns = [
    {
      title: '指标',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: any) => (
        <Space>
          <span>{value.toFixed(2)}</span>
          <Text type="secondary">{record.unit}</Text>
        </Space>
      )
    },
    {
      title: '良好',
      dataIndex: 'good',
      key: 'good',
      render: (value: number, record: any) => (
        <Text type="success">{value}{record.unit}</Text>
      )
    },
    {
      title: '需改进',
      dataIndex: 'needsImprovement',
      key: 'needsImprovement',
      render: (value: number, record: any) => (
        <Text type="warning">{value}{record.unit}</Text>
      )
    },
    {
      title: '状态',
      key: 'status',
      render: (text: string, record: any) => {
        const status = getThresholdStatus(record);
        return <Tag color={status.color}>{status.status}</Tag>;
      }
    }
  ];

  const scoreLevel = getScoreLevel(score);

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <Title level={2}>
          <DashboardOutlined /> 性能监控
        </Title>
        <Space>
          <Space>
            <Badge 
              count={isMonitoring ? '监控中' : '已停止'} 
              status={isMonitoring ? 'processing' : 'default'} 
            />
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              size="small"
              checkedChildren="自动刷新"
              unCheckedChildren="手动刷新"
            />
          </Space>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadCurrentMetrics}
              disabled={!autoRefresh}
            >
              刷新
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={generateReport}
            >
              生成报告
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadReport}
            >
              下载报告
            </Button>
          </Space>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* 性能分数卡片 */}
        <Col xs={24} lg={8}>
          <Card className="score-card">
            <div className="score-display">
              <div className="score-circle">
                <Progress
                  type="circle"
                  percent={score}
                  strokeColor={getScoreColor(score)}
                  size={120}
                  format={(percent) => (
                    <div className="score-content">
                      <div className="score-number">{percent}</div>
                      <div className="score-text">分</div>
                    </div>
                  )}
                />
              </div>
              <div className="score-info">
                <Space direction="vertical" align="center">
                  <Tag color={scoreLevel.color} icon={scoreLevel.icon}>
                    {scoreLevel.text}
                  </Tag>
                  <Text type="secondary">
                    {isMonitoring ? '实时监控中' : '监控已停止'}
                  </Text>
                </Space>
              </div>
            </div>
          </Card>
        </Col>

        {/* 核心指标 */}
        <Col xs={24} lg={16}>
          <Card title="核心性能指标">
            <Row gutter={16}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="首次内容绘制"
                  value={metrics.firstContentfulPaint || 0}
                  suffix="ms"
                  formatter={(value) => value && typeof value === 'number' ? value.toFixed(0) : '0'}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="最大内容绘制"
                  value={metrics.largestContentfulPaint || 0}
                  suffix="ms"
                  formatter={(value) => value && typeof value === 'number' ? value.toFixed(0) : '0'}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="累积布局偏移"
                  value={metrics.cumulativeLayoutShift || 0}
                  formatter={(value) => value && typeof value === 'number' ? value.toFixed(3) : '0.000'}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="内存使用"
                  value={metrics.memoryUsage || 0}
                  suffix="MB"
                  formatter={(value) => value && typeof value === 'number' ? value.toFixed(0) : '0'}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 性能阈值表 */}
        <Col xs={24}>
          <Card title="性能阈值对比">
            <Table
              dataSource={thresholds}
              columns={thresholdColumns}
              pagination={false}
              size="small"
              rowKey="name"
            />
          </Card>
        </Col>

        {/* 优化建议 */}
        <Col xs={24}>
          <Card title="优化建议">
            {recommendations.length === 0 ? (
              <Alert
                message="性能良好"
                description="当前性能表现优秀，无需特别优化。"
                type="success"
                showIcon
              />
            ) : (
              <List
                dataSource={recommendations}
                renderItem={(item, index) => (
                  <List.Item>
                    <Space>
                      <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
                      <Text>{item}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 其他指标 */}
        <Col xs={24} lg={12}>
          <Card title="其他性能指标">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="metric-item">
                <Text strong>页面加载时间</Text>
                <div className="metric-value">
                  {formatTime(metrics.pageLoadTime || 0)}
                </div>
              </div>
              <div className="metric-item">
                <Text strong>API响应时间</Text>
                <div className="metric-value">
                  {formatTime(metrics.apiResponseTime || 0)}
                </div>
              </div>
              <div className="metric-item">
                <Text strong>渲染时间</Text>
                <div className="metric-value">
                  {formatTime(metrics.renderTime || 0)}
                </div>
              </div>
              <div className="metric-item">
                <Text strong>包大小</Text>
                <div className="metric-value">
                  {formatMemory((metrics.bundleSize || 0) / 1024 / 1024)}
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 实时监控状态 */}
        <Col xs={24} lg={12}>
          <Card title="监控状态">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="status-item">
                <Space>
                  <ThunderboltOutlined />
                  <Text>监控状态:</Text>
                  <Tag color={isMonitoring ? 'success' : 'default'}>
                    {isMonitoring ? '运行中' : '已停止'}
                  </Tag>
                </Space>
              </div>
              <div className="status-item">
                <Space>
                  <InfoCircleOutlined />
                  <Text>自动刷新:</Text>
                  <Tag color={autoRefresh ? 'success' : 'default'}>
                    {autoRefresh ? '已启用' : '已禁用'}
                  </Tag>
                </Space>
              </div>
              <div className="status-item">
                <Space>
                  <DashboardOutlined />
                  <Text>性能等级:</Text>
                  <Tag color={scoreLevel.color} icon={scoreLevel.icon}>
                    {scoreLevel.text}
                  </Tag>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 性能报告模态框 */}
      <Modal
        title="性能分析报告"
        open={showReport}
        onCancel={() => setShowReport(false)}
        footer={[
          <Button key="close" onClick={() => setShowReport(false)}>
            关闭
          </Button>,
          <Button key="download" type="primary" onClick={downloadReport}>
            下载报告
          </Button>
        ]}
        width={800}
      >
        <div className="report-content">
          <Alert
            message={`性能评分: ${score} 分 (${scoreLevel.text})`}
            description={`基于核心性能指标的综合评估，当前性能状态为${scoreLevel.text}`}
            type={scoreLevel.color === 'success' ? 'success' : scoreLevel.color === 'warning' ? 'warning' : 'error'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Title level={4}>详细指标</Title>
          <Table
            dataSource={thresholds}
            columns={thresholdColumns}
            pagination={false}
            size="small"
            rowKey="name"
            style={{ marginBottom: 24 }}
          />

          <Title level={4}>优化建议</Title>
          <List
            dataSource={recommendations}
            renderItem={(item) => (
              <List.Item>
                <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                {item}
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
};

export default PerformanceMonitor;