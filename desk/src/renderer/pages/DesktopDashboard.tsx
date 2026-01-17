import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import { useDesktopTheme } from '../contexts/DesktopThemeContext';
import apiService from '../services/apiService';

// 数据类型定义
interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalWorkflows: number;
  activeWorkflows: number;
  totalScripts: number;
  activeScripts: number;
  connectedSoftwares: number;
  totalRecommendations: number;
}

interface SoftwareStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  version?: string;
  lastUsed?: string;
}

interface RecentActivity {
  id: string;
  type: 'workflow' | 'script' | 'project' | 'software';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'error' | 'running';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

export const DesktopDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [softwares, setSoftwares] = useState<SoftwareStatus[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  const { resolvedTheme } = useDesktopTheme();

  // 加载仪表板数据
  const loadDashboardData = async () => {
    try {
      const [statsResponse, softwaresResponse, activitiesResponse] = await Promise.all([
        apiService.get<DashboardStats>('/api/dashboard/stats').catch(() => ({ data: null })),
        apiService.get<SoftwareStatus[]>('/api/softwares/status').catch(() => ({ data: [] })),
        apiService.get<RecentActivity[]>('/api/dashboard/activities').catch(() => ({ data: [] }))
      ]);

      if (statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        // 模拟数据，当后端API不可用时
        setStats({
          totalProjects: 12,
          activeProjects: 3,
          totalWorkflows: 28,
          activeWorkflows: 5,
          totalScripts: 45,
          activeScripts: 8,
          connectedSoftwares: 4,
          totalRecommendations: 156
        });
      }

      if (softwaresResponse.data) {
        setSoftwares(softwaresResponse.data);
      } else {
        // 模拟软件状态数据
        setSoftwares([
          { id: 'photoshop', name: 'Adobe Photoshop', status: 'connected', version: '2024', lastUsed: '2分钟前' },
          { id: 'autocad', name: 'AutoCAD', status: 'disconnected', version: '2024', lastUsed: '1小时前' },
          { id: 'blender', name: 'Blender', status: 'connected', version: '4.0', lastUsed: '30分钟前' },
          { id: 'premiere', name: 'Adobe Premiere', status: 'connecting', version: '2024', lastUsed: '昨天' }
        ]);
      }

      if (activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data);
      } else {
        // 模拟活动数据
        setRecentActivities([
          {
            id: '1',
            type: 'workflow',
            title: '图片批处理工作流',
            description: '成功处理了25张图片',
            timestamp: '5分钟前',
            status: 'success'
          },
          {
            id: '2',
            type: 'script',
            title: 'AutoCAD自动化脚本',
            description: '正在执行图层整理',
            timestamp: '10分钟前',
            status: 'running'
          },
          {
            id: '3',
            type: 'software',
            title: 'Photoshop连接',
            description: '成功建立连接',
            timestamp: '2分钟前',
            status: 'success'
          },
          {
            id: '4',
            type: 'project',
            title: '新项目创建',
            description: '建筑设计项目',
            timestamp: '1小时前',
            status: 'success'
          }
        ]);
      }
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    loadDashboardData();
  }, []);

  // 监听实时更新
  useEffect(() => {
    if (electronAPI) {
      electronAPI.on('software-status-changed', loadDashboardData);
      electronAPI.on('workflow-updated', loadDashboardData);
      electronAPI.on('script-executed', loadDashboardData);
    }

    return () => {
      if (electronAPI && electronAPI.off) {
        electronAPI.off('software-status-changed', loadDashboardData);
        electronAPI.off('workflow-updated', loadDashboardData);
        electronAPI.off('script-executed', loadDashboardData);
      }
    };
  }, [electronAPI]);

  // 快速操作定义
  const quickActions: QuickAction[] = [
    {
      id: 'new-project',
      title: '新建项目',
      description: '创建新的设计项目',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: () => {
        if (electronAPI) {
          electronAPI.invoke('menu-new-project');
        } else {
          navigate('/projects/new');
        }
      },
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'ai-assistant',
      title: 'AI助手',
      description: '智能设计助手',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      action: () => {
        if (electronAPI) {
          // @ts-ignore
          electronAPI.window?.openAIChat();
        } else {
          navigate('/ai-chat');
        }
      },
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'workflow-designer',
      title: '工作流设计',
      description: '可视化工作流编辑',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      action: () => navigate('/workflows'),
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'script-manager',
      title: '脚本管理',
      description: '自动化脚本库',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      action: () => navigate('/scripts'),
      color: 'from-orange-500 to-orange-600'
    }
  ];

  // 获取状态指示器
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'connected':
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>;
      case 'connecting':
      case 'running':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'disconnected':
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  // 获取活动图标
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workflow':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'script':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case 'software':
        return (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'project':
        return (
          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-400">正在加载仪表板...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6">
      {/* 页面标题 */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient mb-2">桌面仪表板</h1>
            <p className="text-gray-400">
              AI智能体平台 - 欢迎回来！系统运行正常，一切就绪。
            </p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            disabled={refreshing}
            className="btn-glass flex items-center space-x-2"
          >
            <svg 
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? '刷新中...' : '刷新'}</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm">项目总数</h3>
              <svg className="w-5 h-5 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalProjects}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.activeProjects} 个活跃项目
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm">工作流</h3>
              <svg className="w-5 h-5 text-green-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-green-400">{stats.totalWorkflows}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.activeWorkflows} 个正在运行
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm">脚本库</h3>
              <svg className="w-5 h-5 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-purple-400">{stats.totalScripts}</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.activeScripts} 个活跃脚本
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm">连接软件</h3>
              <svg className="w-5 h-5 text-orange-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-orange-400">{stats.connectedSoftwares}</div>
            <div className="text-xs text-gray-400 mt-1">
              {softwares.filter(s => s.status === 'connected').length} 个已连接
            </div>
          </div>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快速操作 */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              快速操作
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`glass-card p-4 text-left transition-all duration-200 hover:scale-105 hover:shadow-xl group`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <div className="text-white">{action.icon}</div>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{action.title}</h3>
                  <p className="text-gray-400 text-sm">{action.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 软件状态 */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">🔗</span>
              软件连接状态
            </h2>
            <div className="space-y-3">
              {softwares.map((software) => (
                <div key={software.id} className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIndicator(software.status)}
                    <div>
                      <div className="text-white font-medium">{software.name}</div>
                      <div className="text-gray-400 text-sm">
                        {software.version && `v${software.version}`} • {software.lastUsed}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn-glass text-sm"
                    onClick={() => electronAPI?.invoke('software-connect', software.id)}
                  >
                    {software.status === 'connected' ? '管理' : '连接'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">📊</span>
              最近活动
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="p-3 glass rounded-lg">
                  <div className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{activity.title}</div>
                      <div className="text-gray-400 text-xs mt-1">{activity.description}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-gray-500 text-xs">{activity.timestamp}</div>
                        {getStatusIndicator(activity.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>AI智能体平台 v1.0.0 • 系统运行正常 • 最后更新: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default DesktopDashboard;