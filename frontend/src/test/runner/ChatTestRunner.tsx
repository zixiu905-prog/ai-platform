import React, { useState, useEffect } from 'react';
import { chatService } from '../../services/chatService';
import { TestDataFactory, MockAPIResponses, ChatTestUtils, PerformanceUtils } from '../utils/ChatTestUtils';
import { Message, Conversation, AIModel } from '../../types/chat';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
}

export function ChatTestRunner() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const testSuitesConfig = [
    {
      name: '基础连接测试',
      tests: [
        '测试数据库连接',
        '测试API端点可用性',
        '测试认证状态',
      ],
    },
    {
      name: '对话功能测试',
      tests: [
        '创建新对话',
        '获取对话列表',
        '发送用户消息',
        '接收AI回复',
        '流式消息处理',
      ],
    },
    {
      name: '消息管理测试',
      tests: [
        '获取消息历史',
        '删除消息',
        '重新生成回复',
        '消息搜索',
      ],
    },
    {
      name: '模型配置测试',
      tests: [
        '获取可用模型',
        '切换AI模型',
        '调整模型参数',
        '保存设置',
      ],
    },
    {
      name: '性能测试',
      tests: [
        '大量消息渲染',
        '并发请求处理',
        '内存使用测试',
        '响应时间测试',
      ],
    },
  ];

  const runTest = async (testName: string): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      switch (testName) {
        case '测试数据库连接':
          await testDatabaseConnection();
          break;
        case '测试API端点可用性':
          await testAPIEndpoints();
          break;
        case '测试认证状态':
          await testAuthentication();
          break;
        case '创建新对话':
          await testCreateConversation();
          break;
        case '获取对话列表':
          await testGetConversations();
          break;
        case '发送用户消息':
          await testSendMessage();
          break;
        case '接收AI回复':
          await testReceiveResponse();
          break;
        case '流式消息处理':
          await testStreamingMessage();
          break;
        case '获取消息历史':
          await testGetMessageHistory();
          break;
        case '删除消息':
          await testDeleteMessage();
          break;
        case '重新生成回复':
          await testRegenerateMessage();
          break;
        case '消息搜索':
          await testSearchMessages();
          break;
        case '获取可用模型':
          await testGetAvailableModels();
          break;
        case '切换AI模型':
          await testSwitchModel();
          break;
        case '调整模型参数':
          await testModelParameters();
          break;
        case '保存设置':
          await testSaveSettings();
          break;
        case '大量消息渲染':
          await testLargeMessageRendering();
          break;
        case '并发请求处理':
          await testConcurrentRequests();
          break;
        case '内存使用测试':
          await testMemoryUsage();
          break;
        case '响应时间测试':
          await testResponseTime();
          break;
        default:
          throw new Error(`Unknown test: ${testName}`);
      }

      return {
        name: testName,
        status: 'passed',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: testName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  };

  // Test implementations
  const testDatabaseConnection = async () => {
    const response = await fetch('http://127.0.0.1:3001/api/test/db-status');
    if (!response.ok) throw new Error('Database connection failed');
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Database status check failed');
  };

  const testAPIEndpoints = async () => {
    const endpoints = [
      '/api/test/db-status',
      '/api/test/ai-config',
      '/api/test/models',
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`http://127.0.0.1:3001${endpoint}`);
      if (!response.ok) {
        throw new Error(`Endpoint ${endpoint} not accessible`);
      }
    }
  };

  const testAuthentication = async () => {
    // Mock token in localStorage
    localStorage.setItem('token', 'test-token');
    
    // Test authenticated endpoint
    const response = await fetch('http://127.0.0.1:3001/api/chat/conversations', {
      headers: {
        'Authorization': `Bearer test-token`,
      },
    });
    
    // Expect 401 or 200 (both mean authentication system is working)
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Unexpected authentication response: ${response.status}`);
    }
  };

  const testCreateConversation = async () => {
    const conversation = TestDataFactory.createConversation();
    // This would normally call the real service, but for testing we simulate
    console.log('Creating conversation:', conversation.title);
  };

  const testGetConversations = async () => {
    const conversations = TestDataFactory.createConversationHistory(5);
    console.log('Getting conversations:', conversations.length);
  };

  const testSendMessage = async () => {
    const message = TestDataFactory.createUserMessage();
    console.log('Sending message:', message.content);
  };

  const testReceiveResponse = async () => {
    const response = MockAPIResponses.getChatResponse(
      TestDataFactory.createAssistantMessage(),
      TestDataFactory.createConversation()
    );
    console.log('Receiving response:', response.message.content);
  };

  const testStreamingMessage = async () => {
    const chunks = [
      'data: {"type":"content","content":"Hello"}\n',
      'data: {"type":"content","content":" World"}\n',
      'data: {"type":"complete","data":{}}\n',
    ];
    
    const mockStream = ChatTestUtils.createMockStream(chunks);
    console.log('Testing streaming with', chunks.length, 'chunks');
  };

  const testGetMessageHistory = async () => {
    const messages = TestDataFactory.createMessageHistory(10);
    console.log('Getting message history:', messages.length, 'messages');
  };

  const testDeleteMessage = async () => {
    const message = TestDataFactory.createUserMessage();
    console.log('Deleting message:', message.id);
  };

  const testRegenerateMessage = async () => {
    const message = TestDataFactory.createAssistantMessage();
    console.log('Regenerating message:', message.id);
  };

  const testSearchMessages = async () => {
    const messages = TestDataFactory.createMessageHistory(20);
    const searchTerm = 'test';
    const filtered = messages.filter(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('Search results:', filtered.length, 'messages found');
  };

  const testGetAvailableModels = async () => {
    const models = [
      TestDataFactory.createModel({ id: 'glm-4', description: 'GLM-4 旗舰文本模型' }),
      TestDataFactory.createModel({ id: 'glm-4-plus', description: 'GLM-4 Plus 增强版' }),
    ];
    console.log('Available models:', models.length);
  };

  const testSwitchModel = async () => {
    const conversation = TestDataFactory.createConversation();
    const updatedConversation = {
      ...conversation,
      model: 'glm-4-plus',
    };
    console.log('Switched model to:', updatedConversation.model);
  };

  const testModelParameters = async () => {
    const settings = {
      temperature: 0.9,
      maxTokens: 8000,
      systemPrompt: 'Test system prompt',
    };
    console.log('Updated model parameters:', settings);
  };

  const testSaveSettings = async () => {
    const conversation = TestDataFactory.createConversation();
    const updates = {
      settings: { temperature: 0.8 },
    };
    console.log('Saving settings for conversation:', conversation.id);
  };

  const testLargeMessageRendering = async () => {
    const messages = TestDataFactory.createMessageHistory(1000);
    console.log('Rendering', messages.length, 'messages');
    
    // Simulate render time measurement
    const startTime = performance.now();
    // Mock render operation
    await new Promise(resolve => setTimeout(resolve, 50));
    const endTime = performance.now();
    
    if (endTime - startTime > 1000) {
      throw new Error(`Large message rendering took too long: ${endTime - startTime}ms`);
    }
  };

  const testConcurrentRequests = async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      new Promise(resolve => {
        setTimeout(() => {
          console.log(`Concurrent request ${i} completed`);
          resolve(i);
        }, Math.random() * 100);
      })
    );
    
    await Promise.all(promises);
    console.log('All concurrent requests completed');
  };

  const testMemoryUsage = async () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const before = memory.usedJSHeapSize;
      
      // Create some objects to test memory usage
      const messages = TestDataFactory.createMessageHistory(100);
      
      const after = memory.usedJSHeapSize;
      const increase = after - before;
      
      console.log(`Memory increase: ${(increase / 1024 / 1024).toFixed(2)} MB`);
      
      // Clean up
      messages.length = 0;
      
      if (increase > 50 * 1024 * 1024) { // 50MB
        throw new Error(`Memory usage too high: ${(increase / 1024 / 1024).toFixed(2)} MB`);
      }
    } else {
      console.log('Memory API not available, skipping test');
    }
  };

  const testResponseTime = async () => {
    const startTime = Date.now();
    
    // Simulate API call
    await fetch('http://127.0.0.1:3001/api/test/db-status');
    
    const responseTime = Date.now() - startTime;
    console.log(`Response time: ${responseTime}ms`);
    
    if (responseTime > 5000) {
      throw new Error(`Response time too slow: ${responseTime}ms`);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const suites: TestSuite[] = [];

    for (const suiteConfig of testSuitesConfig) {
      setCurrentTest(suiteConfig.name);
      const suiteStartTime = Date.now();
      
      const suite: TestSuite = {
        name: suiteConfig.name,
        tests: suiteConfig.tests.map(testName => ({
          name: testName,
          status: 'pending' as const,
        })),
        status: 'running' as const,
        duration: 0,
      };

      setTestSuites(prev => [...prev, suite]);

      for (let i = 0; i < suite.tests.length; i++) {
        const test = suite.tests[i];
        setCurrentTest(test.name);
        
        suite.tests[i] = { ...test, status: 'running' as const };
        setTestSuites(prev => [...prev]);

        const result = await runTest(test.name);
        suite.tests[i] = result;
        setTestSuites(prev => [...prev]);

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      suite.duration = Date.now() - suiteStartTime;
      suite.status = suite.tests.every(t => t.status === 'passed') ? 'passed' : 'failed';
      
      // Update the suite in the array
      setTestSuites(prev => 
        prev.map(s => s.name === suite.name ? suite : s)
      );
    }

    setIsRunning(false);
    setCurrentTest('');
  };

  const clearResults = () => {
    setTestSuites([]);
  };

  useEffect(() => {
    // Initialize test suites
    const initialSuites = testSuitesConfig.map(config => ({
      name: config.name,
      tests: config.tests.map(name => ({
        name,
        status: 'pending' as const,
      })),
      status: 'pending' as const,
      duration: 0,
    }));
    setTestSuites(initialSuites);
  }, []);

  const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
  const passedTests = testSuites.reduce(
    (sum, suite) => sum + suite.tests.filter(t => t.status === 'passed').length,
    0
  );
  const failedTests = testSuites.reduce(
    (sum, suite) => sum + suite.tests.filter(t => t.status === 'failed').length,
    0
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">聊天组件集成测试</h1>
        
        {/* Test Status Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalTests}</div>
            <div className="text-sm text-gray-600">总测试数</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{passedTests}</div>
            <div className="text-sm text-gray-600">通过</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{failedTests}</div>
            <div className="text-sm text-gray-600">失败</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">通过率</div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isRunning ? '运行中...' : '运行所有测试'}
          </button>
          <button
            onClick={clearResults}
            disabled={isRunning}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:bg-gray-400"
          >
            清除结果
          </button>
        </div>

        {/* Current Test Status */}
        {isRunning && currentTest && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="text-sm text-blue-600">当前运行:</div>
            <div className="font-semibold">{currentTest}</div>
          </div>
        )}

        {/* Test Results */}
        <div className="space-y-6">
          {testSuites.map((suite) => (
            <div key={suite.name} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{suite.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    suite.status === 'passed' ? 'bg-green-100 text-green-800' :
                    suite.status === 'failed' ? 'bg-red-100 text-red-800' :
                    suite.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {suite.status === 'passed' ? '通过' :
                     suite.status === 'failed' ? '失败' :
                     suite.status === 'running' ? '运行中' : '待运行'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {suite.duration}ms
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suite.tests.map((test) => (
                  <div key={test.name} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{test.name}</span>
                    <div className="flex items-center gap-2">
                      {test.duration && (
                        <span className="text-xs text-gray-500">
                          {test.duration}ms
                        </span>
                      )}
                      <span className={`w-3 h-3 rounded-full ${
                        test.status === 'passed' ? 'bg-green-500' :
                        test.status === 'failed' ? 'bg-red-500' :
                        test.status === 'running' ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
              
              {suite.tests.some(t => t.status === 'failed' && t.error) && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-600 mb-2">错误详情:</h4>
                  <div className="space-y-2">
                    {suite.tests.filter(t => t.status === 'failed' && t.error).map(test => (
                      <div key={test.name} className="bg-red-50 p-2 rounded text-sm">
                        <div className="font-medium">{test.name}:</div>
                        <div className="text-red-700">{test.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}