import React, { useState, useEffect } from 'react';
import { useElectronAPI } from '../contexts/ElectronAPIContext';

interface StatusBarProps {}

export const StatusBar: React.FC<StatusBarProps> = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [platform, setPlatform] = useState('Unknown');
  const [memoryUsage, setMemoryUsage] = useState({ used: 0, total: 0 });
  const electronAPI = useElectronAPI();

  // 获取应用信息
  useEffect(() => {
    const getAppInfo = async () => {
      try {
        if (electronAPI) {
          const version = await electronAPI.app.version();
          const plat = await electronAPI.app.platform();
          
          setAppVersion(version);
          setPlatform(plat);
        }
      } catch (error) {
        console.error('获取应用信息失败:', error);
      }
    };

    getAppInfo();
  }, [electronAPI]);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 获取内存使用情况
  useEffect(() => {
    const getMemoryUsage = async () => {
      try {
        // @ts-ignore - performance.memory is not in standard TypeScript types
        if (performance && (performance as any).memory) {
          // @ts-ignore
          const memory = (performance as any).memory;
          const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);

          setMemoryUsage({ used, total });
        }
      } catch (error) {
        console.error('获取内存使用情况失败:', error);
      }
    };

    getMemoryUsage();
    const interval = setInterval(getMemoryUsage, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    });
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'win32':
        return '🪟';
      case 'darwin':
        return '🍎';
      case 'linux':
        return '🐧';
      default:
        return '💻';
    }
  };

  const getStatusColor = () => {
    if (memoryUsage.used / memoryUsage.total > 0.8) {
      return 'text-red-400';
    } else if (memoryUsage.used / memoryUsage.total > 0.6) {
      return 'text-yellow-400';
    }
    return 'text-green-400';
  };

  return (
    <div className="glass border-t border-white/10 px-4 py-1 flex items-center justify-between text-xs text-gray-400">
      {/* 左侧状态信息 */}
      <div className="flex items-center space-x-4">
        {/* 系统状态 */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>系统就绪</span>
        </div>

        {/* 内存使用情况 */}
        <div className="flex items-center space-x-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <span className={getStatusColor()}>
            {memoryUsage.used}MB / {memoryUsage.total}MB
          </span>
        </div>

        {/* 平台信息 */}
        <div className="flex items-center space-x-1">
          <span>{getPlatformIcon()}</span>
          <span>{platform}</span>
        </div>
      </div>

      {/* 中间信息 */}
      <div className="flex items-center space-x-4">
        {/* 项目状态 */}
        <div className="flex items-center space-x-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>当前项目: 未选择</span>
        </div>

        {/* AI助手状态 */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>AI助手: 在线</span>
        </div>
      </div>

      {/* 右侧信息 */}
      <div className="flex items-center space-x-4">
        {/* 版本信息 */}
        <div className="flex items-center space-x-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m3 0h1a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1m5 0h3" />
          </svg>
          <span>v{appVersion}</span>
        </div>

        {/* 时间和日期 */}
        <div className="flex items-center space-x-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatDate(currentTime)}</span>
          <span>{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;