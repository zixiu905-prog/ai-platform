import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Button, 
  Space, 
  Typography, 
  Switch,
  theme,
  Avatar,
  Dropdown,
  Badge
} from 'antd';
import { 
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  FileOutlined,
  SettingOutlined,
  ApiOutlined,
  DesktopOutlined,
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
  UserOutlined,
  BellOutlined,
  MoonOutlined,
  SunOutlined,
  MessageOutlined,
  RocketOutlined
} from '@ant-design/icons';
import NotificationCenter from './NotificationCenter';
import { notificationManager } from '../services/notificationManager';
import TaskController from './TaskController';
import { themeManager, modernLightTheme, modernDarkTheme } from '../styles/modernTheme';
import './DesktopLayout.css';
import '../styles/ModernUI.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface DesktopLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  onPageChange?: (page: string) => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  children,
  currentPage = 'home',
  onPageChange,
  onMinimize,
  onMaximize,
  onClose
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showTaskController, setShowTaskController] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 初始化现代主题
  useEffect(() => {
    themeManager.initTheme();
    const savedTheme = localStorage.getItem('theme-preference');
    setDarkMode(savedTheme === 'dark');
  }, []);

  // 主题切换
  const handleThemeChange = (checked: boolean) => {
    setDarkMode(checked);
    themeManager.toggleTheme(checked);
  };

  // 页面切换
  const handleMenuClick = ({ key }: { key: string }) => {
    if (onPageChange) {
      onPageChange(key);
    }
  };

  // 更新通知
  useEffect(() => {
    const updateNotifications = () => {
      const notifications = notificationManager.getUnreadNotifications();
      setNotifications(notifications);
    };

    notificationManager.on('notification-updated', updateNotifications);
    updateNotifications();

    return () => {
      notificationManager.off('notification-updated', updateNotifications);
    };
  }, []);

  // 用户菜单项
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <CloseOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  // 菜单项
  const menuItems = [
    {
      key: 'home',
      icon: <HomeOutlined style={{ fontSize: '16px' }} />,
      label: <span className="modern-text-base">智能工作台</span>,
    },
    {
      key: 'multimodal',
      icon: <FileOutlined style={{ fontSize: '16px' }} />,
      label: <span className="modern-text-base">多模态输入</span>,
    },
    {
      key: 'files',
      icon: <FileOutlined style={{ fontSize: '16px' }} />,
      label: <span className="modern-text-base">文件管理</span>,
    },
    {
      key: 'ai-chat',
      icon: <MessageOutlined style={{ fontSize: '16px' }} />,
      label: <span className="modern-text-base">AI 对话</span>,
    },
    {
      key: 'api',
      icon: <ApiOutlined style={{ fontSize: '16px' }} />,
      label: <span className="modern-text-base">API 集成</span>,
    },
    {
      key: 'system',
      icon: <DesktopOutlined style={{ fontSize: '16px' }} />,
      label: <span className="modern-text-base">系统工具</span>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined style={{ fontSize: '16px' }} />,
      label: <span className="modern-text-base">系统设置</span>,
    },
  ];

  // 窗口控制按钮
  const WindowControls = () => (
    <div className="window-controls">
      <Button
        type="text"
        size="small"
        icon={<MinusOutlined />}
        onClick={onMinimize}
        className="control-button minimize"
      />
      <Button
        type="text"
        size="small"
        icon={<BorderOutlined />}
        onClick={onMaximize}
        className="control-button maximize"
      />
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        onClick={onClose}
        className="control-button close"
      />
    </div>
  );

  // 侧边栏标题
  const SidebarTitle = () => (
    <div className="sidebar-title">
      <DesktopOutlined style={{ fontSize: 24, color: '#1890ff' }} />
      {!collapsed && (
        <Title level={4} style={{ margin: 0, marginLeft: 8 }}>
          AI Design
        </Title>
      )}
    </div>
  );

  // 现代化窗口控制按钮
  const ModernWindowControls = () => (
    <div className="modern-window-controls">
      <Button
        type="text"
        size="small"
        icon={<MinusOutlined />}
        onClick={onMinimize}
        className="modern-control-button modern-control-minimize"
      />
      <Button
        type="text"
        size="small"
        icon={<BorderOutlined />}
        onClick={onMaximize}
        className="modern-control-button modern-control-maximize"
      />
      <Button
        type="text"
        size="small"
        icon={<CloseOutlined />}
        onClick={onClose}
        className="modern-control-button modern-control-close"
      />
    </div>
  );

  // 现代化侧边栏标题
  const ModernSidebarTitle = () => (
    <div className="modern-sidebar-header">
      <div className="modern-brand">
        <RocketOutlined style={{ fontSize: '20px', color: 'var(--color-primary-600)' }} />
        {!collapsed && (
          <span className="modern-brand-text">
            AI Design
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Layout className="modern-desktop-layout">
      {/* 现代化顶部导航栏 */}
      <div className="modern-topbar">
        <div className="modern-topbar-left">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="modern-menu-toggle"
          />
          <ModernSidebarTitle />
        </div>
        
        <div className="modern-topbar-center">
          <span className="modern-app-title">AI Design Desktop</span>
        </div>
        
        <div className="modern-topbar-right">
          <Space size="middle">
            {/* 主题切换 */}
            <Button
              type="text"
              icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => handleThemeChange(!darkMode)}
              className="modern-topbar-btn"
            />
            
            {/* 通知中心 */}
            <Badge count={notifications.length} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="modern-topbar-btn"
              />
            </Badge>
            
            {/* 用户菜单 */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<UserOutlined />}
                className="modern-user-btn"
              />
            </Dropdown>
            
            <ModernWindowControls />
          </Space>
        </div>
      </div>

      {/* 主要布局 */}
      <Layout className="modern-main-layout">
        {/* 现代化侧边栏 */}
        <Sider 
          trigger={null} 
          collapsible 
          collapsed={collapsed}
          className="modern-sidebar"
          width={280}
        >
          <div className="modern-sidebar-content">
            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[currentPage]}
              items={menuItems}
              onClick={handleMenuClick}
              className="modern-nav-menu"
            />
          </div>
        </Sider>
        
        <Layout>
          <Content className="modern-main-content">
            <div className="modern-content-wrapper">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};