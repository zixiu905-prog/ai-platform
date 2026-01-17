import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import { useDesktopTheme } from '../contexts/DesktopThemeContext';
import { FileUpload } from '../components/FileUpload';
import { VoiceInput } from '../components/VoiceInput';
import { NotificationCenter } from '../components/NotificationCenter';
import apiService from '../services/apiService';

// 类型定义
interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  subscription: {
    plan: string;
    tokens: number;
    expiresAt: string;
  };
}

interface TaskStatus {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  software?: string;
  startTime?: string;
  estimatedTime?: number;
}

interface Message {
  id: string;
  type: 'system' | 'notification' | 'reminder' | 'update';
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export const DesktopHome: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [currentTask, setCurrentTask] = useState<TaskStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'voice' | 'file'>('input');
  
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  const { resolvedTheme } = useDesktopTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await apiService.get('/api/user/profile');
        if (response.success) {
          setUserInfo(response.data);
        } else {
          // 模拟用户数据
          setUserInfo({
            id: 'user-123',
            username: 'AI设计师',
            email: 'designer@example.com',
            avatar: '',
            subscription: {
              plan: 'PROFESSIONAL',
              tokens: 8500,
              expiresAt: '2024-12-31'
            }
          });
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    };

    loadUserInfo();
  }, []);

  // 加载任务状态
  useEffect(() => {
    const loadTaskStatus = () => {
      // 模拟任务状态
      setCurrentTask({
        id: 'task-1',
        name: '建筑平面图设计',
        status: 'idle',
        progress: 0,
        software: 'AutoCAD'
      });
    };

    loadTaskStatus();
    
    // 定期更新任务状态
    const interval = setInterval(loadTaskStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // 加载消息
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await apiService.get('/api/messages/unread');
        if (response.success) {
          setMessages(response.data);
        } else {
          // 模拟消息数据
          setMessages([
            {
              id: 'msg-1',
              type: 'notification',
              title: '系统更新',
              content: '新版本已发布，包含AI功能增强',
              timestamp: '2024-12-18T10:30:00Z',
              read: false,
              priority: 'medium'
            },
            {
              id: 'msg-2',
              type: 'reminder',
              title: '订阅提醒',
              content: '您的订阅将在7天后到期',
              timestamp: '2024-12-18T09:00:00Z',
              read: false,
              priority: 'high'
            }
          ]);
        }
      } catch (error) {
        console.error('加载消息失败:', error);
      }
    };

    loadMessages();
  }, []);

  // 处理文本输入提交
  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    try {
      // 发送到AI处理
      const response = await apiService.post('/api/ai/process', {
        type: 'text',
        content: textInput,
        context: 'desktop'
      });

      if (response.success) {
        // 开始执行任务
        setCurrentTask({
          id: `task-${Date.now()}`,
          name: textInput,
          status: 'running',
          progress: 0,
          software: response.data.recommendedSoftware || 'AI'
        });
      }

      setTextInput('');
    } catch (error) {
      console.error('处理请求失败:', error);
    }
  };

  // 处理语音输入
  const handleVoiceInput = async (text: string, confidence: number) => {
    try {
      const response = await apiService.post('/api/ai/process', {
        type: 'voice',
        content: text,
        confidence,
        context: 'desktop'
      });

      if (response.success) {
        setCurrentTask({
          id: `task-${Date.now()}`,
          name: `语音任务: ${text.substring(0, 20)}...`,
          status: 'running',
          progress: 0,
          software: response.data.recommendedSoftware || 'AI'
        });
      }
    } catch (error) {
      console.error('处理语音输入失败:', error);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (result: any) => {
    try {
      const response = await apiService.post('/api/ai/process', {
        type: 'file',
        fileUrl: result.url,
        fileName: result.originalName,
        context: 'desktop'
      });

      if (response.success) {
        setCurrentTask({
          id: `task-${Date.now()}`,
          name: `文件处理: ${result.originalName}`,
          status: 'running',
          progress: 0,
          software: response.data.recommendedSoftware || 'AI'
        });
      }
    } catch (error) {
      console.error('处理文件失败:', error);
    }
  };

  // 暂停/继续任务
  const toggleTaskPause = async () => {
    if (!currentTask) return;

    const newStatus = currentTask.status === 'paused' ? 'running' : 'paused';
    
    try {
      // 通知后端更新任务状态
      const response = await apiService.put(`/api/task-management/${currentTask.id}/status`, {
        status: newStatus === 'paused' ? 'PAUSED' : 'RUNNING',
        progress: currentTask.progress
      });

      if (response.success) {
        setCurrentTask({
          ...currentTask,
          status: newStatus
        });
      }
    } catch (error) {
      console.error('更新任务状态失败:', error);
      // 即使后端调用失败，也更新本地状态
      setCurrentTask({
        ...currentTask,
        status: newStatus
      });
    }
  };

  // 打开官网
  const openWebsite = () => {
    if (electronAPI?.shell) {
      electronAPI.shell.openExternal('https://aidesign.com');
    } else {
      window.open('https://aidesign.com', '_blank');
    }
  };

  // 打开客服
  const openCustomerService = () => {
    if (electronAPI?.window) {
      // @ts-ignore
      electronAPI.window.openAIChat();
    } else {
      navigate('/ai-chat');
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'paused':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'error':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '执行中';
      case 'paused':
        return '已暂停';
      case 'completed':
        return '已完成';
      case 'error':
        return '执行失败';
      default:
        return '待机中';
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
      {/* 顶部导航栏 */}
      <div className="glass-panel border-b border-gray-700/50">
        <div className="flex items-center justify-between p-4">
          {/* Logo和标题 */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AiDesign</h1>
              <p className="text-xs text-gray-400">智能设计工作台</p>
            </div>
          </div>

          {/* 用户信息和操作 */}
          <div className="flex items-center space-x-4">
            {/* 通知中心 */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
                title="消息通知"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificationCenter
                  messages={messages}
                  onClose={() => setShowNotifications(false)}
                  onMarkRead={(messageId) => {
                    setMessages(prev => 
                      prev.map(m => m.id === messageId ? { ...m, read: true } : m)
                    );
                  }}
                />
              )}
            </div>

            {/* 官网按钮 */}
            <button
              onClick={openWebsite}
              className="px-3 py-1.5 text-sm glass-btn text-blue-400 hover:text-blue-300"
              title="访问官网"
            >
              🌐 官网
            </button>

            {/* 客服按钮 */}
            <button
              onClick={openCustomerService}
              className="px-3 py-1.5 text-sm glass-btn text-green-400 hover:text-green-300"
              title="AI客服"
            >
              💬 客服
            </button>

            {/* 用户信息 */}
            {userInfo && (
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-700">
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{userInfo.username}</div>
                  <div className="text-xs text-gray-400">{userInfo.subscription.plan}</div>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {userInfo.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* 左侧输入区域 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            {/* 输入方式切换 */}
            <div className="glass-panel p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">智能设计助手</h2>
                <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('input')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'input'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    📝 文字输入
                  </button>
                  <button
                    onClick={() => setActiveTab('voice')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'voice'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    🎤 语音输入
                  </button>
                  <button
                    onClick={() => setActiveTab('file')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'file'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    📁 文件上传
                  </button>
                </div>
              </div>

              {/* 输入内容 */}
              <div className="min-h-[300px]">
                {activeTab === 'input' && (
                  <div className="space-y-4">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="请输入您的设计需求、问题或指令...&#10;&#10;例如：&#10;• 设计一个现代风格的logo&#10;• 帮我优化这个平面布局&#10;• 生成一些建筑设计灵感"
                      className="w-full h-40 p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-400">
                        {textInput.length}/2000 字符
                      </div>
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || currentTask?.status === 'running'}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
                      >
                        发送请求
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'voice' && (
                  <div className="flex justify-center">
                    <VoiceInput
                      onTranscriptionComplete={handleVoiceInput}
                      compactMode={false}
                      showHistory={true}
                      showSettings={true}
                      className="w-full max-w-2xl"
                    />
                  </div>
                )}

                {activeTab === 'file' && (
                  <div className="max-w-2xl mx-auto">
                    <FileUpload
                      options={{
                        type: 'project',
                        multiple: true,
                        maxFiles: 5,
                        maxSize: 50,
                        allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'psd', 'ai', 'dwg', 'skp'],
                        onSuccess: handleFileUpload
                      }}
                      className="w-full"
                    >
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎨</div>
                        <h3 className="text-xl font-semibold text-white mb-2">上传设计文件</h3>
                        <p className="text-gray-400">支持图片、文档、设计软件格式</p>
                      </div>
                    </FileUpload>
                  </div>
                )}
              </div>
            </div>

            {/* 任务状态显示 */}
            {currentTask && (
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">当前任务</h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentTask.status)}`}>
                    {getStatusText(currentTask.status)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-white font-medium mb-2">{currentTask.name}</div>
                    {currentTask.software && (
                      <div className="text-sm text-gray-400 mb-3">
                        使用软件: {currentTask.software}
                      </div>
                    )}
                  </div>

                  {/* 进度条 */}
                  {currentTask.status === 'running' || currentTask.status === 'paused' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">执行进度</span>
                        <span className="text-white">{currentTask.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${currentTask.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : currentTask.status === 'completed' ? (
                    <div className="text-green-400 text-sm">✅ 任务执行完成</div>
                  ) : currentTask.status === 'error' ? (
                    <div className="text-red-400 text-sm">❌ 任务执行失败</div>
                  ) : null}

                  {/* 控制按钮 */}
                  <div className="flex space-x-3">
                    {(currentTask.status === 'running' || currentTask.status === 'paused') && (
                      <button
                        onClick={toggleTaskPause}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          currentTask.status === 'paused'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        }`}
                      >
                        {currentTask.status === 'paused' ? '▶️ 继续' : '⏸️ 暂停'}
                      </button>
                    )}

                    {currentTask.status === 'completed' && (
                      <button
                        onClick={() => setCurrentTask(null)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                      >
                        新任务
                      </button>
                    )}

                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-4 py-2 glass-btn text-blue-400 hover:text-blue-300"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧信息面板 */}
        <div className="w-80 border-l border-gray-700/50 p-6 space-y-6">
          {/* Token余额 */}
          {userInfo && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Token 余额</h3>
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {userInfo.subscription.tokens.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                订阅到期: {new Date(userInfo.subscription.expiresAt).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* 快速操作 */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">快速操作</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all"
              >
                📊 仪表板
              </button>
              <button
                onClick={() => navigate('/workflows/visual-editor')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all"
              >
                ⚡ 工作流设计
              </button>
              <button
                onClick={() => navigate('/scripts')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all"
              >
                📜 脚本管理
              </button>
              <button
                onClick={() => navigate('/projects')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all"
              >
                📁 项目管理
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all"
              >
                ⚙️ 系统设置
              </button>
            </div>
          </div>

          {/* 最近消息 */}
          {messages.length > 0 && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">最近消息</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.slice(0, 3).map((message) => (
                  <div key={message.id} className="p-2 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-white">{message.title}</div>
                      {!message.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{message.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopHome;