# 企业级多租户功能指南

## 概述

本项目实现了完整的企业级多租户功能，支持租户隔离、权限控制、数据管理和资源配额等功能。

## 架构设计

### 数据库架构

- **tenants**: 租户基本信息
- **user_tenants**: 用户租户关联关系
- **tenant_roles**: 租户角色定义
- **tenant_projects**: 租户项目数据
- **tenant_files**: 租户文件管理
- **tenant_ai_configs**: 租户AI配置
- **tenant_usage_stats**: 租户使用统计
- **tenant_audit_logs**: 租户审计日志

### 服务层架构

- **TenantService**: 租户核心管理服务
- **TenantDataService**: 租户数据访问基类
- **TenantProjectService**: 租户项目管理
- **TenantFileService**: 租户文件管理
- **PermissionService**: 权限控制服务
- **TenantInitializationService**: 租户初始化服务

### 中间件

- **TenantMiddleware**: 租户识别和用户验证
- **PermissionMiddleware**: 权限检查和资源隔离

## 快速开始

### 1. 数据库迁移

```bash
# 执行租户相关表结构迁移
npm run prisma:migrate

# 执行租户数据迁移
npm run tenant:migrate
```

### 2. 创建新租户

```typescript
import { TenantService } from './services/tenantService';

const tenantService = new TenantService();

const newTenant = await tenantService.createTenant({
  name: '示例企业',
  domain: 'example.localhost',
  plan: 'professional',
  settings: {
    maxUsers: 100,
    maxProjects: 1000,
    storageQuota: 10737418240, // 10GB
    aiFeatures: ['text', 'image'],
    customBranding: true,
    apiRateLimit: 10000,
    ssoEnabled: false
  }
});
```

### 3. 初始化租户数据

```bash
# 环境变量方式
TENANT_ID=your-tenant-id \
OWNER_USER_ID=user-id \
TENANT_NAME="新租户" \
TENANT_DOMAIN="new.localhost" \
npm run tenant:init
```

### 4. 添加用户到租户

```typescript
import { TenantService } from './services/tenantService';

await tenantService.addUserToTenant(
  'user-uuid',
  'tenant-uuid',
  'admin',
  ['project.manage', 'user.view']
);
```

## 租户识别机制

系统支持多种租户识别方式：

1. **Header识别**: `X-Tenant-ID: tenant-id`
2. **子域名识别**: `tenant.example.com`
3. **路径参数**: `/api/tenants/{tenant-id}/...`
4. **查询参数**: `?tenant=tenant-id`

## 权限系统

### 权限类别

- **用户管理**: `user.*`
- **项目管理**: `project.*`
- **文件管理**: `file.*`
- **租户管理**: `tenant.*`
- **权限管理**: `permission.*`
- **统计分析**: `stats.*`
- **审计管理**: `audit.*`
- **配额管理**: `quota.*`
- **AI功能**: `ai.*`
- **计费管理**: `billing.*`

### 角色定义

- **owner**: 所有者，拥有所有权限
- **admin**: 管理员，拥有除计费外的所有权限
- **user**: 用户，基础功能权限
- **viewer**: 查看者，只读权限

### 权限检查

```typescript
import { requirePermission } from './middleware/permissionMiddleware';

// 路由级别权限检查
app.get('/api/projects', 
  requirePermission({ resource: 'project', action: 'view' }),
  projectController.getProjects
);

// 多权限检查
app.post('/api/users',
  requirePermission([
    { resource: 'user', action: 'create' },
    { resource: 'tenant', action: 'manage' }
  ], { requireAll: true }),
  userController.createUser
);
```

## 数据隔离

### 自动租户过滤

所有数据访问都自动包含租户过滤：

```typescript
// 自动添加 tenantId 条件
const projects = await tenantProjectService.getProjects(req);
// 实际执行的查询类似：
// SELECT * FROM tenant_projects WHERE tenantId = ? AND ...

// 手动指定租户ID
const files = await tenantFileService.getFiles('tenant-123');
```

### 资源所有者检查

```typescript
import { requireResourceOwner } from './middleware/permissionMiddleware';

// 只有资源所有者或管理员可以修改
app.put('/api/projects/:id',
  requireResourceOwner('id'),
  projectController.updateProject
);
```

## 配额管理

### 配额类型

- **用户数量限制**
- **项目数量限制**
- **存储空间限制**
- **API调用限制**
- **AI使用量限制**

### 配额检查

```typescript
// 中间件自动检查
app.post('/api/projects',
  requirePermission({ resource: 'project', action: 'create' }),
  quotaCheck, // 自动检查租户配额
  projectController.createProject
);

// 手动检查
const quotaCheck = await tenantService.checkTenantQuota('tenant-123');
if (!quotaCheck.withinLimit) {
  throw new Error('超出配额限制');
}
```

## 审计日志

### 自动记录

系统自动记录以下操作：

- 用户登录/登出
- 租户创建/修改/删除
- 用户添加/移除/角色变更
- 项目和文件的CRUD操作
- 权限变更
- 配额超限

### 查询审计日志

```typescript
const logs = await tenantService.getAuditLogs('tenant-123', {
  action: 'PROJECT_CREATED',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  limit: 100
});
```

## 前端集成

### 租户选择器

```typescript
import TenantSelector from './components/TenantSelector';

function AppLayout() {
  return (
    <div>
      <TenantSelector 
        onTenantChange={(tenant) => {
          // 处理租户切换
        }}
        currentTenantId={currentTenantId}
      />
    </div>
  );
}
```

### 租户管理界面

```typescript
import TenantManagement from './pages/TenantManagement';

function AdminPanel() {
  return (
    <Routes>
      <Route path="/tenant-management" element={<TenantManagement />} />
    </Routes>
  );
}
```

## 运维指南

### 监控指标

- 租户数量和状态
- 各租户的资源使用情况
- 权限操作频率
- 审计日志量
- 数据库性能指标

### 备份策略

```bash
# 租户数据备份
pg_dump -h localhost -U username -d aidesign -f tenant-backup.sql

# 单租户备份
pg_dump -h localhost -U username -d aidesign \
  --no-owner --no-privileges \
  -t tenants \
  -t user_tenants \
  -t tenant_projects \
  -t tenant_files \
  -f tenant-123-backup.sql
```

### 性能优化

1. **数据库索引优化**
   - 租户ID相关查询索引
   - 用户租户关联索引
   - 审计日志分区表

2. **缓存策略**
   - 租户配置缓存
   - 权限检查结果缓存
   - 使用统计缓存

3. **连接池管理**
   - 按租户隔离连接池
   - 动态调整连接数量

## 安全考虑

### 数据隔离

- 行级安全策略（RLS）
- 应用层租户过滤
- 数据库连接隔离

### 权限控制

- 最小权限原则
- 角色继承机制
- 条件权限支持

### 审计跟踪

- 完整的操作日志
- 敏感操作记录
- 异常行为监控

## 常见问题

### Q: 如何处理租户数据迁移？

A: 使用提供的迁移脚本：
```bash
npm run tenant:migrate
```

### Q: 如何自定义权限？

A: 通过PermissionService扩展：
```typescript
await permissionService.createTenantRole('tenant-123', {
  name: '自定义角色',
  description: '特定权限集合',
  permissions: ['custom.permission']
});
```

### Q: 如何处理跨租户数据访问？

A: 系统严格禁止跨租户数据访问，所有操作都会自动添加租户过滤条件。

### Q: 如何扩展存储配额？

A: 修改租户设置或升级计划：
```typescript
await tenantService.updateTenant('tenant-123', {
  settings: {
    ...existingSettings,
    storageQuota: newQuotaSize
  }
});
```

## API参考

详细的API文档请参考：
- [租户管理API](./API_TENANT_MANAGEMENT.md)
- [权限管理API](./API_PERMISSION_MANAGEMENT.md)
- [数据访问API](./API_DATA_ACCESS.md)

## 更新日志

### v1.0.0
- 基础多租户功能
- 权限控制系统
- 数据隔离机制
- 审计日志功能
- 配额管理
- 前端管理界面

---

更多信息请参考项目文档或联系开发团队。