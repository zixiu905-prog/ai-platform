import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DesktopLayout } from './components/DesktopLayout';
import { DesktopDashboard } from './pages/DesktopDashboard';
import { DesktopHome } from './pages/DesktopHome';
import { DesktopProjectEditor } from './pages/DesktopProjectEditor';
import { DesktopSettings } from './pages/DesktopSettings';
import { DesktopAIChat } from './pages/DesktopAIChat';
import { DesktopWelcome } from './pages/DesktopWelcome';
import DesktopImageGeneration from './pages/DesktopImageGeneration';
import VoiceTestPage from './pages/VoiceTestPage';
import DesktopNaturalLanguageDesign from './pages/DesktopNaturalLanguageDesign';
import AdminWorkflowManager from './pages/AdminWorkflowManager';
import DesignTemplates from './pages/DesignTemplates';
import WorkflowDesignerPage from './pages/WorkflowDesignerPage';
import WorkflowMonitorPage from './pages/WorkflowMonitorPage';
import { DesktopThemeProvider } from './contexts/DesktopThemeContext';
import { ElectronAPIProvider } from './contexts/ElectronAPIContext';
import SoftwareManager from './components/SoftwareManager';
import ProjectManager from './components/ProjectManager';

const DesktopApp: React.FC = () => {
  const [windowType, setWindowType] = useState<string>('main');
  const [projectPath, setProjectPath] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 检查是否为桌面环境
        if (!window.electronAPI) {
          console.error('❌ 桌面API未找到，请确保在Electron环境中运行');
          setIsLoading(false);
          return;
        }

        // 获取窗口类型和项目路径
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('windowType') || 'main';
        const path = urlParams.get('projectPath') || undefined;

        setWindowType(type);
        setProjectPath(path);

        // 设置窗口标题
        if (window.electronAPI.app && window.electronAPI.app.version) {
          const version = await window.electronAPI.app.version();
          document.title = `AI智能体平台 v${version} - 桌面版`;
        }

        // 获取应用版本信息
        const platform = await window.electronAPI.app.platform();
        console.log(`🖥️ 平台: ${platform}`);

        // 根据窗口类型初始化
        switch (type) {
          case 'main':
            console.log('🏠 主窗口初始化');
            break;
          case 'project':
            console.log('📁 项目窗口初始化:', path);
            break;
          case 'settings':
            console.log('⚙️ 设置窗口初始化');
            break;
          case 'ai-chat':
            console.log('🤖 AI聊天窗口初始化');
            break;
          default:
            console.log('❓ 未知窗口类型:', type);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('❌ 桌面应用初始化失败:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // 监听菜单事件
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleMenuEvent = (channel: string, callback: (...args: any[]) => void) => {
      window.electronAPI.on(channel, callback);
    };

    // 主窗口和托盘菜单事件
    if (windowType === 'main') {
      handleMenuEvent('menu-new-project', () => {
        console.log('🆕 新建项目');
        // TODO: 实现新建项目逻辑
      });

      handleMenuEvent('menu-open-project', (path: string) => {
        console.log('📂 打开项目:', path);
        // TODO: 实现打开项目逻辑
      });

      handleMenuEvent('menu-ai-recommend', () => {
        console.log('🎯 AI推荐');
        // TODO: 实现AI推荐逻辑
      });

      handleMenuEvent('menu-code-analysis', () => {
        console.log('🔍 代码分析');
        // TODO: 实现代码分析逻辑
      });

      // 托盘菜单事件
      handleMenuEvent('open-ai-chat', () => {
        console.log('🤖 打开AI对话');
        // 导航到AI聊天页面
        window.location.hash = '/ai-chat';
      });

      handleMenuEvent('open-image-generation', () => {
        console.log('🎨 打开图像生成');
        // 导航到图像生成页面
        window.location.hash = '/image-generation';
      });

      handleMenuEvent('open-natural-language-design', () => {
        console.log('✨ 打开自然语言设计');
        // 导航到自然语言设计页面
        window.location.hash = '/natural-language-design';
      });

      handleMenuEvent('open-admin-workflows', () => {
        console.log('⚙️ 打开管理员工作流');
        // 导航到管理员工作流页面
        window.location.hash = '/admin/workflows';
      });

      handleMenuEvent('open-design-templates', () => {
        console.log('📋 打开设计模板库');
        // 导航到设计模板页面
        window.location.hash = '/design-templates';
      });

      handleMenuEvent('open-voice-test', () => {
        console.log('🎤 打开语音识别');
        // 导航到语音识别页面
        window.location.hash = '/voice-test';
      });

      handleMenuEvent('open-workflow-manager', () => {
        console.log('⚙️ 打开工作流管理器');
        // 导航到工作流页面
        window.location.hash = '/workflows/designer';
      });

      handleMenuEvent('open-software-manager', () => {
        console.log('💻 打开软件管理器');
        // 导航到软件管理页面
        window.location.hash = '/software-manager';
      });

      handleMenuEvent('open-project-manager', () => {
        console.log('📁 打开项目管理器');
        // 导航到项目管理页面
        window.location.hash = '/project-manager';
      });

      handleMenuEvent('open-settings', () => {
        console.log('⚙️ 打开设置');
        // 导航到设置页面
        window.location.hash = '/settings';
      });
    }

    // 清理事件监听器
    return () => {
      if (window.electronAPI && window.electronAPI.off) {
        // TODO: 清理所有事件监听器
      }
    };
  }, [windowType]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-400 text-lg">正在启动桌面应用...</p>
        </div>
      </div>
    );
  }

  // 根据窗口类型渲染不同内容
  const renderContent = () => {
    switch (windowType) {
      case 'main':
        return (
          <DesktopLayout>
            <Routes>
              <Route path="/" element={<DesktopNaturalLanguageDesign />} />
              <Route path="/home" element={<DesktopHome />} />
              <Route path="/dashboard" element={<DesktopDashboard />} />
              <Route path="/welcome" element={<DesktopWelcome />} />
              <Route path="/project/:projectPath" element={<DesktopProjectEditor />} />
              <Route path="/workflows/designer" element={<WorkflowDesignerPage />} />
              <Route path="/workflows/designer/:workflowId" element={<WorkflowDesignerPage />} />
              <Route path="/workflows/designer/template/:templateId" element={<WorkflowDesignerPage />} />
              <Route path="/workflows/monitor/:workflowId" element={<WorkflowMonitorPage />} />
              <Route path="/settings" element={<DesktopSettings />} />
              <Route path="/software-manager" element={<SoftwareManager />} />
              <Route path="/project-manager" element={<ProjectManager />} />
              <Route path="/image-generation" element={<DesktopImageGeneration />} />
              <Route path="/voice-test" element={<VoiceTestPage />} />
              <Route path="/natural-language-design" element={<DesktopNaturalLanguageDesign />} />
              <Route path="/admin/workflows" element={<AdminWorkflowManager />} />
              <Route path="/design-templates" element={<DesignTemplates />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DesktopLayout>
        );

      case 'project':
        return projectPath ? (
          <DesktopProjectEditor />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl text-red-400 mb-2">错误</h2>
              <p className="text-gray-400">项目路径未指定</p>
            </div>
          </div>
        );

      case 'settings':
        return <DesktopSettings />;

      case 'ai-chat':
        return <DesktopAIChat />;

      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl text-red-400 mb-2">未知窗口类型</h2>
              <p className="text-gray-400">窗口类型: {windowType}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <ElectronAPIProvider>
      <DesktopThemeProvider>
        <div className="desktop-app">
          {/* 自定义标题栏（仅Windows/Linux） */}
          {windowType === 'main' && navigator.platform.toLowerCase().includes('win') && (
            <div className="desktop-titlebar">
              <div className="titlebar-title">AI智能体平台</div>
              <div className="titlebar-controls">
                <button onClick={() => window.electronAPI.window.minimize()}>─</button>
                <button onClick={() => window.electronAPI.window.maximize()}>□</button>
                <button onClick={() => window.electronAPI.window.close()}>✕</button>
              </div>
            </div>
          )}
          
          <div className="app-content">
            {renderContent()}
          </div>
        </div>
      </DesktopThemeProvider>
    </ElectronAPIProvider>
  );
};

export default DesktopApp;