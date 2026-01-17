import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { 
  Database, 
  HardDrive, 
  Settings, 
  Upload, 
  Download, 
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Cloud,
  Calendar,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

interface BackupStatus {
  last_backup: string;
  total_size: string;
  database_count: number;
  files_count: number;
  config_count: number;
  cloud_enabled: boolean;
}

interface BackupJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  started_at: string;
  completed_at?: string;
  size?: string;
  error?: string;
}

interface BackupFile {
  name: string;
  type: string;
  size: string;
  created_at: string;
  path: string;
}

const BackupManager: React.FC = () => {
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadBackupStatus();
    loadBackupJobs();
    loadBackupFiles();
    
    // 设置定时刷新
    const interval = setInterval(() => {
      loadBackupJobs();
    }, 5000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadBackupStatus = async () => {
    try {
      const response = await fetch('/api/admin/backup/status');
      if (response.ok) {
        const data = await response.json();
        setBackupStatus(data);
      }
    } catch (error) {
      console.error('Failed to load backup status:', error);
    }
  };

  const loadBackupJobs = async () => {
    try {
      const response = await fetch('/api/admin/backup/jobs');
      if (response.ok) {
        const data = await response.json();
        setBackupJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load backup jobs:', error);
    }
  };

  const loadBackupFiles = async () => {
    try {
      const response = await fetch('/api/admin/backup/files');
      if (response.ok) {
        const data = await response.json();
        setBackupFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load backup files:', error);
    }
  };

  const startBackup = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/backup/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        toast.success(`${type} 备份已启动`);
        loadBackupJobs();
      } else {
        const error = await response.json();
        toast.error(error.message || '备份启动失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (file: BackupFile) => {
    try {
      const response = await fetch(`/api/admin/backup/download?file=${encodeURIComponent(file.path)}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('备份文件下载成功');
      } else {
        toast.error('下载失败');
      }
    } catch (error) {
      toast.error('下载失败');
    }
  };

  const deleteBackup = async (file: BackupFile) => {
    if (!confirm(`确定要删除备份文件 "${file.name}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/backup/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: file.path })
      });

      if (response.ok) {
        toast.success('备份文件删除成功');
        loadBackupFiles();
        loadBackupStatus();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; text: string }> = {
      completed: { variant: 'default', text: '已完成' },
      failed: { variant: 'destructive', text: '失败' },
      running: { variant: 'secondary', text: '运行中' },
      pending: { variant: 'outline', text: '等待中' }
    };

    const config = variants[status] || { variant: 'outline', text: status };
    return <Badge variant={config.variant as any}>{config.text}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          备份恢复管理
        </h1>
        <p className="text-gray-600 mt-2">管理系统的备份策略和恢复操作</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="jobs">备份任务</TabsTrigger>
          <TabsTrigger value="files">备份文件</TabsTrigger>
          <TabsTrigger value="restore">恢复管理</TabsTrigger>
          <TabsTrigger value="settings">备份设置</TabsTrigger>
        </TabsList>

        {/* 总览 */}
        <TabsContent value="overview" className="space-y-6">
          {backupStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">最后备份时间</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Date(backupStatus.last_backup).toLocaleDateString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(backupStatus.last_backup).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总备份大小</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{backupStatus.total_size}</div>
                  <p className="text-xs text-muted-foreground">所有备份文件</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">数据库备份</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{backupStatus.database_count}</div>
                  <p className="text-xs text-muted-foreground">个备份文件</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">云存储</CardTitle>
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {backupStatus.cloud_enabled ? '已启用' : '未启用'}
                  </div>
                  <p className="text-xs text-muted-foreground">异地备份状态</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => startBackup('full')}
                  disabled={loading}
                  className="w-full"
                >
                  <Database className="w-4 h-4 mr-2" />
                  完整备份
                </Button>
                <Button
                  onClick={() => startBackup('database')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <Database className="w-4 h-4 mr-2" />
                  数据库备份
                </Button>
                <Button
                  onClick={() => startBackup('files')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <HardDrive className="w-4 h-4 mr-2" />
                  文件备份
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 备份任务 */}
        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  备份任务历史
                </div>
                <Button onClick={loadBackupJobs} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {backupJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无备份任务</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backupJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(job.status)}
                          <span className="font-medium">{job.type}</span>
                          {getStatusBadge(job.status)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(job.started_at).toLocaleString()}
                        </div>
                      </div>

                      {job.status === 'running' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>进度</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="w-full" />
                        </div>
                      )}

                      {job.error && (
                        <Alert className="mt-3">
                          <AlertDescription className="text-red-600">
                            {job.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
                        <span>
                          开始: {new Date(job.started_at).toLocaleString()}
                        </span>
                        {job.completed_at && (
                          <span>
                            完成: {new Date(job.completed_at).toLocaleString()}
                          </span>
                        )}
                        {job.size && <span>大小: {job.size}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 备份文件 */}
        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  备份文件管理
                </div>
                <Button onClick={loadBackupFiles} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {backupFiles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无备份文件</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {backupFiles.map((file) => (
                    <div key={file.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-600">
                              {file.type} • {file.size} • {new Date(file.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => downloadBackup(file)}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => deleteBackup(file)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 恢复管理 */}
        <TabsContent value="restore" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                系统恢复
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  <strong>警告：</strong> 恢复操作将覆盖现有数据，请确保已备份当前状态。
                  建议在测试环境中先验证恢复文件的完整性。
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="db-restore">数据库恢复</Label>
                  <Input
                    id="db-restore"
                    type="file"
                    accept=".sql,.sql.gz,.dump"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    支持 .sql 和 .sql.gz 格式的数据库备份文件
                  </p>
                  <Button className="mt-3 w-full">
                    <Database className="w-4 h-4 mr-2" />
                    恢复数据库
                  </Button>
                </div>

                <div>
                  <Label htmlFor="files-restore">文件恢复</Label>
                  <Input
                    id="files-restore"
                    type="file"
                    accept=".tar,.tar.gz"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    支持 .tar.gz 格式的文件备份
                  </p>
                  <Button className="mt-3 w-full">
                    <HardDrive className="w-4 h-4 mr-2" />
                    恢复文件
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 备份设置 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                备份配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="backup-retention">备份保留天数</Label>
                  <Input
                    id="backup-retention"
                    type="number"
                    defaultValue="7"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    数据库备份文件保留天数
                  </p>
                </div>

                <div>
                  <Label htmlFor="file-retention">文件保留天数</Label>
                  <Input
                    id="file-retention"
                    type="number"
                    defaultValue="30"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    文件备份保留天数
                  </p>
                </div>
              </div>

              <div>
                <Label>自动备份计划</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">完整备份</p>
                      <p className="text-sm text-gray-600">每日凌晨 2:00</p>
                    </div>
                    <Badge variant="outline">已启用</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">数据库备份</p>
                      <p className="text-sm text-gray-600">每日上午 6:00</p>
                    </div>
                    <Badge variant="outline">已启用</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">异地备份</p>
                      <p className="text-sm text-gray-600">每日上午 10:00</p>
                    </div>
                    <Badge variant="outline">已启用</Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label>云存储配置</Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="s3-bucket">S3 存储桶</Label>
                    <Input id="s3-bucket" placeholder="your-backup-bucket" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="s3-region">S3 区域</Label>
                    <Input id="s3-region" placeholder="us-east-1" className="mt-1" />
                  </div>
                </div>
              </div>

              <Button className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert className="mt-8">
        <AlertDescription>
          <strong>最佳实践：</strong>
          建议定期检查备份文件的完整性，并测试恢复流程。
          对于关键数据，建议实施3-2-1备份策略（3个副本，2种介质，1个异地）。
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BackupManager;