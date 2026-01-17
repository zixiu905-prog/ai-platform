import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantService, Tenant, UserTenant, TenantStats, AuditLog } from '../services/tenantService';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import Layout from '../components/Layout';

const TenantManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'audit'>('overview');

  // UI状态
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);

  // 表单状态
  const [newTenant, setNewTenant] = useState({
    name: '',
    domain: '',
    plan: 'basic' as const,
    settings: {
      maxUsers: 10,
      maxProjects: 50,
      storageQuota: 1073741824, // 1GB
    }
  });

  const [newUser, setNewUser] = useState({
    userId: '',
    role: 'user' as const,
    permissions: [] as string[]
  });

  const [tenantSettings, setTenantSettings] = useState<any>(currentTenant?.settings || {});

  useEffect(() => {
    loadTenantData();
  }, []);

  useEffect(() => {
    setTenantSettings(currentTenant?.settings || {});
  }, [currentTenant]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      const [current, tenants, stats, logs] = await Promise.all([
        tenantService.getCurrentTenant(),
        tenantService.getUserTenants(),
        tenantService.getTenantStats(),
        tenantService.getAuditLogs({ limit: 20 })
      ]);

      setCurrentTenant(current);
      setUserTenants(tenants);
      setTenantStats(stats);
      setAuditLogs(logs.logs);
    } catch (error) {
      console.error('加载租户数据失败:', error);
      toast.error('加载租户数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    try {
      const tenant = await tenantService.createTenant(newTenant);
      toast.success(`租户 "${tenant.name}" 创建成功`);
      setShowCreateTenant(false);
      setNewTenant({
        name: '',
        domain: '',
        plan: 'basic',
        settings: {
          maxUsers: 10,
          maxProjects: 50,
          storageQuota: 1073741824,
        }
      });
      loadTenantData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建租户失败');
    }
  };

  const handleAddUser = async () => {
    try {
      const userTenant = await tenantService.addUserToTenant(
        newUser.userId,
        newUser.role,
        newUser.permissions
      );
      toast.success('用户添加成功');
      setShowAddUser(false);
      setNewUser({
        userId: '',
        role: 'user',
        permissions: []
      });
      loadTenantData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '添加用户失败');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const updatedTenant = await tenantService.updateCurrentTenantSettings(tenantSettings);
      setCurrentTenant(updatedTenant);
      setEditingSettings(false);
      toast.success('租户设置更新成功');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新设置失败');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('确定要从租户中移除此用户吗？')) return;

    try {
      await tenantService.removeUserFromTenant(userId);
      toast.success('用户移除成功');
      loadTenantData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '移除用户失败');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: UserTenant['role']) => {
    try {
      await tenantService.updateUserRole(userId, role);
      toast.success('用户角色更新成功');
      loadTenantData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新用户角色失败');
    }
  };

  const planInfo = currentTenant ? tenantService.getPlanInfo(currentTenant.plan) : null;
  const statusInfo = currentTenant ? tenantService.getStatusInfo(currentTenant.status) : null;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!currentTenant) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">您还没有加入任何租户</h2>
            <p className="text-gray-600 mb-6">请联系租户管理员邀请您加入，或者创建新的租户。</p>
            <button
              onClick={() => setShowCreateTenant(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              创建新租户
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">租户管理</h1>
          <p className="text-gray-600 mt-2">管理您的租户、用户和设置</p>
        </div>

        {/* 租户信息卡片 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{currentTenant.name}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusInfo?.color === 'green' ? 'bg-green-100 text-green-800' :
                  statusInfo?.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {statusInfo?.name}
                </span>
                <span className="text-gray-600">{currentTenant.domain}</span>
                <span className="text-gray-600">{planInfo?.name}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">创建时间</p>
              <p className="text-gray-900">{new Date(currentTenant.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* 统计信息 */}
          {tenantStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">用户数量</p>
                <p className="text-2xl font-bold text-blue-900">
                  {tenantStats.users.total} / {currentTenant.settings.maxUsers}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {tenantStats.users.active} 活跃用户
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 mb-1">项目数量</p>
                <p className="text-2xl font-bold text-green-900">
                  {tenantStats.projects.total} / {currentTenant.settings.maxProjects}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {tenantStats.projects.active} 活跃项目
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 mb-1">存储使用</p>
                <p className="text-2xl font-bold text-purple-900">
                  {tenantService.formatStorageSize(tenantStats.storage.used)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  总计 {tenantService.formatStorageSize(tenantStats.storage.quota)}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 mb-1">AI功能</p>
                <p className="text-2xl font-bold text-orange-900">
                  {currentTenant.settings.aiFeatures.length}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {currentTenant.settings.aiFeatures.join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 标签页导航 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'users', 'settings', 'audit'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overview' && '概览'}
                {tab === 'users' && '用户管理'}
                {tab === 'settings' && '租户设置'}
                {tab === 'audit' && '审计日志'}
              </button>
            ))}
          </nav>
        </div>

        {/* 标签页内容 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowAddUser(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="text-blue-600 mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900">添加用户</h4>
                  <p className="text-sm text-gray-600">邀请新用户加入租户</p>
                </button>
                <button
                  onClick={() => setEditingSettings(true)}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="text-green-600 mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900">租户设置</h4>
                  <p className="text-sm text-gray-600">配置租户参数和限制</p>
                </button>
                <button
                  onClick={() => navigate('/projects')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="text-purple-600 mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900">项目管理</h4>
                  <p className="text-sm text-gray-600">查看和管理租户项目</p>
                </button>
              </div>
            </div>

            {/* 计划信息 */}
            {planInfo && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">当前计划</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{planInfo.name}</h4>
                    <p className="text-gray-600">{planInfo.price}</p>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    升级计划
                  </button>
                </div>
                <ul className="mt-4 space-y-2">
                  {planInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">用户管理</h3>
              <button
                onClick={() => setShowAddUser(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                添加用户
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {userTenants.map((userTenant) => {
                const roleInfo = tenantService.getRoleInfo(userTenant.role);
                return (
                  <div key={userTenant.userId} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {userTenant.userId.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">用户ID: {userTenant.userId}</p>
                        <p className="text-sm text-gray-500">
                          加入时间: {new Date(userTenant.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        roleInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                        roleInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        roleInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {roleInfo.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={userTenant.role}
                        onChange={(e) => handleUpdateUserRole(userTenant.userId, e.target.value as any)}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                      >
                        <option value="viewer">查看者</option>
                        <option value="user">用户</option>
                        <option value="admin">管理员</option>
                        <option value="owner">所有者</option>
                      </select>
                      {userTenant.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveUser(userTenant.userId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">租户设置</h3>
              {!editingSettings ? (
                <button
                  onClick={() => setEditingSettings(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  编辑设置
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingSettings(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpdateSettings}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    保存设置
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大用户数
                </label>
                <input
                  type="number"
                  value={tenantSettings.maxUsers || ''}
                  onChange={(e) => setTenantSettings({
                    ...tenantSettings,
                    maxUsers: parseInt(e.target.value) || 0
                  })}
                  disabled={!editingSettings}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大项目数
                </label>
                <input
                  type="number"
                  value={tenantSettings.maxProjects || ''}
                  onChange={(e) => setTenantSettings({
                    ...tenantSettings,
                    maxProjects: parseInt(e.target.value) || 0
                  })}
                  disabled={!editingSettings}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  存储配额 (字节)
                </label>
                <input
                  type="number"
                  value={tenantSettings.storageQuota || ''}
                  onChange={(e) => setTenantSettings({
                    ...tenantSettings,
                    storageQuota: parseInt(e.target.value) || 0
                  })}
                  disabled={!editingSettings}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {tenantService.formatStorageSize(tenantSettings.storageQuota || 0)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API速率限制
                </label>
                <input
                  type="number"
                  value={tenantSettings.apiRateLimit || ''}
                  onChange={(e) => setTenantSettings({
                    ...tenantSettings,
                    apiRateLimit: parseInt(e.target.value) || 0
                  })}
                  disabled={!editingSettings}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">审计日志</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{log.action}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    用户: {log.userId} | 资源: {log.resourceType}/{log.resourceId}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 创建租户模态框 */}
      {showCreateTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建新租户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">租户名称</label>
                <input
                  type="text"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">域名</label>
                <input
                  type="text"
                  value={newTenant.domain}
                  onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">计划</label>
                <select
                  value={newTenant.plan}
                  onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="basic">基础版</option>
                  <option value="professional">专业版</option>
                  <option value="enterprise">企业版</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowCreateTenant(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleCreateTenant}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加用户模态框 */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">添加用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户ID</label>
                <input
                  type="text"
                  value={newUser.userId}
                  onChange={(e) => setNewUser({ ...newUser, userId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="viewer">查看者</option>
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TenantManagement;