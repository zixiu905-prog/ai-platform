-- AI智能体平台生产环境数据库初始化脚本

-- 创建数据库和用户
CREATE DATABASE IF NOT EXISTS ai_platform_prod;
CREATE USER IF NOT EXISTS ai_platform_user WITH ENCRYPTED PASSWORD 'your_strong_postgres_password_here';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE ai_platform_prod TO ai_platform_user;

-- 切换到应用数据库
\c ai_platform_prod;

-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 创建schema
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO ai_platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL ON TABLES TO ai_platform_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT ALL ON TABLES TO ai_platform_user;

-- 创建优化配置表
CREATE TABLE IF NOT EXISTS app.system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入初始配置
INSERT INTO app.system_config (key, value, description) VALUES
('app_version', '"1.0.0"', '应用版本'),
('maintenance_mode', 'false', '维护模式开关'),
('max_file_size', '"104857600"', '最大文件上传大小(字节)'),
('jwt_expires_in', '"604800"', 'JWT过期时间(秒)')
ON CONFLICT (key) DO NOTHING;

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS audit.connection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    action VARCHAR(100),
    resource VARCHAR(255),
    status VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_connection_logs_user_id ON audit.connection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON audit.connection_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_connection_logs_ip_address ON audit.connection_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_connection_logs_action ON audit.connection_logs(action);

-- 创建分区函数（用于大数据量表）
CREATE OR REPLACE FUNCTION audit.create_partition_table(table_name text, partition_interval text)
RETURNS void AS $$
DECLARE
    sql text;
BEGIN
    -- 创建分区表的逻辑可以在这里实现
    -- 这是一个示例，实际实现会更复杂
    sql := format('CREATE TABLE IF NOT EXISTS %s (LIKE audit.connection_logs INCLUDING ALL)', table_name);
    EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- 创建监控视图
CREATE OR REPLACE VIEW analytics.user_activity_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    user_id,
    action,
    COUNT(*) as action_count,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM audit.connection_logs
WHERE user_id IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at), user_id, action;

-- 创建性能监控视图
CREATE OR REPLACE VIEW analytics.performance_metrics AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    action,
    COUNT(*) as request_count,
    AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_interval_seconds
FROM audit.connection_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), action;

-- 设置数据库参数优化
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- 创建备份函数
CREATE OR REPLACE FUNCTION app.backup_database(backup_path text)
RETURNS boolean AS $$
DECLARE
    sql text;
BEGIN
    -- 这里可以添加备份逻辑
    -- 实际备份会通过pg_dump或外部工具实现
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 创建清理函数（清理过期日志）
CREATE OR REPLACE FUNCTION app.cleanup_old_logs(days_to_keep integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM audit.connection_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建数据库统计函数
CREATE OR REPLACE FUNCTION app.get_database_stats()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'database_size', pg_size_pretty(pg_database_size(current_database())),
        'total_connections', count(*),
        'active_connections', count(*) FILTER (WHERE state = 'active'),
        'idle_connections', count(*) FILTER (WHERE state = 'idle'),
        'total_tables', count(*) FROM pg_stat_user_tables
    ) INTO result FROM pg_stat_activity;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 授权给应用用户
GRANT USAGE ON SCHEMA app TO ai_platform_user;
GRANT USAGE ON SCHEMA audit TO ai_platform_user;
GRANT USAGE ON SCHEMA analytics TO ai_platform_user;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO ai_platform_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO ai_platform_user;

-- 设置表所有者
ALTER SCHEMA app OWNER TO ai_platform_user;
ALTER SCHEMA audit OWNER TO ai_platform_user;
ALTER SCHEMA analytics OWNER TO ai_platform_user;

COMMIT;