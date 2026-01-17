import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Settings, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Upload
} from 'lucide-react';
import { toast } from 'react-toastify';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: any;
  settings: any;
  isActive: boolean;
  assignedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  successRate: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const AdminWorkflowManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('workflows');
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'material',
    definition: '',
    settings: '{}'
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const workflowCategories = [
    { value: 'material', label: '物料排版' },
    { value: 'graphics', label: '常规图形' },
    { value: 'photoshop', label: 'PS工作' },
    { value: 'interior', label: '室内外装修' },
    { value: 'landscape', label: '园林景观' }
  ];

  useEffect(() => {
    loadWorkflows();
    loadUsers();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.get('/api/workflows/admin');
      
      if (response?.success) {
        setWorkflows(response.data || []);
      } else {
        toast.error('加载工作流失败');
      }
    } catch (error) {
      console.error('加载工作流失败:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.get('/api/users');
      
      if (response?.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!formData.name || !formData.definition) {
      toast.error('请填写工作流名称和定义');
      return;
    }

    setIsLoading(true);
    try {
      const electronAPI = (window as any).electronAPI;
      const url = isEditing && selectedWorkflow 
        ? `/api/workflows/admin/${selectedWorkflow.id}`
        : '/api/workflows/admin';
      
      const method = isEditing ? 'put' : 'post';
      const response = await electronAPI?.api[method === 'put' ? 'post' : 'post'](url, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        definition: JSON.parse(formData.definition),
        settings: JSON.parse(formData.settings)
      });

      if (response?.success) {
        toast.success(isEditing ? '工作流更新成功' : '工作流创建成功');
        setIsEditing(false);
        setSelectedWorkflow(null);
        resetForm();
        loadWorkflows();
      } else {
        toast.error(response?.error || '操作失败');
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
      toast.error('操作失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWorkflow = (workflow: WorkflowTemplate) => {
    setSelectedWorkflow(workflow);
    setIsEditing(true);
    setFormData({
      name: workflow.name,
      description: workflow.description,
      category: workflow.category,
      definition: JSON.stringify(workflow.definition, null, 2),
      settings: JSON.stringify(workflow.settings, null, 2)
    });
    setActiveTab('editor');
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('确定要删除这个工作流吗？此操作不可恢复。')) {
      return;
    }

    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.post(`/api/workflows/admin/${workflowId}/delete`);
      
      if (response?.success) {
        toast.success('工作流删除成功');
        loadWorkflows();
      } else {
        toast.error(response?.error || '删除失败');
      }
    } catch (error) {
      console.error('删除工作流失败:', error);
      toast.error('删除失败，请稍后重试');
    }
  };

  const handleToggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.post(`/api/workflows/admin/${workflowId}/toggle`, {
        isActive: !isActive
      });
      
      if (response?.success) {
        toast.success(`工作流已${!isActive ? '启用' : '停用'}`);
        loadWorkflows();
      } else {
        toast.error(response?.error || '操作失败');
      }
    } catch (error) {
      console.error('切换工作流状态失败:', error);
      toast.error('操作失败，请稍后重试');
    }
  };

  const handleAssignUsers = async (workflowId: string, userIds: string[]) => {
    try {
      const electronAPI = (window as any).electronAPI;
      const response = await electronAPI?.api?.post(`/api/workflows/admin/${workflowId}/assign`, {
        userIds
      });
      
      if (response?.success) {
        toast.success('用户分配成功');
        loadWorkflows();
      } else {
        toast.error(response?.error || '分配失败');
      }
    } catch (error) {
      console.error('分配用户失败:', error);
      toast.error('分配失败，请稍后重试');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'material',
      definition: '',
      settings: '{}'
    });
  };

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? '已启用' : '已停用'}
    </Badge>
  );

  const getStatusIcon = (workflow: WorkflowTemplate) => {
    if (!workflow.isActive) return <XCircle className="w-4 h-4 text-gray-500" />;
    if (workflow.successRate >= 90) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (workflow.successRate >= 70) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">管理员工作流系统</h1>
            <Badge variant="secondary">管理员专用</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              返回主界面
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="workflows">工作流管理</TabsTrigger>
            <TabsTrigger value="editor">创建/编辑</TabsTrigger>
            <TabsTrigger value="assignments">用户分配</TabsTrigger>
            <TabsTrigger value="analytics">执行分析</TabsTrigger>
          </TabsList>

          {/* 工作流列表 */}
          <TabsContent value="workflows">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                      </div>
                      {getStatusIcon(workflow)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(workflow.isActive)}
                      <Badge variant="outline" size="sm">
                        {workflowCategories.find(c => c.value === workflow.category)?.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">执行次数:</span>
                        <span className="ml-1 font-medium">{workflow.executionCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">成功率:</span>
                        <span className="ml-1 font-medium">{workflow.successRate}%</span>
                      </div>
                    </div>

                    {workflow.assignedUsers.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-600">
                          已分配给 {workflow.assignedUsers.length} 个用户
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditWorkflow(workflow)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleWorkflow(workflow.id, workflow.isActive)}
                      >
                        {workflow.isActive ? (
                          <>
                            <Pause className="w-3 h-3 mr-1" />
                            停用
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            启用
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        删除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {workflows.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">暂无工作流</h3>
                <p className="text-gray-500">点击"创建/编辑"标签页开始创建第一个工作流</p>
              </div>
            )}
          </TabsContent>

          {/* 创建/编辑 */}
          <TabsContent value="editor">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isEditing ? '编辑工作流' : '创建新工作流'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">工作流名称 *</label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="输入工作流名称"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">分类 *</label>
                        <Select 
                          value={formData.category} 
                          onValueChange={(value) => setFormData({...formData, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {workflowCategories.map(category => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">描述</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="描述工作流的用途和功能"
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">工作流定义 (JSON) *</label>
                        <Textarea
                          value={formData.definition}
                          onChange={(e) => setFormData({...formData, definition: e.target.value})}
                          placeholder='{"nodes": [], "edges": [], "settings": {}}'
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">设置 (JSON)</label>
                        <Textarea
                          value={formData.settings}
                          onChange={(e) => setFormData({...formData, settings: e.target.value})}
                          placeholder='{"timeout": 300, "retries": 3}'
                          rows={6}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      <strong>工作流定义说明：</strong>
                      <br />
                      • 定义应为JSON格式，包含nodes和edges数组<br />
                      • nodes定义工作流中的各个节点<br />
                      • edges定义节点之间的连接关系<br />
                      • settings包含工作流的执行参数<br />
                      <br />
                      <strong>模板分类：</strong><br />
                      • 物料排版：常用物料排版模板<br />
                      • 常规图形：常用常规图形模板<br />
                      • PS工作：Photoshop相关工作模板<br />
                      • 室内外装修：室内外设计模板<br />
                      • 园林景观：园林景观设计模板
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveWorkflow}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                          保存中...
                        </>
                      ) : (
                        <>
                          {isEditing ? '更新工作流' : '创建工作流'}
                        </>
                      )}
                    </Button>
                    
                    {isEditing && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedWorkflow(null);
                          resetForm();
                        }}
                      >
                        取消
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 用户分配 */}
          <TabsContent value="assignments">
            <div className="space-y-6">
              {workflows.map(workflow => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{workflow.name}</CardTitle>
                      {getStatusBadge(workflow.isActive)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">分配用户</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {users.map(user => (
                            <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={workflow.assignedUsers.includes(user.id)}
                                onChange={(e) => {
                                  const newAssignments = e.target.checked
                                    ? [...workflow.assignedUsers, user.id]
                                    : workflow.assignedUsers.filter(id => id !== user.id);
                                  
                                  // 更新本地状态
                                  setWorkflows(prev => prev.map(w => 
                                    w.id === workflow.id 
                                      ? { ...w, assignedUsers: newAssignments }
                                      : w
                                  ));
                                  
                                  // 保存到服务器
                                  handleAssignUsers(workflow.id, newAssignments);
                                }}
                                className="rounded"
                              />
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <Badge variant="outline" size="sm">{user.role}</Badge>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>已分配 {workflow.assignedUsers.length} 个用户</span>
                        </div>
                        {workflow.lastExecuted && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>最后执行: {new Date(workflow.lastExecuted).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 执行分析 */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {workflows.map(workflow => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {workflow.name}
                      {getStatusIcon(workflow)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{workflow.executionCount}</div>
                        <div className="text-sm text-gray-600">总执行次数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{workflow.successRate}%</div>
                        <div className="text-sm text-gray-600">成功率</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{workflow.assignedUsers.length}</div>
                        <div className="text-sm text-gray-600">分配用户数</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {workflow.isActive ? '运行中' : '已停止'}
                        </div>
                        <div className="text-sm text-gray-600">当前状态</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminWorkflowManager;