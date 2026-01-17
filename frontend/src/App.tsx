import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { ConfigProvider, Layout, Menu, theme, Button } from 'antd'
import { 
  HomeOutlined, 
  DownloadOutlined, 
  UserOutlined, 
  DashboardOutlined, 
  RobotOutlined,
  SettingOutlined,
  PictureOutlined,
  ApiOutlined,
  CloudOutlined,
  TeamOutlined
} from '@ant-design/icons'

// 导入所有页面
import HomePage from './pages/HomePage'
import DesktopDownloadPage from './pages/DesktopDownloadPage'
import DownloadPage from './pages/DownloadPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ImageGeneration from './pages/ImageGeneration'
import Chat from './pages/Chat'
import ApiTest from './pages/ApiTest'
import DoubaoAITestPage from './pages/DoubaoAITestPage'
import ZhipuAITestPage from './pages/ZhipuAITestPage'
import SoftwareApiManagement from './pages/SoftwareApiManagement'
import WorkflowList from './pages/WorkflowList'
import WorkflowVisualEditor from './pages/WorkflowVisualEditor'
import Profile from './pages/Profile'
import TenantManagement from './pages/TenantManagement'
import SpeechRecognition from './pages/SpeechRecognition'
import BackupManager from './pages/BackupManager'
import Subscription from './pages/Subscription'

const { Header, Content, Footer, Sider } = Layout

// 简单的导航组件
const Navigation: React.FC = () => {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = React.useState(false)
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)

  React.useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsLoggedIn(false)
    navigate('/')
  }

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/desktop/download',
      icon: <DownloadOutlined />,
      label: <Link to="/desktop/download">桌面下载</Link>,
    },
    {
      key: '/download',
      icon: <CloudOutlined />,
      label: <Link to="/download">下载中心</Link>,
    },
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">仪表板</Link>,
    },
    {
      key: '/image-generation',
      icon: <PictureOutlined />,
      label: <Link to="/image-generation">AI图像生成</Link>,
    },
    {
      key: '/chat',
      icon: <RobotOutlined />,
      label: <Link to="/chat">AI聊天</Link>,
    },
    {
      key: '/workflow',
      icon: <SettingOutlined />,
      label: '工作流',
      children: [
        {
          key: '/workflow/list',
          label: <Link to="/workflow/list">工作流列表</Link>,
        },
        {
          key: '/workflow/editor',
          label: <Link to="/workflow/editor">可视化编辑器</Link>,
        },
      ],
    },
    {
      key: '/ai-tests',
      icon: <ApiOutlined />,
      label: 'AI测试',
      children: [
        {
          key: '/api-test',
          label: <Link to="/api-test">API测试</Link>,
        },
        {
          key: '/doubao-test',
          label: <Link to="/doubao-test">豆包AI测试</Link>,
        },
        {
          key: '/zhipu-test',
          label: <Link to="/zhipu-test">智谱AI测试</Link>,
        },
      ],
    },
    {
      key: '/software-api',
      icon: <ApiOutlined />,
      label: <Link to="/software-api">软件API管理</Link>,
    },
    {
      key: '/speech-recognition',
      icon: <RobotOutlined />,
      label: <Link to="/speech-recognition">语音识别</Link>,
    },
    {
      key: '/backup',
      icon: <SettingOutlined />,
      label: <Link to="/backup">备份管理</Link>,
    },
    {
      key: '/subscription',
      icon: <TeamOutlined />,
      label: <Link to="/subscription">订阅管理</Link>,
    },
    {
      key: '/tenant',
      icon: <TeamOutlined />,
      label: <Link to="/tenant">租户管理</Link>,
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">个人中心</Link>,
    },
  ].filter(item => {
    // 如果没有登录，隐藏需要登录的菜单
    if (!isLoggedIn) {
      const protectedRoutes = ['/dashboard', '/profile', '/workflow', '/ai-tests', '/software-api', '/speech-recognition', '/backup', '/subscription', '/tenant']
      if (protectedRoutes.includes(item.key)) {
        return false
      }
    }
    return true
  })

  return (
    <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
      <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
      <Menu theme="dark" mode="inline" items={menuItems} />
    </Sider>
  )
}

// 布局组件
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navigation />
      <Layout className="site-layout">
        <Header style={{ padding: 0, background: '#fff' }}>
          <div style={{ float: 'right', marginRight: 24 }}>
            {localStorage.getItem('token') ? (
              <Button onClick={() => {
                localStorage.removeItem('token')
                window.location.href = '/'
              }}>退出</Button>
            ) : (
              <>
                <Link to="/login">
                  <Button type="link">登录</Button>
                </Link>
                <Link to="/register">
                  <Button type="primary">注册</Button>
                </Link>
              </>
            )}
          </div>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: '#fff' }}>
          {children}
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          AI智能体平台 ©2026 Created by AiDesign Team
        </Footer>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#667eea',
        },
      }}
    >
      <Router>
        <Routes>
          {/* 公共页面 - 无布局 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* 有布局的页面 */}
          <Route path="/*" element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/desktop/download" element={<DesktopDownloadPage />} />
                <Route path="/download" element={<DownloadPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/image-generation" element={<ImageGeneration />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/api-test" element={<ApiTest />} />
                <Route path="/doubao-test" element={<DoubaoAITestPage />} />
                <Route path="/zhipu-test" element={<ZhipuAITestPage />} />
                <Route path="/software-api" element={<SoftwareApiManagement />} />
                <Route path="/workflow/list" element={<WorkflowList />} />
                <Route path="/workflow/editor" element={<WorkflowVisualEditor />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/tenant" element={<TenantManagement />} />
                <Route path="/speech-recognition" element={<SpeechRecognition />} />
                <Route path="/backup" element={<BackupManager />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="*" element={<h1>404 - 页面不存在</h1>} />
              </Routes>
            </AppLayout>
          } />
        </Routes>
      </Router>
    </ConfigProvider>
  )
}

export default App
