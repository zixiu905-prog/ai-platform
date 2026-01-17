import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// @ts-ignore
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DesktopApp from './DesktopApp'
import './index.css'

// 类型声明
declare global {
  interface Window {
    electronAPI: any;
    desktopApp?: {
      windowType: string;
      projectPath?: string;
      isDesktop: boolean;
    };
  }
}

// 检测是否为桌面环境
const isDesktop = window.electronAPI !== undefined;

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      retry: 3,
    },
  },
});

// 桌面应用初始化
if (isDesktop) {
  console.log('🚀 桌面应用模式启动');

  // 获取启动参数
  const urlParams = new URLSearchParams(window.location.search);
  const windowType = urlParams.get('windowType') || 'main';
  const projectPath = urlParams.get('projectPath');

  console.log('窗口类型:', windowType);
  if (projectPath) {
    console.log('项目路径:', projectPath);
  }

  // 设置全局变量
  window.desktopApp = {
    windowType,
    projectPath,
    isDesktop: true
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DesktopApp />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)