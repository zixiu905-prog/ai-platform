-- 多租户功能数据库迁移脚本
-- 创建租户相关的表结构

-- 创建租户表
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'professional', 'enterprise')),
    status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial')),
    settings JSONB NOT NULL DEFAULT '{}',
    billing_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 创建用户租户关联表
CREATE TABLE IF NOT EXISTS user_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user', 'viewer')),
    permissions TEXT[] DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 创建租户角色表
CREATE TABLE IF NOT EXISTS tenant_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 创建租户项目表
CREATE TABLE IF NOT EXISTS tenant_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    settings JSONB DEFAULT '{}',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 创建租户文件表
CREATE TABLE IF NOT EXISTS tenant_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    project_id UUID,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT DEFAULT 0,
    checksum VARCHAR(64),
    metadata JSONB DEFAULT '{}',
    uploaded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES tenant_projects(id) ON DELETE SET NULL
);

-- 创建租户AI配置表
CREATE TABLE IF NOT EXISTS tenant_ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    enabled_models TEXT[] DEFAULT '{}',
    default_model VARCHAR(100),
    monthly_quota INTEGER DEFAULT 1000,
    current_usage INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}',
    rate_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 创建租户使用统计表
CREATE TABLE IF NOT EXISTS tenant_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, date, metric_name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 创建租户审计日志表
CREATE TABLE IF NOT EXISTS tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON user_tenants(role);

CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant_id ON tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_roles_name ON tenant_roles(name);

CREATE INDEX IF NOT EXISTS idx_tenant_projects_tenant_id ON tenant_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_projects_status ON tenant_projects(status);
CREATE INDEX IF NOT EXISTS idx_tenant_projects_created_by ON tenant_projects(created_by);

CREATE INDEX IF NOT EXISTS idx_tenant_files_tenant_id ON tenant_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_files_project_id ON tenant_files(project_id);
CREATE INDEX IF NOT EXISTS idx_tenant_files_uploaded_by ON tenant_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_tenant_files_mime_type ON tenant_files(mime_type);

CREATE INDEX IF NOT EXISTS idx_tenant_ai_configs_tenant_id ON tenant_ai_configs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_stats_tenant_id ON tenant_usage_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_stats_date ON tenant_usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_stats_metric_name ON tenant_usage_stats(metric_name);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_tenant_id ON tenant_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_user_id ON tenant_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_action ON tenant_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_created_at ON tenant_audit_logs(created_at);

-- 创建分区表（用于大数据量的审计日志）
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- 为tenant_audit_logs创建分区表
DO $$
DECLARE
    current_month date := date_trunc('month', CURRENT_DATE);
    i integer;
BEGIN
    -- 创建未来12个月的分区
    FOR i IN 0..11 LOOP
        PERFORM create_monthly_partition('tenant_audit_logs', current_month + (i || ' months')::interval);
    END LOOP;
END
$$;

-- 创建行级安全策略（RLS）
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_audit_logs ENABLE ROW LEVEL SECURITY;

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加更新时间戳触发器
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tenants_updated_at BEFORE UPDATE ON user_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_roles_updated_at BEFORE UPDATE ON tenant_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_projects_updated_at BEFORE UPDATE ON tenant_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_ai_configs_updated_at BEFORE UPDATE ON tenant_ai_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建租户统计视图
CREATE OR REPLACE VIEW tenant_overview AS
SELECT 
    t.id,
    t.name,
    t.domain,
    t.plan,
    t.status,
    t.created_at,
    COUNT(DISTINCT ut.user_id) as user_count,
    COUNT(DISTINCT tp.id) as project_count,
    COALESCE(tf.file_count, 0) as file_count,
    COALESCE(tf.total_size, 0) as total_storage_used,
    COALESCE(taic.current_usage, 0) as ai_usage_current,
    COALESCE(taic.monthly_quota, 0) as ai_quota_monthly
FROM tenants t
LEFT JOIN user_tenants ut ON t.id = ut.tenant_id
LEFT JOIN tenant_projects tp ON t.id = tp.tenant_id AND tp.status = 'active'
LEFT JOIN (
    SELECT 
        tenant_id,
        COUNT(*) as file_count,
        COALESCE(SUM(size), 0) as total_size
    FROM tenant_files
    GROUP BY tenant_id
) tf ON t.id = tf.tenant_id
LEFT JOIN tenant_ai_configs taic ON t.id = taic.tenant_id
GROUP BY t.id, t.name, t.domain, t.plan, t.status, t.created_at, tf.file_count, tf.total_size, taic.current_usage, taic.monthly_quota;

-- 创建租户使用量汇总函数
CREATE OR REPLACE FUNCTION update_tenant_usage_stats()
RETURNS void AS $$
BEGIN
    -- 更新用户数量统计
    INSERT INTO tenant_usage_stats (tenant_id, date, metric_name, metric_value)
    SELECT 
        tenant_id,
        CURRENT_DATE,
        'active_users',
        COUNT(DISTINCT user_id)
    FROM user_tenants
    WHERE last_active_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY tenant_id
    ON CONFLICT (tenant_id, date, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value;
    
    -- 更新存储使用量统计
    INSERT INTO tenant_usage_stats (tenant_id, date, metric_name, metric_value)
    SELECT 
        tenant_id,
        CURRENT_DATE,
        'storage_used_bytes',
        COALESCE(SUM(size), 0)
    FROM tenant_files
    GROUP BY tenant_id
    ON CONFLICT (tenant_id, date, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value;
    
    -- 更新AI使用量统计
    INSERT INTO tenant_usage_stats (tenant_id, date, metric_name, metric_value)
    SELECT 
        tenant_id,
        CURRENT_DATE,
        'ai_requests_count',
        current_usage
    FROM tenant_ai_configs
    ON CONFLICT (tenant_id, date, metric_name) 
    DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务（需要pg_cron扩展）
-- SELECT cron.schedule('update-tenant-stats', '0 2 * * *', 'SELECT update_tenant_usage_stats();');

-- 插入默认数据
INSERT INTO tenants (name, domain, plan, status, settings) VALUES
('系统默认租户', 'system.localhost', 'enterprise', 'active', '{"maxUsers": 1000, "maxProjects": 10000, "storageQuota": 10737418240, "aiFeatures": ["all"], "customBranding": true, "apiRateLimit": 10000, "ssoEnabled": true}'),
('示例企业', 'demo.localhost', 'professional', 'active', '{"maxUsers": 100, "maxProjects": 1000, "storageQuota": 1073741824, "aiFeatures": ["text", "image"], "customBranding": true, "apiRateLimit": 1000, "ssoEnabled": false}')
ON CONFLICT (domain) DO NOTHING;

COMMIT;