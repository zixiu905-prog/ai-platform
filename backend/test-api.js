// 简单的API测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testApi() {
  try {
    console.log('🧪 测试软件API管理功能...\n');

    // 1. 测试健康检查
    console.log('1. 测试健康检查:');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康检查:', health.data);

    // 2. 测试支持的软件列表（不需要认证的路由）
    console.log('\n2. 测试支持的软件:');
    try {
      const software = await axios.get(`${BASE_URL}/api/softwares`);
      console.log('✅ 软件列表获取成功:', software.data.success ? '成功' : '失败');
      if (software.data.success && software.data.data) {
        console.log(`   找到 ${software.data.data.length} 个软件`);
      }
    } catch (error) {
      console.log('❌ 软件列表获取失败:', error.response?.data || error.message);
    }

    // 3. 测试软件API管理路由是否存在
    console.log('\n3. 测试软件API管理路由:');
    try {
      const response = await axios.get(`${BASE_URL}/api/software-api/stats`);
      console.log('✅ 软件API管理路由可用');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 软件API管理路由存在，需要认证');
      } else {
        console.log('❌ 软件API管理路由测试失败:', error.response?.data || error.message);
      }
    }

    console.log('\n🎉 API测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testApi();