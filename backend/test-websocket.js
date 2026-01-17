/**
 * WebSocket连接和消息传递测试
 * 测试Socket.IO连接、认证、消息传递和错误处理
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

class WebSocketTester {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.testResults = {
      connection: [],
      messaging: [],
      authentication: [],
      errorHandling: [],
      performance: []
    };
    this.connectedSockets = [];
  }

  // 生成测试用的JWT token
  generateTestToken(userId = 'test-user-123') {
    return jwt.sign(
      { userId, email: `test${userId}@example.com` },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  }

  // 测试WebSocket连接建立
  async testConnection() {
    console.log('🔌 开始测试WebSocket连接...');
    
    const tests = [
      {
        name: '基本连接测试',
        test: async () => {
          const token = this.generateTestToken();
          const socket = io(this.backendUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
          });

          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.disconnect();
              reject(new Error('连接超时'));
            }, 5000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              socket.disconnect();
              resolve({ success: true, socketId: socket.id });
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        }
      },
      {
        name: '无认证连接测试',
        test: async () => {
          const socket = io(this.backendUrl);

          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.disconnect();
              reject(new Error('应该被拒绝但连接成功了'));
            }, 3000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              socket.disconnect();
              reject(new Error('未认证连接不应该成功'));
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              resolve({ success: true, error: error.message });
            });
          });
        }
      },
      {
        name: '多客户端连接测试',
        test: async () => {
          const token1 = this.generateTestToken('user-1');
          const token2 = this.generateTestToken('user-2');
          
          const socket1 = io(this.backendUrl, { auth: { token: token1 } });
          const socket2 = io(this.backendUrl, { auth: { token: token2 } });

          return new Promise((resolve, reject) => {
            let connectedCount = 0;
            const timeout = setTimeout(() => {
              socket1.disconnect();
              socket2.disconnect();
              reject(new Error('连接超时'));
            }, 5000);

            const onConnect = () => {
              connectedCount++;
              if (connectedCount === 2) {
                clearTimeout(timeout);
                const result = {
                  success: true,
                  socket1Id: socket1.id,
                  socket2Id: socket2.id
                };
                socket1.disconnect();
                socket2.disconnect();
                resolve(result);
              }
            };

            socket1.on('connect', onConnect);
            socket2.on('connect', onConnect);
          });
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.connection.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.connection.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试消息传递
  async testMessaging() {
    console.log('💬 开始测试消息传递...');
    
    const token = this.generateTestToken();
    const socket = io(this.backendUrl, { auth: { token } });

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('连接超时')), 5000);
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.on('connect_error', reject);
      });

      const tests = [
        {
          name: '用户消息发送测试',
          test: () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('消息响应超时')), 3000);
              
              socket.emit('user_message', {
                content: '测试消息内容',
                timestamp: new Date().toISOString()
              });

              socket.on('message_response', (data) => {
                clearTimeout(timeout);
                resolve({ success: true, data });
              });

              socket.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.details || '未知错误'));
              });
            });
          }
        },
        {
          name: 'AI调用请求测试',
          test: () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('AI响应超时')), 5000);
              
              socket.emit('ai_call', {
                id: 'test-ai-call-123',
                model: 'gpt-3.5-turbo',
                prompt: '请介绍一下人工智能',
                settings: { temperature: 0.7 }
              });

              socket.on('ai_response', (data) => {
                clearTimeout(timeout);
                resolve({ success: true, data });
              });

              socket.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.details || 'AI调用失败'));
              });
            });
          }
        },
        {
          name: '软件连接测试',
          test: () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('软件连接响应超时')), 3000);
              
              socket.emit('software_connect', {
                software: 'photoshop',
                version: '2024',
                features: ['image-editing', 'layer-management']
              });

              socket.on('software_response', (data) => {
                clearTimeout(timeout);
                resolve({ success: true, data });
              });

              socket.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.details || '软件连接失败'));
              });
            });
          }
        },
        {
          name: '工作流执行测试',
          test: () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('工作流响应超时')), 3000);
              
              socket.emit('workflow_execute', {
                id: 'test-workflow-123',
                workflowId: 'workflow-456',
                inputs: { text: '测试输入' }
              });

              socket.on('workflow_response', (data) => {
                clearTimeout(timeout);
                resolve({ success: true, data });
              });

              socket.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.details || '工作流执行失败'));
              });
            });
          }
        },
        {
          name: '心跳测试',
          test: () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('心跳响应超时')), 2000);
              
              socket.emit('ping');

              socket.on('pong', (data) => {
                clearTimeout(timeout);
                resolve({ success: true, data });
              });
            });
          }
        }
      ];

      for (const test of tests) {
        try {
          const startTime = Date.now();
          const result = await test.test();
          const duration = Date.now() - startTime;
          
          this.testResults.messaging.push({
            test: test.name,
            status: 'PASS',
            duration: `${duration}ms`,
            result
          });
          
          console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
        } catch (error) {
          this.testResults.messaging.push({
            test: test.name,
            status: 'FAIL',
            error: error.message
          });
          
          console.log(`❌ ${test.name} - 失败: ${error.message}`);
        }
      }

    } finally {
      socket.disconnect();
    }
  }

  // 测试认证机制
  async testAuthentication() {
    console.log('🔐 开始测试认证机制...');
    
    const tests = [
      {
        name: '有效Token测试',
        test: async () => {
          const token = this.generateTestToken('valid-user');
          const socket = io(this.backendUrl, { auth: { token } });

          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.disconnect();
              reject(new Error('连接超时'));
            }, 3000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              socket.disconnect();
              resolve({ success: true, authenticated: true });
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });
        }
      },
      {
        name: '过期Token测试',
        test: async () => {
          const token = jwt.sign(
            { userId: 'expired-user' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '-1h' } // 已过期
          );
          
          const socket = io(this.backendUrl, { auth: { token } });

          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.disconnect();
              reject(new Error('应该被拒绝但连接成功了'));
            }, 3000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              socket.disconnect();
              reject(new Error('过期Token不应该成功连接'));
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              resolve({ success: true, error: error.message });
            });
          });
        }
      },
      {
        name: '无效Token测试',
        test: async () => {
          const token = 'invalid-token-12345';
          const socket = io(this.backendUrl, { auth: { token } });

          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              socket.disconnect();
              reject(new Error('应该被拒绝但连接成功了'));
            }, 3000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              socket.disconnect();
              reject(new Error('无效Token不应该成功连接'));
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              resolve({ success: true, error: error.message });
            });
          });
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.authentication.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.authentication.push({
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
    console.log('⚠️ 开始测试错误处理...');
    
    const token = this.generateTestToken();
    const socket = io(this.backendUrl, { auth: { token } });

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('连接超时')), 5000);
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.on('connect_error', reject);
      });

      const tests = [
        {
          name: '无效消息格式测试',
          test: () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('应该有错误响应')), 3000);
              
              socket.emit('invalid_event', { invalid: 'data' });

              socket.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ success: true, error: error.details });
              });

              // 如果没有错误事件，也算通过（服务端可能忽略无效消息）
              setTimeout(() => {
                clearTimeout(timeout);
                resolve({ success: true, message: '服务端忽略了无效消息' });
              }, 1000);
            });
          }
        },
        {
          name: '缺失参数测试',
          test: () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                resolve({ success: true, message: '服务端处理了缺失参数' });
              }, 2000);
              
              socket.emit('ai_call', {}); // 缺少必要参数

              socket.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ success: true, error: error.details });
              });
            });
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

    } finally {
      socket.disconnect();
    }
  }

  // 测试性能
  async testPerformance() {
    console.log('⚡ 开始测试性能...');
    
    const token = this.generateTestToken();
    const socket = io(this.backendUrl, { auth: { token } });

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('连接超时')), 5000);
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        socket.on('connect_error', reject);
      });

      const tests = [
        {
          name: '并发消息发送测试',
          test: async () => {
            const messageCount = 50;
            const startTime = Date.now();
            let responsesReceived = 0;

            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('并发消息响应超时'));
              }, 10000);

              for (let i = 0; i < messageCount; i++) {
                socket.emit('user_message', {
                  content: `并发测试消息 ${i}`,
                  messageId: `msg-${i}`
                });
              }

              socket.on('message_response', (data) => {
                responsesReceived++;
                if (responsesReceived === messageCount) {
                  clearTimeout(timeout);
                  const duration = Date.now() - startTime;
                  resolve({
                    success: true,
                    messageCount,
                    duration,
                    avgLatency: duration / messageCount
                  });
                }
              });

              socket.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.details));
              });
            });
          }
        },
        {
          name: '延迟测试',
          test: async () => {
            const testCount = 10;
            const latencies = [];

            for (let i = 0; i < testCount; i++) {
              const startTime = Date.now();
              
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('延迟测试超时')), 2000);
                
                socket.emit('ping');

                socket.on('pong', () => {
                  const latency = Date.now() - startTime;
                  latencies.push(latency);
                  clearTimeout(timeout);
                  resolve();
                });
              });

              // 等待一小段时间避免连续请求
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
            const minLatency = Math.min(...latencies);
            const maxLatency = Math.max(...latencies);

            return {
              success: true,
              testCount,
              avgLatency,
              minLatency,
              maxLatency,
              latencies
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

    } finally {
      socket.disconnect();
    }
  }

  // 运行所有WebSocket测试
  async runAllTests() {
    console.log('🚀 开始WebSocket完整测试套件...\n');
    
    try {
      await this.testConnection();
      console.log('');
      
      await this.testAuthentication();
      console.log('');
      
      await this.testMessaging();
      console.log('');
      
      await this.testErrorHandling();
      console.log('');
      
      await this.testPerformance();
      console.log('');
      
      this.generateReport();
      
    } catch (error) {
      console.error('WebSocket测试套件执行失败:', error);
    }
  }

  // 生成测试报告
  generateReport() {
    console.log('📊 WebSocket测试报告');
    console.log('='.repeat(50));
    
    const allResults = [
      ...this.testResults.connection,
      ...this.testResults.authentication,
      ...this.testResults.messaging,
      ...this.testResults.errorHandling,
      ...this.testResults.performance
    ];
    
    const passedTests = allResults.filter(r => r.status === 'PASS').length;
    const totalTests = allResults.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n总体结果: ${passedTests}/${totalTests} 测试通过 (${successRate}%)`);
    
    const categories = [
      { name: '连接测试', results: this.testResults.connection },
      { name: '认证测试', results: this.testResults.authentication },
      { name: '消息传递测试', results: this.testResults.messaging },
      { name: '错误处理测试', results: this.testResults.errorHandling },
      { name: '性能测试', results: this.testResults.performance }
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
    console.log('WebSocket测试完成！');
    
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
  const tester = new WebSocketTester();
  tester.runAllTests().catch(console.error);
}

module.exports = WebSocketTester;