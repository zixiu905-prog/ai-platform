import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Statistic, 
  Row, 
  Col, 
  Progress, 
  Button, 
  Space, 
  List,
  Alert,
  Tag,
  Tabs,
  Table,
  Input,
  message
} from 'antd';
import { 
  DesktopOutlined, 
  MemoryOutlined, 
  DatabaseOutlined,
  ApiOutlined,
  ReloadOutlined,
  CleanOutlined,
  ExportOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { systemManager } from '../services/systemManager';
import { aiManager } from '../services/aiManager';
import { softwareManager } from '../services/softwareManager';
import { fileManager } from '../services/fileManager';
import { notificationManager } from '../services/notificationManager';

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  totalMemory: number;
  freeMemory: number;
  cpuUsage: number;
  uptime: number;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

export const SystemPage: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchText, setSearchText] = useState('');

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
        cpuUsage: info.cpuUsage || 0,
        uptime: info.uptime || 0
      });
    } catch (error) {
      console.error('加载系统信息失败:', error);
    }
  };

  // 加载进程信息
  const loadProcesses = async () => {
    try {
      const processList = await systemManager.getProcessList();
      setProcesses(processList);
    } catch (error) {
      console.error('加载进程信息失败:', error);
    }
  };

  // 加载系统日志
  const loadLogs = async () => {
    try {
      // 模拟日志数据
      const mockLogs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date(),
          level: 'info',
          message: '应用启动成功',
          source: 'main'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60000),
          level: 'info',
          message: 'API服务连接成功',
          source: 'api'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 120000),
          level: 'warn',
          message: '内存使用率超过80%',
          source: 'system'
        }
      ];
      setLogs(mockLogs);
    } catch (error) {
      console.error('加载系统日志失败:', error);
    }
  };

  // 清理系统缓存
  const cleanCache = async () => {
    try {
      setLoading(true);
      // 模拟清理缓存
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success('系统缓存清理完成');
      await notificationManager.showSuccess('系统清理', '系统缓存已清理');
    } catch (error) {
      message.error('清理缓存失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出系统报告
  const exportSystemReport = async () => {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        systemInfo,
        processes: processes.slice(0, 10),
        logs: logs.slice(0, 50)
      };

      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-report-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      message.success('系统报告已导出');
    } catch (error) {
      message.error('导出报告失败');
    }
  };

  // 搜索日志
  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchText.toLowerCase()) ||
    log.source.toLowerCase().includes(searchText.toLowerCase())
  );

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        loadSystemInfo(),
        loadProcesses(),
        loadLogs()
      ]);
      setLoading(false);
    };

    initialize();

    // 定期更新系统信息
    const interval = setInterval(() => {
      loadSystemInfo();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatMemory = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return '#ff4d4f';
      case 'warn': return '#faad14';
      default: return '#52c41a';
    }
  };

  const renderSystemOverview = () => (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="操作系统"
              value={systemInfo?.platform || 'Unknown'}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="架构"
              value={systemInfo?.arch || 'Unknown'}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Node.js版本"
              value={systemInfo?.nodeVersion || 'Unknown'}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Electron版本"
              value={systemInfo?.electronVersion || 'Unknown'}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="内存使用率"
              value={systemInfo ? ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory * 100).toFixed(1) : 0}
              suffix="%"
              prefix={<MemoryOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="CPU使用率"
              value={systemInfo?.cpuUsage || 0}
              suffix="%"
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="内存使用详情">
            {systemInfo && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text>已使用: {formatMemory(systemInfo.totalMemory - systemInfo.freeMemory)}</Text>
                </div>
                <Progress
                  percent={((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory * 100)}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">总计: {formatMemory(systemInfo.totalMemory)}</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="系统运行时间">
            <Statistic
              title="运行时间"
              value={systemInfo ? formatUptime(systemInfo.uptime) : '0小时0分钟'}
              prefix={<DesktopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="系统操作" style={{ marginTop: 16 }}>
        <Space>
          <Button 
            icon={<CleanOutlined />}
            onClick={cleanCache}
            loading={loading}
          >
            清理缓存
          </Button>
          <Button 
            icon={<ExportOutlined />}
            onClick={exportSystemReport}
          >
            导出报告
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={() => {
              loadSystemInfo();
              loadProcesses();
              loadLogs();
            }}
          >
            刷新数据
          </Button>
        </Space>
      </Card>
    </div>
  );

  const renderProcesses = () => (
    <Card title="进程管理">
      <Table
        dataSource={processes}
        rowKey="pid"
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: 'PID',
            dataIndex: 'pid',
            key: 'pid',
            width: 80,
          },
          {
            title: '进程名称',
            dataIndex: 'name',
            key: 'name',
          },
          {
            title: 'CPU使用率',
            dataIndex: 'cpu',
            key: 'cpu',
            width: 120,
            render: (cpu: number) => `${cpu}%`,
            sorter: (a, b) => a.cpu - b.cpu,
          },
          {
            title: '内存使用',
            dataIndex: 'memory',
            key: 'memory',
            width: 120,
            render: (memory: number) => formatMemory(memory),
            sorter: (a, b) => a.memory - b.memory,
          },
          {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => (
              <Tag color={status === 'running' ? 'green' : 'red'}>
                {status}
              </Tag>
            ),
          },
        ]}
      />
    </Card>
  );

  const renderLogs = () => (
    <Card 
      title="系统日志" 
      extra={
        <Search
          placeholder="搜索日志"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
          prefix={<SearchOutlined />}
        />
      }
    >
      <List
        dataSource={filteredLogs}
        renderItem={(log) => (
          <List.Item>
            <List.Item.Meta
              title={
                <div>
                  <Tag color={getLogColor(log.level)}>
                    {log.level.toUpperCase()}
                  </Tag>
                  <Text>{log.message}</Text>
                </div>
              }
              description={
                <div>
                  <Text type="secondary">来源: {log.source}</Text>
                  <Text type="secondary" style={{ marginLeft: 16 }}>
                    时间: {log.timestamp.toLocaleString()}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );

  return (
    <div className="system-page">
      <Title level={2}>系统工具</Title>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="系统概览" key="overview">
          {renderSystemOverview()}
        </TabPane>
        
        <TabPane tab="进程管理" key="processes">
          {renderProcesses()}
        </TabPane>
        
        <TabPane tab="系统日志" key="logs">
          {renderLogs()}
        </TabPane>
      </Tabs>
    </div>
  );
};