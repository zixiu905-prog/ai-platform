import React, { useState } from 'react';
import { DesktopLayout } from './components/DesktopLayout';
import ModernHomePage from './components/ModernHomePage';
import { FileExplorer } from './components/FileExplorer';
import MultiModalTestPage from './pages/MultiModalTestPage';
import TaskController from './components/TaskController';
import NotificationCenter from './components/NotificationCenter';
import './styles/ModernUI.css';
import './styles/modernTheme.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');

  // 页面渲染函数
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <ModernHomePage />;
      case 'multimodal':
        return <MultiModalTestPage />;
      case 'files':
        return <FileExplorer />;
      case 'ai-chat':
        return (
          <div style={{ padding: 24 }}>
            <h2>AI 对话</h2>
            <p>AI对话功能正在开发中...</p>
          </div>
        );
      case 'api':
        return (
          <div style={{ padding: 24 }}>
            <h2>API 集成</h2>
            <p>API集成功能正在开发中...</p>
          </div>
        );
      case 'system':
        return <TaskController />;
      case 'settings':
        return (
          <div style={{ padding: 24 }}>
            <h2>系统设置</h2>
            <p>系统设置功能正在开发中...</p>
          </div>
        );
      default:
        return <ModernHomePage />;
    }
  };

  // 页面切换处理
  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  // 窗口控制函数
  const handleMinimize = () => {
    console.log('Minimize window');
  };

  const handleMaximize = () => {
    console.log('Maximize window');
  };

  const handleClose = () => {
    console.log('Close window');
  };

  return (
    <div className="app">
      <DesktopLayout
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      >
        {renderPage()}
      </DesktopLayout>
    </div>
  );
};

export default App;