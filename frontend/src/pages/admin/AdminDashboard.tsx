import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Cpu, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import AdminOverview from './components/AdminOverview';
import UserManagement from './components/UserManagement';
// import SubscriptionManagement from './components/SubscriptionManagement';
// import AIModelManagement from './components/AIModelManagement';
// import SystemSettings from './components/SystemSettings';
// import AuditLogs from './components/AuditLogs';
// import FinancialReports from './components/FinancialReports';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
              <p className="text-sm text-gray-600">AiDesign 系统管理控制台</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>系统正常运行</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">概览</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">用户</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">订阅</span>
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">AI模型</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">财务</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">系统</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">审计</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="subscriptions">
            <div className="p-4">订阅管理功能开发中...</div>
          </TabsContent>

          <TabsContent value="ai-models">
            <div className="p-4">AI模型管理功能开发中...</div>
          </TabsContent>

          <TabsContent value="financial">
            <div className="p-4">财务报表功能开发中...</div>
          </TabsContent>

          <TabsContent value="system">
            <div className="p-4">系统设置功能开发中...</div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="p-4">审计日志功能开发中...</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;