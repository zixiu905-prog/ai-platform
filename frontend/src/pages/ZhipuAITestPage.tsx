import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Progress,
  Tabs,
  Badge,
  Row,
  Col,
  Timeline,
  Divider
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  RobotOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  details?: any;
  timestamp?: string;
}

interface FullTestResults {
  overall: boolean;
  results: Record<string, boolean>;
  summary: string;
  timestamp: string;
}

const ZhipuAITestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [runningTests, setRunningTests] = useState<string[]>([]);
  const [individualTests, setIndividualTests] = useState<TestResult[]>([]);
  const [fullTestResults, setFullTestResults] = useState<FullTestResults | null>(null);
  const [modelStatus, setModelStatus] = useState<any>(null);

  // 获取模型状态
  const fetchModelStatus = async () => {
    try {
      const response = await axios.get('/api/zhipu-ai-test/model-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setModelStatus(response.data.data);
      }
    } catch (error) {
      console.error('获取模型状态失败:', error);
    }
  };

  // 运行单个测试
  const runSingleTest = async (testType: string, testName: string) => {
    try {
      setRunningTests(prev => [...prev, testName]);
      
      const response = await axios.post(`/api/zhipu-ai-test/test/${testType}`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result: TestResult = {
        name: testName,
        passed: response.data.result,
        message: response.data.message,
        timestamp: new Date().toISOString()
      };
      
      setIndividualTests(prev => {
        const filtered = prev.filter(t => t.name !== testName);
        return [...filtered, result];
      });
      
    } catch (error: any) {
      const result: TestResult = {
        name: testName,
        passed: false,
        message: error.response?.data?.error || '测试执行失败',
        timestamp: new Date().toISOString()
      };
      
      setIndividualTests(prev => {
        const filtered = prev.filter(t => t.name !== testName);
        return [...filtered, result];
      });
    } finally {
      setRunningTests(prev => prev.filter(t => t !== testName));
    }
  };

  // 运行完整测试套件
  const runFullTestSuite = async () => {
    try {
      setLoading(true);
      setFullTestResults(null);
      
      const response = await axios.post('/api/zhipu-ai-test/run-full-test', {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setFullTestResults(response.data.data);
      
    } catch (error: any) {
      console.error('运行完整测试套件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelStatus();
    const interval = setInterval(fetchModelStatus, 30000); // 30秒更新一次
    return () => clearInterval(interval);
  }, []);

  const testConfigs = [
    { type: 'text-generation', name: '文本生成', description: '测试基础的文本对话和生成能力' },
    { type: 'image-analysis', name: '图像分析', description: '测试图像理解、元素识别和分析能力' },
    { type: 'design-commands', name: '设计指令生成', description: '测试生成可执行的设计软件指令' },
    { type: 'com-fixes', name: 'COM接口修复', description: '测试COM接口问题诊断和修复建议' },
    { type: 'multimodal-processing', name: '多模态处理', description: '测试图文综合处理能力' }
  ];

  const renderModelStatus = () => {
    if (!modelStatus) return null;

    return (
      <Card 
        title={
          <Space>
            <RobotOutlined />
            <span>智谱AI模型状态</span>
          </Space>
        }
        size="small"
      >
        <Row gutter={16}>
          <Col span={6}>
            <Text strong>连接状态:</Text>
            <Badge 
              status={modelStatus.connected ? 'success' : 'error'} 
              text={modelStatus.connected ? '已连接' : '连接失败'} 
            />
          </Col>
          <Col span={6}>
            <Text strong>API密钥:</Text>
            <Text code>{modelStatus.apiKey}</Text>
          </Col>
          <Col span={6}>
            <Text strong>API端点:</Text>
            <Text code copyable>{modelStatus.apiEndpoint}</Text>
          </Col>
          <Col span={6}>
            <Text strong>最后测试:</Text>
            <Text>{new Date(modelStatus.lastTest).toLocaleString()}</Text>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderIndividualTests = () => {
    return (
      <Card title="单项功能测试" size="small">
        <Row gutter={[16, 16]}>
          {testConfigs.map((config) => {
            const isRunning = runningTests.includes(config.name);
            const testResult = individualTests.find(t => t.name === config.name);
            const hasResult = testResult !== undefined;
            
            return (
              <Col span={12} key={config.type}>
                <Card 
                  size="small"
                  loading={isRunning}
                  actions={[
                    <Button 
                      key="test"
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => runSingleTest(config.type, config.name)}
                      loading={isRunning}
                      disabled={isRunning}
                    >
                      {isRunning ? '测试中...' : '开始测试'}
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={
                      <Space>
                        <span>{config.name}</span>
                        {hasResult && (
                          testResult!.passed ? 
                            <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph type="secondary" style={{ fontSize: '12px', marginBottom: '8px' }}>
                          {config.description}
                        </Paragraph>
                        {hasResult && (
                          <div>
                            <Badge 
                              status={testResult!.passed ? 'success' : 'error'} 
                              text={testResult!.message} 
                            />
                            <br />
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {new Date(testResult!.timestamp!).toLocaleString()}
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  const renderFullTestResults = () => {
    if (!fullTestResults) return null;

    return (
      <Card title="完整测试套件结果" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type={fullTestResults.overall ? 'success' : 'warning'}
            message={
              <Space>
                <span>测试完成 - {fullTestResults.overall ? '全部通过' : '部分失败'}</span>
                <Badge 
                  count={Object.values(fullTestResults.results).filter(Boolean).length} 
                  style={{ backgroundColor: '#52c41a' }}
                />
                <span>/ {Object.keys(fullTestResults.results).length}</span>
              </Space>
            }
            description={
              <div>
                <Paragraph>{fullTestResults.summary}</Paragraph>
                <Text type="secondary">
                  测试时间: {new Date(fullTestResults.timestamp).toLocaleString()}
                </Text>
              </div>
            }
          />

          <Divider />

          <Timeline>
            {Object.entries(fullTestResults.results).map(([name, passed]) => (
              <Timeline.Item
                key={name}
                color={passed ? 'green' : 'red'}
                dot={passed ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
              >
                <Space>
                  <Text strong>{name}</Text>
                  <Badge status={passed ? 'success' : 'error'} text={passed ? '通过' : '失败'} />
                </Space>
              </Timeline.Item>
            ))}
          </Timeline>
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>智谱AI功能测试中心</Title>
      
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {renderModelStatus()}
        
        <Card>
          <Tabs defaultActiveKey="individual">
            <TabPane 
              tab={
                <Space>
                  <span>单项测试</span>
                  {individualTests.length > 0 && (
                    <Badge count={individualTests.filter(t => t.passed).length} />
                  )}
                </Space>
              } 
              key="individual"
            >
              {renderIndividualTests()}
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <span>完整测试</span>
                  {fullTestResults && (
                    <Badge 
                      count={fullTestResults.overall ? '✓' : '⚠'} 
                      style={{ backgroundColor: fullTestResults.overall ? '#52c41a' : '#faad14' }}
                    />
                  )}
                </Space>
              } 
              key="full"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card size="small">
                  <Space>
                    <Button 
                      type="primary" 
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={runFullTestSuite}
                      loading={loading}
                    >
                      {loading ? '运行中...' : '运行完整测试套件'}
                    </Button>
                    <Text type="secondary">
                      完整测试将验证所有智谱AI功能，包括文本生成、图像分析、设计指令生成、COM接口修复和多模态处理
                    </Text>
                  </Space>
                </Card>
                
                {renderFullTestResults()}
              </Space>
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default ZhipuAITestPage;