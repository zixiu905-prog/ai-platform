import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import { useDesktopTheme } from '../contexts/DesktopThemeContext';
import apiService from '../services/apiService';

// 类型定义
interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  comingSoon?: boolean;
}

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
}

interface RecentActivity {
  id: string;
  type: 'project' | 'workflow' | 'script' | 'chat';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export const DesktopWelcome: React.FC = () => {
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  const { theme, setTheme } = useDesktopTheme();

  // 状态管理
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState({
    projects: 0,
    workflows: 0,
    scripts: 0,
    conversations: 0
  });

  // 快速操作配置
  const quickActions: QuickAction[] = [
    {
      id: 'new-project',
      title: '新建项目',
      description: '开始一个新的创意项目',
      icon: '📁',
      color: 'from-blue-500 to-blue-600',
      route: '/project/new'
    },
    {
      id: 'ai-chat',
      title: 'AI助手',
      description: '与AI助手进行智能对话',
      icon: '🤖',
      color: 'from-green-500 to-green-600',
      route: '/ai-chat'
    },
    {
      id: 'workflow-designer',
      title: '工作流设计',
      description: '创建自动化工作流程',
      icon: '⚙️',
      color: 'from-purple-500 to-purple-600',
      route: '/workflows/designer'
    },
    {
      id: 'script-manager',
      title: '脚本管理',
      description: '管理和执行自动化脚本',
      icon: '📜',
      color: 'from-orange-500 to-orange-600',
      route: '/scripts'
    },
    {
      id: 'template-library',
      title: '模板库',
      description: '浏览和使用项目模板',
      icon: '📚',
      color: 'from-pink-500 to-pink-600',
      route: '/templates',
      comingSoon: true
    },
    {
      id: 'community',
      title: '社区',
      description: '与其他创作者交流分享',
      icon: '👥',
      color: 'from-indigo-500 to-indigo-600',
      route: '/community',
      comingSoon: true
    }
  ];

  // 功能卡片
  const featureCards: FeatureCard[] = [
    {
      id: 'ai-powered',
      title: 'AI驱动',
      description: '集成先进AI技术，提供智能化的创作支持',
      icon: '🧠',
      features: [
        '智能对话助手',
        '自动化工作流',
        '代码生成与优化',
        '创意内容生成'
      ]
    },
    {
      id: 'multi-software',
      title: '多软件支持',
      description: '支持主流设计和开发软件的无缝集成',
      icon: '🔗',
      features: [
        'Adobe Creative Suite',
        'Autodesk产品线',
        '开发工具集成',
        '自定义插件支持'
      ]
    },
    {
      id: 'collaboration',
      title: '协作功能',
      description: '强大的团队协作和项目管理能力',
      icon: '🤝',
      features: [
        '实时协作编辑',
        '版本控制管理',
        '团队权限控制',
        '项目进度追踪'
      ]
    },
    {
      id: 'automation',
      title: '自动化流程',
      description: '简化重复性工作，提高创作效率',
      icon: '⚡',
      features: [
        '可视化工作流设计',
        '智能脚本执行',
        '定时任务调度',
        '错误自动恢复'
      ]
    }
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // 加载用户信息
      const userResponse = await apiService.get('/settings/user');
      if (userResponse.success) {
        setUserName(userResponse.data.user.username);
      }

      // 加载统计数据
      const statsResponse = await apiService.get('/dashboard/stats');
      if (statsResponse.success) {
        setStats({
          projects: statsResponse.data.totalProjects,
          workflows: statsResponse.data.totalWorkflows,
          scripts: statsResponse.data.totalScripts,
          conversations: 0 // 暂时设为0，可以从chat API获取
        });
      }

      // 加载最近活动（模拟数据）
      setRecentActivities([
        {
          id: '1',
          type: 'project',
          title: 'Web设计项目',
          description: '创建了新的Web设计项目',
          timestamp: '2小时前',
          icon: '📁'
        },
        {
          id: '2',
          type: 'workflow',
          title: '图片处理流程',
          description: '完成了图片批处理工作流',
          timestamp: '5小时前',
          icon: '⚙️'
        },
        {
          id: '3',
          type: 'chat',
          title: 'AI对话',
          description: '与AI助手讨论了设计方案',
          timestamp: '1天前',
          icon: '🤖'
        },
        {
          id: '4',
          type: 'script',
          title: '自动化脚本',
          description: '执行了文件重命名脚本',
          timestamp: '2天前',
          icon: '📜'
        }
      ]);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      // 使用默认值
      setUserName('创作者');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.comingSoon) {
      alert('此功能即将推出，敬请期待！');
      return;
    }
    navigate(action.route);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme as any);
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      project: '📁',
      workflow: '⚙️',
      script: '📜',
      chat: '🤖'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* 顶部导航栏 */}
      <div className="relative z-10 border-b border-gray-800 bg-gray-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎨</span>
                </div>
                <h1 className="text-xl font-bold">创作工坊</h1>
              </div>
              
              <nav className="hidden md:flex items-center space-x-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-300 hover:text-white transition"
                >
                  仪表板
                </button>
                <button
                  onClick={() => navigate('/projects')}
                  className="text-gray-300 hover:text-white transition"
                >
                  项目
                </button>
                <button
                  onClick={() => navigate('/workflows')}
                  className="text-gray-300 hover:text-white transition"
                >
                  工作流
                </button>
                <button
                  onClick={() => navigate('/ai-chat')}
                  className="text-gray-300 hover:text-white transition"
                >
                  AI助手
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleThemeToggle}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                ⚙️
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <span className="text-sm text-gray-300">{userName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* 欢迎区域 */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {getTimeGreeting()}，{userName}！
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            欢迎回到创作工坊！让我们一起开启今天的创意之旅
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-400">{stats.projects}</div>
                <div className="text-gray-400 text-sm mt-1">项目</div>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-purple-400">{stats.workflows}</div>
                <div className="text-gray-400 text-sm mt-1">工作流</div>
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-orange-400">{stats.scripts}</div>
                <div className="text-gray-400 text-sm mt-1">脚本</div>
              </div>
              <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📜</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-400">{stats.conversations}</div>
                <div className="text-gray-400 text-sm mt-1">对话</div>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6">快速开始</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="group relative bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all hover:transform hover:scale-105 text-left"
                disabled={action.comingSoon}
              >
                {action.comingSoon && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                    即将推出
                  </div>
                )}
                
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="text-2xl">{action.icon}</span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold mb-1">{action.title}</h4>
                    <p className="text-gray-400 text-sm">{action.description}</p>
                  </div>
                </div>
                
                <div className="mt-4 text-gray-500 text-sm group-hover:text-gray-300 transition">
                  → 开始使用
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 功能介绍 */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6">探索功能</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featureCards.map(card => (
              <div key={card.id} className="bg-gray-800/50 backdrop-blur rounded-xl p-8 border border-gray-700">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">{card.icon}</span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold mb-3">{card.title}</h4>
                    <p className="text-gray-400 mb-4">{card.description}</p>
                    
                    <ul className="space-y-2">
                      {card.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 最近活动 */}
        {recentActivities.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">最近活动</h3>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-blue-400 hover:text-blue-300 transition"
              >
                查看全部 →
              </button>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700">
              {recentActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`flex items-center space-x-4 p-4 ${index !== recentActivities.length - 1 ? 'border-b border-gray-700' : ''}`}
                >
                  <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{getActivityIcon(activity.type)}</span>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{activity.title}</h4>
                    <p className="text-gray-400 text-sm">{activity.description}</p>
                  </div>
                  
                  <div className="text-gray-500 text-sm">
                    {activity.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部行动区域 */}
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold mb-4">准备开始创作了吗？</h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            无论是专业项目还是个人创作，创作工坊都能为您提供强大的工具和支持
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleQuickAction(quickActions[0])}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition"
            >
              创建第一个项目
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              查看仪表板
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};