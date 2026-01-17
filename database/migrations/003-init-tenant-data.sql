-- 初始化租户数据脚本
-- 为现有系统创建默认租户和迁移现有数据

-- 创建迁移临时表
CREATE TEMPORARY TABLE migration_users AS 
SELECT 
    id,
    email,
    username,
    COALESCE(name, username) as display_name,
    created_at
FROM users;

-- 创建默认租户
INSERT INTO tenants (
    id,
    name,
    domain,
    plan,
    status,
    settings,
    created_at,
    updated_at
) SELECT 
    uuid_generate_v4(),
    '默认租户',
    'default.localhost',
    'enterprise',
    'active',
    '{
        "maxUsers": 1000,
        "maxProjects": 10000,
        "storageQuota": 107374182400,
        "aiFeatures": ["text", "image", "speech", "all"],
        "customBranding": true,
        "apiRateLimit": 100000,
        "ssoEnabled": true
    }'::jsonb,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE domain = 'default.localhost')
RETURNING id INTO default_tenant_id;

-- 将现有用户关联到默认租户
INSERT INTO user_tenants (
    id,
    user_id,
    tenant_id,
    role,
    permissions,
    joined_at,
    last_active_at,
    created_at,
    updated_at
) SELECT 
    uuid_generate_v4(),
    mu.id,
    t.id,
    CASE 
        WHEN mu.email LIKE '%admin%' THEN 'owner'
        WHEN mu.created_at < NOW() - INTERVAL '30 days' THEN 'admin'
        ELSE 'user'
    END,
    CASE 
        WHEN mu.email LIKE '%admin%' THEN ARRAY['*']
        ELSE ARRAY['project.view', 'project.create', 'project.edit', 'file.view', 'file.create', 'file.edit', 'ai.use']
    END,
    mu.created_at,
    COALESCE(
        (SELECT MAX(updated_at) FROM audit_logs WHERE user_id = mu.id LIMIT 1),
        mu.created_at
    ),
    NOW(),
    NOW()
