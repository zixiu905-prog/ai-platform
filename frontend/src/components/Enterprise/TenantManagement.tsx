import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Business,
  People,
  Storage,
  TrendingUp
} from '@mui/icons-material';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  description: string;
  status: 'active' | 'inactive' | 'suspended';
  userCount: number;
  storageUsed: number;
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    maxUsers: number;
    maxStorage: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateTenantData {
  name: string;
  domain: string;
  description: string;
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    maxUsers: number;
    maxStorage: number;
  };
  settings: any;
}

export const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [newTenant, setNewTenant] = useState<CreateTenantData>({
    name: '',
    domain: '',
    description: '',
    subscription: {
      plan: 'basic',
      maxUsers: 10,
      maxStorage: 1024
    },
    settings: {}
  });

  // 获取租户列表
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/tenants?${params}`);
      const data = await response.json();

      if (data.success) {
        setTenants(data.data.tenants);
        setTotal(data.data.total);
      } else {
        setError(data.error || '获取租户列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 创建租户
  const handleCreateTenant = async () => {
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTenant)
      });

      const data = await response.json();

      if (data.success) {
        setCreateDialogOpen(false);
        setNewTenant({
          name: '',
          domain: '',
          description: '',
          subscription: {
            plan: 'basic',
            maxUsers: 10,
            maxStorage: 1024
          },
          settings: {}
        });
        fetchTenants();
      } else {
        setError(data.error || '创建租户失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  // 删除租户
  const handleDeleteTenant = async (tenantId: string) => {
    if (!window.confirm('确定要删除这个租户吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchTenants();
      } else {
        setError(data.error || '删除租户失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'inactive': return '非活跃';
      case 'suspended': return '已暂停';
      default: return '未知';
    }
  };

  // 获取计划文本
  const getPlanText = (plan: string) => {
    switch (plan) {
      case 'free': return '免费版';
      case 'basic': return '基础版';
      case 'pro': return '专业版';
      case 'enterprise': return '企业版';
      default: return '未知';
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, searchTerm, statusFilter]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        租户管理
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 200, '@media (min-width: 900px)': { flex: '0 0 32%' } }}>
              <TextField
                fullWidth
                placeholder="搜索租户名称或域名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
            </Box>
            <Box sx={{ minWidth: 120 }}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="active">活跃</MenuItem>
                  <MenuItem value="inactive">非活跃</MenuItem>
                  <MenuItem value="suspended">已暂停</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                创建租户
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 租户列表 */}
      <Card>
        <CardHeader title={`租户列表 (${total})`} />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>租户名称</TableCell>
                  <TableCell>域名</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>用户数</TableCell>
                  <TableCell>存储使用</TableCell>
                  <TableCell>订阅计划</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Business sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="body2" fontWeight="medium">
                          {tenant.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{tenant.domain}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(tenant.status)}
                        color={getStatusColor(tenant.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <People sx={{ mr: 1, fontSize: 16 }} />
                        {tenant.userCount}/{tenant.subscription.maxUsers}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Storage sx={{ mr: 1, fontSize: 16 }} />
                        {Math.round(tenant.storageUsed / 1024)}GB/{tenant.subscription.maxStorage}GB
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPlanText(tenant.subscription.plan)}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="查看详情">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑">
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTenant(tenant.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 分页 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              sx={{ mr: 1 }}
            >
              上一页
            </Button>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
              第 {page} 页
            </Typography>
            <Button
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
              sx={{ ml: 1 }}
            >
              下一页
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 创建租户对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建新租户</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label="租户名称"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="域名"
                value={newTenant.domain}
                onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                required
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="描述"
                multiline
                rows={3}
                value={newTenant.description}
                onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>订阅计划</InputLabel>
                <Select
                  value={newTenant.subscription.plan}
                  onChange={(e) => setNewTenant({
                    ...newTenant,
                    subscription: { ...newTenant.subscription, plan: e.target.value as any }
                  })}
                >
                  <MenuItem value="free">免费版</MenuItem>
                  <MenuItem value="basic">基础版</MenuItem>
                  <MenuItem value="pro">专业版</MenuItem>
                  <MenuItem value="enterprise">企业版</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="最大用户数"
                type="number"
                value={newTenant.subscription.maxUsers}
                onChange={(e) => setNewTenant({
                  ...newTenant,
                  subscription: { ...newTenant.subscription, maxUsers: parseInt(e.target.value) }
                })}
              />
              <TextField
                fullWidth
                label="最大存储空间(GB)"
                type="number"
                value={newTenant.subscription.maxStorage}
                onChange={(e) => setNewTenant({
                  ...newTenant,
                  subscription: { ...newTenant.subscription, maxStorage: parseInt(e.target.value) }
                })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateTenant} variant="contained">创建</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};