const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// 测试数据库连接
app.get('/api/test/db', async (req, res) => {
  try {
    const usersCount = await prisma.users.count();
    const projectsCount = await prisma.workflows.count();
    res.json({
      success: true,
      data: {
        usersCount,
        projectsCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  DB test: http://localhost:${PORT}/api/test/db`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
