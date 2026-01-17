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
  Divider,
  Form,
  Input,
  Select,
  message,
  Image,
  Spin
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  PictureOutlined,
  HomeOutlined,
  BuildOutlined,
  ToolOutlined,
  BulbOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

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

interface DesignExample {
  responseId: string;
  output: any[];
  designType: string;
  requirements: string;
  timestamp: string;
}

const DoubaoAITestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [runningTests, setRunningTests] = useState<string[]>([]);
  const [individualTests, setIndividualTests] = useState<TestResult[]>([]);
  const [fullTestResults, setFullTestResults] = useState<FullTestResults | null>(null);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [designExamples, setDesignExamples] = useState<DesignExample[]>([]);
  const [form] = Form.useForm();

  // 获取模型状态
  const fetchModelStatus = async () => {
    try {
      const response = await axios.get('/api/doubao-ai-test/model-status', {
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
      
      const response = await axios.post(`/api/doubao-ai-test/test/${testType}`, {}, {
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
      
      const response = await axios.post('/api/doubao-ai-test/run-full-test', {}, {
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

  // 生成设计示例
  const generateDesignExample = async (values: any) => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/doubao-ai-test/generate-design-example', values, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setDesignExamples(prev => [response.data.data, ...prev.slice(0, 4)]); // 保留最近5个
        message.success('设计示例生成成功！');
        form.resetFields();
      }
      
    } catch (error: any) {
      message.error(error.response?.data?.error || '设计示例生成失败');
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
    { 
      type: 'image-generation', 
      name: '图像生成', 
      description: '测试AI图像生成能力',
      icon: <PictureOutlined />
    },
    { 
      type: 'multimodal-understanding', 
      name: '多模态理解', 
      description: '测试图像和文本综合理解能力',
      icon: <RobotOutlined />
    },
    { 
      type: 'interior-design', 
      name: '室内设计', 
      description: '测试室内空间设计能力',
      icon: <HomeOutlined />
    },
    { 
      type: 'exterior-design', 
      name: '室外设计', 
      description: '测试建筑外观设计能力',
      icon: <BuildOutlined />
    },
    { 
      type: 'design-commands', 
      name: '设计指令生成', 
      description: '测试生成设计软件可执行指令',
      icon: <ToolOutlined />
    },
    { 
      type: 'design-optimization', 
      name: '设计优化建议', 
      description: '测试设计问题分析和优化建议',
      icon: <BulbOutlined />
    }
  ];

  const renderModelStatus = () => {
    if (!modelStatus) return null;

    return (
      <Card 
        title={
          <Space>
            <RobotOutlined />
            <span>豆包AI模型状态</span>
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
        {modelStatus.capabilities && (
          <div style={{ marginTop: '12px' }}>
            <Text strong>支持功能:</Text>
            <div style={{ marginTop: '8px' }}>
              {modelStatus.capabilities.map((capability: string, index: number) => (
                <Badge key={index} count={capability} style={{ marginRight: '8px', marginBottom: '8px' }} />
              ))}
            </div>
          </div>
        )}
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
                    avatar={config.icon}
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

  const renderDesignGeneration = () => {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card title="生成设计示例" size="small">
          <Form
            form={form}
            layout="vertical"
            onFinish={generateDesignExample}
          >
            <Form.Item
              name="designType"
              label="设计类型"
              rules={[{ required: true, message: '请选择设计类型' }]}
            >
              <Select placeholder="选择设计类型">
                <Option value="logo">Logo设计</Option>
                <Option value="poster">海报设计</Option>
                <Option value="interior">室内设计</Option>
                <Option value="exterior">建筑外观</Option>
                <Option value="custom">自定义设计</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="requirements"
              label="设计需求"
              rules={[{ required: true, message: '请描述设计需求' }]}
            >
              <TextArea
                rows={4}
                placeholder="请详细描述您的设计需求，例如：现代简约风格、蓝色主色调、包含科技元素等"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<PictureOutlined />}
              >
                生成设计
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {designExamples.length > 0 && (
          <Card title="最近生成的设计" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {designExamples.map((example, index) => (
                <Card key={example.responseId} size="small">
                  <Space>
                    <Text strong>{example.designType}</Text>
                    <Text type="secondary">|</Text>
                    <Text>{example.requirements}</Text>
                    <Text type="secondary">|</Text>
                    <Text>{new Date(example.timestamp).toLocaleString()}</Text>
                  </Space>
                  {example.output && example.output.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      {example.output.map((item: any, itemIndex: number) => (
                        <div key={itemIndex}>
                          {item.image_url && (
                            <Image
                              width={200}
                              src={item.image_url}
                              alt={`设计图 ${itemIndex + 1}`}
                              style={{ marginTop: '8px' }}
                            />
                          )}
                          {item.text && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {item.text}
                            </Text>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </Space>
          </Card>
        )}
      </Space>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>豆包AI功能测试中心</Title>
      
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
                      完整测试将验证所有豆包AI功能，包括图像生成、多模态理解、室内外设计、设计指令生成和优化建议
                    </Text>
                  </Space>
                </Card>
                
                {renderFullTestResults()}
              </Space>
            </TabPane>

            <TabPane 
              tab={
                <Space>
                  <PictureOutlined />
                  <span>设计生成</span>
                </Space>
              } 
              key="design"
            >
              {renderDesignGeneration()}
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default DoubaoAITestPage;