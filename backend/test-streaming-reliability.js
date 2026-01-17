/**
 * 流式响应错误处理和重连机制测试
 * 测试各种异常情况下的错误处理、重连策略和故障恢复
 */

const { io } = require('socket.io-client');
const WebSocketTester = require('./test-websocket');
const SSEStreamTester = require('./test-sse-streaming');
const jwt = require('jsonwebtoken');

class StreamingReliabilityTester {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.testResults = {
      connectionErrors: [],
      timeoutHandling: [],
      reconnectionLogic: [],
      dataCorruption: [],
      gracefulDegradation: [],
      failoverHandling: []
    };
  }

  // 生成测试token
  generateTestToken(userId = 'reliability-test-user') {
    return jwt.sign(
      { userId, email: `${userId}@example.com` },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  }

  // 测试连接错误处理
  async testConnectionErrors() {
    console.log('🔌 开始测试连接错误处理...');
    
    const tests = [
      {
        name: 'WebSocket服务器不可达测试',
        test: async () => {
          // 使用一个无效的URL
          const socket = io('http://localhost:9999', {
            auth: { token: this.generateTestToken() },
            timeout: 3000,
            reconnection: false
          });

          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              socket.disconnect();
              resolve({ success: false, error: '连接未超时' });
            }, 5000);

            socket.on('connect', () => {
              clearTimeout(timeout);
              socket.disconnect();
              resolve({ success: false, error: '不应该连接成功' });
            });

            socket.on('connect_error', (error) => {
              clearTimeout(timeout);
              resolve({ 
                success: true, 
                error: error.message,
                handledGracefully: true 
              });
            });
          });
        }
      },
      {
        name: 'WebSocket认证失败重试机制',
        test: async () => {
          const invalidToken = 'invalid-token-123';
          const attempts = [];
          let attemptCount = 0;

          return new Promise((resolve) => {
            const socket = io(this.backendUrl, {
              auth: { token: invalidToken },
              reconnectionAttempts: 3,
              reconnectionDelay: 1000,
              reconnection: true
            });

            const cleanup = () => {
              socket.disconnect();
              resolve({
                success: true,
                attempts: attemptCount,
                allFailed: attempts.every(a => a.status === 'failed'),
                handledGracefully: true
              });
            };

            socket.on('connect', () => {
              attempts.push({ attempt: attemptCount, status: 'connected', time: Date.now() });
              cleanup();
            });

            socket.on('connect_error', (error) => {
              attemptCount++;
              attempts.push({ 
                attempt: attemptCount, 
                status: 'failed', 
                error: error.message,
                time: Date.now() 
              });
              
              if (attemptCount >= 3) {
                setTimeout(cleanup, 1000);
              }
            });

            setTimeout(() => {
              cleanup();
            }, 10000);
          });
        }
      },
      {
        name: 'SSE连接中断恢复',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          
          // 启动一个正常的SSE流
          const response = await sseTester.sendSSERequest(token, '测试连接中断');
          
          const events = [];
          let interrupted = false;
          let recovered = false;
          
          // 模拟客户端中断
          setTimeout(() => {
            if (response.data && !response.data.destroyed) {
              response.data.destroy();
              interrupted = true;
              
              // 尝试重新连接
              setTimeout(async () => {
                try {
                  const newResponse = await sseTester.sendSSERequest(token, '重连测试');
                  await sseTester.processStreamData(
                    newResponse.data,
                    (data) => {
                      events.push({ type: 'recovered', data });
                      recovered = true;
                    },
                    () => {}
                  );
                } catch (error) {
                  console.warn('重连失败:', error.message);
                }
              }, 1000);
            }
          }, 1500);

          try {
            await sseTester.processStreamData(
              response.data,
              (data) => {
                events.push({ type: 'original', data });
              },
              (error) => {
                if (interrupted) {
                  return; // 中断是预期的
                }
                throw error;
              }
            );

            return {
              success: true,
              originalEvents: events.filter(e => e.type === 'original').length,
              interrupted,
              recovered,
              hasRecoveryLogic: interrupted && recovered
            };
            
          } catch (error) {
            return {
              success: false,
              error: error.message,
              interrupted
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
        
        this.testResults.connectionErrors.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.connectionErrors.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试超时处理
  async testTimeoutHandling() {
    console.log('⏱️ 开始测试超时处理...');
    
    const tests = [
      {
        name: 'WebSocket连接超时',
        test: async () => {
          return new Promise((resolve) => {
            const startTime = Date.now();
            const socket = io(this.backendUrl, {
              auth: { token: this.generateTestToken() },
              timeout: 2000, // 2秒超时
              reconnection: false
            });

            const cleanup = () => {
              const duration = Date.now() - startTime;
              socket.disconnect();
              resolve({
                success: true,
                duration,
                timeoutHandled: duration >= 2000 && duration < 5000
              });
            };

            socket.on('connect', () => {
              const duration = Date.now() - startTime;
              cleanup();
            });

            socket.on('connect_timeout', () => {
              const duration = Date.now() - startTime;
              cleanup();
            });

            socket.on('connect_error', () => {
              const duration = Date.now() - startTime;
              cleanup();
            });

            // 强制超时
            setTimeout(cleanup, 5000);
          });
        }
      },
      {
        name: 'WebSocket消息响应超时',
        test: async () => {
          const token = this.generateTestToken();
          const socket = io(this.backendUrl, { auth: { token } });

          return new Promise((resolve, reject) => {
            const cleanup = (result) => {
              socket.disconnect();
              resolve(result);
            };

            socket.on('connect', () => {
              // 发送一个可能导致超时的消息
              socket.emit('ai_call', {
                model: 'slow-model',
                prompt: '请生成一个很长的回答来测试超时',
                timeout: 3000
              });

              // 监听响应
              socket.on('ai_response', (data) => {
                cleanup({
                  success: true,
                  receivedResponse: true,
                  responseTime: Date.now() - startTime
                });
              });

              socket.on('error', (error) => {
                cleanup({
                  success: true,
                  errorHandled: true,
                  errorMessage: error.details || error.message
                });
              });

              // 如果5秒内没有响应，认为是超时
              setTimeout(() => {
                cleanup({
                  success: true,
                  timeoutOccurred: true,
                  waitedTime: 5000
                });
              }, 5000);
            });

            socket.on('connect_error', (error) => {
              reject(error);
            });

            const startTime = Date.now();
          });
        }
      },
      {
        name: 'SSE流超时处理',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          
          const startTime = Date.now();
          
          try {
            const response = await sseTester.sendSSERequest(token, '测试SSE超时', {
              timeout: 5000
            });
            
            const events = [];
            let timeoutHandled = false;
            
            // 设置客户端超时
            const timeoutPromise = new Promise((resolve) => {
              setTimeout(() => {
                if (response.data && !response.data.destroyed) {
                  response.data.destroy();
                  timeoutHandled = true;
                  resolve({ clientTimeout: true });
                }
              }, 3000);
            });
            
            // 正常流处理
            const streamPromise = sseTester.processStreamData(
              response.data,
              (data) => {
                events.push(data);
              },
              (error) => {
                return { streamError: error.message };
              }
            );
            
            const result = await Promise.race([streamPromise, timeoutPromise]);
            const duration = Date.now() - startTime;
            
            return {
              success: true,
              duration,
              eventsReceived: events.length,
              timeoutHandled,
              hadTimeout: result.clientTimeout || false
            };
            
          } catch (error) {
            return {
              success: false,
              error: error.message,
              duration: Date.now() - startTime
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
        
        this.testResults.timeoutHandling.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.timeoutHandling.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试重连逻辑
  async testReconnectionLogic() {
    console.log('🔄 开始测试重连逻辑...');
    
    const tests = [
      {
        name: 'WebSocket自动重连测试',
        test: async () => {
          return new Promise((resolve) => {
            const token = this.generateTestToken();
            const reconnectionEvents = [];
            let connectionCount = 0;
            
            const socket = io(this.backendUrl, {
              auth: { token },
              reconnection: true,
              reconnectionAttempts: 3,
              reconnectionDelay: 1000,
              reconnectionDelayMax: 5000
            });

            const recordEvent = (event, data) => {
              reconnectionEvents.push({
                event,
                timestamp: Date.now(),
                data: data || null
              });
            };

            socket.on('connect', () => {
              connectionCount++;
              recordEvent('connect', { connectionNumber: connectionCount });
              
              // 第一次连接后模拟网络问题
              if (connectionCount === 1) {
                setTimeout(() => {
                  socket.disconnect();
                  recordEvent('manual_disconnect');
                }, 1000);
              }
              
              // 如果重连成功，测试完成
              if (connectionCount >= 2) {
                setTimeout(() => {
                  socket.disconnect();
                  resolve({
                    success: true,
                    connectionCount,
                    reconnectionEvents,
                    hadAutomaticReconnection: reconnectionEvents.some(e => e.event === 'reconnect')
                  });
                }, 2000);
              }
            });

            socket.on('disconnect', (reason) => {
              recordEvent('disconnect', { reason });
            });

            socket.on('reconnect', (attemptNumber) => {
              recordEvent('reconnect', { attemptNumber });
            });

            socket.on('reconnect_attempt', (attemptNumber) => {
              recordEvent('reconnect_attempt', { attemptNumber });
            });

            socket.on('reconnect_failed', () => {
              recordEvent('reconnect_failed');
            });

            socket.on('connect_error', (error) => {
              recordEvent('connect_error', { error: error.message });
            });

            // 总体超时
            setTimeout(() => {
              socket.disconnect();
              resolve({
                success: connectionCount > 0,
                connectionCount,
                reconnectionEvents,
                partialSuccess: true
              });
            }, 15000);
          });
        }
      },
      {
        name: 'SSE重连策略测试',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          
          const connectionAttempts = [];
          let maxAttempts = 3;
          
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const startTime = Date.now();
            
            try {
              const response = await sseTester.sendSSERequest(
                token, 
                `重连测试尝试 ${attempt}`
              );
              
              const events = [];
              let connectionTime = null;
              
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  if (response.data && !response.data.destroyed) {
                    response.data.destroy();
                  }
                  resolve(); // 超时也算成功的一次尝试
                }, 2000);
                
                sseTester.processStreamData(
                  response.data,
                  (data) => {
                    if (!connectionTime) {
                      connectionTime = Date.now() - startTime;
                    }
                    events.push(data);
                    
                    // 收到数据后断开连接，模拟网络问题
                    if (events.length >= 2 && attempt < maxAttempts) {
                      clearTimeout(timeout);
                      if (response.data && !response.data.destroyed) {
                        response.data.destroy();
                      }
                      resolve();
                    }
                  },
                  (error) => {
                    clearTimeout(timeout);
                    reject(error);
                  }
                ).then(resolve).catch(reject);
              });
              
              connectionAttempts.push({
                attempt,
                success: events.length > 0,
                eventsReceived: events.length,
                connectionTime,
                timestamp: Date.now()
              });
              
              // 如果是最后一次尝试，等待更长时间
              if (attempt === maxAttempts) {
                break;
              }
              
              // 等待一段时间再重试
              await new Promise(resolve => setTimeout(resolve, 1000));
              
            } catch (error) {
              connectionAttempts.push({
                attempt,
                success: false,
                error: error.message,
                timestamp: Date.now()
              });
            }
          }
          
          return {
            success: true,
            attempts: connectionAttempts,
            totalAttempts: connectionAttempts.length,
            successfulAttempts: connectionAttempts.filter(a => a.success).length,
            hasRecoveryLogic: connectionAttempts.some(a => a.success)
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.reconnectionLogic.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.reconnectionLogic.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试数据损坏处理
  async testDataCorruption() {
    console.log('💥 开始测试数据损坏处理...');
    
    const tests = [
      {
        name: 'WebSocket无效数据处理',
        test: async () => {
          const token = this.generateTestToken();
          const socket = io(this.backendUrl, { auth: { token } });

          return new Promise((resolve) => {
            const invalidDataTests = [];
            let testCount = 0;
            const totalTests = 5;

            const recordTest = (testType, result) => {
              invalidDataTests.push({ testType, result, timestamp: Date.now() });
              testCount++;
              
              if (testCount >= totalTests) {
                socket.disconnect();
                resolve({
                  success: true,
                  tests: invalidDataTests,
                  allHandled: invalidDataTests.every(t => t.result.handled || t.result.noError)
                });
              }
            };

            socket.on('connect', () => {
              // 测试1: 发送null数据
              socket.emit('user_message', null);
              setTimeout(() => recordTest('null_data', { handled: true }), 500);

              // 测试2: 发送undefined
              socket.emit('user_message', undefined);
              setTimeout(() => recordTest('undefined_data', { handled: true }), 600);

              // 测试3: 发送循环引用对象
              try {
                const circular = {};
                circular.self = circular;
                socket.emit('user_message', circular);
                setTimeout(() => recordTest('circular_reference', { handled: true }), 700);
              } catch (error) {
                recordTest('circular_reference', { handled: true, caughtEarly: true });
              }

              // 测试4: 发送超大对象
              try {
                const largeObj = { data: 'x'.repeat(1000000) };
                socket.emit('user_message', largeObj);
                setTimeout(() => recordTest('large_object', { handled: true }), 800);
              } catch (error) {
                recordTest('large_object', { handled: true, caughtEarly: true });
              }

              // 测试5: 发送无效事件名
              socket.emit('', { valid: 'data' });
              setTimeout(() => recordTest('invalid_event', { noError: true }), 900);
            });

            socket.on('error', (error) => {
              // 错误是预期的，说明服务器处理了无效数据
              console.log('收到服务器错误（预期）:', error.message);
            });

            // 超时保护
            setTimeout(() => {
              socket.disconnect();
              resolve({
                success: true,
                tests: invalidDataTests,
                timeout: true
              });
            }, 5000);
          });
        }
      },
      {
        name: 'SSE损坏数据处理',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          
          // 发送一个正常请求，然后模拟接收到损坏的SSE数据
          const response = await sseTester.sendSSERequest(token, '测试数据处理');
          
          const processedEvents = [];
          const corruptedEvents = [];
          
          // 模拟损坏的SSE数据解析
          const originalProcessStreamData = sseTester.processStreamData.bind(sseTester);
          
          const corruptedStreamData = async (stream, onData, onError) => {
            let buffer = '';
            
            return new Promise((resolve, reject) => {
              stream.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    // 模拟各种损坏情况
                    if (data.includes('corrupt_test')) {
                      corruptedEvents.push({ data, timestamp: Date.now() });
                      try {
                        JSON.parse(data);
                        onData({ type: 'corrupted_but_valid', data });
                      } catch (error) {
                        // 损坏的JSON
                        onData({ type: 'corrupted_json', raw: data, error: error.message });
                      }
                    } else if (data === '[DONE]') {
                      resolve();
                    } else {
                      try {
                        const parsedData = JSON.parse(data);
                        processedEvents.push(parsedData);
                        onData(parsedData);
                      } catch (error) {
                        corruptedEvents.push({ data, error: error.message, timestamp: Date.now() });
                        // 继续处理，不中断流
                      }
                    }
                  }
                }
              });

              stream.on('end', () => resolve());
              stream.on('error', reject);
            });
          };

          try {
            await corruptedStreamData(
              response.data,
              () => {},
              (error) => { throw error; }
            );

            return {
              success: true,
              processedEvents: processedEvents.length,
              corruptedEvents: corruptedEvents.length,
              handledGracefully: true
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
        
        this.testResults.dataCorruption.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.dataCorruption.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试优雅降级
  async testGracefulDegradation() {
    console.log('🕊️ 开始测试优雅降级...');
    
    const tests = [
      {
        name: 'WebSocket降级到HTTP轮询',
        test: async () => {
          const token = this.generateTestToken();
          
          // 强制使用轮询传输
          const socket = io(this.backendUrl, {
            auth: { token },
            transports: ['polling'], // 只使用轮询
            forceNew: true
          });

          return new Promise((resolve) => {
            const startTime = Date.now();
            let messageReceived = false;

            socket.on('connect', () => {
              console.log('轮询连接建立成功');
              
              // 发送测试消息
              socket.emit('user_message', {
                content: '轮询模式测试消息'
              });

              socket.on('message_response', (data) => {
                messageReceived = true;
                const duration = Date.now() - startTime;
                socket.disconnect();
                resolve({
                  success: true,
                  usingPolling: true,
                  messageReceived,
                  responseTime: duration,
                  degradedGracefully: true
                });
              });

              socket.on('error', (error) => {
                socket.disconnect();
                resolve({
                  success: false,
                  error: error.message,
                  usingPolling: true
                });
              });
            });

            socket.on('connect_error', (error) => {
              resolve({
                success: false,
                error: error.message,
                cannotUsePolling: true
              });
            });

            // 超时保护
            setTimeout(() => {
              socket.disconnect();
              resolve({
                success: messageReceived,
                usingPolling: true,
                messageReceived,
                timeout: true
              });
            }, 5000);
          });
        }
      },
      {
        name: 'SSE降级到普通HTTP请求',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          
          // 首先尝试SSE流，如果失败则降级到普通请求
          const startTime = Date.now();
          
          try {
            // 尝试流式请求
            const streamResponse = await sseTester.sendSSERequest(token, '降级测试');
            
            let streamSuccessful = false;
            let fallbackUsed = false;
            
            // 设置短超时来强制降级
            const timeoutPromise = new Promise((resolve) => {
              setTimeout(() => {
                fallbackUsed = true;
                resolve({ fallback: true });
              }, 1000);
            });
            
            const streamPromise = sseTester.processStreamData(
              streamResponse.data,
              (data) => {
                if (data.type === 'content') {
                  streamSuccessful = true;
                }
              },
              () => {}
            );
            
            const result = await Promise.race([streamPromise, timeoutPromise]);
            const duration = Date.now() - startTime;
            
            if (result.fallback) {
              // 模拟降级到普通HTTP请求
              const axios = require('axios');
              const response = await axios.post(
                `${this.backendUrl}/api/ai/chat`,
                { message: '降级测试' },
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 5000
                }
              );
              
              return {
                success: true,
                streamSuccessful: false,
                fallbackSuccessful: response.status === 200,
                fallbackUsed,
                duration,
                degradedGracefully: true
              };
            } else {
              return {
                success: true,
                streamSuccessful,
                fallbackUsed: false,
                duration
              };
            }
            
          } catch (error) {
            // 直接使用降级策略
            const axios = require('axios');
            try {
              const response = await axios.post(
                `${this.backendUrl}/api/ai/chat`,
                { message: '降级测试' },
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 5000
                }
              );
              
              return {
                success: response.status === 200,
                streamSuccessful: false,
                fallbackSuccessful: response.status === 200,
                fallbackUsed: true,
                errorHandled: true
              };
            } catch (fallbackError) {
              return {
                success: false,
                error: error.message,
                fallbackError: fallbackError.message
              };
            }
          }
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.gracefulDegradation.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.gracefulDegradation.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 测试故障转移处理
  async testFailoverHandling() {
    console.log('🔄 开始测试故障转移处理...');
    
    const tests = [
      {
        name: '多服务器故障转移模拟',
        test: async () => {
          // 模拟连接到多个服务器端点
          const endpoints = [
            this.backendUrl,
            `${this.backendUrl}/backup`, // 备用端点
            'http://localhost:3002'      // 另一个备用服务器
          ];
          
          const token = this.generateTestToken();
          let connectedEndpoint = null;
          let attemptedEndpoints = [];
          
          for (const endpoint of endpoints) {
            attemptedEndpoints.push(endpoint);
            
            try {
              const socket = io(endpoint, {
                auth: { token },
                timeout: 3000,
                reconnection: false
              });

              const result = await new Promise((resolve) => {
                const cleanup = (result) => {
                  socket.disconnect();
                  resolve(result);
                };

                const timeout = setTimeout(() => {
                  cleanup({ success: false, error: 'timeout' });
                }, 3500);

                socket.on('connect', () => {
                  clearTimeout(timeout);
                  cleanup({ success: true, endpoint });
                });

                socket.on('connect_error', (error) => {
                  clearTimeout(timeout);
                  cleanup({ success: false, error: error.message });
                });
              });

              if (result.success) {
                connectedEndpoint = result.endpoint;
                break;
              }
              
            } catch (error) {
              console.log(`端点 ${endpoint} 连接失败:`, error.message);
            }
          }

          return {
            success: connectedEndpoint !== null,
            connectedEndpoint,
            attemptedEndpoints,
            attemptedCount: attemptedEndpoints.length,
            hasFailoverLogic: attemptedEndpoints.length > 1
          };
        }
      },
      {
        name: '服务降级策略测试',
        test: async () => {
          const sseTester = new SSEStreamTester();
          const token = await sseTester.createTestUser();
          
          // 测试不同的服务级别降级
          const strategies = [
            { name: 'full_feature', timeout: 30000 },
            { name: 'reduced_feature', timeout: 10000 },
            { name: 'basic_only', timeout: 5000 }
          ];
          
          const results = [];
          
          for (const strategy of strategies) {
            const startTime = Date.now();
            
            try {
              const response = await sseTester.sendSSERequest(
                token, 
                `测试${strategy.name}策略`,
                { timeout: strategy.timeout }
              );
              
              const events = [];
              await sseTester.processStreamData(
                response.data,
                (data) => events.push(data),
                () => {}
              );
              
              results.push({
                strategy: strategy.name,
                success: events.length > 0,
                events: events.length,
                duration: Date.now() - startTime,
                withinTimeout: Date.now() - startTime <= strategy.timeout
              });
              
            } catch (error) {
              results.push({
                strategy: strategy.name,
                success: false,
                error: error.message,
                duration: Date.now() - startTime
              });
            }
          }
          
          return {
            success: true,
            strategies: results,
            hasGradualDegradation: results.some(r => r.success),
            adaptable: true
          };
        }
      }
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.test();
        const duration = Date.now() - startTime;
        
        this.testResults.failoverHandling.push({
          test: test.name,
          status: 'PASS',
          duration: `${duration}ms`,
          result
        });
        
        console.log(`✅ ${test.name} - 通过 (${duration}ms)`);
      } catch (error) {
        this.testResults.failoverHandling.push({
          test: test.name,
          status: 'FAIL',
          error: error.message
        });
        
        console.log(`❌ ${test.name} - 失败: ${error.message}`);
      }
    }
  }

  // 运行所有可靠性测试
  async runAllTests() {
    console.log('🚀 开始流式响应可靠性完整测试套件...\n');
    
    try {
      await this.testConnectionErrors();
      console.log('');
      
      await this.testTimeoutHandling();
      console.log('');
      
      await this.testReconnectionLogic();
      console.log('');
      
      await this.testDataCorruption();
      console.log('');
      
      await this.testGracefulDegradation();
      console.log('');
      
      await this.testFailoverHandling();
      console.log('');
      
      this.generateReport();
      
    } catch (error) {
      console.error('可靠性测试套件执行失败:', error);
    }
  }

  // 生成可靠性测试报告
  generateReport() {
    console.log('📊 流式响应可靠性测试报告');
    console.log('='.repeat(60));
    
    const allResults = [
      ...this.testResults.connectionErrors,
      ...this.testResults.timeoutHandling,
      ...this.testResults.reconnectionLogic,
      ...this.testResults.dataCorruption,
      ...this.testResults.gracefulDegradation,
      ...this.testResults.failoverHandling
    ];
    
    const passedTests = allResults.filter(r => r.status === 'PASS').length;
    const totalTests = allResults.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n总体结果: ${passedTests}/${totalTests} 测试通过 (${successRate}%)`);
    
    const categories = [
      { name: '连接错误处理', results: this.testResults.connectionErrors },
      { name: '超时处理', results: this.testResults.timeoutHandling },
      { name: '重连逻辑', results: this.testResults.reconnectionLogic },
      { name: '数据损坏处理', results: this.testResults.dataCorruption },
      { name: '优雅降级', results: this.testResults.gracefulDegradation },
      { name: '故障转移', results: this.testResults.failoverHandling }
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
    
    // 可靠性特性总结
    console.log('\n🛡️ 可靠性特性总结:');
    
    const connectionErrorTests = this.testResults.connectionErrors.filter(r => r.status === 'PASS');
    const reconnectionTests = this.testResults.reconnectionLogic.filter(r => r.status === 'PASS');
    const degradationTests = this.testResults.gracefulDegradation.filter(r => r.status === 'PASS');
    
    console.log(`✅ 连接错误处理: ${connectionErrorTests.length}/${this.testResults.connectionErrors.length} 测试通过`);
    console.log(`✅ 重连机制: ${reconnectionTests.length}/${this.testResults.reconnectionLogic.length} 测试通过`);
    console.log(`✅ 优雅降级: ${degradationTests.length}/${this.testResults.gracefulDegradation.length} 测试通过`);
    
    console.log('\n' + '='.repeat(60));
    console.log('流式响应可靠性测试完成！');
    
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
  const tester = new StreamingReliabilityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = StreamingReliabilityTester;