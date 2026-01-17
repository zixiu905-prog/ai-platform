import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  List,
  Lock,
  Unlock,
  Download,
  Upload,
  Shield,
  Wrench,
  History,
  Bell,
  Zap,
  Eye,
  EyeOff,
  FolderOpen,
  Clock,
  CheckSquare,
  AlertTriangle
} from 'lucide-react';

interface SoftwareInfo {
  name: string;
  version: string;
  path: string;
  executable: string;
  icon?: string;
  category: 'design' | 'development' | 'modeling' | 'rendering' | 'other';
  status: 'installed' | 'not_installed' | 'unknown';
  lastUsed?: Date;
  capabilities?: string[];
  publisher?: string;
  installDate?: Date;
  size?: number;
  isLocked?: boolean;
  detectedPaths?: string[];
  confidence?: number;
}

interface UpdateNotification {
  softwareName: string;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch';
  releaseDate?: Date;
  downloadUrl?: string;
  changelog?: string;
  critical: boolean;
}

interface PathIssue {
  type: 'missing' | 'corrupted' | 'permission' | 'version_mismatch' | 'dependency_missing' | 'registry_error' | 'invalid_executable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  softwareName: string;
  path: string;
  description: string;
  suggestedFix: string;
  autoFixable: boolean;
  detectedAt: Date;
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

const lockTypeLabels = {
  readonly: '只读',
  hidden: '隐藏',
  protected: '受保护',
  registry: '注册表保护',
  full: '完全锁定'
};

export const EnhancedSoftwareManager: React.FC = () => {
  const [softwareList, setSoftwareList] = useState<SoftwareInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [launchingSoftware, setLaunchingSoftware] = useState<string | null>(null);
  
  // 新增状态
  const [updates, setUpdates] = useState<UpdateNotification[]>([]);
  const [locks, setLocks] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<Map<string, any>>(new Map());
  const [activeTab, setActiveTab] = useState('discover');
  const [deepScanning, setDeepScanning] = useState(false);
  const [validating, setValidating] = useState<string[]>([]);
  const [repairing, setRepairing] = useState<string[]>([]);

  // 基础功能
  const scanSoftware = useCallback(async () => {
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
  }, []);

  const launchSoftware = useCallback(async (softwareName: string) => {
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
  }, []);

  // 深度扫描
  const performDeepScan = useCallback(async () => {
    if (!window.electronAPI?.software) return;

    setDeepScanning(true);
    try {
      const result = await window.electronAPI.software.deepScan();
      if (result.success && result.data) {
        setSoftwareList(result.data);
      } else {
        setError(result.error || '深度扫描失败');
      }
    } catch (err) {
      setError(`深度扫描失败: ${err}`);
    } finally {
      setDeepScanning(false);
    }
  }, []);

  // 智能搜索
  const performIntelligentSearch = useCallback(async (softwareName?: string) => {
    if (!window.electronAPI?.software) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.software.intelligentSearch(softwareName);
      if (result.success && result.data) {
        setSoftwareList(prev => {
          const existing = prev.filter(s => !result.data.find((r: SoftwareInfo) => r.name === s.name));
          return [...existing, ...result.data];
        });
      } else {
        setError(result.error || '智能搜索失败');
      }
    } catch (err) {
      setError(`智能搜索失败: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 检查更新
  const checkUpdates = useCallback(async () => {
    if (!window.electronAPI?.software?.updates) return;

    try {
      const result = await window.electronAPI.software.updates.checkAll();
      if (result.success && result.data) {
        setUpdates(result.data);
      } else {
        console.error('检查更新失败:', result.error);
      }
    } catch (err) {
      console.error('检查更新失败:', err);
    }
  }, []);

  // 验证路径
  const validateSoftwarePath = useCallback(async (softwareName: string, path: string) => {
    if (!window.electronAPI?.software?.pathValidation) return;

    setValidating(prev => [...prev, softwareName]);
    try {
      const result = await window.electronAPI.software.pathValidation.validate(softwareName, path);
      if (result.success && result.data) {
        setValidationResults(prev => new Map(prev.set(softwareName, result.data)));
      }
    } catch (err) {
      console.error('路径验证失败:', err);
    } finally {
      setValidating(prev => prev.filter(s => s !== softwareName));
    }
  }, []);

  // 锁定/解锁路径
  const togglePathLock = useCallback(async (softwareName: string, path: string, isLocked: boolean) => {
    if (!window.electronAPI?.software?.pathLock) return;

    try {
      if (isLocked) {
        const result = await window.electronAPI.software.pathLock.unlock(softwareName, path);
        if (result.success) {
          setLocks(prev => prev.filter(l => !(l.softwareName === softwareName && l.path === path)));
        }
      } else {
        const result = await window.electronAPI.software.pathLock.lock(softwareName, path, 'readonly');
        if (result.success) {
          setLocks(prev => [...prev, { softwareName, path, locked: true }]);
        }
      }
    } catch (err) {
      console.error('路径锁定操作失败:', err);
    }
  }, []);

  // 下载更新
  const downloadUpdate = useCallback(async (update: UpdateNotification) => {
    if (!window.electronAPI?.software?.updates || !update.downloadUrl) return;

    try {
      const savePath = `/downloads/${update.softwareName}_update.exe`;
      const result = await window.electronAPI.software.updates.download(update.softwareName.toLowerCase(), update.downloadUrl, savePath);
      if (result.success) {
        console.log('更新下载成功:', savePath);
      }
    } catch (err) {
      console.error('更新下载失败:', err);
    }
  }, []);

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

  // 获取置信度颜色
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-500';
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 过滤软件列表
  const filteredSoftware = softwareList.filter(software => {
    const matchesCategory = selectedCategory === 'all' || software.category === selectedCategory;
    const matchesSearch = software.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 获取统计信息
  const installedCount = softwareList.filter(s => s.status === 'installed').length;
  const lockedCount = locks.length;
  const updateCount = updates.filter(u => u.critical).length;

  useEffect(() => {
    scanSoftware();
    checkUpdates();
  }, [scanSoftware, checkUpdates]);

  return (
    <div className="space-y-6 p-6">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">高级软件管理</h2>
          <p className="text-muted-foreground flex items-center gap-4">
            <span>已安装 {installedCount}/{softwareList.length}</span>
            {lockedCount > 0 && <Badge variant="secondary" className="bg-orange-500">锁定 {lockedCount}</Badge>}
            {updateCount > 0 && <Badge variant="destructive">关键更新 {updateCount}</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={scanSoftware} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            快速扫描
          </Button>
          <Button onClick={performDeepScan} disabled={deepScanning} variant="outline">
            <Zap className={`h-4 w-4 mr-2 ${deepScanning ? 'animate-pulse' : ''}`} />
            深度扫描
          </Button>
          <Button onClick={() => performIntelligentSearch(searchTerm)} disabled={loading} variant="outline">
            <Search className={`h-4 w-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
            智能搜索
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 主要功能标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            软件发现
          </TabsTrigger>
          <TabsTrigger value="updates" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            更新管理
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            安全防护
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            路径验证
          </TabsTrigger>
        </TabsList>

        {/* 软件发现标签页 */}
        <TabsContent value="discover" className="space-y-6">
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

          {/* 软件列表 */}
          {loading || deepScanning ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>{deepScanning ? '正在执行深度扫描...' : '正在扫描已安装的软件...'}</p>
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
                      <div className="flex items-center gap-2">
                        {software.isLocked && <Lock className="h-4 w-4 text-orange-500" />}
                        {getStatusIcon(software.status)}
                        {software.confidence && (
                          <Badge className={`text-white ${getConfidenceColor(software.confidence)}`}>
                            {software.confidence}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="secondary" className={`${categoryColors[software.category]} text-white`}>
                        {categoryLabels[software.category]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        v{software.version}
                      </span>
                      {software.publisher && (
                        <span className="text-xs text-muted-foreground">
                          {software.publisher}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* 路径信息 */}
                    {software.path && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        <span className="truncate" title={software.path}>
                          {software.path}
                        </span>
                      </div>
                    )}

                    {/* 状态信息 */}
                    <div className="flex items-center justify-between text-sm">
                      <span>状态:</span>
                      <span className={software.status === 'installed' ? 'text-green-600' : 'text-red-600'}>
                        {software.status === 'installed' ? '已安装' : '未安装'}
                      </span>
                    </div>

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
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => validateSoftwarePath(software.name, software.path)}
                        disabled={validating.includes(software.name)}
                      >
                        <CheckSquare className="h-3 w-3" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => togglePathLock(software.name, software.path, !!software.isLocked)}
                      >
                        {software.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 更新管理标签页 */}
        <TabsContent value="updates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">软件更新</h3>
            <Button onClick={checkUpdates} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              检查更新
            </Button>
          </div>

          {updates.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>所有软件都是最新版本</p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((update, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{update.softwareName}</h4>
                          {update.critical && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              关键更新
                            </Badge>
                          )}
                          <Badge variant={
                            update.updateType === 'major' ? 'destructive' :
                            update.updateType === 'minor' ? 'default' : 'secondary'
                          }>
                            {update.updateType === 'major' ? '主版本' :
                             update.updateType === 'minor' ? '次版本' : '补丁'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          当前版本: {update.currentVersion} → 最新版本: {update.latestVersion}
                        </div>
                        {update.releaseDate && (
                          <div className="text-xs text-muted-foreground">
                            发布时间: {update.releaseDate.toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => downloadUpdate(update)}
                        disabled={!update.downloadUrl}
                        size="sm"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        下载
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 安全防护标签页 */}
        <TabsContent value="security" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">路径锁定</h3>
            <Button onClick={() => window.electronAPI?.software?.pathLock?.getAll()} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              查看所有锁定
            </Button>
          </div>

          {locks.length === 0 ? (
            <div className="text-center py-8">
              <Unlock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>当前没有锁定的软件路径</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locks.map((lock, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{lock.softwareName}</h4>
                        <div className="text-sm text-muted-foreground truncate" title={lock.path}>
                          {lock.path}
                        </div>
                      </div>
                      <Button 
                        onClick={() => togglePathLock(lock.softwareName, lock.path, true)}
                        variant="outline"
                        size="sm"
                      >
                        <Unlock className="h-3 w-3 mr-1" />
                        解锁
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 路径验证标签页 */}
        <TabsContent value="validation" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">路径验证结果</h3>
            <Button onClick={() => window.electronAPI?.software?.pathValidation?.clearCache()} variant="outline">
              <History className="h-4 w-4 mr-2" />
              清除缓存
            </Button>
          </div>

          {validationResults.size === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>点击软件卡片上的验证按钮开始验证</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(validationResults.entries()).map(([softwareName, result]) => (
                <Card key={softwareName}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{softwareName}</h4>
                        <Badge variant={result.isValid ? 'default' : 'destructive'}>
                          {result.isValid ? '有效' : '存在问题'}
                        </Badge>
                      </div>
                      
                      {result.issues && result.issues.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">检测到的问题:</h5>
                          {result.issues.map((issue: PathIssue, idx: number) => (
                            <Alert key={idx} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="font-medium">{issue.description}</div>
                                <div className="text-sm mt-1">建议: {issue.suggestedFix}</div>
                                {issue.autoFixable && (
                                  <Button size="sm" variant="outline" className="mt-2">
                                    自动修复
                                  </Button>
                                )}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}

                      {result.warnings && result.warnings.length > 0 && (
                        <div className="space-y-1">
                          {result.warnings.map((warning: string, idx: number) => (
                            <Alert key={idx} variant="default">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>{warning}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedSoftwareManager;