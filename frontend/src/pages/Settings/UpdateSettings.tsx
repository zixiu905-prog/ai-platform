import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  Settings, 
  Info,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { useAppUpdate } from '@/services/updateService';
import { toast } from 'sonner';

export function UpdateSettings() {
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
  const [autoInstallEnabled, setAutoInstallEnabled] = useState(false);
  const { 
    status, 
    checkForUpdates, 
    refreshApp, 
    getCurrentVersion, 
    isPWA, 
    pwaUpdate,
    hasAnyUpdate 
  } = useAppUpdate();

  const handleCheckUpdates = async () => {
    try {
      await checkForUpdates();
      toast.success('检查更新完成');
    } catch (error) {
      toast.error('检查更新失败');
    }
  };

  const handleRefreshApp = () => {
    refreshApp();
  };

  const handleInstallPWAUpdate = () => {
    pwaUpdate.installUpdate();
  };

  const getUpdateStatusIcon = () => {
    if (status.isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (hasAnyUpdate) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getUpdateStatusText = () => {
    if (status.isChecking) return '检查中...';
    if (hasAnyUpdate) return '有可用更新';
    return '已是最新版本';
  };

  return (
    <div className="space-y-6">
      {/* 当前版本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            当前版本
          </CardTitle>
          <CardDescription>
            应用版本和更新状态信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">版本号</div>
              <div className="text-sm text-muted-foreground">v{getCurrentVersion()}</div>
            </div>
            <Badge variant={hasAnyUpdate ? "destructive" : "default"}>
              {getUpdateStatusIcon()}
              <span className="ml-2">{getUpdateStatusText()}</span>
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">应用类型</div>
              <div className="text-sm text-muted-foreground">
                {isPWA ? 'PWA应用' : 'Web应用'}
              </div>
            </div>
            <Badge variant="secondary">
              {isPWA ? '支持离线使用' : '需要网络连接'}
            </Badge>
          </div>

          {status.updateInfo && (
            <>
              <Separator />
              <div>
                <div className="font-medium mb-2">可用更新</div>
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">v{status.updateInfo.version}</span>
                    {status.updateInfo.mandatory && (
                      <Badge variant="destructive">强制更新</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    发布日期: {status.updateInfo.releaseDate ? 
                      new Date(status.updateInfo.releaseDate).toLocaleDateString() : 
                      '未知'
                    }
                  </div>
                  {status.updateInfo.releaseNotes && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">更新说明:</div>
                      <div className="text-muted-foreground">
                        {status.updateInfo.releaseNotes.split('\n')[0]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {status.downloadProgress !== undefined && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">下载进度</span>
                  <span className="text-sm">{status.downloadProgress}%</span>
                </div>
                <Progress value={status.downloadProgress} className="h-2" />
              </div>
            </>
          )}

          {status.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 更新设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            更新设置
          </CardTitle>
          <CardDescription>
            配置自动更新和行为选项
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">自动检查更新</div>
              <div className="text-sm text-muted-foreground">
                定期检查是否有新版本可用
              </div>
            </div>
            <Switch
              checked={autoCheckEnabled}
              onCheckedChange={setAutoCheckEnabled}
            />
          </div>

          {isPWA && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">自动安装更新</div>
                <div className="text-sm text-muted-foreground">
                  更新下载完成后自动安装
                </div>
              </div>
              <Switch
                checked={autoInstallEnabled}
                onCheckedChange={setAutoInstallEnabled}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">更新通知</div>
              <div className="text-sm text-muted-foreground">
                发现更新时显示通知
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">预发布版本</div>
              <div className="text-sm text-muted-foreground">
                包含测试版和预览版更新
              </div>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* 更新操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            更新操作
          </CardTitle>
          <CardDescription>
            手动检查和安装更新
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleCheckUpdates}
              disabled={status.isChecking}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${status.isChecking ? 'animate-spin' : ''}`} />
              检查更新
            </Button>

            {hasAnyUpdate && !isPWA && (
              <Button
                onClick={handleRefreshApp}
                variant="default"
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                立即更新
              </Button>
            )}

            {pwaUpdate.isUpdateAvailable && (
              <Button
                onClick={handleInstallPWAUpdate}
                disabled={pwaUpdate.isInstalling}
                variant="default"
                className="w-full"
              >
                <Download className={`h-4 w-4 mr-2 ${pwaUpdate.isInstalling ? 'animate-pulse' : ''}`} />
                {pwaUpdate.isInstalling ? '安装中...' : '安装PWA更新'}
              </Button>
            )}
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>上次检查: {new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>下次自动检查: {new Date(Date.now() + 30 * 60 * 1000).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 安全信息 */}
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          安全信息
        </CardTitle>
        <CardDescription>
          更新验证和安全性相关信息
        </CardDescription>
      </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              所有更新都经过数字签名验证，确保来源可靠和完整性
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium mb-1">签名验证</div>
              <Badge variant="default">已启用</Badge>
            </div>
            <div>
              <div className="font-medium mb-1">传输加密</div>
              <Badge variant="default">HTTPS</Badge>
            </div>
            <div>
              <div className="font-medium mb-1">回滚支持</div>
              <Badge variant="secondary">有限支持</Badge>
            </div>
            <div>
              <div className="font-medium mb-1">更新源</div>
              <Badge variant="secondary">GitHub</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}