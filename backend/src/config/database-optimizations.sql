-- AI设计平台数据库优化脚本
-- 针对生产环境的性能优化

-- 1. 创建必要的索引
-- 用户表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription ON users(subscription_plan);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 会话表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_is_revoked ON sessions(is_revoked);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at);

-- 对话表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_model ON conversations(model);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- 消息表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_role ON messages(role);

-- 工作流表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);

-- 工作流执行表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at);

-- 脚本表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scripts_user_id ON scripts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scripts_type ON scripts(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scripts_category ON scripts(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scripts_is_public ON scripts(is_public);

-- 软件连接表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_software_connections_user_id ON software_connections(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_software_connections_software_type ON software_connections(software_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_software_connections_status ON software_connections(status);

-- 文件表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_type ON files(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_created_at ON files(created_at);

-- 订阅表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- 支付记录表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 2. 分区表（针对大数据量表）
-- 按月分区消息表
CREATE TABLE messages_partitioned (
    LIKE messages INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE IF NOT EXISTS messages_2025_12 PARTITION OF messages_partitioned
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS messages_2026_01 PARTITION OF messages_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- 3. 统计信息更新
-- 更新表统计信息以提高查询性能
ANALYZE users;
ANALYZE sessions;
ANALYZE conversations;
ANALYZE messages;
ANALYZE workflows;
ANALYZE workflow_executions;
ANALYZE scripts;
ANALYZE software_connections;
ANALYZE files;
ANALYZE subscriptions;
ANALYZE payments;

-- 4. 配置优化建议
-- 检查并建议PostgreSQL配置优化
DO $$
DECLARE
    shared_buffers_size TEXT;
    effective_cache_size TEXT;
    work_mem_size TEXT;
    maintenance_work_mem_size TEXT;
BEGIN
    -- 获取当前配置
    SELECT setting INTO shared_buffers_size FROM pg_settings WHERE name = 'shared_buffers';
    SELECT setting INTO effective_cache_size FROM pg_settings WHERE name = 'effective_cache_size';
    SELECT setting INTO work_mem_size FROM pg_settings WHERE name = 'work_mem';
    SELECT setting INTO maintenance_work_mem_size FROM pg_settings WHERE name = 'maintenance_work_mem';
    
    -- 输出配置建议
    RAISE NOTICE '=== PostgreSQL配置优化建议 ===';
    RAISE NOTICE '当前 shared_buffers: %', shared_buffers_size;
    RAISE NOTICE '建议 shared_buffers: 256MB (系统内存的25%)';
    
    RAISE NOTICE '当前 effective_cache_size: %', effective_cache_size;
    RAISE NOTICE '建议 effective_cache_size: 1GB (系统内存的75%)';
    
    RAISE NOTICE '当前 work_mem: %', work_mem_size;
    RAISE NOTICE '建议 work_mem: 4MB (每个连接)';
    
    RAISE NOTICE '当前 maintenance_work_mem: %', maintenance_work_mem_size;
    RAISE NOTICE '建议 maintenance_work_mem: 64MB (维护操作)';
END $$;

-- 5. 慢查询监控配置
-- 启用慢查询日志
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 记录超过1秒的查询
ALTER SYSTEM SET log_statement = 'all'; -- 记录所有SQL语句
ALTER SYSTEM SET log_duration = on; -- 记录查询持续时间

-- 6. 连接池优化建议
-- 检查连接数配置
SELECT 
    name,
    setting,
    unit,
    short_desc
FROM pg_settings 
WHERE name IN ('max_connections', 'shared_buffers', 'effective_cache_size', 'work_mem')
ORDER BY name;

-- 7. 定期维护任务
-- 创建维护函数
CREATE OR REPLACE FUNCTION maintenance_tasks() 
RETURNS void AS $$
DECLARE
    last_analyze TIMESTAMP;
    last_vacuum TIMESTAMP;
BEGIN
    -- 更新表统计信息
    ANALYZE;
    
    -- 清理过期会话
    DELETE FROM sessions 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    -- 清理过期的工作流执行记录
    DELETE FROM workflow_executions 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- 清理旧的日志记录（如果有日志表）
    -- 这里可以根据实际需要添加清理逻辑
    
    RAISE NOTICE '维护任务完成于 %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. 性能监控视图
-- 创建性能监控视图
CREATE OR REPLACE VIEW performance_stats AS
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;

-- 创建索引使用情况视图
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY schemaname, tablename, indexname;

-- 9. 缓存优化
-- 为频繁查询的数据创建物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS user_subscription_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.subscription_plan,
    u.tokens_used,
    u.tokens_limit,
    s.status,
    s.expires_at,
    s.auto_renew
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active';

-- 创建唯一索引以支持快速刷新
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscription_summary_user_id 
ON user_subscription_summary(user_id);

-- 创建刷新函数
CREATE OR REPLACE FUNCTION refresh_user_subscription_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_subscription_summary;
END;
$$ LANGUAGE plpgsql;

-- 10. 安全配置
-- 禁用不安全的函数
DROP EXTENSION IF EXISTS plpythonu;
DROP EXTENSION IF EXISTS plperlu;

-- 设置行级安全策略（可选）
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '=== 数据库优化脚本执行完成 ===';
    RAISE NOTICE '请检查上述输出并根据实际情况应用配置建议';
    RAISE NOTICE '建议定期运行 maintenance_tasks() 函数进行维护';
    RAISE NOTICE '建议定期刷新物化视图: SELECT refresh_user_subscription_summary();';
END $$;