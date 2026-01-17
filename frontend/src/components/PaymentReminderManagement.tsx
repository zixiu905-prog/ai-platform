import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { toast } from 'sonner';

interface PaymentReminderSettings {
  enabled: boolean;
  threshold: number;
  schedule: string;
  customTemplate: string | null;
}

interface OverdueUser {
  userId: string;
  email: string;
  userName: string;
  currentBalance: number;
  threshold: number;
  daysOverdue: number;
  lastPaymentDate?: string;
  totalUsage: number;
}

interface PaymentStatistics {
  totalUsers: number;
  paidUsers: number;
  avgBalance: number;
  overdueStatistics: Array<{
    threshold: number;
    count: number;
    totalBalance: number;
    avgDaysOverdue: number;
  }>;
}

export default function PaymentReminderManagement() {
  const [settings, setSettings] = useState<PaymentReminderSettings>({
    enabled: true,
    threshold: 10,
    schedule: '0 10 * * *',
    customTemplate: null
  });
  
  const [overdueUsers, setOverdueUsers] = useState<OverdueUser[]>([]);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  // 获取设置
  useEffect(() => {
    fetchSettings();
    fetchStatistics();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/payment-reminders/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('获取设置失败:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/payment-reminders/statistics');
      const data = await response.json();
      if (data.success) {
        setStatistics(data.data);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    }
  };

  const fetchOverdueUsers = async (threshold?: number) => {
    setLoading(true);
    try {
      const url = threshold 
        ? `/api/payment-reminders/overdue?threshold=${threshold}`
        : '/api/payment-reminders/overdue';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setOverdueUsers(data.data);
      }
    } catch (error) {
      console.error('获取欠费用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      const response = await fetch('/api/payment-reminders/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('设置已更新');
      } else {
        toast.error('设置更新失败');
      }
    } catch (error) {
      console.error('更新设置失败:', error);
      toast.error('设置更新失败');
    }
  };

  const sendPaymentReminders = async (threshold?: number) => {
    setSendingProgress(0);
    setLoading(true);
    try {
      const response = await fetch('/api/payment-reminders/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ threshold: threshold || settings.threshold })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`发送完成: 成功 ${data.data.success}，失败 ${data.data.failed}`);
        // 更新统计和用户列表
        fetchStatistics();
        fetchOverdueUsers();
      } else {
        toast.error('发送失败');
      }
    } catch (error) {
      console.error('发送付费提醒失败:', error);
      toast.error('发送失败');
    } finally {
      setLoading(false);
      setSendingProgress(0);
    }
  };

  const previewEmail = async (userId: string) => {
    try {
      const response = await fetch(`/api/payment-reminders/preview/${userId}`);
      const data = await response.json();
      if (data.success) {
        // 这里可以打开一个弹窗显示邮件预览
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
          previewWindow.document.write(data.data.emailHtml);
        }
      }
    } catch (error) {
      console.error('预览邮件失败:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">付费提醒管理</h1>
          <p className="text-muted-foreground">管理自动付费提醒邮件的发送和设置</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
          <TabsTrigger value="users">欠费用户</TabsTrigger>
          <TabsTrigger value="preview">邮件预览</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总用户数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.totalUsers || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">付费用户</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics?.paidUsers || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均余额</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{statistics?.avgBalance.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">欠费用户 (¥10)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics?.overdueStatistics.find(s => s.threshold === 10)?.count || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>执行常用的付费提醒操作</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => sendPaymentReminders(10)}
                  disabled={loading}
                  variant="default"
                >
                  发送¥10以下提醒
                </Button>
                <Button 
                  onClick={() => sendPaymentReminders(50)}
                  disabled={loading}
                  variant="outline"
                >
                  发送¥50以下提醒
                </Button>
                <Button 
                  onClick={() => sendPaymentReminders(100)}
                  disabled={loading}
                  variant="outline"
                >
                  发送¥100以下提醒
                </Button>
                <Button 
                  onClick={() => fetchOverdueUsers()}
                  disabled={loading}
                  variant="secondary"
                >
                  刷新数据
                </Button>
              </div>
              
              {sendingProgress > 0 && (
                <div className="space-y-2">
                  <Label>发送进度</Label>
                  <Progress value={sendingProgress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {statistics?.overdueStatistics && (
            <Card>
              <CardHeader>
                <CardTitle>欠费统计</CardTitle>
                <CardDescription>不同阈值下的欠费用户统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.overdueStatistics.map((stat) => (
                    <div key={stat.threshold} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">¥{stat.threshold} 以下</h4>
                        <p className="text-sm text-muted-foreground">
                          {stat.count} 个用户，总计欠费 ¥{stat.totalBalance.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={stat.count > 0 ? "destructive" : "secondary"}>
                          {stat.count}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          平均 {stat.avgDaysOverdue.toFixed(0)} 天
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>付费提醒设置</CardTitle>
              <CardDescription>配置自动付费提醒的行为参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
                <Label htmlFor="enabled">启用付费提醒</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="threshold">欠费阈值 (¥)</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={settings.threshold}
                  onChange={(e) => setSettings({ ...settings, threshold: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
                <p className="text-sm text-muted-foreground">
                  当用户余额低于此值时发送提醒邮件
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="schedule">发送计划 (Cron表达式)</Label>
                <Input
                  id="schedule"
                  value={settings.schedule}
                  onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                  placeholder="0 10 * * *"
                />
                <p className="text-sm text-muted-foreground">
                  例如: "0 10 * * *" 表示每天上午10点发送
                </p>
              </div>
              
              <Button onClick={updateSettings} disabled={loading}>
                保存设置
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>欠费用户列表</CardTitle>
              <CardDescription>当前需要发送付费提醒的用户</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={() => fetchOverdueUsers(10)} variant="outline" size="sm">
                    ¥10以下
                  </Button>
                  <Button onClick={() => fetchOverdueUsers(50)} variant="outline" size="sm">
                    ¥50以下
                  </Button>
                  <Button onClick={() => fetchOverdueUsers(100)} variant="outline" size="sm">
                    ¥100以下
                  </Button>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">加载中...</div>
                ) : overdueUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无欠费用户
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overdueUsers.map((user) => (
                      <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h4 className="font-medium">{user.userName}</h4>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex gap-2 text-xs">
                            <Badge variant="outline">余额: ¥{user.currentBalance}</Badge>
                            <Badge variant="outline">欠费: {user.daysOverdue}天</Badge>
                            <Badge variant="outline">用量: {user.totalUsage} tokens</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => previewEmail(user.userId)}
                          >
                            预览邮件
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>邮件预览</CardTitle>
              <CardDescription>预览付费提醒邮件的样式和内容</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  请在"欠费用户"标签页中选择一个用户，然后点击"预览邮件"按钮来查看邮件内容。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}