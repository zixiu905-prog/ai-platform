import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Monitor, 
  Play, 
  Settings, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Search,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';

interface SoftwareInfo {
  name: string;
  version: string;
  path: string;
  executable: string;
  category: 'design' | 'development' | 'modeling' | 'rendering' | 'other';
  status: 'installed' | 'not_installed' | 'unknown';
  lastUsed?: Date;
  capabilities?: string[];
}

interface SoftwareManagerProps {
  className?: string;
}

const categoryColors = {
  design: 'bg-blue-500',
  development: 'bg-green-500',
  modeling: 'bg-purple-500',
  rendering: 'bg-orange-500',
  other: 'bg-gray-500'
};

const categoryLabels = {
  design: '设计软件',
  development: '开发工具',
  modeling: '建模软件',
  rendering: '渲染引擎',
  other: '其他'
};

export const SoftwareManager: React.FC<SoftwareManagerProps> = ({ className }) => {
  const [softwareList, setSoftwareList] = useState<SoftwareInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [launchingSoftware, setLaunchingSoftware] = useState<string | null>(null);

  // 扫描软件
  const scanSoftware = async () => {
    if (!window.electronAPI?.software) {
      setError('桌面API不可用');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.software.scan();
      if (result.success && result.data) {
        setSoftwareList(result.data);
      } else {
        setError(result.error || '扫描软件失败');
      }
    } catch (err) {
      setError(`扫描软件失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  // 启动软件
  const launchSoftware = async (softwareName: string) => {
    if (!window.electronAPI?.software) return;

    setLaunchingSoftware(softwareName);
    try {
      const result = await window.electronAPI.software.launch(softwareName);
      if (!result.success) {
        setError(`启动 ${softwareName} 失败: ${result.error}`);
      }
    } catch (err) {
      setError(`启动 ${softwareName} 失败: ${err}`);
    } finally {
      setLaunchingSoftware(null);
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'installed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'not_installed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'installed':
        return '已安装';
      case 'not_installed':
        return '未安装';
      default:
        return '未知';
    }
  };

  // 过滤软件列表
  const filteredSoftware = softwareList.filter(software => {
    const matchesCategory = selectedCategory === 'all' || software.category === selectedCategory;
    const matchesSearch = software.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 获取安装的软件数量
  const installedCount = softwareList.filter(s => s.status === 'installed').length;
  const totalCount = softwareList.length;

  useEffect(() => {
    scanSoftware();
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">软件管理</h2>
          <p className="text-muted-foreground">
            管理和启动本地设计软件 (已安装 {installedCount}/{totalCount})
          </p>
        </div>
        <Button onClick={scanSoftware} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '扫描中...' : '重新扫描'}
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 搜索和过滤栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索软件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">所有分类</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
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

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>扫描进度</span>
          <span>{installedCount}/{totalCount} 已安装</span>
        </div>
        <Progress value={totalCount > 0 ? (installedCount / totalCount) * 100 : 0} />
      </div>

      {/* 软件列表 */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>正在扫描已安装的软件...</p>
        </div>
      ) : filteredSoftware.length === 0 ? (
        <div className="text-center py-8">
          <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">未找到相关软件</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
            : 'space-y-4'
        }>
          {filteredSoftware.map((software, index) => (
            <Card 
              key={`${software.name}-${index}`}
              className={`transition-all hover:shadow-md ${
                software.status === 'not_installed' ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{software.name}</CardTitle>
                  {getStatusIcon(software.status)}
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="secondary" className={`${categoryColors[software.category]} text-white`}>
                    {categoryLabels[software.category]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    v{software.version}
                  </span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* 状态信息 */}
                <div className="flex items-center justify-between text-sm">
                  <span>状态:</span>
                  <span className={software.status === 'installed' ? 'text-green-600' : 'text-red-600'}>
                    {getStatusText(software.status)}
                  </span>
                </div>

                {/* 路径信息 */}
                {software.path && (
                  <div className="text-xs text-muted-foreground truncate">
                    {software.path}
                  </div>
                )}

                {/* 功能标签 */}
                {software.capabilities && software.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {software.capabilities.slice(0, 3).map((capability, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {capability.replace('_', ' ')}
                      </Badge>
                    ))}
                    {software.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{software.capabilities.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={software.status !== 'installed' || launchingSoftware === software.name}
                    onClick={() => launchSoftware(software.name)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {launchingSoftware === software.name ? '启动中...' : '启动'}
                  </Button>
                  
                  <Button size="sm" variant="outline" disabled>
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoftwareManager;