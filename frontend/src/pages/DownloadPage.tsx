import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Space,
  Divider,
  Spin,
  Alert,
  Select,
  Input,
  Tabs,
  List,
  Avatar,
  Tooltip,
  Badge,
  Progress,
  Descriptions,
  Modal,
  Form,
  message
} from 'antd';
import { apiClient } from '../services/api';
import {
  DownloadOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  StarOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useApi } from '../hooks/useApi';
import './DownloadPage.css';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Search } = Input;

interface SoftwareVersion {
  id: string;
  version: string;
  releaseDate: string;
  size: string;
  platform: string;
  downloadUrl: string;
  md5: string;
  sha256: string;
  releaseNotes: string;
  isLatest: boolean;
  isBeta: boolean;
  isRecommended: boolean;
  downloadCount: number;
  status: 'active' | 'deprecated' | 'testing';
}

interface SoftwareInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  website: string;
  developer: string;
  rating: number;
  totalDownloads: number;
  features: string[];
  requirements: {
    os: string[];
    ram: string;
    storage: string;
    gpu?: string;
  };
  versions: SoftwareVersion[];
  integrationStatus: 'supported' | 'in-development' | 'planned';
  lastUpdated: string;
}

const DownloadPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [softwareList, setSoftwareList] = useState<SoftwareInfo[]>([]);
  const [filteredSoftware, setFilteredSoftware] = useState<SoftwareInfo[]>([]);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareInfo | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<SoftwareVersion | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [downloading, setDownloading] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [showVersionModal, setShowVersionModal] = useState(false);

  useEffect(() => {
    fetchSoftwareList();
  }, []);

  useEffect(() => {
    filterSoftware();
  }, [softwareList, searchTerm, categoryFilter, platformFilter, activeTab]);

  const fetchSoftwareList = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/softwares/download-list');
      if (response.success) {
        setSoftwareList(response.data);
        setFilteredSoftware(response.data);
      }
    } catch (error) {
      message.error('获取软件列表失败');
      console.error('Failed to fetch software list:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSoftware = () => {
    let filtered = [...softwareList];

    // 按标签页过滤
    if (activeTab === 'supported') {
      filtered = filtered.filter(s => s.integrationStatus === 'supported');
    } else if (activeTab === 'development') {
      filtered = filtered.filter(s => s.integrationStatus === 'in-development');
    } else if (activeTab === 'planned') {
      filtered = filtered.filter(s => s.integrationStatus === 'planned');
    }

    // 按类别过滤
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    // 按平台过滤
    if (platformFilter !== 'all') {
      filtered = filtered.filter(s => 
        s.versions.some(v => v.platform.toLowerCase().includes(platformFilter.toLowerCase()))
      );
    }

    // 按搜索词过滤
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.developer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredSoftware(filtered);
  };

  const getPlatformIcon = (platform: string) => {
    if (platform.toLowerCase().includes('win')) {
      return <WindowsOutlined className="platform-icon windows" />;
    } else if (platform.toLowerCase().includes('mac')) {
      return <AppleOutlined className="platform-icon mac" />;
    } else if (platform.toLowerCase().includes('linux')) {
      return <LinuxOutlined className="platform-icon linux" />;
    }
    return <DownloadOutlined />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge status="success" text="可用" />;
      case 'deprecated':
        return <Badge status="warning" text="已废弃" />;
      case 'testing':
        return <Badge status="processing" text="测试中" />;
      default:
        return <Badge status="default" text="未知" />;
    }
  };

  const getIntegrationBadge = (status: string) => {
    switch (status) {
      case 'supported':
        return <Tag color="green">已支持</Tag>;
      case 'in-development':
        return <Tag color="blue">开发中</Tag>;
      case 'planned':
        return <Tag color="default">计划中</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const handleDownload = async (software: SoftwareInfo, version: SoftwareVersion) => {
    try {
      setDownloading([...downloading, `${software.id}-${version.id}`]);
      
      // 开始下载
      const response = await apiClient.post('/api/softwares/download', {
        softwareId: software.id,
        versionId: version.id
      });

      if (response.success) {
        // 模拟下载进度
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setDownloading(downloading.filter(id => id !== `${software.id}-${version.id}`));
            message.success(`${software.name} ${version.version} 下载完成！`);
          }
          setDownloadProgress(prev => ({
            ...prev,
            [`${software.id}-${version.id}`]: progress
          }));
        }, 500);

        // 创建下载链接
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = `${software.name}-${version.version}-${version.platform}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      message.error('下载失败，请稍后重试');
      setDownloading(downloading.filter(id => id !== `${software.id}-${version.id}`));
    }
  };

  const showVersionDetails = (software: SoftwareInfo) => {
    setSelectedSoftware(software);
    setShowVersionModal(true);
  };

  const renderSoftwareCard = (software: SoftwareInfo) => {
    const latestVersion = software.versions.find(v => v.isLatest);
    const isDownloading = downloading.includes(`${software.id}-${latestVersion?.id}`);

    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={software.id}>
        <Card
          hoverable
          className="software-card"
          cover={
            <div className="software-cover">
              <Avatar size={64} src={software.icon} className="software-icon">
                {software.name.charAt(0)}
              </Avatar>
              <div className="software-actions">
                {latestVersion && (
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    loading={isDownloading}
                    onClick={() => handleDownload(software, latestVersion)}
                    className="download-btn"
                  >
                    {isDownloading ? '下载中...' : '下载'}
                  </Button>
                )}
                <Button
                  icon={<InfoCircleOutlined />}
                  onClick={() => showVersionDetails(software)}
                  className="info-btn"
                >
                  详情
                </Button>
              </div>
            </div>
          }
          actions={[
            <Tooltip title="官方网站">
              <a href={software.website} target="_blank" rel="noopener noreferrer">
                <LinkOutlined />
              </a>
            </Tooltip>,
            <Tooltip title={`下载次数: ${software.totalDownloads.toLocaleString()}`}>
              <span><DownloadOutlined /> {software.totalDownloads.toLocaleString()}</span>
            </Tooltip>,
            <Tooltip title={`评分: ${software.rating}/5`}>
              <span><StarOutlined /> {software.rating}</span>
            </Tooltip>
          ]}
        >
          <Card.Meta
            title={
              <Space>
                <span className="software-name">{software.name}</span>
                {getIntegrationBadge(software.integrationStatus)}
                {latestVersion?.isBeta && <Tag color="purple">Beta</Tag>}
              </Space>
            }
            description={
              <div>
                <Paragraph ellipsis={{ rows: 2 }} className="software-description">
                  {software.description}
                </Paragraph>
                <div className="software-meta">
                  <Text type="secondary">开发商: {software.developer}</Text>
                  <br />
                  <Text type="secondary">
                    最新版本: {latestVersion?.version || 'N/A'}
                  </Text>
                  {latestVersion && (
                    <>
                      <br />
                      <Space>
                        {getPlatformIcon(latestVersion.platform)}
                        <Text type="secondary">{latestVersion.size}</Text>
                        {getStatusBadge(latestVersion.status)}
                      </Space>
                    </>
                  )}
                </div>
                {isDownloading && (
                  <Progress
                    percent={Math.round(downloadProgress[`${software.id}-${latestVersion?.id}`] || 0)}
                    size="small"
                    className="download-progress"
                  />
                )}
              </div>
            }
          />
        </Card>
      </Col>
    );
  };

  return (
    <div className="download-page">
      <div className="page-header">
        <Title level={2}>
          <DownloadOutlined /> 软件下载中心
        </Title>
        <Paragraph>
          下载并安装支持的设计软件，享受 AiDesign 带来的智能设计体验
        </Paragraph>
      </div>

      {/* 搜索和过滤 */}
      <Card className="filter-card">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Search
              placeholder="搜索软件名称、描述或功能"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={filterSoftware}
              allowClear
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="选择类别"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">所有类别</Option>
              <Option value="design">设计软件</Option>
              <Option value="3d">3D建模</Option>
              <Option value="cad">CAD制图</Option>
              <Option value="video">视频编辑</Option>
              <Option value="audio">音频处理</Option>
            </Select>
          </Col>
          <Col xs={24} md={4}>
            <Select
              placeholder="选择平台"
              value={platformFilter}
              onChange={setPlatformFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">所有平台</Option>
              <Option value="windows">Windows</Option>
              <Option value="mac">macOS</Option>
              <Option value="linux">Linux</Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Space>
              <Button icon={<FilterOutlined />}>高级筛选</Button>
              <Button icon={<ThunderboltOutlined />}>推荐下载</Button>
              <Button icon={<FireOutlined />}>热门软件</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="software-tabs">
        <TabPane 
          tab={<span><CheckCircleOutlined />已支持 ({softwareList.filter(s => s.integrationStatus === 'supported').length})</span>} 
          key="supported"
        />
        <TabPane 
          tab={<span><ClockCircleOutlined />开发中 ({softwareList.filter(s => s.integrationStatus === 'in-development').length})</span>} 
          key="development"
        />
        <TabPane 
          tab={<span><ExclamationCircleOutlined />计划中 ({softwareList.filter(s => s.integrationStatus === 'planned').length})</span>} 
          key="planned"
        />
        <TabPane 
          tab={<span><DownloadOutlined />全部软件 ({softwareList.length})</span>} 
          key="all"
        />
      </Tabs>

      {/* 软件列表 */}
      <Spin spinning={loading}>
        {filteredSoftware.length === 0 ? (
          <Alert
            message="没有找到匹配的软件"
            description="请尝试调整搜索条件或筛选选项"
            type="info"
            showIcon
            className="empty-alert"
          />
        ) : (
          <Row gutter={[16, 16]} className="software-grid">
            {filteredSoftware.map(renderSoftwareCard)}
          </Row>
        )}
      </Spin>

      {/* 版本详情弹窗 */}
      <Modal
        title={`${selectedSoftware?.name} - 版本详情`}
        open={showVersionModal}
        onCancel={() => setShowVersionModal(false)}
        footer={null}
        width={800}
        className="version-modal"
      >
        {selectedSoftware && (
          <div>
            <Descriptions title="软件信息" bordered column={2}>
              <Descriptions.Item label="开发商">{selectedSoftware.developer}</Descriptions.Item>
              <Descriptions.Item label="类别">{selectedSoftware.category}</Descriptions.Item>
              <Descriptions.Item label="官网">
                <a href={selectedSoftware.website} target="_blank" rel="noopener noreferrer">
                  {selectedSoftware.website}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="总下载量">{selectedSoftware.totalDownloads.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="评分">{selectedSoftware.rating}/5</Descriptions.Item>
              <Descriptions.Item label="集成状态">
                {getIntegrationBadge(selectedSoftware.integrationStatus)}
              </Descriptions.Item>
            </Descriptions>

            <Divider>版本历史</Divider>
            <List
              dataSource={selectedSoftware.versions}
              renderItem={(version) => (
                <List.Item
                  actions={[
                    version.isLatest && <Tag color="gold">最新</Tag>,
                    version.isBeta && <Tag color="purple">Beta</Tag>,
                    version.isRecommended && <Tag color="green">推荐</Tag>,
                    <Button
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(selectedSoftware, version)}
                      loading={downloading.includes(`${selectedSoftware.id}-${version.id}`)}
                    >
                      下载
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getPlatformIcon(version.platform)}
                    title={
                      <Space>
                        <span>{version.version}</span>
                        <Text type="secondary">({version.platform})</Text>
                        {getStatusBadge(version.status)}
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary">发布时间: {version.releaseDate}</Text>
                        <br />
                        <Text type="secondary">文件大小: {version.size}</Text>
                        <br />
                        <Text type="secondary">下载次数: {version.downloadCount.toLocaleString()}</Text>
                        {version.releaseNotes && (
                          <>
                            <Divider type="vertical" />
                            <Text type="secondary">{version.releaseNotes}</Text>
                          </>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DownloadPage;