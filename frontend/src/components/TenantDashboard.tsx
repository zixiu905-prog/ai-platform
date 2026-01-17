import React, { useState, useEffect } from 'react';
import { tenantService, Tenant, TenantStats, AuditLog } from '../services/tenantService';
import { useToast } from '../hooks/useToast';

interface TenantDashboardProps {
  tenantId?: string;
}

const TenantDashboard: React.FC<TenantDashboardProps> = ({ tenantId }) => {
  const { addToast } = useToast();
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [quotaInfo, setQuotaInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (tenantId) {
      loadDashboardData();
    }
  }, [tenantId, timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [currentTenant, tenantStats, logs, quota] = await Promise.all([
        tenantService.getTenant(tenantId!),
        tenantService.getTenantStats(),
        tenantService.getAuditLogs({ 
          limit: 10,
          // 这里可以添加时间范围过滤
        }),
        tenantService.checkTenantQuota()
      ]);

      setTenant(currentTenant);
      setStats(tenantStats);
      setRecentLogs(logs.logs);
      setQuotaInfo(quota);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      addToast('加载仪表板数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((used / total) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  };

  const getPlanInfo = (plan: Tenant['plan']) => {
    const plans = {
      basic: { name: '基础版', color: 'gray' },
      professional: { name: '专业版', color: 'purple' },
      enterprise: { name: '企业版', color: 'gold' }
    };
    return plans[plan];
  };

  const getStatusInfo = (status: Tenant['status']) => {
    const statuses = {
      active: { name: '活跃', color: 'green' },
      suspended: { name: '暂停', color: 'red' },
      trial: { name: '试用', color: 'yellow' }
    };
    return statuses[status];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">无法加载租户信息</h3>
        <p className="text-gray-600">请检查租户ID是否正确</p>
      </div>
    );
  }

  const planInfo = getPlanInfo(tenant.plan);
  const statusInfo = getStatusInfo(tenant.status);

  return (
    <div className="space-y-6">
      {/* 租户基本信息 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{tenant.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {statusInfo.name}
              </span>
              <span className="text-gray-600">{tenant.domain}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                planInfo.color === 'gray' ? 'bg-gray-100 text-gray-800' :
                planInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {planInfo.name}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">创建时间</p>
            <p className="text-gray-900">{new Date(tenant.createdAt).toLocaleDateString()}</p>
            {tenant.expiresAt && (
              <>
                <p className="text-sm text-gray-500 mt-1">到期时间</p>
                <p className="text-gray-900">{new Date(tenant.expiresAt).toLocaleDateString()}</p>
              </>
            )}
          </div>
        </div>

        {/* 时间范围选择 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">时间范围:</span>
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '7d' && '7天'}
              {range === '30d' && '30天'}
              {range === '90d' && '90天'}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">用户</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.users.total}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats.users.active} 活跃用户
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${getUsagePercentage(stats.users.total, tenant.settings.maxUsers)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getUsagePercentage(stats.users.total, tenant.settings.maxUsers).toFixed(1)}% 使用
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">项目</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.projects.total}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats.projects.active} 活跃项目
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${getUsagePercentage(stats.projects.total, tenant.settings.maxProjects)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getUsagePercentage(stats.projects.total, tenant.settings.maxProjects).toFixed(1)}% 使用
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">存储</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tenantService.formatStorageSize(stats.storage.used)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                总计 {tenantService.formatStorageSize(stats.storage.quota)}
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full bg-${getUsageColor(getUsagePercentage(stats.storage.used, stats.storage.quota))}-600`}
                    style={{ width: `${getUsagePercentage(stats.storage.used, stats.storage.quota)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getUsagePercentage(stats.storage.used, stats.storage.quota).toFixed(1)}% 使用
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">AI功能</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {tenant.settings.aiFeatures.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                已启用功能
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {tenant.settings.aiFeatures.slice(0, 3).map((feature, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                    {feature}
                  </span>
                ))}
                {tenant.settings.aiFeatures.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                    +{tenant.settings.aiFeatures.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 配额警告 */}
      {quotaInfo && !quotaInfo.withinLimit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">配额警告</h3>
              <p className="text-sm text-red-700 mt-1">
                您的租户已超过某些资源配额限制，请考虑升级计划或清理数据。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 审计日志 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">最近活动</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-80 overflow-auto">
            {recentLogs.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">
                暂无活动记录
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{log.action}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {log.userId && <span>用户: {log.userId}</span>}
                    {log.resourceType && <span> | 资源: {log.resourceType}/{log.resourceId}</span>}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">查看详情</summary>
                      <pre className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 功能状态 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">功能状态</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">自定义品牌</span>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                tenant.settings.customBranding ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {tenant.settings.customBranding ? '已启用' : '未启用'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">单点登录 (SSO)</span>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                tenant.settings.ssoEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {tenant.settings.ssoEnabled ? '已启用' : '未启用'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">API访问</span>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {tenant.settings.apiRateLimit} 请求/小时
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">AI功能</span>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  {tenant.settings.aiFeatures.length} 个功能
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;