FROM migration_users mu
CROSS JOIN tenants t
WHERE t.domain = 'default.localhost'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 迁移现有项目到默认租户
INSERT INTO tenant_projects (
    id,
    tenant_id,
    name,
    description,
    type,
    status,
    settings,
    created_by,
    created_at,
    updated_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    w.name,
    w.description,
    COALESCE(w.category, 'general'),
    CASE 
        WHEN w.is_active THEN 'active'
        ELSE 'archived'
    END,
    COALESCE(w.config, '{}')::jsonb,
    w.author_id,
    w.created_at,
    w.updated_at
FROM workflows w
CROSS JOIN tenants t
WHERE t.domain = 'default.localhost'
ON CONFLICT DO NOTHING;

-- 迁移现有文件到默认租户
INSERT INTO tenant_files (
    id,
    tenant_id,
    name,
    original_name,
    path,
    mime_type,
    size,
    metadata,
    uploaded_by,
    created_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    f.file_name || '_' || f.id,
    f.file_name,
    '/uploads/' || f.file_path,
    f.mime_type,
    COALESCE(f.file_size, 0),
    jsonb_build_object(
        'original_id', f.id,
        'migration_source', 'legacy_files'
    ),
    COALESCE(f.uploaded_by, 'system'),
    f.created_at
FROM files f
CROSS JOIN tenants t
WHERE t.domain = 'default.localhost'
AND f.created_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- 为默认租户创建AI配置
INSERT INTO tenant_ai_configs (
    id,
    tenant_id,
    enabled_models,
    default_model,
    monthly_quota,
    current_usage,
    features,
    rate_limits,
    created_at,
    updated_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    ARRAY['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet', 'doubao-pro'],
    'gpt-3.5-turbo',
    100000,
    0,
    '{
        "textGeneration": true,
        "imageGeneration": true,
        "speechSynthesis": true,
        "speechRecognition": true,
        "codeGeneration": true,
        "dataAnalysis": true
    }'::jsonb,
    '{
        "requestsPerMinute": 1000,
        "requestsPerHour": 10000,
        "requestsPerDay": 100000,
        "tokensPerMinute": 60000,
        "tokensPerHour": 1000000
    }'::jsonb,
    NOW(),
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost'
ON CONFLICT (tenant_id) DO NOTHING;

-- 创建默认角色
INSERT INTO tenant_roles (
    id,
    tenant_id,
    name,
    description,
    permissions,
    is_system_role,
    created_at,
    updated_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    '默认管理员',
    '拥有租户的管理权限，但计费权限除外',
    ARRAY[
        'user.view', 'user.create', 'user.manage',
        'project.view', 'project.create', 'project.edit', 'project.delete',
        'file.view', 'file.create', 'file.edit', 'file.delete',
        'tenant.view', 'tenant.edit',
        'permission.view', 'permission.manage',
        'stats.view', 'audit.view', 'quota.view',
        'ai.use', 'ai.manage'
    ],
    true,
    NOW(),
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost'
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO tenant_roles (
    id,
    tenant_id,
    name,
    description,
    permissions,
    is_system_role,
    created_at,
    updated_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    '默认用户',
    '基础用户权限，可以使用主要功能',
    ARRAY[
        'project.view', 'project.create', 'project.edit',
        'file.view', 'file.create', 'file.edit',
        'ai.use', 'tenant.view', 'stats.view'
    ],
    true,
    NOW(),
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost'
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO tenant_roles (
    id,
    tenant_id,
    name,
    description,
    permissions,
    is_system_role,
    created_at,
    updated_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    '默认查看者',
    '只读权限，只能查看信息',
    ARRAY[
        'project.view', 'file.view', 'tenant.view', 'stats.view'
    ],
    true,
    NOW(),
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost'
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 创建使用统计初始数据
INSERT INTO tenant_usage_stats (
    id,
    tenant_id,
    date,
    metric_name,
    metric_value,
    metadata,
    created_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    CURRENT_DATE - INTERVAL '1 day',
    'users_count',
    (SELECT COUNT(*) FROM user_tenants WHERE tenant_id = t.id),
    '{"source": "migration"}'::jsonb,
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost';

INSERT INTO tenant_usage_stats (
    id,
    tenant_id,
    date,
    metric_name,
    metric_value,
    metadata,
    created_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    CURRENT_DATE - INTERVAL '1 day',
    'projects_count',
    (SELECT COUNT(*) FROM tenant_projects WHERE tenant_id = t.id),
    '{"source": "migration"}'::jsonb,
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost';

INSERT INTO tenant_usage_stats (
    id,
    tenant_id,
    date,
    metric_name,
    metric_value,
    metadata,
    created_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    CURRENT_DATE - INTERVAL '1 day',
    'files_count',
    (SELECT COUNT(*) FROM tenant_files WHERE tenant_id = t.id),
    '{"source": "migration"}'::jsonb,
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost';

INSERT INTO tenant_usage_stats (
    id,
    tenant_id,
    date,
    metric_name,
    metric_value,
    metadata,
    created_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    CURRENT_DATE - INTERVAL '1 day',
    'storage_used_bytes',
    COALESCE((SELECT SUM(size) FROM tenant_files WHERE tenant_id = t.id), 0),
    '{"source": "migration"}'::jsonb,
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost';

-- 创建迁移审计日志
INSERT INTO tenant_audit_logs (
    id,
    tenant_id,
    action,
    resource_type,
    details,
    created_at
) SELECT 
    uuid_generate_v4(),
    t.id,
    'SYSTEM_MIGRATION_COMPLETED',
    'system',
    jsonb_build_object(
        'migration_date', NOW(),
        'users_migrated', (SELECT COUNT(*) FROM user_tenants WHERE tenant_id = t.id),
        'projects_migrated', (SELECT COUNT(*) FROM tenant_projects WHERE tenant_id = t.id),
        'files_migrated', (SELECT COUNT(*) FROM tenant_files WHERE tenant_id = t.id)
    ),
    NOW()
FROM tenants t
WHERE t.domain = 'default.localhost';

-- 更新序列（如果需要）
SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants) + 1);
SELECT setval('user_tenants_id_seq', (SELECT MAX(id) FROM user_tenants) + 1);
SELECT setval('tenant_projects_id_seq', (SELECT MAX(id) FROM tenant_projects) + 1);
SELECT setval('tenant_files_id_seq', (SELECT MAX(id) FROM tenant_files) + 1);
SELECT setval('tenant_roles_id_seq', (SELECT MAX(id) FROM tenant_roles) + 1);
SELECT setval('tenant_ai_configs_id_seq', (SELECT MAX(id) FROM tenant_ai_configs) + 1);
SELECT setval('tenant_usage_stats_id_seq', (SELECT MAX(id) FROM tenant_usage_stats) + 1);
SELECT setval('tenant_audit_logs_id_seq', (SELECT MAX(id) FROM tenant_audit_logs) + 1);

-- 创建迁移完成标记表
CREATE TABLE IF NOT EXISTS migration_markers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB DEFAULT '{}'
);

INSERT INTO migration_markers (migration_name, details) VALUES (
    'tenant_data_migration_003',
    jsonb_build_object(
        'default_tenant_created', true,
        'users_migrated', (SELECT COUNT(*) FROM user_tenants),
        'projects_migrated', (SELECT COUNT(*) FROM tenant_projects),
        'files_migrated', (SELECT COUNT(*) FROM tenant_files),
        'migration_timestamp', NOW()
    )
) ON CONFLICT (migration_name) DO NOTHING;

-- 清理临时表
DROP TABLE IF EXISTS migration_users;

COMMIT;

-- 输出迁移统计信息
DO $$
DECLARE
    default_tenant_id UUID;
    users_count INTEGER;
    projects_count INTEGER;
    files_count INTEGER;
BEGIN
    SELECT id INTO default_tenant_id FROM tenants WHERE domain = 'default.localhost';
    
    SELECT COUNT(*) INTO users_count FROM user_tenants WHERE tenant_id = default_tenant_id;
    SELECT COUNT(*) INTO projects_count FROM tenant_projects WHERE tenant_id = default_tenant_id;
    SELECT COUNT(*) INTO files_count FROM tenant_files WHERE tenant_id = default_tenant_id;
    
    RAISE NOTICE '=== 租户数据迁移完成 ===';
    RAISE NOTICE '默认租户ID: %', default_tenant_id;
    RAISE NOTICE '迁移用户数量: %', users_count;
    RAISE NOTICE '迁移项目数量: %', projects_count;
    RAISE NOTICE '迁移文件数量: %', files_count;
    RAISE NOTICE '迁移完成时间: %', NOW();
END $$;