import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Statistic,
  Progress,
  Button,
  Space,
  Typography,
  List,
  Tag,
  Switch,
  InputNumber,
  Slider,
  Alert,
  Upload,
  message,
  Modal,
  Form,
  Table,
  Tooltip,
  Badge
} from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  SyncOutlined,
  DeleteOutlined,
  SettingOutlined,
  ImportOutlined,
  ExportOutlined,
  ReloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { offlineService } from '../services/offlineService';
import './OfflineManager.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Dragger } = Upload;

interface OfflineStats {
  cacheStats: {
    totalItems: number;
    totalSize: number;
    oldestItem?: number;
    newestItem?: number;
  };
  syncStats: {
    pendingOps: number;
    completedOps: number;
    failedOps: number;
  };
  config: any;
}

const OfflineManager: React.FC = () => {
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [configForm] = Form.useForm();

  useEffect(() => {
    loadStats();
    setupEventListeners();
    
    const interval = setInterval(loadStats, 5000); // 每5秒刷新统计
    
    return () => {
      clearInterval(interval);
      cleanupEventListeners();
    };
  }, []);

  const loadStats = async () => {
    try {
      const offlineStats = await offlineService.getOfflineStats();
      setStats(offlineStats);
    } catch (error) {
      console.error('获取离线统计失败:', error);
    }
  };

  const setupEventListeners = () => {
    offlineService.on('cached', loadStats);
    offlineService.on('cache-deleted', loadStats);
    offlineService.on('sync-operation-completed', loadStats);
    offlineService.on('online-status-changed', setIsOnline);
  };

  const cleanupEventListeners = () => {
    offlineService.removeAllListeners();
  };

  const handleClearCache = async () => {
    Modal.confirm({
      title: '确认清空缓存',
      content: '此操作将清空所有离线缓存数据，且无法恢复。确定要继续吗？',
      onOk: async () => {
        try {
          setLoading(true);
          await offlineService.clear();
          message.success('缓存已清空');
          loadStats();
        } catch (error) {
          message.error('清空缓存失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleForceSync = async () => {
    try {
      setLoading(true);
      await offlineService.forceSync();
      message.success('同步完成');
      loadStats();
    } catch (error) {
      message.error('同步失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (values: any) => {
    try {
      await offlineService.updateConfig(values);
      message.success('配置已更新');
      setShowConfig(false);
      loadStats();
    } catch (error) {
      message.error('更新配置失败');
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const exportPath = await offlineService.exportData();
      message.success(`数据已导出到: ${exportPath}`);
    } catch (error) {
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file: any) => {
    try {
      setLoading(true);
      await offlineService.importData(file.originFileObj.path);
      message.success('数据导入成功');
      setShowImport(false);
      loadStats();
    } catch (error) {
      message.error('导入失败');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const getCacheUsagePercent = (): number => {
    if (!stats) return 0;
    return Math.round((stats.cacheStats.totalSize / (stats.config.maxCacheSize * 1024 * 1024)) * 100);
  };

  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>;
      case 'failed':
        return <Tag color="error" icon={<ExclamationCircleOutlined />}>失败</Tag>;
      case 'pending':
        return <Tag color="warning" icon={<ClockCircleOutlined />}>待同步</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  return (
    <div className="offline-manager">
      <div className="offline-header">
        <Title level={2}>
          <DatabaseOutlined /> 离线功能管理
        </Title>
        <Space>
          <Badge 
            status={isOnline ? 'success' : 'error'} 
            text={isOnline ? '在线' : '离线'} 
          />
          {isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
        </Space>
      </div>

      <Tabs defaultActiveKey="overview">
        <TabPane tab="概览" key="overview">
          <Row gutter={[24, 24]}>
            {/* 缓存统计 */}
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <DatabaseOutlined />
                  <span>缓存统计</span>
                </Space>
              }>
                {stats && (
                  <div className="stats-grid">
                    <Statistic
                      title="缓存项目"
                      value={stats.cacheStats.totalItems}
                      suffix="项"
                    />
                    <Statistic
                      title="缓存大小"
                      value={formatSize(stats.cacheStats.totalSize)}
                      suffix={`/ ${stats.config.maxCacheSize} MB`}
                    />
                    <div className="progress-section">
                      <Text type="secondary">使用率</Text>
                      <Progress
                        percent={getCacheUsagePercent()}
                        status={getCacheUsagePercent() > 80 ? 'exception' : 'normal'}
                      />
                    </div>
                    <div className="date-info">
                      <Text type="secondary">
                        <div>最旧: {formatDate(stats.cacheStats.oldestItem)}</div>
                        <div>最新: {formatDate(stats.cacheStats.newestItem)}</div>
                      </Text>
                    </div>
                  </div>
                )}
              </Card>
            </Col>

            {/* 同步统计 */}
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <SyncOutlined />
                  <span>同步统计</span>
                  {stats && stats.syncStats.pendingOps > 0 && (
                    <Badge count={stats.syncStats.pendingOps} />
                  )}
                </Space>
              }>
                {stats && (
                  <div className="stats-grid">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic
                          title="待同步"
                          value={stats.syncStats.pendingOps}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="已完成"
                          value={stats.syncStats.completedOps}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="失败"
                          value={stats.syncStats.failedOps}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Col>
                    </Row>
                  </div>
                )}
              </Card>
            </Col>

            {/* 快速操作 */}
            <Col xs={24}>
              <Card title="快速操作">
                <Space wrap>
                  <Button
                    icon={<CloudUploadOutlined />}
                    onClick={handleForceSync}
                    disabled={!isOnline}
                    loading={loading}
                  >
                    强制同步
                  </Button>
                  <Button
                    icon={<CloudDownloadOutlined />}
                    onClick={handleExport}
                    loading={loading}
                  >
                    导出数据
                  </Button>
                  <Button
                    icon={<ImportOutlined />}
                    onClick={() => setShowImport(true)}
                  >
                    导入数据
                  </Button>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={handleClearCache}
                    danger
                  >
                    清空缓存
                  </Button>
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => setShowConfig(true)}
                  >
                    配置设置
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={loadStats}
                  >
                    刷新统计
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="配置" key="config">
          <Card title="离线功能配置">
            <Form
              form={configForm}
              layout="vertical"
              initialValues={stats?.config}
              onFinish={handleConfigUpdate}
            >
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="最大缓存大小 (MB)"
                    name="maxCacheSize"
                    rules={[{ required: true, type: 'number', min: 100, max: 5000 }]}
                  >
                    <InputNumber min={100} max={5000} />
                  </Form.Item>

                  <Form.Item
                    label="缓存有效期 (天)"
                    name="maxCacheAge"
                    rules={[{ required: true, type: 'number', min: 1, max: 365 }]}
                  >
                    <InputNumber min={1} max={365} />
                  </Form.Item>

                  <Form.Item
                    label="同步间隔 (分钟)"
                    name="syncInterval"
                    rules={[{ required: true, type: 'number', min: 1, max: 60 }]}
                  >
                    <InputNumber min={1} max={60} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="启用自动同步"
                    name="autoSync"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="启用数据压缩"
                    name="enableCompression"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>

                  <Form.Item
                    label="启用数据加密"
                    name="enableEncryption"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      {/* 导入数据模态框 */}
      <Modal
        title="导入离线数据"
        open={showImport}
        onCancel={() => setShowImport(false)}
        footer={null}
      >
        <Dragger
          accept=".json"
          beforeUpload={(file) => {
            handleImport({ originFileObj: file });
            return false;
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 .json 格式的离线数据文件
          </p>
        </Dragger>
      </Modal>

      {/* 配置模态框 */}
      <Modal
        title="配置设置"
        open={showConfig}
        onCancel={() => setShowConfig(false)}
        footer={null}
        width={800}
      >
        <Form
          form={configForm}
          layout="vertical"
          initialValues={stats?.config}
          onFinish={handleConfigUpdate}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="最大缓存大小 (MB)" name="maxCacheSize">
                <Slider min={100} max={5000} marks={{ 100: '100MB', 1000: '1GB', 5000: '5GB' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="缓存有效期 (天)" name="maxCacheAge">
                <Slider min={1} max={365} marks={{ 1: '1天', 30: '30天', 365: '1年' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OfflineManager;