import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import { useDesktopTheme } from '../contexts/DesktopThemeContext';
import apiService from '../services/apiService';

// 类型定义
interface Project {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  path?: string;
  settings?: any;
  metadata?: any;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    email: string;
  };
  workflows: Array<{
    id: string;
    workflow: {
      id: string;
      name: string;
      status: string;
    };
  }>;
  scripts: Array<{
    id: string;
    script: {
      id: string;
      name: string;
      status: string;
    };
  }>;
  assets: Array<{
    id: string;
    name: string;
    type: string;
    size: bigint;
  }>;
  activities: Array<{
    id: string;
    action: string;
    target?: string;
    targetType?: string;
    details?: any;
    createdAt: string;
    user: {
      username: string;
    };
  }>;
}

interface ProjectStats {
  workflows: number;
  scripts: number;
  assets: number;
  recentActivities: number;
  progress: number;
  status: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export const DesktopProjectEditor: React.FC = () => {
  const { projectPath } = useParams<{ projectPath: string }>();
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  const { theme } = useDesktopTheme();

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'scripts' | 'assets' | 'settings'>('overview');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general',
    status: 'draft' as Project['status'],
    tags: [] as string[],
    priority: 'medium' as Project['priority'],
    deadline: '',
    progress: 0
  });

  useEffect(() => {
    if (projectPath) {
      loadProject();
    }
  }, [projectPath]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/projects/${projectPath}`);
      if (response.success) {
        setProject(response.data);
        setFormData({
          name: response.data.name,
          description: response.data.description || '',
          type: response.data.type,
          status: response.data.status,
          tags: response.data.tags,
          priority: response.data.priority,
          deadline: response.data.deadline ? new Date(response.data.deadline).toISOString().split('T')[0] : '',
          progress: response.data.progress
        });
        
        // 加载统计信息
        loadStats(projectPath);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (projectId: string) => {
    try {
      const response = await apiService.get(`/projects/${projectId}/stats`);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('加载项目统计失败:', error);
    }
  };

  const handleSave = async () => {
    if (!project) return;
    
    try {
      setSaving(true);
      const response = await apiService.put(`/projects/${project.id}`, {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      });
      
      if (response.success) {
        setProject(response.data);
        setEditing(false);
        loadStats(project.id);
      }
    } catch (error) {
      console.error('保存项目失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddWorkflow = async () => {
    navigate('/workflows/designer');
  };

  const handleAddScript = () => {
    // 打开脚本管理页面
    window.open('/scripts', '_blank');
  };

  const handleOpenInExplorer = async () => {
    if (project?.path && electronAPI?.shell) {
      try {
        // @ts-ignore
        await electronAPI.shell.showItemInFolder(project.path);
      } catch (error) {
        console.error('打开文件夹失败:', error);
      }
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-400';
      case 'active': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'archived': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'low': return 'text-gray-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载项目中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">项目不存在</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回仪表板
          </button>
        </div>
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
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editing ? formData.name : project.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  readOnly={!editing}
                  className={`text-xl font-semibold bg-transparent border-b ${editing ? 'border-blue-500 text-white' : 'border-transparent'} focus:outline-none`}
                />
                <span className={`text-sm ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span className={`text-sm ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {project.path && (
                <button
                  onClick={handleOpenInExplorer}
                  className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition text-sm"
                >
                  打开文件夹
                </button>
              )}
              
              {editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                >
                  编辑
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-700 bg-gray-800/30 backdrop-blur">
        <div className="px-6">
          <div className="flex space-x-8">
            {(['overview', 'workflows', 'scripts', 'assets', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 transition ${
                  activeTab === tab 
                    ? 'border-blue-500 text-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && '概览'}
                {tab === 'workflows' && '工作流'}
                {tab === 'scripts' && '脚本'}
                {tab === 'assets' && '资源'}
                {tab === 'settings' && '设置'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-6">
        {/* 概览标签页 */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧信息 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 基本信息 */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">基本信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">描述</label>
                    <textarea
                      value={editing ? formData.description : project.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      readOnly={!editing}
                      className={`w-full mt-1 px-3 py-2 bg-gray-700/50 rounded border ${editing ? 'border-gray-600' : 'border-transparent'} focus:outline-none focus:border-blue-500`}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">类型</label>
                      <select
                        value={editing ? formData.type : project.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        disabled={!editing}
                        className={`w-full mt-1 px-3 py-2 bg-gray-700/50 rounded border ${editing ? 'border-gray-600' : 'border-transparent'} focus:outline-none`}
                      >
                        <option value="general">常规项目</option>
                        <option value="video">视频项目</option>
                        <option value="design">设计项目</option>
                        <option value="development">开发项目</option>
                        <option value="automation">自动化项目</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400">优先级</label>
                      <select
                        value={editing ? formData.priority : project.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Project['priority'] })}
                        disabled={!editing}
                        className={`w-full mt-1 px-3 py-2 bg-gray-700/50 rounded border ${editing ? 'border-gray-600' : 'border-transparent'} focus:outline-none`}
                      >
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                        <option value="urgent">紧急</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">截止日期</label>
                      <input
                        type="date"
                        value={editing ? formData.deadline : project.deadline?.split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        disabled={!editing}
                        className={`w-full mt-1 px-3 py-2 bg-gray-700/50 rounded border ${editing ? 'border-gray-600' : 'border-transparent'} focus:outline-none`}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400">进度 ({formData.progress}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editing ? formData.progress : project.progress}
                        onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                        disabled={!editing}
                        className={`w-full mt-1 ${!editing && 'cursor-not-allowed'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              {stats && (
                <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">项目统计</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{stats.workflows}</div>
                      <div className="text-sm text-gray-400">工作流</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{stats.scripts}</div>
                      <div className="text-sm text-gray-400">脚本</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{stats.assets}</div>
                      <div className="text-sm text-gray-400">资源</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">{stats.recentActivities}</div>
                      <div className="text-sm text-gray-400">近期活动</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 最近活动 */}
              {project.activities.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">最近活动</h3>
                  <div className="space-y-3">
                    {project.activities.slice(0, 10).map(activity => (
                      <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="text-gray-300">{activity.user.username}</span>
                            <span className="mx-2 text-gray-500">•</span>
                            <span className="text-gray-400">{activity.action}</span>
                            {activity.target && (
                              <>
                                <span className="mx-2 text-gray-500">•</span>
                                <span className="text-gray-300">{activity.targetType}</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 右侧面板 */}
            <div className="space-y-6">
              {/* 快速操作 */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">快速操作</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleAddWorkflow}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    + 添加工作流
                  </button>
                  <button
                    onClick={handleAddScript}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                  >
                    + 添加脚本
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
                    + 上传资源
                  </button>
                </div>
              </div>

              {/* 项目标签 */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">标签</h3>
                <div className="flex flex-wrap gap-2">
                  {(editing ? formData.tags : project.tags).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  {editing && (
                    <button
                      onClick={() => {
                        const newTag = prompt('输入新标签:');
                        if (newTag) {
                          setFormData({ ...formData, tags: [...formData.tags, newTag] });
                        }
                      }}
                      className="px-2 py-1 border border-dashed border-gray-600 text-gray-400 rounded text-sm hover:border-gray-500"
                    >
                      + 添加
                    </button>
                  )}
                </div>
              </div>

              {/* 项目信息 */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold mb-4">项目信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">创建者</span>
                    <span>{project.author.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">创建时间</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">最后更新</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {project.path && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">项目路径</span>
                      <span className="text-xs text-gray-500">{project.path}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 工作流标签页 */}
        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">工作流管理</h3>
              <button
                onClick={handleAddWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                + 添加工作流
              </button>
            </div>
            
            {project.workflows.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {project.workflows.map(item => (
                  <div key={item.id} className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition">
                    <h4 className="font-semibold mb-2">{item.workflow.name}</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.workflow.status === 'active' ? 'bg-green-600/20 text-green-400' :
                        item.workflow.status === 'draft' ? 'bg-gray-600/20 text-gray-400' :
                        'bg-blue-600/20 text-blue-400'
                      }`}>
                        {item.workflow.status}
                      </span>
                      <button
                        onClick={() => navigate(`/workflows/designer/${item.workflow.id}`)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        编辑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="mb-4">暂无工作流</div>
                <button
                  onClick={handleAddWorkflow}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  创建第一个工作流
                </button>
              </div>
            )}
          </div>
        )}

        {/* 脚本标签页 */}
        {activeTab === 'scripts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">脚本管理</h3>
              <button
                onClick={handleAddScript}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                + 添加脚本
              </button>
            </div>
            
            {project.scripts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {project.scripts.map(item => (
                  <div key={item.id} className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition">
                    <h4 className="font-semibold mb-2">{item.script.name}</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.script.status === 'active' ? 'bg-green-600/20 text-green-400' :
                        item.script.status === 'draft' ? 'bg-gray-600/20 text-gray-400' :
                        'bg-blue-600/20 text-blue-400'
                      }`}>
                        {item.script.status}
                      </span>
                      <button className="text-green-400 hover:text-green-300">
                        编辑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="mb-4">暂无脚本</div>
                <button
                  onClick={handleAddScript}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  添加第一个脚本
                </button>
              </div>
            )}
          </div>
        )}

        {/* 资源标签页 */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">资源管理</h3>
              <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
                + 上传资源
              </button>
            </div>
            
            {project.assets.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {project.assets.map(asset => (
                  <div key={asset.id} className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                    <div className="aspect-video bg-gray-700 rounded mb-2 flex items-center justify-center">
                      <div className="text-gray-400 text-sm">{asset.type}</div>
                    </div>
                    <h4 className="font-semibold text-sm truncate">{asset.name}</h4>
                    <div className="text-xs text-gray-500 mt-1">
                      {(Number(asset.size) / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="mb-4">暂无资源</div>
                <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
                  上传第一个资源
                </button>
              </div>
            )}
          </div>
        )}

        {/* 设置标签页 */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">项目设置</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">项目状态</label>
                    <select
                      value={editing ? formData.status : project.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
                      disabled={!editing}
                      className={`w-full mt-1 px-3 py-2 bg-gray-700/50 rounded border ${editing ? 'border-gray-600' : 'border-transparent'} focus:outline-none`}
                    >
                      <option value="draft">草稿</option>
                      <option value="active">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="archived">已归档</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400">项目路径</label>
                    <input
                      type="text"
                      value={project.path || ''}
                      readOnly
                      className="w-full mt-1 px-3 py-2 bg-gray-700/50 rounded border border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 高级设置 */}
            <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">高级设置</h3>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span>启用自动保存</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span>启用版本控制</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span>允许团队协作</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};