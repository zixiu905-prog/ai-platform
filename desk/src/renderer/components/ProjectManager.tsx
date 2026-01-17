import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FolderPlus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  MoreHorizontal,
  Calendar,
  Clock,
  Users,
  Star,
  Archive,
  Trash2,
  Edit,
  Eye,
  Play,
  FileText,
  Image,
  Video,
  Code
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  type: 'design' | 'development' | 'workflow' | 'ai_project';
  status: 'active' | 'archived' | 'completed';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  team?: string[];
  files: {
    total: number;
    size: string;
  };
  aiFeatures?: {
    enabled: boolean;
    usage: number;
  };
}

interface ProjectManagerProps {
  className?: string;
}

const projectTypes = {
  design: { icon: Image, label: '设计项目', color: 'bg-blue-500' },
  development: { icon: Code, label: '开发项目', color: 'bg-green-500' },
  workflow: { icon: Play, label: '工作流', color: 'bg-purple-500' },
  ai_project: { icon: Star, label: 'AI项目', color: 'bg-orange-500' }
};

const statusColors = {
  active: 'bg-green-500',
  archived: 'bg-gray-500',
  completed: 'bg-blue-500'
};

const priorityColors = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-yellow-200 text-yellow-800',
  high: 'bg-red-200 text-red-800'
};

export const ProjectManager: React.FC<ProjectManagerProps> = ({ className }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 模拟项目数据
  const mockProjects: Project[] = [
    {
      id: '1',
      name: '品牌视觉设计',
      description: '为新产品线设计完整的品牌视觉识别系统',
      type: 'design',
      status: 'active',
      priority: 'high',
      progress: 65,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      tags: ['品牌', 'Logo', 'VI设计'],
      team: ['Alice', 'Bob'],
      files: { total: 45, size: '2.3GB' },
      aiFeatures: { enabled: true, usage: 75 }
    },
    {
      id: '2',
      name: '3D产品建模',
      description: '创建产品的3D模型用于营销材料',
      type: 'design',
      status: 'active',
      priority: 'medium',
      progress: 40,
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-19'),
      tags: ['3D', 'Blender', '建模'],
      team: ['Charlie'],
      files: { total: 23, size: '890MB' },
      aiFeatures: { enabled: true, usage: 45 }
    },
    {
      id: '3',
      name: '自动化工作流',
      description: '设计自动化设计任务的工作流程',
      type: 'workflow',
      status: 'completed',
      priority: 'high',
      progress: 100,
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-18'),
      tags: ['自动化', 'N8N', '效率'],
      team: ['David', 'Eve'],
      files: { total: 12, size: '120MB' },
      aiFeatures: { enabled: false, usage: 0 }
    },
    {
      id: '4',
      name: 'AI图像生成系统',
      description: '开发基于AI的图像生成和管理系统',
      type: 'ai_project',
      status: 'active',
      priority: 'high',
      progress: 25,
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-21'),
      tags: ['AI', '图像生成', '深度学习'],
      team: ['Frank', 'Grace'],
      files: { total: 67, size: '1.8GB' },
      aiFeatures: { enabled: true, usage: 90 }
    },
    {
      id: '5',
      name: '网站重构项目',
      description: '重构公司官网，提升用户体验和性能',
      type: 'development',
      status: 'active',
      priority: 'medium',
      progress: 80,
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-20'),
      tags: ['React', 'TypeScript', '重构'],
      team: ['Henry', 'Ivy', 'Jack'],
      files: { total: 156, size: '3.2GB' },
      aiFeatures: { enabled: true, usage: 60 }
    }
  ];

  useEffect(() => {
    // 模拟加载项目数据
    setTimeout(() => {
      setProjects(mockProjects);
      setLoading(false);
    }, 1000);
  }, []);

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || project.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || project.priority === selectedPriority;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  // 创建新项目
  const createProject = () => {
    // TODO: 实现创建项目功能
    console.log('创建新项目');
  };

  // 打开项目
  const openProject = (projectId: string) => {
    // TODO: 实现打开项目功能
    console.log('打开项目:', projectId);
  };

  // 获取项目统计
  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalFiles: projects.reduce((acc, p) => acc + p.files.total, 0),
    totalAIUsage: Math.round(projects.reduce((acc, p) => acc + (p.aiFeatures?.usage || 0), 0) / projects.length)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500/20 border-t-blue-500 mx-auto mb-4"></div>
          <p>加载项目数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">项目管理</h2>
          <p className="text-muted-foreground">
            管理您的设计和开发项目
          </p>
        </div>
        <Button onClick={createProject}>
          <FolderPlus className="h-4 w-4 mr-2" />
          新建项目
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{projectStats.total}</p>
                <p className="text-sm text-muted-foreground">总项目数</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{projectStats.active}</p>
                <p className="text-sm text-muted-foreground">进行中</p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{projectStats.completed}</p>
                <p className="text-sm text-muted-foreground">已完成</p>
              </div>
              <Star className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{projectStats.totalFiles}</p>
                <p className="text-sm text-muted-foreground">总文件数</p>
              </div>
              <Image className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{projectStats.totalAIUsage}%</p>
                <p className="text-sm text-muted-foreground">AI使用率</p>
              </div>
              <Star className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索项目..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有类型</option>
            {Object.entries(projectTypes).map(([key, type]) => (
              <option key={key} value={key}>{type.label}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有状态</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="archived">已归档</option>
          </select>
          
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有优先级</option>
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">没有找到项目</h3>
          <p className="text-muted-foreground">创建您的第一个项目开始使用</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
            : 'space-y-4'
        }>
          {filteredProjects.map((project) => {
            const TypeIcon = projectTypes[project.type].icon;
            
            return (
              <Card key={project.id} className="transition-all hover:shadow-md cursor-pointer"
                    onClick={() => openProject(project.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-md ${projectTypes[project.type].color} text-white`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription>
                          {projectTypes[project.type].label}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                  
                  {/* 进度条 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>进度</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} />
                  </div>
                  
                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {project.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  
                  {/* 状态和优先级 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                      <span className="text-xs text-muted-foreground">
                        {project.status === 'active' ? '进行中' : 
                         project.status === 'completed' ? '已完成' : '已归档'}
                      </span>
                    </div>
                    
                    <Badge variant="outline" className={`text-xs ${priorityColors[project.priority]}`}>
                      {project.priority === 'high' ? '高' : 
                       project.priority === 'medium' ? '中' : '低'}优先级
                    </Badge>
                  </div>
                  
                  {/* 底部信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {project.updatedAt.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {project.files.total} 文件
                      </span>
                    </div>
                    
                    {project.aiFeatures?.enabled && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <Star className="h-3 w-3" />
                        {project.aiFeatures.usage}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectManager;