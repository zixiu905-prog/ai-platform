import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Tag,
  Space,
  Divider,
  Tabs,
  Statistic,
  Descriptions,
  Modal,
  message,
  Empty,
  Alert
} from 'antd';
import {
  DownloadOutlined,
  WindowsOutlined,
  AppleOutlined,
  RocketOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import './DesktopDownloadPage.css';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

interface DesktopAppVersion {
  version: string;
  platform: 'windows' | 'mac';
  arch: 'x64' | 'ia32' | 'arm64';
  filename: string;
  filesize: number;
  downloadUrl: string;
  releaseDate: string;
  md5: string;
  sha256: string;
}

const DesktopDownloadPage: React.FC = () => {
  const [downloading, setDownloading] = React.useState<string>('');
  const [showInstallGuide, setShowInstallGuide] = React.useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = (version: DesktopAppVersion) => {
    try {
      setDownloading(version.filename);

      // 直接从静态URL下载
      const link = document.createElement('a');
      link.href = version.downloadUrl;
      link.download = version.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('下载已开始！');

      // 3秒后清除下载状态
      setTimeout(() => {
        setDownloading('');
      }, 3000);
    } catch (error) {
      message.error('下载失败，请稍后重试');
      console.error('Download failed:', error);
      setDownloading('');
    }
  };

  const renderWindowsContent = () => {
    const windowsVersions: DesktopAppVersion[] = [
      {
        version: '1.0.0',
        platform: 'windows',
        arch: 'x64',
        filename: 'AI-Platform-FIXED-1.0.0.tar.gz',
        filesize: 104 * 1024 * 1024, // 104MB (精简优化版)
        downloadUrl: 'https://www.aidesign.ltd/downloads/desktop/AI-Platform-FIXED-1.0.0.tar.gz',
        releaseDate: '2026-01-11',
        md5: 'fixed-version-md5-hash',
        sha256: 'fixed-version-sha256-hash'
      }
    ];

    return (
      <Row gutter={[16, 16]}>
        {windowsVersions.map((version) => (
          <Col xs={24} lg={12} key={version.filename}>
            <Card
              className="version-card"
              title={
                <Space>
                  <WindowsOutlined />
                  <Text strong>完整安装程序</Text>
                  <Tag color="blue">{version.version}</Tag>
                </Space>
              }
              extra={<Tag color="green">{version.arch}</Tag>}
            >
              <div className="version-info">
                <Paragraph>
                  <Text type="secondary">文件大小: </Text>
                  <Text strong>{formatFileSize(version.filesize)}</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">发布日期: </Text>
                  <Text strong>{version.releaseDate}</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">完整离线安装包，无需联网，包含所有组件</Text>
                </Paragraph>
              </div>
              <Button
                type="primary"
                size="large"
                block
                icon={<DownloadOutlined />}
                loading={downloading === version.filename}
                onClick={() => handleDownload(version)}
                style={{ marginTop: 16 }}
              >
                下载Windows完整安装程序
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderMacContent = () => {
    const macVersions: DesktopAppVersion[] = [
      {
        version: '1.0.0',
        platform: 'mac',
        arch: 'x64',
        filename: 'AI-Platform-1.0.0-x64.dmg',
        filesize: 180 * 1024 * 1024, // 180MB
        downloadUrl: 'https://www.aidesign.ltd/downloads/AI-Platform-1.0.0-x64.dmg',
        releaseDate: '2026-01-10',
        md5: 'mac-x64-dmg-md5-hash',
        sha256: 'mac-x64-dmg-sha256-hash'
      },
      {
        version: '1.0.0',
        platform: 'mac',
        arch: 'arm64',
        filename: 'AI-Platform-1.0.0-arm64.dmg',
        filesize: 170 * 1024 * 1024, // 170MB
        downloadUrl: 'https://www.aidesign.ltd/downloads/AI-Platform-1.0.0-arm64.dmg',
        releaseDate: '2026-01-10',
        md5: 'mac-arm64-dmg-md5-hash',
        sha256: 'mac-arm64-dmg-sha256-hash'
      }
    ];

    return (
      <Row gutter={[16, 16]}>
        {macVersions.map((version) => (
          <Col xs={24} lg={12} key={version.filename}>
            <Card
              className="version-card"
              title={
                <Space>
                  <AppleOutlined />
                  <Text strong>DMG Installer</Text>
                  <Tag color="blue">{version.version}</Tag>
                </Space>
              }
              extra={<Tag color="green">{version.arch}</Tag>}
            >
              <div className="version-info">
                <Paragraph>
                  <Text type="secondary">文件大小: </Text>
                  <Text strong>{formatFileSize(version.filesize)}</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">发布日期: </Text>
                  <Text strong>{version.releaseDate}</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">
                    原生支持 {version.arch === 'arm64' ? 'Apple Silicon (M1/M2/M3)' : 'Intel (x86_64)'}
                  </Text>
                </Paragraph>
              </div>
              <Button
                type="primary"
                size="large"
                block
                icon={<DownloadOutlined />}
                loading={downloading === version.filename}
                onClick={() => handleDownload(version)}
                style={{ marginTop: 16 }}
              >
                下载 {version.arch.toUpperCase()} 安装程序
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div className="desktop-download-page">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <Title level={2}>
              <RocketOutlined />
              AI智能体平台桌面版
            </Title>
            <Paragraph>
              下载安装AI智能体平台桌面应用，享受更流畅、更强大的本地AI设计体验
            </Paragraph>
          </div>

          <div className="header-stats">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="当前版本"
                  value="1.0.0"
                  prefix={<Tag color="blue">Latest</Tag>}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="支持平台"
                  value={2}
                  suffix="个"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="即将发布"
                  value="Windows & macOS"
                />
              </Col>
            </Row>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="page-content">
        {/* 功能特性 */}
        <Card title="核心特性" className="features-card" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <div className="feature-item">
                <DownloadOutlined className="feature-icon" />
                <Title level={4}>一键安装</Title>
                <Paragraph>简单的安装流程，快速开始使用</Paragraph>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <div className="feature-item">
                <WindowsOutlined className="feature-icon" />
                <Title level={4}>跨平台支持</Title>
                <Paragraph>支持Windows和macOS系统</Paragraph>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <div className="feature-item">
                <FileTextOutlined className="feature-icon" />
                <Title level={4}>离线工作</Title>
                <Paragraph>无需联网即可使用大部分功能</Paragraph>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 下载区域 */}
        <Tabs defaultActiveKey="windows" className="download-tabs">
          <TabPane tab={<><WindowsOutlined /> Windows</>} key="windows">
            <div className="platform-content">
              {renderWindowsContent()}
            </div>
          </TabPane>
          <TabPane tab={<><AppleOutlined /> macOS</>} key="mac">
            <div className="platform-content">
              {renderMacContent()}
            </div>
          </TabPane>
        </Tabs>

        {/* 系统要求 */}
        <Card title="系统要求" style={{ marginTop: 24 }}>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Windows">
              Windows 10 或 Windows 11 (64位)
            </Descriptions.Item>
            <Descriptions.Item label="macOS">
              macOS 10.15 (Catalina) 或更高版本
            </Descriptions.Item>
            <Descriptions.Item label="CPU架构">x86_64 (64位) 或 Apple Silicon (ARM64)</Descriptions.Item>
            <Descriptions.Item label="内存">至少 4GB RAM (推荐 8GB+)</Descriptions.Item>
            <Descriptions.Item label="存储空间">至少 2GB 可用空间</Descriptions.Item>
            <Descriptions.Item label="网络">需要联网（部分功能需要）</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 安装说明 */}
        <Card title="安装说明" style={{ marginTop: 24 }}>
          <Paragraph>
            <strong>Windows 安装步骤：</strong>
          </Paragraph>
          <ol className="install-steps">
            <li>点击"下载Windows完整安装程序"按钮，下载ZIP压缩包（约500MB）</li>
            <li>右键点击ZIP文件，选择"解压全部"或使用7-Zip/WinRAR解压</li>
            <li>进入解压后的 AI-Platform-Complete-1.0.0 文件夹</li>
            <li>找到并双击运行 AIPlatform.exe 启动应用</li>
            <li>如果系统提示安全警告，请点击"更多信息"→"仍要运行"</li>
            <li>使用您的账号登录即可开始使用</li>
          </ol>
          <Alert 
            message="重要提示" 
            description="请务必将ZIP文件完整解压后再运行，不要直接在压缩包中运行程序。所有文件（包括DLL）都是应用运行所必需的。"
            type="warning" 
            style={{ marginTop: 16 }}
          />
          <Divider />
          <Paragraph>
            <strong>macOS 安装步骤：</strong>
          </Paragraph>
          <ol className="install-steps">
            <li>点击 macOS 标签页中的"立即下载"按钮，下载 DMG 安装包</li>
            <li>双击下载的 DMG 文件进行挂载</li>
            <li>将应用图标拖拽到"应用程序"文件夹</li>
            <li>从"启动台"或"应用程序"文件夹启动应用</li>
            <li>如遇到安全提示，请在"系统偏好设置 &gt; 安全性与隐私"中允许运行</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default DesktopDownloadPage;
