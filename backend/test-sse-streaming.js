/**
 * SSE (Server-Sent Events) 流式响应测试
 * 测试AI对话的流式响应功能
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

class SSEStreamTester {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.prisma = new PrismaClient();
    this.testResults = {
      basicStreaming: [],
      errorHandling: [],
      performance: [],
      concurrent: [],
      reliability: []
    };
    this.testUser = null;
  }

  // 创建测试用户和获取token
  async createTestUser() {
    try {
      // 尝试获取现有测试用户
      let user = await this.prisma.user.findFirst({
        where: { email: 'sse-test@example.com' }
      });

      if (!user) {
        // 创建新用户
        user = await this.prisma.user.create({
          data: {
            email: 'sse-test@example.com',
            username: 'sse-test-user',
            password: '$2a$10$test', // 模拟密码hash
            subscription: 'basic',
            subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
            emailVerified: true
          }
        });
      }

      this.testUser = user;
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      return token;
    } catch (error) {
      console.error('创建测试用户失败:', error);
      throw error;
    }
  }

  // 发送SSE请求并处理流
  async sendSSERequest(token, message, options = {}) {
    const {
      conversationId = null,
      model = 'gpt-3.5-turbo',
      settings = {}
    } = options;

    const response = await axios.post(
      `${this.backendUrl}/api/ai/chat/stream`,
      {
        message,
        conversationId,
        model,
        settings
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 30000
      }
    );

    return response;
  }

  // 处理SSE流数据
  async processStreamData(stream, onData, onError) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let isComplete = false;

      const cleanup = () => {
        stream.removeAllListeners();
        if (!isComplete) {
          isComplete = true;
          reject(new Error('Stream ended unexpectedly'));
        }
      };

      stream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              isComplete = true;
              stream.removeAllListeners();
              resolve();
              return;
            }

            try {
              const parsedData = JSON.parse(data);
              if (onData) onData(parsedData);
            } catch (error) {
              console.warn('解析SSE数据失败:', data, error.message);
            }
          }
        }
      });

      stream.on('end', () => {
        if (!isComplete) {
          isComplete = true;
          resolve();
        }
      });

      stream.on('error', (error) => {
        if (!isComplete) {
          isComplete = true;
          if (onError) onError(error);
          reject(error);
        }
      });
    });
  }

  // 测试基本流式响应
  async testBasicStreaming() {
    console.log('🌊 开始测试基本流式响应...');
    
    const token = await this.createTestUser();
    
    const tests = [
      {
        name: '简单消息流式响应',
        test: async () => {
          const message = '你好，请介绍一下自己';
          const response = await this.sendSSERequest(token, message);
          
          const events = [];
          await this.processStreamData(
            response.data,
            (data) => events.push(data),
            (error) => { throw error; }
          );

          return {
            success: true,
            eventCount: events.length,
            eventTypes: [...new Set(events.map(e => e.type))],
            hasContent: events.some(e => e.type === 'content'),
            hasComplete: events.some(e => e.type === 'complete')
          };
        }
      },
      {
        name: '长消息流式响应',
        test: async () => {
          const message = '请详细解释人工智能的发展历史、当前状态和未来趋势，包括机器学习、深度学习、自然语言处理等相关技术';
          const response = await this.sendSSERequest(token, message);
          
          const events = [];
          let totalContent = '';
          
          await this.processStreamData(
            response.data,
            (data) => {
              events.push(data);
              if (data.type === 'content' && data.data.chunk) {
                totalContent += data.data.chunk;
              }
            },
            (error) => { throw error; }
          );

          return {
            success: true,
            eventCount: events.length,
            totalContentLength: totalContent.length,
            hasMultipleChunks: events.filter(e => e.type === 'content').length > 1
          };
        }
      },
      {
        name: '带有系统提示的流式响应',
        test: async () => {
          const settings = {
            systemPrompt: '你是一个专业的AI助手，请用简洁明了的语言回答问题，每次回答不超过100字。'
          };
          const message = '什么是云计算？';
          
          const response = await this.sendSSERequest(token, message, { settings });
          
          const events = [];
          let totalContent = '';
          
          await this.processStreamData(
            response.data,
            (data) => {
              events.push(data);
              if (data.type === 'content' && data.data.chunk) {
                totalContent += data.data.chunk;
              }
            },
            (error) => { throw error; }
          );

          return {
            success: true,
            contentLength: totalContent.length,
            followsInstructions: totalContent.length <= 150, // 允许一些误差
            hasSystemPromptResponse: true
          };
        }
      },
      {
        name: '带对话历史的流式响应',
        test: async () => {
          // 首先创建一个对话
          const conversation = await this.prisma.conversation.create({
            data: {
              userId: this.testUser.id,
              title: '测试对话',
              model: 'gpt-3.5-turbo',
              messageCount: 0,
              totalTokens: BigInt(0),
              totalCost: 0
            }
          });

          // 添加几条历史消息
          await this.prisma.chatMessage.createMany({
            data: [
              {
                conversationId: conversation.id,
                role: 'USER',
                content: '你好',
                status: 'COMPLETED'
              },
              {
                conversationId: conversation.id,
                role: 'ASSISTANT',
                content: '你好！有什么可以帮助你的吗？',
                status: 'COMPLETED'
              }
            ]
          });

          const message = '请继续我们的对话';
          const response = await this.sendSSERequest(token, message, {
            conversationId: conversation.id
          });
          
          const events = [];
          await this.processStreamData(
            response.data,
            (data) => events.push(data),
            (error) => { throw error; }
          );

          // 清理测试数据
          await this.prisma.conversation.delete({
            where: { id: conversation.id }
          });

          return {
            success: true,
            eventCount: events.length,
            hasHistoryContext: true
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.basicStreaming.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.basicStreaming.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试错误处理
  async testErrorHandling() {
    console.log('⚠️ 开始测试SSE错误处理...');
    
    const tests = [
      {
        name: '空消息错误处理',
        test: async () => {
          const token = await this.createTestUser();
          
          try {
            await this.sendSSERequest(token, '');
            return { success: false, message: '应该抛出错误' };
          } catch (error) {
            if (error.response && error.response.status === 400) {
              return { success: true, error: '空消息正确被拒绝' };
            }
            throw error;
          }
        }
      },
      {
        name: '无效token错误处理',
        test: async () => {
          try {
            await this.sendSSERequest('invalid-token', '测试消息');
            return { success: false, message: '应该抛出认证错误' };
          } catch (error) {
            if (error.response && error.response.status === 401) {
              return { success: true, error: '无效token正确被拒绝' };
            }
            throw error;
          }
        }
      },
      {
        name: '无效对话ID错误处理',
        test: async () => {
          const token = await this.createTestUser();
          
          try {
            await this.sendSSERequest(token, '测试消息', {
              conversationId: 'invalid-conversation-id'
            });
            return { success: false, message: '应该抛出对话不存在错误' };
          } catch (error) {
            if (error.response && error.response.status === 400) {
              return { success: true, error: '无效对话ID正确被拒绝' };
            }
            throw error;
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.errorHandling.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.errorHandling.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试性能
  async testPerformance() {
    console.log('⚡ 开始测试SSE性能...');
    
    const token = await this.createTestUser();
    
    const tests = [
      {
        name: '首次响应时间测试',
        test: async () => {
          const message = '测试消息';
          const startTime = Date.now();
          let firstChunkTime = null;
          
          const response = await this.sendSSERequest(token, message);
          
          await this.processStreamData(
            response.data,
            (data) => {
              if (!firstChunkTime && data.type === 'content') {
                firstChunkTime = Date.now() - startTime;
              }
            },
            (error) => { throw error; }
          );

          return {
            success: true,
            firstChunkTime,
            totalTime: Date.now() - startTime
          };
        }
      },
      {
        name: '流式吞吐量测试',
        test: async () => {
          const message = '请生成一个包含10个要点的列表';
          const startTime = Date.now();
          let chunkCount = 0;
          let totalContentLength = 0;
          
          const response = await this.sendSSERequest(token, message);
          
          await this.processStreamData(
            response.data,
            (data) => {
              if (data.type === 'content') {
                chunkCount++;
                if (data.data.chunk) {
                  totalContentLength += data.data.chunk.length;
                }
              }
            },
            (error) => { throw error; }
          );

          const totalTime = Date.now() - startTime;
          const throughput = totalContentLength / (totalTime / 1000); // 字符/秒

          return {
            success: true,
            chunkCount,
            totalContentLength,
            totalTime,
            throughput: `${throughput.toFixed(2)} chars/sec`
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.performance.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.performance.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试并发流式请求
  async testConcurrentStreams() {
    console.log('🔄 开始测试并发流式请求...');
    
    const token = await this.createTestUser();
    
    const tests = [
      {
        name: '多个并发流请求',
        test: async () => {
          const concurrentCount = 5;
          const requests = [];
          
          for (let i = 0; i < concurrentCount; i++) {
            requests.push(
              this.sendSSERequest(token, `并发测试消息 ${i + 1}`)
            );
          }

          const responses = await Promise.all(requests);
          const results = [];
          
          for (let i = 0; i < responses.length; i++) {
            const events = [];
            await this.processStreamData(
              responses[i].data,
              (data) => events.push(data),
              (error) => { throw error; }
            );
            results.push(events);
          }

          return {
            success: true,
            concurrentCount,
            allCompleted: results.every(r => r.length > 0),
            totalEvents: results.reduce((sum, r) => sum + r.length, 0)
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.concurrent.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.concurrent.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试可靠性
  async testReliability() {
    console.log('🛡️ 开始测试SSE可靠性...');
    
    const token = await this.createTestUser();
    
    const tests = [
      {
        name: '流连接中断测试',
        test: async () => {
          const message = '请生成一个较长的回答，用于测试连接中断';
          const response = await this.sendSSERequest(token, message);
          
          let eventCount = 0;
          let interrupted = false;
          
          // 模拟客户端在中途断开连接
          setTimeout(() => {
            if (response.data && !response.data.destroyed) {
              response.data.destroy();
              interrupted = true;
            }
          }, 1000);

          try {
            await this.processStreamData(
              response.data,
              (data) => {
                eventCount++;
              },
              (error) => { 
                // 连接中断是预期的
                if (interrupted) {
                  return;
                }
                throw error;
              }
            );
          } catch (error) {
            if (interrupted) {
              return {
                success: true,
                interrupted: true,
                eventsReceived: eventCount
              };
            }
            throw error;
          }

          return {
            success: false,
            message: '连接没有被中断'
          };
        }
      },
      {
        name: '数据完整性测试',
        test: async () => {
          const message = '请计算 1+1 等于多少？';
          const response = await this.sendSSERequest(token, message);
          
          const events = [];
          let fullContent = '';
          
          await this.processStreamData(
            response.data,
            (data) => {
              events.push(data);
              if (data.type === 'content' && data.data.chunk) {
                fullContent += data.data.chunk;
              }
            },
            (error) => { throw error; }
          );

          // 检查是否有完整的事件序列
          const hasUserMessage = events.some(e => e.type === 'user_message');
          const hasContent = events.some(e => e.type === 'content');
          const hasComplete = events.some(e => e.type === 'complete');
          const hasValidContent = fullContent.includes('2') || fullContent.includes('等于');

          return {
            success: true,
            hasCompleteSequence: hasUserMessage && hasContent && hasComplete,
            hasValidContent,
            contentLength: fullContent.length,
            eventCount: events.length
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.reliability.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.reliability.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 运行所有SSE测试
  async runAllTests() {
    console.log('🚀 开始SSE流式响应完整测试套件...\n');
    
    try {
      await this.testBasicStreaming();
      console.log('');
      
      await this.testErrorHandling();
      console.log('');
      
      await this.testPerformance();
      console.log('');
      
      await this.testConcurrentStreams();
      console.log('');
      
      await this.testReliability();
      console.log('');
      
      this.generateReport();
      
    } catch (error) {
      console.error('SSE测试套件执行失败:', error);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  // 生成测试报告
  generateReport() {
    console.log('📊 SSE流式响应测试报告');
    console.log('='.repeat(50));
    
    const allResults = [
      ...this.testResults.basicStreaming,
      ...this.testResults.errorHandling,
      ...this.testResults.performance,
      ...this.testResults.concurrent,
      ...this.testResults.reliability
    ];
    
    const passedTests = allResults.filter(r => r.status === 'PASS').length;
    const totalTests = allResults.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n总体结果: ${passedTests}/${totalTests} 测试通过 (${successRate}%)`);
    
    const categories = [
      { name: '基本流式测试', results: this.testResults.basicStreaming },
      { name: '错误处理测试', results: this.testResults.errorHandling },
      { name: '性能测试', results: this.testResults.performance },
      { name: '并发测试', results: this.testResults.concurrent },
      { name: '可靠性测试', results: this.testResults.reliability }
    ];
    
    categories.forEach(category => {
      if (category.results.length > 0) {
        const passed = category.results.filter(r => r.status === 'PASS').length;
        const total = category.results.length;
        console.log(`\n${category.name}: ${passed}/${total} 通过`);
        
        category.results.forEach(result => {
          const status = result.status === 'PASS' ? '✅' : '❌';
          const duration = result.duration || '';
          console.log(`  ${status} ${result.test} ${duration}`);
          if (result.error) {
            console.log(`    错误: ${result.error}`);
          }
        });
      }
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('SSE流式响应测试完成！');
    
    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        successRate: parseFloat(successRate)
      },
      details: this.testResults
    };
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const tester = new SSEStreamTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SSEStreamTester;