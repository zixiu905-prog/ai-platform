import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  X,
  ExternalLink,
  Zap,
  Shield
} from 'lucide-react';
import { useAppUpdate } from '@/services/updateService';
import { toast } from 'sonner';

interface UpdateNotificationProps {
  className?: string;
  autoCheck?: boolean;
}

export function UpdateNotification({ className, autoCheck = true }: UpdateNotificationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { status, checkForUpdates, refreshApp, getCurrentVersion, isPWA, pwaUpdate, hasAnyUpdate } = useAppUpdate();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (autoCheck && !status.isChecking && !status.updateInfo) {
      // 延迟检查，避免应用启动时的性能影响
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [autoCheck, status.isChecking, status.updateInfo, checkForUpdates]);

  // 检查是否应该显示通知
  const shouldShow = hasAnyUpdate && 
    !dismissedVersion && 
    (status.updateInfo?.version !== dismissedVersion);

  if (!shouldShow) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedVersion(status.updateInfo?.version || null);
  };

  const handleRefresh = () => {
    refreshApp();
    handleDismiss();
  };

  const handleViewDetails = () => {
    setShowDetails(true);
  };

  const handleInstallPWAUpdate = () => {
    pwaUpdate.installUpdate();
  };

  const renderWebUpdate = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            发现新版本
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            v{status.updateInfo?.version}
          </Badge>
        </div>
        <CardDescription>
          当前版本 v{getCurrentVersion()} → 最新版本 v{status.updateInfo?.version}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            新版本包含功能改进和安全更新
          </AlertDescription>
        </Alert>

        {status.updateInfo?.mandatory && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              此更新为强制更新，请尽快更新
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>更新状态</span>
            {status.isChecking ? (
              <span className="text-blue-600 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                检查中...
              </span>
            ) : status.updateAvailable ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                可更新
              </span>
            ) : (
              <span className="text-gray-500">已是最新</span>
            )}
          </div>

          {status.downloadProgress !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>下载进度</span>
                <span>{status.downloadProgress}%</span>
              </div>
              <Progress value={status.downloadProgress} className="h-2" />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button
          onClick={handleRefresh}
          className="flex-1"
          disabled={status.isChecking}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          立即更新
        </Button>
        
        <Button
          variant="outline"
          onClick={handleViewDetails}
        >
          详情
        </Button>
        
        {!status.updateInfo?.mandatory && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  const renderPWAUpdate = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-green-500" />
            应用已更新
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            PWA
          </Badge>
        </div>
        <CardDescription>
          新版本已下载完成，点击安装更新
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            离线缓存已更新，安装后将获得最新功能
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button
          onClick={handleInstallPWAUpdate}
          className="flex-1"
          disabled={pwaUpdate.isInstalling}
        >
          {pwaUpdate.isInstalling ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              安装中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              安装更新
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleDismiss}
        >
          稍后
        </Button>
      </CardFooter>
    </Card>
  );

  if (pwaUpdate.isUpdateAvailable) {
    return renderPWAUpdate();
  }

  if (status.updateAvailable) {
    return renderWebUpdate();
  }

  return null;
}

// 更新详情对话框组件
export function UpdateDetailsDialog({ 
  updateInfo, 
  isOpen, 
  onClose 
}: { 
  updateInfo: any; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              更新详情 v{updateInfo?.version}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            发布日期: {updateInfo?.releaseDate ? 
              new Date(updateInfo.releaseDate).toLocaleDateString() : 
              '未知'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">更新内容</h4>
            <div className="bg-muted p-3 rounded-md text-sm">
              <pre className="whitespace-pre-wrap font-mono">
                {updateInfo?.releaseNotes || '暂无更新说明'}
              </pre>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {updateInfo?.mandatory && (
              <Badge variant="destructive">强制更新</Badge>
            )}
            <Badge variant="secondary">Web版本</Badge>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button 
            onClick={() => {
              window.open(updateInfo?.downloadUrl, '_blank');
              onClose();
            }}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            查看完整更新
          </Button>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// 全局更新状态指示器
export function UpdateStatusIndicator() {
  const { status, hasAnyUpdate } = useAppUpdate();

  if (!hasAnyUpdate) return null;

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>有可用更新</span>
      </div>
    </div>
  );
}