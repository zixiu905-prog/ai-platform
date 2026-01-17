import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Ban, 
  Crown,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  phone?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  isPaid: boolean;
  tokenBalance: number;
  lastLoginAt?: string;
  createdAt: string;
  _count: {
    conversations: number;
    payments: number;
    subscriptions: number;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchUsers();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('isActive', statusFilter);

      const response = await apiClient.get(`/admin/users?${params.toString()}`);
      setUsers(response.data!.users);
      setPagination(response.data!.pagination);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { isActive });
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, isActive } : user
      ));
    } catch (error) {
      console.error('更新用户状态失败:', error);
    }
  };

  const handleUserRoleChange = async (userId: string, role: string) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { role });
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, role: role as any } : user
      ));
    } catch (error) {
      console.error('更新用户角色失败:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const configs: any = {
      'USER': { label: '普通用户', color: 'bg-blue-100 text-blue-800', icon: UserX },
      'ADMIN': { label: '管理员', color: 'bg-purple-100 text-purple-800', icon: Shield },
      'SUPER_ADMIN': { label: '超级管理员', color: 'bg-red-100 text-red-800', icon: ShieldCheck }
    };
    const config = configs[role] || configs.USER;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {isActive ? (
          <>
            <UserCheck className="h-3 w-3 mr-1" />
            活跃
          </>
        ) : (
          <>
            <UserX className="h-3 w-3 mr-1" />
            禁用
          </>
        )}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>用户管理</CardTitle>
          <CardDescription>管理系统中的所有用户账户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">搜索用户</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="搜索邮箱、用户名或手机号..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full lg:w-48">
              <Label htmlFor="role">角色筛选</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部角色</SelectItem>
                  <SelectItem value="USER">普通用户</SelectItem>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                  <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full lg:w-48">
              <Label htmlFor="status">状态筛选</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部状态</SelectItem>
                  <SelectItem value="true">活跃</SelectItem>
                  <SelectItem value="false">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户信息</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>订阅</TableHead>
                  <TableHead>Token余额</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="animate-pulse">
                          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 w-48 bg-gray-200 rounded"></div>
                        </div>
                      </TableCell>
                      <TableCell><div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>没有找到匹配的用户</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="h-10 w-10 rounded-full" />
                            ) : (
                              <span className="text-sm font-medium">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.isActive)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isPaid ? "default" : "secondary"}>
                          {user.isPaid ? '付费用户' : '免费用户'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {user.tokenBalance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {user.lastLoginAt 
                            ? format(new Date(user.lastLoginAt), 'MM-dd HH:mm', { locale: zhCN })
                            : '从未登录'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserStatusToggle(user.id, !user.isActive)}
                          >
                            {user.isActive ? (
                              <>
                                <Ban className="h-4 w-4 mr-1" />
                                禁用
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                启用
                              </>
                            )}
                          </Button>
                          
                          {user.role !== 'SUPER_ADMIN' && (
                            <Select
                              value={user.role}
                              onValueChange={(role) => handleUserRoleChange(user.id, role)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USER">普通用户</SelectItem>
                                <SelectItem value="ADMIN">管理员</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* 分页 */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                显示 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
                共 {pagination.total} 条记录
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  上一页
                </Button>
                <span className="text-sm">
                  第 {pagination.page} 页，共 {pagination.pages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;