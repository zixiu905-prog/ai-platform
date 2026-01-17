/**
 * 流式响应性能和稳定性综合测试
 * 包含负载测试、压力测试、长时间运行测试等
 */

const WebSocketTester = require('./test-websocket');
const SSEStreamTester = require('./test-sse-streaming');
const { performance } = require('perf_hooks');

class StreamingPerformanceTester {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.testResults = {
      loadTest: [],
      stressTest: [],
      enduranceTest: [],
      resourceTest: [],
      stabilityTest: []
    };
  }

  // 负载测试 - 模拟正常负载下的性能
  async testLoad() {
    console.log('📈 开始负载测试...');
    
    const tests = [
      {
        name: 'WebSocket并发连接负载测试',
        test: async () => {
          const wsTester = new WebSocketTester();
          const concurrentConnections = [10, 25, 50];
          const results = [];
          
          for (const count of concurrentConnections) {
            const startTime = performance.now();
            const connections = [];
            
            // 创建并发连接
            for (let i = 0; i < count; i++) {
              const token = wsTester.generateTestToken(`load-user-${i}`);
              const { io } = require('socket.io-client');
              const socket = io(this.backendUrl, {
                auth: { token },
                transports: ['websocket']
              });
              
              connections.push(new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('连接超时')), 5000);
                
                socket.on('connect', () => {
                  clearTimeout(timeout);
                  resolve({ socketId: socket.id, connected: true });
                });
                
                socket.on('connect_error', (error) => {
                  clearTimeout(timeout);
                  reject(error);
                });
              }));
            }
            
            try {
              const connectionResults = await Promise.all(connections);
              const connectionTime = performance.now() - startTime;
              
              // 测试消息传递
              const messageStartTime = performance.now();
              const messagePromises = connectionResults.map(result => {
                return new Promise((resolve) => {
                  const socket = connections.find(c => c.socketId === result.socketId);
                  if (socket) {
                    socket.on('message_response', () => resolve(true));
                    socket.emit('user_message', { content: '负载测试消息' });
                  }
                });
              });
              
              await Promise.all(messagePromises);
              const messageTime = performance.now() - messageStartTime;
              
              results.push({
                connectionCount: count,
                connectionTime: connectionTime.toFixed(2),
                messageTime: messageTime.toFixed(2),
                avgConnectionTime: (connectionTime / count).toFixed(2),
                successRate: 100
              });
              
              // 清理连接
              connections.forEach(socket => {
                if (socket && socket.disconnect) {
                  socket.disconnect();
                }
              });
              
            } catch (error) {
              results.push({
                connectionCount: count,
                error: error.message,
                successRate: 0
              });
            }
          }
          
          return {
            success: true,
            results,
            maxConnections: Math.max(...results.filter(r => r.successRate > 0).map(r => r.connectionCount))
          };
        }
      },
      {
        name: 'SSE并发流负载测试',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          const concurrentStreams = [5, 10, 20];
          const results = [];
          
          for (const count of concurrentStreams) {
            const startTime = performance.now();
            const streams = [];
            
            for (let i = 0; i < count; i++) {
              const streamPromise = sseTester.sendSSERequest(
                token, 
                `负载测试消息 ${i + 1}`
              );
              streams.push(streamPromise);
            }
            
            try {
              const responses = await Promise.all(streams);
              const connectionTime = performance.now() - startTime;
              
              // 处理所有流
              const streamStartTime = performance.now();
              const processPromises = responses.map(response => {
                return sseTester.processStreamData(
                  response.data,
                  () => {},
                  (error) => { throw error; }
                );
              });
              
              await Promise.all(processPromises);
              const streamTime = performance.now() - streamStartTime;
              
              results.push({
                streamCount: count,
                connectionTime: connectionTime.toFixed(2),
                streamTime: streamTime.toFixed(2),
                avgStreamTime: (streamTime / count).toFixed(2),
                totalTime: (connectionTime + streamTime).toFixed(2),
                successRate: 100
              });
              
            } catch (error) {
              results.push({
                streamCount: count,
                error: error.message,
                successRate: 0
              });
            }
          }
          
          return {
            success: true,
            results,
            maxConcurrentStreams: Math.max(...results.filter(r => r.successRate > 0).map(r => r.streamCount))
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.loadTest.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.loadTest.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 压力测试 - 测试系统在极限条件下的表现
  async testStress() {
    console.log('💪 开始压力测试...');
    
    const tests = [
      {
        name: 'WebSocket极限连接测试',
        test: async () => {
          const wsTester = new WebSocketTester();
          const maxConnections = 100;
          const connections = [];
          let successfulConnections = 0;
          
          const startTime = performance.now();
          
          // 尝试建立大量连接
          for (let i = 0; i < maxConnections; i++) {
            const token = wsTester.generateTestToken(`stress-user-${i}`);
            const { io } = require('socket.io-client');
            const socket = io(this.backendUrl, {
              auth: { token },
              transports: ['websocket'],
              timeout: 3000
            });
            
            connections.push(new Promise((resolve) => {
              const timeout = setTimeout(() => {
                resolve({ success: false, error: 'timeout' });
              }, 3000);
              
              socket.on('connect', () => {
                clearTimeout(timeout);
                successfulConnections++;
                resolve({ success: true, socketId: socket.id });
              });
              
              socket.on('connect_error', () => {
                clearTimeout(timeout);
                resolve({ success: false, error: 'connection_failed' });
              });
            }));
          }
          
          const results = await Promise.all(connections);
          const connectionTime = performance.now() - startTime;
          
          // 清理连接
          setTimeout(() => {
            connections.forEach(conn => {
              if (conn.socket && conn.socket.disconnect) {
                conn.socket.disconnect();
              }
            });
          }, 1000);
          
          return {
            success: true,
            maxConnections,
            successfulConnections,
            successRate: ((successfulConnections / maxConnections) * 100).toFixed(2),
            connectionTime: connectionTime.toFixed(2),
            avgConnectionTime: (connectionTime / maxConnections).toFixed(2)
          };
        }
      },
      {
        name: 'SSE高频请求测试',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          const requestCount = 50;
          const requests = [];
          
          const startTime = performance.now();
          
          // 快速连续发送请求
          for (let i = 0; i < requestCount; i++) {
            const request = sseTester.sendSSERequest(token, `高频测试消息 ${i + 1}`);
            requests.push(request);
          }
          
          try {
            const responses = await Promise.allSettled(requests);
            const requestTime = performance.now() - startTime;
            
            const successful = responses.filter(r => r.status === 'fulfilled').length;
            const failed = responses.filter(r => r.status === 'rejected').length;
            
            // 处理成功的响应
            const processStartTime = performance.now();
            const processPromises = responses
              .filter(r => r.status === 'fulfilled')
              .map(r => {
                return sseTester.processStreamData(
                  r.value.data,
                  () => {},
                  (error) => { console.warn('流处理错误:', error.message); }
                );
              });
            
            await Promise.allSettled(processPromises);
            const processTime = performance.now() - processStartTime;
            
            return {
              success: true,
              requestCount,
              successful,
              failed,
              successRate: ((successful / requestCount) * 100).toFixed(2),
              requestTime: requestTime.toFixed(2),
              processTime: processTime.toFixed(2),
              totalTime: (requestTime + processTime).toFixed(2)
            };
            
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.stressTest.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.stressTest.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 耐久性测试 - 长时间运行测试
  async testEndurance() {
    console.log('⏰ 开始耐久性测试...');
    
    const tests = [
      {
        name: 'WebSocket长连接测试',
        test: async () => {
          const wsTester = new WebSocketTester();
          const token = wsTester.generateTestToken('endurance-user');
          const { io } = require('socket.io-client');
          const socket = io(this.backendUrl, {
            auth: { token },
            transports: ['websocket']
          });
          
          return new Promise((resolve, reject) => {
            const testDuration = 60000; // 1分钟
            const pingInterval = 5000; // 每5秒ping一次
            const startTime = performance.now();
            let pingCount = 0;
            let pongCount = 0;
            let latencySum = 0;
            
            const connectTimeout = setTimeout(() => {
              reject(new Error('连接超时'));
            }, 10000);
            
            socket.on('connect', () => {
              clearTimeout(connectTimeout);
              console.log('耐久性测试连接建立');
              
              // 定期发送ping
              const pingTimer = setInterval(() => {
                const pingStartTime = performance.now();
                socket.emit('ping', { timestamp: pingStartTime });
                pingCount++;
              }, pingInterval);
              
              // 监听pong响应
              socket.on('pong', (data) => {
                pongCount++;
                if (data.timestamp) {
                  const latency = performance.now() - data.timestamp;
                  latencySum += latency;
                }
              });
              
              // 测试结束
              setTimeout(() => {
                clearInterval(pingTimer);
                const totalTime = performance.now() - startTime;
                const avgLatency = pongCount > 0 ? (latencySum / pongCount).toFixed(2) : 0;
                
                socket.disconnect();
                
                resolve({
                  success: true,
                  duration: totalTime.toFixed(2),
                  pingCount,
                  pongCount,
                  pongSuccessRate: ((pongCount / pingCount) * 100).toFixed(2),
                  avgLatency
                });
              }, testDuration);
            });
            
            socket.on('disconnect', () => {
              console.warn('耐久性测试连接意外断开');
            });
            
            socket.on('connect_error', (error) => {
              clearTimeout(connectTimeout);
              reject(error);
            });
          });
        }
      },
      {
        name: 'SSE持续流测试',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          const streamDuration = 30000; // 30秒
          
          const startTime = performance.now();
          const response = await sseTester.sendSSERequest(
            token, 
            '请生成一个较长且详细的内容，用于耐久性测试'
          );
          
          const events = [];
          let totalContent = '';
          let firstChunkTime = null;
          let lastChunkTime = null;
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              resolve();
            }, streamDuration + 10000); // 额外10秒缓冲
            
            const streamData = (data) => {
              const now = performance.now();
              
              if (!firstChunkTime && data.type === 'content') {
                firstChunkTime = now;
              }
              
              if (data.type === 'content') {
                lastChunkTime = now;
                if (data.data.chunk) {
                  totalContent += data.data.chunk;
                }
              }
              
              events.push({ type: data.type, timestamp: now });
              
              if (data.type === 'complete') {
                clearTimeout(timeout);
                resolve();
              }
            };
            
            sseTester.processStreamData(
              response.data,
              streamData,
              (error) => {
                clearTimeout(timeout);
                reject(error);
              }
            );
          });
          
          const totalTime = performance.now() - startTime;
          const streamingTime = lastChunkTime && firstChunkTime ? 
            (lastChunkTime - firstChunkTime).toFixed(2) : 0;
          
          return {
            success: true,
            totalTime: totalTime.toFixed(2),
            streamingTime,
            eventCount: events.length,
            contentLength: totalContent.length,
            eventRate: (events.length / (totalTime / 1000)).toFixed(2)
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.enduranceTest.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.enduranceTest.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 资源使用测试
  async testResources() {
    console.log('🖥️ 开始资源使用测试...');
    
    const tests = [
      {
        name: '内存使用监控测试',
        test: async () => {
          const initialMemory = process.memoryUsage();
          const wsTester = new WebSocketTester();
          const connections = [];
          
          // 创建多个连接
          for (let i = 0; i < 20; i++) {
            const token = wsTester.generateTestToken(`memory-test-${i}`);
            const { io } = require('socket.io-client');
            const socket = io(this.backendUrl, { auth: { token } });
            
            connections.push(new Promise((resolve) => {
              socket.on('connect', () => resolve(socket));
              socket.on('connect_error', () => resolve(null));
            }));
          }
          
          const sockets = (await Promise.all(connections)).filter(s => s !== null);
          const afterConnectionsMemory = process.memoryUsage();
          
          // 发送一些消息
          const messagePromises = sockets.map(socket => {
            return new Promise((resolve) => {
              socket.on('message_response', () => resolve());
              socket.emit('user_message', { content: '内存测试消息' });
            });
          });
          
          await Promise.all(messagePromises);
          const afterMessagesMemory = process.memoryUsage();
          
          // 清理连接
          sockets.forEach(socket => socket.disconnect());
          
          // 等待垃圾回收
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (global.gc) {
            global.gc();
          }
          
          const finalMemory = process.memoryUsage();
          
          return {
            success: true,
            connectionsCreated: sockets.length,
            initialMemory: {
              rss: (initialMemory.rss / 1024 / 1024).toFixed(2) + 'MB',
              heapUsed: (initialMemory.heapUsed / 1024 / 1024).toFixed(2) + 'MB'
            },
            afterConnectionsMemory: {
              rss: (afterConnectionsMemory.rss / 1024 / 1024).toFixed(2) + 'MB',
              heapUsed: (afterConnectionsMemory.heapUsed / 1024 / 1024).toFixed(2) + 'MB'
            },
            afterMessagesMemory: {
              rss: (afterMessagesMemory.rss / 1024 / 1024).toFixed(2) + 'MB',
              heapUsed: (afterMessagesMemory.heapUsed / 1024 / 1024).toFixed(2) + 'MB'
            },
            finalMemory: {
              rss: (finalMemory.rss / 1024 / 1024).toFixed(2) + 'MB',
              heapUsed: (finalMemory.heapUsed / 1024 / 1024).toFixed(2) + 'MB'
            },
            memoryIncrease: ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2) + 'MB'
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.resourceTest.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.resourceTest.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 稳定性测试
  async testStability() {
    console.log('🔧 开始稳定性测试...');
    
    const tests = [
      {
        name: '异常情况恢复测试',
        test: async () => {
          const wsTester = new WebSocketTester();
          const token = wsTester.generateTestToken('stability-user');
          const { io } = require('socket.io-client');
          
          const recoveryTests = [];
          
          // 测试1: 网络中断恢复
          recoveryTests.push(
            new Promise(async (resolve) => {
              const socket = io(this.backendUrl, { auth: { token } });
              
              await new Promise(r => {
                socket.on('connect', r);
                socket.on('connect_error', () => r());
              });
              
              // 模拟网络中断
              socket.disconnect();
              
              // 等待一段时间后重连
              setTimeout(async () => {
                const newSocket = io(this.backendUrl, { auth: { token } });
                
                await new Promise(r => {
                  newSocket.on('connect', () => {
                    newSocket.disconnect();
                    resolve({ test: 'network_recovery', success: true });
                  });
                  newSocket.on('connect_error', () => {
                    resolve({ test: 'network_recovery', success: false });
                  });
                });
              }, 1000);
            })
          );
          
          // 测试2: 无效数据处理
          recoveryTests.push(
            new Promise(async (resolve) => {
              const socket = io(this.backendUrl, { auth: { token } });
              
              await new Promise(r => {
                socket.on('connect', r);
                socket.on('connect_error', () => r());
              });
              
              // 发送各种无效数据
              socket.emit('invalid_event', null);
              socket.emit('user_message', {});
              socket.emit('ai_call', { invalid: 'data' });
              
              // 等待看连接是否还存活
              setTimeout(() => {
                socket.emit('ping');
                socket.on('pong', () => {
                  socket.disconnect();
                  resolve({ test: 'invalid_data_recovery', success: true });
                });
                
                setTimeout(() => {
                  socket.disconnect();
                  resolve({ test: 'invalid_data_recovery', success: false });
                }, 2000);
              }, 1000);
            })
          );
          
          const results = await Promise.all(recoveryTests);
          
          return {
            success: true,
            results,
            allRecovered: results.every(r => r.success)
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.stabilityTest.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.stabilityTest.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 运行所有性能和稳定性测试
  async runAllTests() {
    console.log('🚀 开始流式响应性能和稳定性完整测试套件...\n');
    
    try {
      await this.testLoad();
      console.log('');
      
      await this.testStress();
      console.log('');
      
      await this.testEndurance();
      console.log('');
      
      await this.testResources();
      console.log('');
      
      await this.testStability();
      console.log('');
      
      this.generateReport();
      
    } catch (error) {
      console.error('性能和稳定性测试套件执行失败:', error);
    }
  }

  // 生成详细测试报告
  generateReport() {
    console.log('📊 流式响应性能和稳定性测试报告');
    console.log('='.repeat(60));
    
    const allResults = [
      ...this.testResults.loadTest,
      ...this.testResults.stressTest,
      ...this.testResults.enduranceTest,
      ...this.testResults.resourceTest,
      ...this.testResults.stabilityTest
    ];
    
    const passedTests = allResults.filter(r => r.status === 'PASS').length;
    const totalTests = allResults.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n总体结果: ${passedTests}/${totalTests} 测试通过 (${successRate}%)`);
    
    const categories = [
      { name: '负载测试', results: this.testResults.loadTest },
      { name: '压力测试', results: this.testResults.stressTest },
      { name: '耐久性测试', results: this.testResults.enduranceTest },
      { name: '资源测试', results: this.testResults.resourceTest },
      { name: '稳定性测试', results: this.testResults.stabilityTest }
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
    
    // 性能总结
    console.log('\n📈 性能指标总结:');
    this.testResults.loadTest.forEach(result => {
      if (result.result && result.result.results) {
        console.log(`\n${result.test}:`);
        result.result.results.forEach(metric => {
          console.log(`  - ${metric.connectionCount || metric.streamCount} 个${metric.connectionCount ? '连接' : '流'}: ${metric.avgConnectionTime || metric.avgStreamTime}ms 平均时间`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('流式响应性能和稳定性测试完成！');
    
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
  const tester = new StreamingPerformanceTester();
  tester.runAllTests().catch(console.error);
}

module.exports = StreamingPerformanceTester;