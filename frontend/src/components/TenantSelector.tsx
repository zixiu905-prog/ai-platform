import React, { useState, useEffect } from 'react';
import { tenantService, Tenant, UserTenant } from '../services/tenantService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

interface TenantSelectorProps {
  onTenantChange?: (tenant: Tenant) => void;
  currentTenantId?: string;
}

const TenantSelector: React.FC<TenantSelectorProps> = ({ 
  onTenantChange, 
  currentTenantId 
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserTenants();
  }, []);

  useEffect(() => {
    if (currentTenantId && userTenants.length > 0) {
      loadCurrentTenant();
    }
  }, [currentTenantId, userTenants]);

  const loadUserTenants = async () => {
    try {
      const tenants = await tenantService.getUserTenants();
      setUserTenants(tenants);
    } catch (error) {
      console.error('加载用户租户失败:', error);
      addToast('加载租户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentTenant = async () => {
    try {
      const tenant = await tenantService.getTenant(currentTenantId!);
      setCurrentTenant(tenant);
      if (tenant && onTenantChange) {
        onTenantChange(tenant);
      }
    } catch (error) {
      console.error('加载当前租户失败:', error);
    }
  };

  const handleTenantSelect = async (userTenant: UserTenant) => {
    try {
      const tenant = await tenantService.getTenant(userTenant.tenantId);
      if (tenant) {
        setCurrentTenant(tenant);
        setIsOpen(false);
        
        // 更新URL参数
        const url = new URL(window.location.href);
        url.searchParams.set('tenant', tenant.id);
        window.history.pushState({}, '', url.toString());
        
        if (onTenantChange) {
          onTenantChange(tenant);
        }

        addToast(`已切换到租户: ${tenant.name}`, 'success');
      }
    } catch (error) {
      addToast('切换租户失败', 'error');
    }
  };

  const getRoleInfo = (role: UserTenant['role']) => {
    const roles = {
      owner: { name: '所有者', color: 'red' },
      admin: { name: '管理员', color: 'orange' },
      user: { name: '用户', color: 'blue' },
      viewer: { name: '查看者', color: 'gray' }
    };
    return roles[role];
  };

  const getPlanInfo = (plan: Tenant['plan']) => {
    const plans = {
      basic: { name: '基础版', color: 'gray' },
      professional: { name: '专业版', color: 'purple' },
      enterprise: { name: '企业版', color: 'gold' }
    };
    return plans[plan];
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  if (userTenants.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        暂无租户
      </div>
    );
  }

  if (userTenants.length === 1 && currentTenant) {
    const roleInfo = getRoleInfo(userTenants[0].role);
    const planInfo = getPlanInfo(currentTenant.plan);
    
    return (
      <div className="flex items-center space-x-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{currentTenant.name}</p>
          <p className="text-xs text-gray-500">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              roleInfo.color === 'red' ? 'bg-red-100 text-red-800' :
              roleInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
              roleInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {roleInfo.name}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ml-1 ${
              planInfo.color === 'gray' ? 'bg-gray-100 text-gray-800' :
              planInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {planInfo.name}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-md px-3 py-2 border border-gray-300"
      >
        {currentTenant ? (
          <>
            <div>
              <p className="font-medium">{currentTenant.name}</p>
              <p className="text-xs text-gray-500">
                {getRoleInfo(userTenants.find(ut => ut.tenantId === currentTenant.id)!.role).name}
              </p>
            </div>
          </>
        ) : (
          <span>选择租户</span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">选择租户</p>
          </div>
          <div className="py-1">
            {userTenants.map((userTenant) => {
              const roleInfo = getRoleInfo(userTenant.role);
              return (
                <button
                  key={userTenant.tenantId}
                  onClick={() => handleTenantSelect(userTenant)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    currentTenant?.id === userTenant.tenantId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {userTenant.tenantId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        加入时间: {new Date(userTenant.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      roleInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                      roleInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                      roleInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {roleInfo.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false);
                // 导航到租户管理页面
                window.location.href = '/tenant-management';
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              管理租户 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantSelector;