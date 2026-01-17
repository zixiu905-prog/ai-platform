import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import { useDesktopTheme } from '../contexts/DesktopThemeContext';
import apiService from '../services/apiService';

// 类型定义
interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  phone?: string;
  wechatId?: string;
  isActive: boolean;
  isPaid: boolean;
  role: string;
  createdAt: string;
}

interface UserProfile {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  preferences: any;
  learningGoals: string[];
}

interface UserSoftware {
  id: string;
  softwareId: string;
  apiKey?: string;
  settings?: any;
  status: string;
  connectedAt?: string;
  software: {
    id: string;
    name: string;
    displayName: string;
    category: string;
    version: string;
    features: string[];
  };
}

interface AppSettings {
  theme: 'dark' | 'light';
  language: string;
  autoSave: boolean;
  autoSaveInterval: number;
  notifications: {
    desktop: boolean;
    email: boolean;
    sound: boolean;
  };
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
    lineNumbers: boolean;
    minimap: boolean;
  };
  workflow: {
    autoLayout: boolean;
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
  };
  performance: {
    maxMemory: number;
    enableGPU: boolean;
    cacheSize: number;
  };
}

export const DesktopSettings: React.FC = () => {
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  const { theme, setTheme } = useDesktopTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'software' | 'app' | 'notifications' | 'system'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 用户信息
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // 软件连接
  const [userSoftwares, setUserSoftwares] = useState<UserSoftware[]>([]);
  
  // 应用设置
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'dark',
    language: 'zh-CN',
    autoSave: true,
    autoSaveInterval: 30,
    notifications: {
      desktop: true,
      email: false,
      sound: true
    },
    editor: {
      fontSize: 14,
      fontFamily: 'JetBrains Mono',
      tabSize: 2,
      wordWrap: true,
      lineNumbers: true,
      minimap: true
    },
    workflow: {
      autoLayout: true,
      showGrid: true,
      snapToGrid: true,
      gridSize: 20
    },
    performance: {
      maxMemory: 4096,
      enableGPU: true,
      cacheSize: 1024
    }
  });

  // 表单数据
  const [profileForm, setProfileForm] = useState({
    username: '',
    avatar: '',
    phone: ''
  });

  const [preferencesForm, setPreferencesForm] = useState({
    skillLevel: 'beginner' as UserProfile['skillLevel'],
    interests: [] as string[],
    learningGoals: [] as string[]
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const [userResponse, softwareResponse, appResponse] = await Promise.all([
        apiService.get('/settings/user'),
        apiService.get('/settings/software'),
        apiService.get('/settings/app')
      ]);

      if (userResponse.success) {
        setUserInfo(userResponse.data.user);
        setUserProfile(userResponse.data.profile);
        setProfileForm({
          username: userResponse.data.user.username,
          avatar: userResponse.data.user.avatar || '',
          phone: userResponse.data.user.phone || ''
        });
        setPreferencesForm({
          skillLevel: userResponse.data.profile.skillLevel,
          interests: userResponse.data.profile.interests,
          learningGoals: userResponse.data.profile.learningGoals
        });
      }

      if (softwareResponse.success) {
        setUserSoftwares(softwareResponse.data);
      }

      if (appResponse.success) {
        setAppSettings(appResponse.data);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      await apiService.put('/settings/user/profile', profileForm);
      
      // 重新加载用户信息
      const userResponse = await apiService.get('/settings/user');
      if (userResponse.success) {
        setUserInfo(userResponse.data.user);
      }
    } catch (error) {
      console.error('保存个人信息失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      
      await apiService.put('/settings/user/preferences', preferencesForm);
      
      // 重新加载用户配置
      const userResponse = await apiService.get('/settings/user');
      if (userResponse.success) {
        setUserProfile(userResponse.data.profile);
      }
    } catch (error) {
      console.error('保存偏好设置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppSettings = async () => {
    try {
      setSaving(true);
      
      await apiService.put('/settings/app', appSettings);
    } catch (error) {
      console.error('保存应用设置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSoftwareConnection = async (softwareId: string) => {
    try {
      const response = await apiService.post(`/settings/software/${softwareId}/test`);
      if (response.success) {
        alert(`连接成功！延迟: ${response.data.latency}ms`);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      alert('连接测试失败');
    }
  };

  const handleAvatarChange = async () => {
    if (electronAPI?.dialog) {
      try {
        // @ts-ignore
        const result = await electronAPI.dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
          ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
          setProfileForm({ ...profileForm, avatar: result.filePaths[0] });
        }
      } catch (error) {
        console.error('选择头像失败:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载设置中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 头部工具栏 */}
      <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-400 hover:text-white transition"
              >
                ← 返回
              </button>
              <h1 className="text-xl font-semibold">设置</h1>
            </div>
            
            {activeTab === 'profile' && (
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            )}
            
            {activeTab === 'preferences' && (
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            )}
            
            {activeTab === 'app' && (
              <button
                onClick={handleSaveAppSettings}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* 左侧导航 */}
        <div className="w-64 border-r border-gray-700 bg-gray-800/30 backdrop-blur">
          <div className="p-4">
            <nav className="space-y-1">
              {[
                { key: 'profile', label: '个人信息', icon: '👤' },
                { key: 'preferences', label: '偏好设置', icon: '⚙️' },
                { key: 'software', label: '软件连接', icon: '🔗' },
                { key: 'app', label: '应用设置', icon: '🖥️' },
                { key: 'notifications', label: '通知设置', icon: '🔔' },
                { key: 'system', label: '系统设置', icon: '🛠️' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                    activeTab === tab.key
                      ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 个人信息 */}
          {activeTab === 'profile' && userInfo && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">基本信息</h2>
                
                <div className="space-y-6">
                  {/* 头像 */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center">
                        {profileForm.avatar ? (
                          <img src={profileForm.avatar} alt="头像" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-3xl">👤</span>
                        )}
                      </div>
                      <button
                        onClick={handleAvatarChange}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition"
                      >
                        📷
                      </button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-xl font-semibold">{userInfo.username}</div>
                      <div className="text-gray-400">{userInfo.email}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {userInfo.role === 'ADMIN' ? '管理员' : 
                         userInfo.role === 'SUPER_ADMIN' ? '超级管理员' : '普通用户'}
                        {userInfo.isPaid && <span className="ml-2 text-yellow-400">💎 付费用户</span>}
                      </div>
                    </div>
                  </div>

                  {/* 表单字段 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        邮箱
                      </label>
                      <input
                        type="email"
                        value={userInfo.email}
                        disabled
                        className="w-full px-3 py-2 bg-gray-700/30 border border-gray-700 rounded-lg text-gray-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        手机号
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        注册时间
                      </label>
                      <input
                        type="text"
                        value={new Date(userInfo.createdAt).toLocaleDateString()}
                        disabled
                        className="w-full px-3 py-2 bg-gray-700/30 border border-gray-700 rounded-lg text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 偏好设置 */}
          {activeTab === 'preferences' && userProfile && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">技能与兴趣</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      技能水平
                    </label>
                    <select
                      value={preferencesForm.skillLevel}
                      onChange={(e) => setPreferencesForm({ ...preferencesForm, skillLevel: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="beginner">初学者</option>
                      <option value="intermediate">中级</option>
                      <option value="advanced">高级</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      兴趣标签
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {preferencesForm.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const interest = prompt('输入兴趣标签:');
                        if (interest) {
                          setPreferencesForm({
                            ...preferencesForm,
                            interests: [...preferencesForm.interests, interest]
                          });
                        }
                      }}
                      className="px-3 py-1 border border-dashed border-gray-600 text-gray-400 rounded-lg text-sm hover:border-gray-500"
                    >
                      + 添加标签
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      学习目标
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {preferencesForm.learningGoals.map((goal, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-600/20 text-green-400 rounded-lg text-sm"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const goal = prompt('输入学习目标:');
                        if (goal) {
                          setPreferencesForm({
                            ...preferencesForm,
                            learningGoals: [...preferencesForm.learningGoals, goal]
                          });
                        }
                      }}
                      className="px-3 py-1 border border-dashed border-gray-600 text-gray-400 rounded-lg text-sm hover:border-gray-500"
                    >
                      + 添加目标
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 软件连接 */}
          {activeTab === 'software' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">设计软件连接</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {userSoftwares.map(userSoftware => (
                    <div key={userSoftware.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{userSoftware.software.displayName}</h3>
                          <div className="text-sm text-gray-400">{userSoftware.software.name}</div>
                          <div className="text-xs text-gray-500">v{userSoftware.software.version}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          userSoftware.status === 'connected' ? 'bg-green-600/20 text-green-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {userSoftware.status === 'connected' ? '已连接' : '未连接'}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-400">API密钥</label>
                          <input
                            type="password"
                            value={userSoftware.apiKey || ''}
                            onChange={(e) => {
                              const updated = userSoftwares.map(us =>
                                us.id === userSoftware.id
                                  ? { ...us, apiKey: e.target.value }
                                  : us
                              );
                              setUserSoftwares(updated);
                            }}
                            className="w-full mt-1 px-2 py-1 bg-gray-600/50 rounded border border-gray-600 text-sm"
                            placeholder="输入API密钥"
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTestSoftwareConnection(userSoftware.id)}
                            className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                          >
                            测试连接
                          </button>
                          <button
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition"
                          >
                            配置
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 应用设置 */}
          {activeTab === 'app' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* 外观设置 */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">外观</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      主题
                    </label>
                    <select
                      value={appSettings.theme}
                      onChange={(e) => setAppSettings({ ...appSettings, theme: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="dark">深色</option>
                      <option value="light">浅色</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      语言
                    </label>
                    <select
                      value={appSettings.language}
                      onChange={(e) => setAppSettings({ ...appSettings, language: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 编辑器设置 */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">编辑器</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      字体大小
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="24"
                      value={appSettings.editor.fontSize}
                      onChange={(e) => setAppSettings({
                        ...appSettings,
                        editor: { ...appSettings.editor, fontSize: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      字体
                    </label>
                    <select
                      value={appSettings.editor.fontFamily}
                      onChange={(e) => setAppSettings({
                        ...appSettings,
                        editor: { ...appSettings.editor, fontFamily: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="Fira Code">Fira Code</option>
                      <option value="Consolas">Consolas</option>
                      <option value="Monaco">Monaco</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Tab大小
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="8"
                      value={appSettings.editor.tabSize}
                      onChange={(e) => setAppSettings({
                        ...appSettings,
                        editor: { ...appSettings.editor, tabSize: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={appSettings.editor.wordWrap}
                      onChange={(e) => setAppSettings({
                        ...appSettings,
                        editor: { ...appSettings.editor, wordWrap: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span>自动换行</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={appSettings.editor.lineNumbers}
                      onChange={(e) => setAppSettings({
                        ...appSettings,
                        editor: { ...appSettings.editor, lineNumbers: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span>显示行号</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={appSettings.editor.minimap}
                      onChange={(e) => setAppSettings({
                        ...appSettings,
                        editor: { ...appSettings.editor, minimap: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span>显示缩略图</span>
                  </label>
                </div>
              </div>

              {/* 性能设置 */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">性能</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={appSettings.performance.enableGPU}
                      onChange={(e) => setAppSettings({
                        ...appSettings,
                        performance: { ...appSettings.performance, enableGPU: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <span>启用GPU加速</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={appSettings.autoSave}
                      onChange={(e) => setAppSettings({ ...appSettings, autoSave: e.target.checked })}
                      className="rounded"
                    />
                    <span>自动保存</span>
                  </label>
                  
                  {appSettings.autoSave && (
                    <div className="ml-6">
                      <label className="block text-sm text-gray-400 mb-1">
                        自动保存间隔 (秒)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={appSettings.autoSaveInterval}
                        onChange={(e) => setAppSettings({
                          ...appSettings,
                          autoSaveInterval: parseInt(e.target.value)
                        })}
                        className="w-32 px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 通知设置 */}
          {activeTab === 'notifications' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">通知偏好</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium mb-3">系统通知</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={appSettings.notifications.desktop}
                          onChange={(e) => setAppSettings({
                            ...appSettings,
                            notifications: { ...appSettings.notifications, desktop: e.target.checked }
                          })}
                          className="rounded"
                        />
                        <span>桌面通知</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={appSettings.notifications.email}
                          onChange={(e) => setAppSettings({
                            ...appSettings,
                            notifications: { ...appSettings.notifications, email: e.target.checked }
                          })}
                          className="rounded"
                        />
                        <span>邮件通知</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={appSettings.notifications.sound}
                          onChange={(e) => setAppSettings({
                            ...appSettings,
                            notifications: { ...appSettings.notifications, sound: e.target.checked }
                          })}
                          className="rounded"
                        />
                        <span>声音提醒</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium mb-3">项目通知</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>项目创建</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>项目更新</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span>项目删除</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>截止日期提醒</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium mb-3">工作流通知</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>工作流完成</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>工作流失败</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span>工作流开始</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-md font-medium mb-3">AI通知</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>AI回复</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>AI建议</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 系统设置 */}
          {activeTab === 'system' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">系统信息</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-400">应用版本</span>
                    <span>1.0.0</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-400">Electron版本</span>
                    <span>{process.versions.electron}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-400">Node.js版本</span>
                    <span>{process.versions.node}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-400">平台</span>
                    <span>{process.platform}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-gray-700/50">
                    <span className="text-gray-400">架构</span>
                    <span>{process.arch}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold mb-6">维护</h2>
                
                <div className="space-y-4">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    清理缓存
                  </button>
                  
                  <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    导出设置
                  </button>
                  
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    导入设置
                  </button>
                  
                  <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
                    重置设置
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};