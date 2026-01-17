#!/usr/bin/env node
/**
 * AI设计平台压力测试脚本
 * 使用Apache Bench (ab) 和自定义测试进行负载测试
 */

const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置参数
const CONFIG = {
  baseURL: process.env.TEST_URL || 'https://localhost',
  apiBase: process.env.API_URL || 'https://localhost/api',
  wsURL: process.env.WS_URL || 'wss://localhost',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 100,
  duration: parseInt(process.env.TEST_DURATION) || 60, // 秒
  requestsPerSecond: parseInt(process.env.RPS) || 10,
  testTypes: process.env.TEST_TYPES ? process.env.TEST_TYPES.split(',') : ['http', 'websocket', 'ai']
};

// 测试结果收集
const results = {
  startTime: null,
  endTime: null,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  errors: [],
  responseTimeSum: 0,
  responseTimeMin: Infinity,
  responseTimeMax: 0,
  responseTimes: [],
  concurrentConnections: 0,
  memoryUsage: [],
  cpuUsage: []
};

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${timestamp} - ${message}`);
}

// HTTP请求工具
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          dataSize: data.length,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.data) {
      req.write(options.data);
    }
    req.end();
  });
}

// HTTP负载测试
async function runHTTPLoadTest() {
  log('info', '开始HTTP负载测试...');
  
  const endpoints = [
    { path: '/health', method: 'GET', weight: 40 },
    { path: '/ai/models', method: 'GET', weight: 20 },
    { path: '/user/profile', method: 'GET', weight: 15 },
    { path: '/ai/conversations', method: 'GET', weight: 15 },
    { path: '/software', method: 'GET', weight: 10 }
  ];

  const testPromises = [];
  
  for (let i = 0; i < CONFIG.concurrentUsers; i++) {
    const userTest = runUserHTTPTest(endpoints);
    testPromises.push(userTest);
  }

  await Promise.all(testPromises);
  log('info', 'HTTP负载测试完成');
}

async function runUserHTTPTest(endpoints) {
  const endTime = Date.now() + CONFIG.duration * 1000;
  
  while (Date.now() < endTime) {
    try {
      // 根据权重选择端点
      const endpoint = selectWeightedEndpoint(endpoints);
      const url = `${CONFIG.apiBase}${endpoint.path}`;
      
      const options = {
        method: endpoint.method,
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        }
      };

      if (endpoint.method === 'POST' && endpoint.body) {
        options.data = JSON.stringify(endpoint.body);
      }

      const response = await makeRequest(url, options);
      
      results.totalRequests++;
      if (response.statusCode >= 200 && response.statusCode < 400) {
        results.successfulRequests++;
        results.responseTimeSum += response.responseTime;
        results.responseTimeMin = Math.min(results.responseTimeMin, response.responseTime);
        results.responseTimeMax = Math.max(results.responseTimeMax, response.responseTime);
        results.responseTimes.push(response.responseTime);
      } else {
        results.failedRequests++;
        results.errors.push({
          type: 'HTTP_ERROR',
          statusCode: response.statusCode,
          url: endpoint.path,
          time: new Date().toISOString()
        });
      }
      
      // 控制请求频率
      await sleep(1000 / CONFIG.requestsPerSecond);
      
    } catch (error) {
      results.totalRequests++;
      results.failedRequests++;
      results.errors.push({
        type: 'NETWORK_ERROR',
        message: error.message,
        time: new Date().toISOString()
      });
    }
  }
}

function selectWeightedEndpoint(endpoints) {
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }
  
  return endpoints[0];
}

// WebSocket连接测试
async function runWebSocketLoadTest() {
  log('info', '开始WebSocket负载测试...');
  
  const connections = [];
  
  for (let i = 0; i < CONFIG.concurrentUsers / 10; i++) { // WebSocket通常用户数较少
    try {
      const ws = new WebSocket(CONFIG.wsURL);
      
      ws.on('open', () => {
        connections.push(ws);
        results.concurrentConnections++;
        
        // 模拟消息发送
        const messageInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
          }
        }, 10000); // 每10秒发送一次消息
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'pong') {
            // 计算响应时间
            const responseTime = Date.now() - message.timestamp;
            results.responseTimes.push(responseTime);
          }
        } catch (error) {
          // 忽略解析错误
        }
      });
      
      ws.on('error', (error) => {
        results.errors.push({
          type: 'WEBSOCKET_ERROR',
          message: error.message,
          time: new Date().toISOString()
        });
        results.concurrentConnections--;
      });
      
      ws.on('close', () => {
        results.concurrentConnections--;
      });
      
    } catch (error) {
      results.errors.push({
        type: 'WEBSOCKET_CONNECTION_ERROR',
        message: error.message,
        time: new Date().toISOString()
      });
    }
  }
  
  // 等待测试完成
  await sleep(CONFIG.duration * 1000);
  
  // 关闭所有连接
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  log('info', 'WebSocket负载测试完成');
}

// AI API专项测试
async function runAILoadTest() {
  log('info', '开始AI API负载测试...');
  
  const aiEndpoints = [
    { 
      path: '/ai/chat', 
      method: 'POST',
      body: {
        message: '你好，请简单介绍一下你自己',
        model: 'gpt-4'
      },
      weight: 50
    },
    {
      path: '/ai/chat',
      method: 'POST',
      body: {
        message: '帮我设计一个简单的logo',
        model: 'zhipu-glm'
      },
      weight: 30
    },
    {
      path: '/ai/models',
      method: 'GET',
      weight: 20
    }
  ];

  const testPromises = [];
  
  // AI API通常并发数较低
  for (let i = 0; i < Math.min(CONFIG.concurrentUsers / 5, 20); i++) {
    const userTest = runUserHTTPTest(aiEndpoints);
    testPromises.push(userTest);
  }

  await Promise.all(testPromises);
  log('info', 'AI API负载测试完成');
}

// 系统资源监控
function startSystemMonitoring() {
  log('info', '开始系统资源监控...');
  
  const monitorInterval = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    results.memoryUsage.push({
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      timestamp: Date.now()
    });
    
    results.cpuUsage.push({
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: Date.now()
    });
  }, 1000); // 每秒记录一次
  
  return () => {
    clearInterval(monitorInterval);
  };
}

// Apache Bench集成测试
function runApacheBenchTest() {
  return new Promise((resolve, reject) => {
    log('info', '运行Apache Bench测试...');
    
    const abCommand = `ab -n ${CONFIG.concurrentUsers * 10} -c ${CONFIG.concurrentUsers} "${CONFIG.baseURL}/health"`;
    
    const ab = spawn('ab', ['-n', CONFIG.concurrentUsers * 10, '-c', CONFIG.concurrentUsers, CONFIG.baseURL + '/health']);
    
    let output = '';
    
    ab.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ab.stderr.on('data', (data) => {
      log('error', `Apache Bench error: ${data.toString()}`);
    });
    
    ab.on('close', (code) => {
      if (code === 0) {
        log('info', 'Apache Bench测试完成');
        // 解析ab输出
        const abResults = parseApacheBenchOutput(output);
        results.apacheBench = abResults;
      } else {
        log('error', `Apache Bench exited with code ${code}`);
      }
      resolve();
    });
  });
}

function parseApacheBenchOutput(output) {
  const lines = output.split('\n');
  const results = {};
  
  lines.forEach(line => {
    if (line.includes('Server Software:')) {
      results.serverSoftware = line.split(':')[1].trim();
    } else if (line.includes('Server Hostname:')) {
      results.serverHostname = line.split(':')[1].trim();
    } else if (line.includes('Server Port:')) {
      results.serverPort = line.split(':')[1].trim();
    } else if (line.includes('Document Path:')) {
      results.documentPath = line.split(':')[1].trim();
    } else if (line.includes('Concurrency Level:')) {
      results.concurrencyLevel = parseInt(line.split(':')[1].trim());
    } else if (line.includes('Time taken for tests:')) {
      results.timeTaken = parseFloat(line.split(':')[1].trim().split(' ')[0]);
    } else if (line.includes('Complete requests:')) {
      results.completeRequests = parseInt(line.split(':')[1].trim());
    } else if (line.includes('Failed requests:')) {
      results.failedRequests = parseInt(line.split(':')[1].trim());
    } else if (line.includes('Requests per second:')) {
      results.requestsPerSecond = parseFloat(line.split(':')[1].trim().split(' ')[0]);
    } else if (line.includes('Time per request:')) {
      results.timePerRequest = parseFloat(line.split(':')[1].trim().split(' ')[0]);
    }
  });
  
  return results;
}

// 性能基准测试
async function runPerformanceBenchmarks() {
  log('info', '运行性能基准测试...');
  
  const benchmarks = [
    { name: 'Simple API Call', test: () => makeRequest(`${CONFIG.apiBase}/health`) },
    { name: 'Complex API Call', test: () => makeRequest(`${CONFIG.apiBase}/ai/models`) },
    { name: 'User Profile API', test: () => makeRequest(`${CONFIG.apiBase}/user/profile`) }
  ];
  
  const benchmarkResults = {};
  
  for (const benchmark of benchmarks) {
    const times = [];
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      try {
        await benchmark.test();
        times.push(Date.now() - startTime);
      } catch (error) {
        // 忽略错误，继续测试
      }
    }
    
    if (times.length > 0) {
      benchmarkResults[benchmark.name] = {
        iterations: times.length,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: calculatePercentile(times, 95),
        p99: calculatePercentile(times, 99)
      };
    }
  }
  
  results.benchmarks = benchmarkResults;
  log('info', '性能基准测试完成');
}

function calculatePercentile(values, percentile) {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// 生成测试报告
function generateReport() {
  log('info', '生成测试报告...');
  
  const report = {
    testConfiguration: CONFIG,
    testSummary: {
      startTime: results.startTime,
      endTime: results.endTime,
      duration: results.endTime - results.startTime,
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      successRate: ((results.successfulRequests / results.totalRequests) * 100).toFixed(2) + '%',
      averageResponseTime: results.responseTimes.length > 0 ? 
        (results.responseTimeSum / results.responseTimes.length).toFixed(2) + 'ms' : 'N/A',
      minResponseTime: results.responseTimeMin === Infinity ? 'N/A' : results.responseTimeMin + 'ms',
      maxResponseTime: results.responseTimeMax + 'ms',
      concurrentConnections: results.concurrentConnections
    },
    performanceMetrics: {
      requestsPerSecond: results.totalRequests / ((results.endTime - results.startTime) / 1000),
      errorRate: ((results.failedRequests / results.totalRequests) * 100).toFixed(2) + '%',
      p95ResponseTime: calculatePercentile(results.responseTimes, 95),
      p99ResponseTime: calculatePercentile(results.responseTimes, 99)
    },
    errors: results.errors.slice(0, 50), // 只保留前50个错误
    systemResources: {
      peakMemoryUsage: Math.max(...results.memoryUsage.map(m => m.heapUsed)),
      averageMemoryUsage: results.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / results.memoryUsage.length
    },
    apacheBenchResults: results.apacheBench,
    benchmarkResults: results.benchmarks
  };
  
  // 保存JSON报告
  const reportPath = path.join(__dirname, `stress-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 生成HTML报告
  const htmlReport = generateHTMLReport(report);
  const htmlReportPath = path.join(__dirname, `stress-test-report-${Date.now()}.html`);
  fs.writeFileSync(htmlReportPath, htmlReport);
  
  log('info', `测试报告已保存: ${reportPath}`);
  log('info', `HTML报告已保存: ${htmlReportPath}`);
  
  return report;
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI设计平台压力测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #007bff; margin-top: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { font-size: 14px; color: #666; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
        .error-list { max-height: 300px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 4px; }
        .error-item { margin: 5px 0; padding: 8px; background: #fff; border-left: 3px solid #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>AI设计平台压力测试报告</h1>
        <p>测试时间: ${new Date(report.testSummary.startTime).toLocaleString()} - ${new Date(report.testSummary.endTime).toLocaleString()}</p>
        <p>测试持续时间: ${(report.testSummary.duration / 1000).toFixed(2)} 秒</p>
        
        <h2>测试概览</h2>
        <div class="metric success">
            <div class="metric-value">${report.testSummary.totalRequests}</div>
            <div class="metric-label">总请求数</div>
        </div>
        <div class="metric success">
            <div class="metric-value">${report.testSummary.successRate}</div>
            <div class="metric-label">成功率</div>
        </div>
        <div class="metric ${parseFloat(report.performanceMetrics.errorRate) > 5 ? 'error' : 'success'}">
            <div class="metric-value">${report.performanceMetrics.requestsPerSecond.toFixed(2)}</div>
            <div class="metric-label">每秒请求数 (RPS)</div>
        </div>
        <div class="metric ${report.testSummary.averageResponseTime > 1000 ? 'warning' : 'success'}">
            <div class="metric-value">${report.testSummary.averageResponseTime}</div>
            <div class="metric-label">平均响应时间</div>
        </div>
        
        <h2>性能指标</h2>
        <table>
            <tr><th>指标</th><th>数值</th></tr>
            <tr><td>总请求数</td><td>${report.testSummary.totalRequests}</td></tr>
            <tr><td>成功请求数</td><td>${report.testSummary.successfulRequests}</td></tr>
            <tr><td>失败请求数</td><td>${report.testSummary.failedRequests}</td></tr>
            <tr><td>成功率</td><td>${report.testSummary.successRate}</td></tr>
            <tr><td>每秒请求数</td><td>${report.performanceMetrics.requestsPerSecond.toFixed(2)}</td></tr>
            <tr><td>错误率</td><td>${report.performanceMetrics.errorRate}</td></tr>
            <tr><td>P95响应时间</td><td>${report.performanceMetrics.p95ResponseTime}ms</td></tr>
            <tr><td>P99响应时间</td><td>${report.performanceMetrics.p99ResponseTime}ms</td></tr>
            <tr><td>并发连接数</td><td>${report.testSummary.concurrentConnections}</td></tr>
        </table>
        
        ${report.apacheBenchResults ? `
        <h2>Apache Bench 结果</h2>
        <table>
            <tr><th>指标</th><th>数值</th></tr>
            <tr><td>并发级别</td><td>${report.apacheBenchResults.concurrencyLevel}</td></tr>
            <tr><td>测试时间</td><td>${report.apacheBenchResults.timeTaken}s</td></tr>
            <tr><td>完成请求数</td><td>${report.apacheBenchResults.completeRequests}</td></tr>
            <tr><td>失败请求数</td><td>${report.apacheBenchResults.failedRequests}</td></tr>
            <tr><td>每秒请求数</td><td>${report.apacheBenchResults.requestsPerSecond}</td></tr>
            <tr><td>每个请求时间</td><td>${report.apacheBenchResults.timePerRequest}ms</td></tr>
        </table>
        ` : ''}
        
        ${report.benchmarkResults ? `
        <h2>性能基准测试</h2>
        <table>
            <tr><th>测试项目</th><th>平均时间</th><th>最小时间</th><th>最大时间</th><th>P95时间</th></tr>
            ${Object.entries(report.benchmarkResults).map(([name, data]) => `
                <tr>
                    <td>${name}</td>
                    <td>${data.average.toFixed(2)}ms</td>
                    <td>${data.min}ms</td>
                    <td>${data.max}ms</td>
                    <td>${data.p95}ms</td>
                </tr>
            `).join('')}
        </table>
        ` : ''}
        
        ${report.errors.length > 0 ? `
        <h2>错误详情 (前50个)</h2>
        <div class="error-list">
            ${report.errors.map(error => `
                <div class="error-item">
                    <strong>${error.type}</strong> - ${error.message || ''} - ${new Date(error.time).toLocaleString()}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
}

// 工具函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主测试函数
async function runStressTest() {
  log('info', '开始AI设计平台压力测试...');
  log('info', `测试配置: ${JSON.stringify(CONFIG, null, 2)}`);
  
  results.startTime = Date.now();
  
  try {
    // 启动系统监控
    const stopMonitoring = startSystemMonitoring();
    
    // 运行测试
    if (CONFIG.testTypes.includes('performance')) {
      await runPerformanceBenchmarks();
    }
    
    if (CONFIG.testTypes.includes('http')) {
      await runHTTPLoadTest();
    }
    
    if (CONFIG.testTypes.includes('websocket')) {
      await runWebSocketLoadTest();
    }
    
    if (CONFIG.testTypes.includes('ai')) {
      await runAILoadTest();
    }
    
    if (CONFIG.testTypes.includes('apache-bench')) {
      await runApacheBenchTest();
    }
    
    // 停止监控
    stopMonitoring();
    
    results.endTime = Date.now();
    
    // 生成报告
    const report = generateReport();
    
    // 输出摘要
    log('info', '=== 测试完成 ===');
    log('info', `总请求数: ${report.testSummary.totalRequests}`);
    log('info', `成功率: ${report.testSummary.successRate}`);
    log('info', `平均响应时间: ${report.testSummary.averageResponseTime}`);
    log('info', `每秒请求数: ${report.performanceMetrics.requestsPerSecond.toFixed(2)}`);
    log('info', `错误率: ${report.performanceMetrics.errorRate}`);
    
    // 性能评估
    evaluatePerformance(report);
    
  } catch (error) {
    log('error', `测试过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

function evaluatePerformance(report) {
  log('info', '=== 性能评估 ===');
  
  const rps = report.performanceMetrics.requestsPerSecond;
  const errorRate = parseFloat(report.performanceMetrics.errorRate);
  const avgResponseTime = parseFloat(report.testSummary.averageResponseTime);
  const p95ResponseTime = report.performanceMetrics.p95ResponseTime;
  
  // RPS评估
  if (rps > 1000) {
    log('success', `✅ 优秀: RPS ${rps.toFixed(2)} (> 1000)`);
  } else if (rps > 500) {
    log('info', `ℹ️  良好: RPS ${rps.toFixed(2)} (> 500)`);
  } else if (rps > 100) {
    log('warning', `⚠️  一般: RPS ${rps.toFixed(2)} (> 100)`);
  } else {
    log('error', `❌ 需要优化: RPS ${rps.toFixed(2)} (< 100)`);
  }
  
  // 错误率评估
  if (errorRate < 1) {
    log('success', `✅ 优秀: 错误率 ${errorRate}% (< 1%)`);
  } else if (errorRate < 5) {
    log('info', `ℹ️  良好: 错误率 ${errorRate}% (< 5%)`);
  } else if (errorRate < 10) {
    log('warning', `⚠️  一般: 错误率 ${errorRate}% (< 10%)`);
  } else {
    log('error', `❌ 需要优化: 错误率 ${errorRate}% (> 10%)`);
  }
  
  // 响应时间评估
  if (avgResponseTime < 200) {
    log('success', `✅ 优秀: 平均响应时间 ${avgResponseTime}ms (< 200ms)`);
  } else if (avgResponseTime < 500) {
    log('info', `ℹ️  良好: 平均响应时间 ${avgResponseTime}ms (< 500ms)`);
  } else if (avgResponseTime < 1000) {
    log('warning', `⚠️  一般: 平均响应时间 ${avgResponseTime}ms (< 1000ms)`);
  } else {
    log('error', `❌ 需要优化: 平均响应时间 ${avgResponseTime}ms (> 1000ms)`);
  }
  
  // P95响应时间评估
  if (p95ResponseTime < 500) {
    log('success', `✅ 优秀: P95响应时间 ${p95ResponseTime}ms (< 500ms)`);
  } else if (p95ResponseTime < 1000) {
    log('info', `ℹ️  良好: P95响应时间 ${p95ResponseTime}ms (< 1000ms)`);
  } else if (p95ResponseTime < 2000) {
    log('warning', `⚠️  一般: P95响应时间 ${p95ResponseTime}ms (< 2000ms)`);
  } else {
    log('error', `❌ 需要优化: P95响应时间 ${p95ResponseTime}ms (> 2000ms)`);
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  log('error', `未捕获的异常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', `未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

// 启动测试
if (require.main === module) {
  runStressTest();
}

module.exports = { runStressTest, CONFIG };