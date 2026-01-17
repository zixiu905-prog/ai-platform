import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import workflowApi from '../services/workflowApi';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'error';
  nodes: number;
  edges: number;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

export const WorkflowList: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updatedAt');

  // 加载工作流列表
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setLoading(true);
        const response = await workflowApi.getWorkflows();
        
        if (response.success) {
          setWorkflows(response.data);
        } else {
          // 模拟数据
          setWorkflows([
            {
              id: 'workflow-1',
              name: '图片批处理工作流',
              description: '自动处理图片大小调整、水印添加和格式转换',
              status: 'active',
              nodes: 5,
              edges: 4,
              lastRun: '2024-12-18T10:30:00Z',
              createdAt: '2024-12-15T09:00:00Z',
              updatedAt: '2024-12-17T14:20:00Z'
            },
            {
              id: 'workflow-2',
              name: 'AI设计自动化',
              description: '使用AI自动生成设计概念和色彩方案',
              status: 'draft',
              nodes: 8,
              edges: 7,
              createdAt: '2024-12-16T11:00:00Z',
              updatedAt: '2024-12-18T09:15:00Z'
            },
            {
              id: 'workflow-3',
              name: '邮件通知系统',
              description: '定时发送邮件通知和状态更新',
              status: 'paused',
              nodes: 3,
              edges: 2,
              lastRun: '2024-12-17T16:45:00Z',
              createdAt: '2024-12-10T08:30:00Z',
              updatedAt: '2024-12-17T16:45:00Z'
            }
          ]);
        }
      } catch (error) {
        console.error('加载工作流列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflows();
  }, []);

  // 创建新工作流
  const handleCreateWorkflow = () => {
    const newWorkflowId = `workflow_${Date.now()}`;
    navigate(`/workflows/visual-editor/${newWorkflowId}`);
  };

  // 编辑工作流
  const handleEditWorkflow = (workflowId: string) => {
    navigate(`/workflows/visual-editor/${workflowId}`);
  };

  // 删除工作流
  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('确定要删除这个工作流吗？此操作不可恢复。')) return;

    try {
      const response = await workflowApi.deleteWorkflow(workflowId);
      
      if (response.success) {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      } else {
        alert('删除失败，请重试！');
      }
    } catch (error) {
      console.error('删除工作流失败:', error);
      alert('删除失败，请重试！');
    }
  };

  // 复制工作流
  const handleDuplicateWorkflow = async (workflowId: string) => {
    try {
      const response = await workflowApi.cloneWorkflow(workflowId);
      
      if (response.success) {
        // 重新加载列表
        const updatedResponse = await workflowApi.getWorkflows();
        if (updatedResponse.success) {
          setWorkflows(updatedResponse.data);
        }
      } else {
        alert('复制失败，请重试！');
      }
    } catch (error) {
      console.error('复制工作流失败:', error);
      alert('复制失败，请重试！');
    }
  };

  // 切换工作流状态
  const handleToggleStatus = async (workflowId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const response = await workflowApi.updateWorkflow(workflowId, { status: newStatus });

      if (response.success) {
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, status: newStatus as any } : w
        ));
      } else {
        alert('状态更新失败，请重试！');
      }
    } catch (error) {
      console.error('更新工作流状态失败:', error);
      alert('状态更新失败，请重试！');
    }
  };

  // 过滤和排序工作流
  const filteredWorkflows = workflows
    .filter(workflow => {
      const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        default: // updatedAt
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  // 获取状态徽章样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">运行中</Badge>;
      case 'paused':
        return <Badge variant="secondary">已暂停</Badge>;
      case 'draft':
        return <Badge variant="outline">草稿</Badge>;
      case 'error':
        return <Badge variant="destructive">错误</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载工作流列表...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">工作流管理</h1>
          <p className="text-muted-foreground mt-1">管理和创建自动化工作流</p>
        </div>
        <Button onClick={handleCreateWorkflow} className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>创建工作流</span>
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="搜索工作流名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">运行中</SelectItem>
            <SelectItem value="paused">已暂停</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="error">错误</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">更新时间</SelectItem>
            <SelectItem value="createdAt">创建时间</SelectItem>
            <SelectItem value="name">名称</SelectItem>
            <SelectItem value="status">状态</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 工作流列表 */}
      {filteredWorkflows.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无工作流</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? '没有找到匹配的工作流，请调整搜索条件'
              : '还没有创建任何工作流'
            }
          </p>
          <Button onClick={handleCreateWorkflow}>创建第一个工作流</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg truncate">{workflow.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {workflow.description}
                    </CardDescription>
                  </div>
                  {getStatusBadge(workflow.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span>📦 {workflow.nodes} 节点</span>
                      <span>🔗 {workflow.edges} 连接</span>
                    </div>
                  </div>

                  {/* 最后运行时间 */}
                  {workflow.lastRun && (
                    <div className="text-xs text-muted-foreground">
                      最后运行: {formatDate(workflow.lastRun)}
                    </div>
                  )}

                  {/* 更新时间 */}
                  <div className="text-xs text-muted-foreground">
                    更新于: {formatDate(workflow.updatedAt)}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWorkflow(workflow.id)}
                      className="flex-1"
                    >
                      编辑
                    </Button>
                    
                    {workflow.status === 'active' || workflow.status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(workflow.id, workflow.status)}
                        className="flex-1"
                      >
                        {workflow.status === 'active' ? '暂停' : '启动'}
                      </Button>
                    ) : null}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateWorkflow(workflow.id)}
                      title="复制"
                    >
                      📋
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      title="删除"
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 统计信息 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {workflows.length} 个工作流
            {searchTerm || statusFilter !== 'all' ? 
              `，显示 ${filteredWorkflows.length} 个` : 
              ''
            }
          </div>
          <div className="flex space-x-6 text-sm">
            <span className="text-green-600">运行中: {workflows.filter(w => w.status === 'active').length}</span>
            <span className="text-yellow-600">已暂停: {workflows.filter(w => w.status === 'paused').length}</span>
            <span className="text-gray-600">草稿: {workflows.filter(w => w.status === 'draft').length}</span>
            <span className="text-red-600">错误: {workflows.filter(w => w.status === 'error').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowList;