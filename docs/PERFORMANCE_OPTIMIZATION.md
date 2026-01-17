# AiDesign 性能优化指南

## 📋 目录

- [性能监控](#性能监控)
- [应用层优化](#应用层优化)
- [数据库优化](#数据库优化)
- [缓存优化](#缓存优化)
- [前端优化](#前端优化)
- [网络优化](#网络优化)
- [系统级优化](#系统级优化)
- [监控和调优](#监控和调优)

## 📊 性能监控

### 关键性能指标

#### 应用性能指标 (APM)

**响应时间指标**
```javascript
// 响应时间分级
const responseTimeMetrics = {
    excellent: '< 100ms',    // 优秀
    good: '100ms - 300ms', // 良好  
    acceptable: '300ms - 1s', // 可接受
    poor: '> 1s'           // 需要优化
};

// API性能基准
const apiBenchmarks = {
    '/api/health': { target: '< 50ms', p95: '< 100ms' },
    '/api/auth/login': { target: '< 200ms', p95: '< 500ms' },
    '/api/ai/chat': { target: '< 2s', p95: '< 5s' },
    '/api/ai/image/generate': { target: '< 30s', p95: '< 60s' },
    '/api/files/upload': { target: '< 5s', p95: '< 10s' }
};
```

**吞吐量指标**
```javascript
// 并发用户数目标
const concurrentUsers = {
    minimum: 100,     // 最低要求
    standard: 1000,    // 标准配置
    high: 10000,       // 高负载配置
    enterprise: 100000  // 企业级配置
};

// 请求处理能力
const throughputTargets = {
    requestsPerSecond: {
        web: 1000,      // Web页面请求
        api: 5000,      // API请求
        file: 100,       // 文件上传
        ai: 50          // AI处理请求
    }
};
```

#### 系统资源指标

**CPU使用率**
```bash
# CPU使用率目标
CPU_USAGE_TARGETS = {
    warning: 70,    // 警告阈值
    critical: 85,    // 严重阈值
    optimal: 60      // 最优范围
}

# 监控脚本
#!/bin/bash
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')

if (( $(echo "$cpu_usage > $CPU_WARNING" | bc -l) )); then
    echo "WARNING: CPU usage is ${cpu_usage}%"
elif (( $(echo "$cpu_usage > $CPU_CRITICAL" | bc -l) )); then
    echo "CRITICAL: CPU usage is ${cpu_usage}%"
fi
```

**内存使用率**
```bash
# 内存使用监控
memory_monitor() {
    local total=$(free -m | awk 'NR==2{print $2}')
    local used=$(free -m | awk 'NR==2{print $3}')
    local usage=$((used * 100 / total))
    
    echo "Memory usage: ${usage}% (${used}MB/${total}MB)"
    
    if [ $usage -gt 85 ]; then
        echo "CRITICAL: High memory usage detected"
    elif [ $usage -gt 70 ]; then
        echo "WARNING: Memory usage is high"
    fi
}
```

### 性能监控工具

#### Prometheus指标配置

**应用指标**
```yaml
# custom_metrics.yml
groups:
  - name: aiplatform.application
    rules:
      # 响应时间指标
      - record: aiplatform:http_request_duration_seconds:rate5m
        expr: rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
      
      # 错误率指标
      - record: aiplatform:http_request_error_rate:rate5m
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
      
      # 并发用户数
      - record: aiplatform:concurrent_users
        expr: count by (user_id) (user_last_seen_timestamp)
```

**业务指标**
```yaml
# business_metrics.yml
groups:
  - name: aiplatform.business
    rules:
      # AI使用统计
      - record: aiplatform:ai_requests_per_minute
        expr: increase(ai_requests_total[1m])
      
      # 文件处理量
      - record: aiplatform:files_processed_per_minute
        expr: increase(files_processed_total[1m])
      
      # 活跃项目数
      - record: aiplatform:active_projects
        expr: count(project_last_updated_timestamp > time() - 3600)
```

## 🚀 应用层优化

### Node.js性能优化

#### 事件循环优化

```javascript
// 启用集群模式
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork(); // Restart worker
    });
} else {
    // Worker process
    require('./app');
    
    // 优雅关闭
    process.on('SIGTERM', () => {
        console.log(`Worker ${process.pid} shutting down gracefully`);
        server.close(() => {
            process.exit(0);
        });
    });
}
```

#### 内存管理优化

```javascript
// 内存泄漏检测
const memwatch = require('memwatch-next');

memwatch.on('leak', (info) => {
    console.error('Memory leak detected:', info);
    // 发送告警
    sendAlert('Memory leak detected', info);
});

memwatch.on('stats', (stats) => {
    if (stats.current_base_size > 100 * 1024 * 1024) { // 100MB
        console.warn('High memory usage detected:', stats);
    }
});

// 对象池优化
class ObjectPool {
    constructor(createFn, resetFn, maxSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        this.pool = [];
    }
    
    acquire() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }
    
    release(obj) {
        if (this.pool.length < this.maxSize) {
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
}

// 使用示例
const stringPool = new ObjectPool(
    () => new Array(1000).join(''),
    (arr) => arr.length = 0,
    50
);
```

#### 数据库连接优化

```javascript
// 连接池配置
const { Pool } = require('pg');

const poolConfig = {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,              // 最大连接数
    min: 5,               // 最小连接数
    idleTimeoutMillis: 30000, // 空闲超时30秒
    connectionTimeoutMillis: 2000, // 连接超时2秒
    acquireTimeoutMillis: 60000,   // 获取连接超时60秒
    createTimeoutMillis: 30000,     // 创建连接超时30秒
    destroyTimeoutMillis: 5000,    // 销毁连接超时5秒
    reapIntervalMillis: 1000,       // 回收间隔1秒
    createRetryIntervalMillis: 200   // 创建重试间隔200ms
};

const pool = new Pool(poolConfig);

// 监控连接池状态
pool.on('connect', (client) => {
    console.log('New connection established');
});

pool.on('remove', (client) => {
    console.log('Connection removed');
});

pool.on('error', (err, client) => {
    console.error('Pool error:', err);
});

// 连接查询中间件
app.use(async (req, res, next) => {
    const client = await pool.connect();
    req.db = client;
    
    res.on('finish', () => {
        client.release();
    });
    
    next();
});
```

### API性能优化

#### 请求处理优化

```javascript
// 压缩中间件
const compression = require('compression');
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
    chunkSize: 16 * 1024
}));

// 响应缓存中间件
const cache = require('memory-cache');
const responseCache = new cache({
    max: 1000,
    ttl: 300 * 1000, // 5分钟
    checkperiod: 60 * 1000 // 1分钟检查过期
});

const cacheMiddleware = (req, res, next) => {
    const key = req.originalUrl;
    const cached = responseCache.get(key);
    
    if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
    }
    
    res.set('X-Cache', 'MISS');
    
    // 重写res.json以缓存响应
    const originalJson = res.json;
    res.json = function(data) {
        if (res.statusCode === 200) {
            responseCache.set(key, data, 60); // 缓存1分钟
        }
        return originalJson.call(this, data);
    };
    
    next();
};

// 批量请求优化
const batchProcessing = async (requests) => {
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(req => processRequest(req))
        );
        results.push(...batchResults);
        
        // 避免过载，批次间暂停
        if (i + batchSize < requests.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return results;
};
```

#### 异步处理优化

```javascript
// 任务队列配置
const Queue = require('bull');
const redisConfig = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    maxRetriesPerRequest: 3,
    retryDelay: 5000
};

// 创建不同类型的队列
const aiQueue = new Queue('AI processing', { redis: redisConfig });
const fileQueue = new Queue('File processing', { redis: redisConfig });
const emailQueue = new Queue('Email sending', { redis: redisConfig });

// AI处理队列配置
aiQueue.process(5, async (job) => {
    const { type, data } = job.data;
    
    try {
        switch (type) {
            case 'image_generation':
                return await generateImage(data);
            case 'text_generation':
                return await generateText(data);
            case 'speech_synthesis':
                return await synthesizeSpeech(data);
            default:
                throw new Error(`Unknown AI task type: ${type}`);
        }
    } catch (error) {
        console.error(`AI job ${job.id} failed:`, error);
        throw error; // Bull会自动重试
    }
});

// 队列监控
aiQueue.on('completed', (job, result) => {
    console.log(`AI job ${job.id} completed`);
});

aiQueue.on('failed', (job, err) => {
    console.error(`AI job ${job.id} failed:`, err);
});

aiQueue.on('stalled', (job) => {
    console.warn(`AI job ${job.id} stalled`);
});
```

## 🗄️ 数据库优化

### PostgreSQL性能调优

#### 配置优化

```sql
-- postgresql.conf 性能参数优化

-- 内存配置
shared_buffers = 256MB                    -- 25% of RAM on dedicated server
effective_cache_size = 1GB                 -- 75% of RAM on dedicated server
work_mem = 4MB                             -- Per connection memory
maintenance_work_mem = 64MB                   -- Maintenance operations

-- 连接配置
max_connections = 200                         -- 根据应用需求调整
shared_preload_libraries = 'pg_stat_statements'   -- 预加载统计模块
pg_stat_statements.track = all                  -- 跟踪所有查询

-- WAL配置
wal_buffers = 16MB                           -- WAL缓冲区
checkpoint_completion_target = 0.7              -- 检查点完成目标
wal_writer_delay = 10ms                      -- WAL写入延迟

-- 查询规划器
random_page_cost = 1.1                         -- SSD优化
effective_io_concurrency = 200                  -- 并发IO操作
default_statistics_target = 100                -- 统计目标

-- 日志配置
log_min_duration_statement = 1000               -- 记录慢查询 (>1s)
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

#### 索引优化

```sql
-- 分析表统计信息
ANALYZE users;
ANALYZE projects;
ANALYZE ai_requests;

-- 创建复合索引
CREATE INDEX CONCURRENTLY idx_users_email_status 
ON users(email, status) WHERE status IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_projects_user_updated 
ON projects(user_id, updated_at DESC);

CREATE INDEX CONCURRENTLY idx_ai_requests_user_created 
ON ai_requests(user_id, created_at DESC);

-- 部分索引（对大表有效）
CREATE INDEX CONCURRENTLY idx_ai_requests_recent 
ON ai_requests(created_at) WHERE created_at > NOW() - INTERVAL '30 days';

-- 表达式索引
CREATE INDEX CONCURRENTLY idx_users_lower_email 
ON users(LOWER(email));

-- JSON字段索引
CREATE INDEX CONCURRENTLY idx_ai_requests_data_gin 
ON ai_requests USING gin(data);
```

#### 查询优化

```sql
-- 查询优化示例

-- 原始查询（可能很慢）
SELECT u.*, p.* 
FROM users u 
LEFT JOIN projects p ON u.id = p.user_id 
WHERE u.email = 'user@example.com' 
ORDER BY p.created_at DESC;

-- 优化后查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.id, u.email, u.name, 
       p.id as project_id, p.name as project_name, p.created_at
FROM users u
LEFT JOIN LATERAL (
    SELECT id, name, created_at
    FROM projects 
    WHERE user_id = u.id 
    ORDER BY created_at DESC 
    LIMIT 10
) p ON true
WHERE u.email = 'user@example.com';

-- 使用CTE优化复杂查询
WITH user_projects AS (
    SELECT u.id, u.email,
           p.id as project_id, p.name as project_name, p.created_at
    FROM users u
    LEFT JOIN projects p ON u.id = p.user_id
    WHERE u.email = 'user@example.com'
),
project_stats AS (
    SELECT user_id, 
           COUNT(*) as project_count,
           MAX(created_at) as latest_project
    FROM projects
    GROUP BY user_id
)
SELECT up.*, ps.project_count
FROM user_projects up
JOIN project_stats ps ON up.id = ps.user_id;
```

#### 分区表优化

```sql
-- 时间分区表示例
CREATE TABLE ai_requests (
    id SERIAL,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    data JSONB
) PARTITION BY RANGE (created_at);

-- 创建月度分区
CREATE TABLE ai_requests_2024_01 PARTITION OF ai_requests
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE ai_requests_2024_02 PARTITION OF ai_requests
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 自动创建分区的存储过程
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

-- 定期创建新分区
SELECT create_monthly_partition('ai_requests', date_trunc('month', CURRENT_DATE + interval '1 month'));
```

## 🗄️ 缓存优化

### Redis缓存策略

#### 缓存架构设计

```javascript
// 缓存层级架构
const cacheStrategy = {
    // L1: 应用内存缓存（最快）
    l1: {
        type: 'memory',
        ttl: 60,      // 1分钟
        maxSize: 1000,
        keys: ['user_session', 'config', 'hot_data']
    },
    
    // L2: Redis缓存（快）
    l2: {
        type: 'redis',
        ttl: 3600,    // 1小时
        keys: ['user_profile', 'project_data', 'ai_results']
    },
    
    // L3: 磁盘缓存（持久）
    l3: {
        type: 'disk',
        ttl: 86400,   // 24小时
        keys: ['generated_images', 'large_files', 'backup_data']
    }
};

// 多级缓存实现
class MultiLevelCache {
    constructor(l1Cache, l2Cache, l3Cache) {
        this.l1 = l1Cache;
        this.l2 = l2Cache;
        this.l3 = l3Cache;
    }
    
    async get(key) {
        // 尝试L1缓存
        let value = await this.l1.get(key);
        if (value !== null) {
            return { value, source: 'l1' };
        }
        
        // 尝试L2缓存
        value = await this.l2.get(key);
        if (value !== null) {
            // 回填L1缓存
            await this.l1.set(key, value, 60);
            return { value, source: 'l2' };
        }
        
        // 尝试L3缓存
        value = await this.l3.get(key);
        if (value !== null) {
            // 回填L1和L2缓存
            await this.l1.set(key, value, 60);
            await this.l2.set(key, value, 3600);
            return { value, source: 'l3' };
        }
        
        return { value: null, source: 'miss' };
    }
    
    async set(key, value, ttl = 3600) {
        await Promise.all([
            this.l1.set(key, value, Math.min(ttl, 60)),
            this.l2.set(key, value, ttl),
            this.l3.set(key, value, Math.max(ttl, 86400))
        ]);
    }
}
```

#### 缓存键设计

```javascript
// 缓存键命名规范
const cacheKeys = {
    user: (userId) => `user:${userId}`,
    userProfile: (userId) => `user:${userId}:profile`,
    userSession: (sessionId) => `session:${sessionId}`,
    project: (projectId) => `project:${projectId}`,
    projectMembers: (projectId) => `project:${projectId}:members`,
    aiModel: (modelId) => `ai:model:${modelId}`,
    aiResult: (requestId) => `ai:result:${requestId}`,
    fileMeta: (fileId) => `file:${fileId}:meta`,
    permissions: (userId, resource) => `perm:${userId}:${resource}`,
    rateLimit: (userId, endpoint) => `rate:${userId}:${endpoint}`,
    config: (key) => `config:${key}`
};

// 缓存失效策略
const cacheInvalidation = {
    // 用户相关缓存失效
    invalidateUser: async (userId) => {
        const patterns = [
            `user:${userId}*`,
            `session:*${userId}*`,
            `perm:${userId}*`
        ];
        
        for (const pattern of patterns) {
            await invalidatePattern(pattern);
        }
    },
    
    // 项目相关缓存失效
    invalidateProject: async (projectId) => {
        const patterns = [
            `project:${projectId}*`,
            `file:*project:${projectId}*`
        ];
        
        for (const pattern of patterns) {
            await invalidatePattern(pattern);
        }
    }
};
```

#### 缓存预热策略

```javascript
// 应用启动时预热关键数据
const cacheWarmup = async () => {
    console.log('Starting cache warmup...');
    
    // 预热用户配置
    const activeUsers = await getActiveUsers();
    for (const user of activeUsers) {
        const profile = await getUserProfile(user.id);
        await cache.set(cacheKeys.userProfile(user.id), profile, 3600);
    }
    
    // 预热热门项目
    const hotProjects = await getHotProjects();
    for (const project of hotProjects) {
        const projectData = await getProjectDetails(project.id);
        await cache.set(cacheKeys.project(project.id), projectData, 1800);
    }
    
    // 预热AI模型配置
    const aiModels = await getAIModels();
    for (const model of aiModels) {
        await cache.set(cacheKeys.aiModel(model.id), model.config, 86400);
    }
    
    console.log('Cache warmup completed');
};

// 定期预热
setInterval(async () => {
    const stats = await getCacheStats();
    if (stats.hitRate < 0.8) {
        console.log('Cache hit rate low, triggering warmup');
        await cacheWarmup();
    }
}, 300000); // 5分钟检查一次
```

## 🎨 前端优化

### React性能优化

#### 组件优化

```typescript
// 使用React.memo优化组件渲染
import React, { memo, useMemo, useCallback } from 'react';

interface UserListProps {
    users: User[];
    onUserSelect: (user: User) => void;
}

const UserList = memo<UserListProps>(({ users, onUserSelect }) => {
    // 使用useMemo缓存计算结果
    const sortedUsers = useMemo(() => {
        return users.sort((a, b) => a.name.localeCompare(b.name));
    }, [users]);
    
    // 使用useCallback缓存函数
    const handleUserSelect = useCallback((user: User) => {
        onUserSelect(user);
    }, [onUserSelect]);
    
    return (
        <div>
            {sortedUsers.map(user => (
                <UserItem 
                    key={user.id} 
                    user={user} 
                    onSelect={handleUserSelect}
                />
            ))}
        </div>
    );
});

// 使用useSelector优化状态订阅
import { useSelector, useDispatch } from 'react-redux';

const UserProfile = () => {
    // 只订阅需要的状态片段
    const user = useSelector(state => state.user.profile);
    const loading = useSelector(state => state.user.loading);
    const dispatch = useDispatch();
    
    const handleUpdate = useCallback((updates: Partial<User>) => {
        dispatch(updateUserProfile(updates));
    }, [dispatch]);
    
    if (loading) return <LoadingSpinner />;
    
    return <UserProfileForm user={user} onUpdate={handleUpdate} />;
};
```

#### 代码分割和懒加载

```typescript
// 路由级别的代码分割
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// 懒加载组件
const AIDashboard = lazy(() => import('./pages/AIDashboard'));
const ProjectManager = lazy(() => import('./pages/ProjectManager'));
const WorkflowDesigner = lazy(() => import('./pages/WorkflowDesigner'));

const App = () => (
    <Suspense fallback={<div>Loading...</div>}>
        <Routes>
            <Route path="/ai" element={<AIDashboard />} />
            <Route path="/projects" element={<ProjectManager />} />
            <Route path="/workflows" element={<WorkflowDesigner />} />
        </Routes>
    </Suspense>
);

// 组件级别的懒加载
const HeavyChart = lazy(() => 
    import('./components/HeavyChart').then(module => ({
        default: module.HeavyChart
    }))
);

// 动态导入
const loadFeatureModule = async (featureName: string) => {
    try {
        const module = await import(`./features/${featureName}`);
        return module.default;
    } catch (error) {
        console.error(`Failed to load feature ${featureName}:`, error);
        return null;
    }
};
```

### 资源优化

#### 图片优化

```typescript
// 图片懒加载组件
import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    placeholder?: string;
    className?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ 
    src, 
    alt, 
    placeholder = '/images/placeholder.jpg',
    className 
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        
        if (imgRef.current) {
            observer.observe(imgRef.current);
        }
        
        return () => observer.disconnect();
    }, []);
    
    return (
        <img
            ref={imgRef}
            src={isInView ? src : placeholder}
            alt={alt}
            className={className}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            style={{
                transition: 'opacity 0.3s',
                opacity: isLoaded ? 1 : 0.7
            }}
        />
    );
};

// 响应式图片组件
const ResponsiveImage: React.FC<{
    sources: {
        srcSet: string;
        media?: string;
    }[];
    fallbackSrc: string;
    alt: string;
}> = ({ sources, fallbackSrc, alt }) => {
    return (
        <picture>
            {sources.map((source, index) => (
                <source
                    key={index}
                    srcSet={source.srcSet}
                    media={source.media}
                />
            ))}
            <img 
                src={fallbackSrc} 
                alt={alt}
                loading="lazy"
                decoding="async"
            />
        </picture>
    );
};
```

#### CSS优化

```css
/* CSS性能优化 */

/* 使用transform代替position变化 */
.optimized-animation {
    will-change: transform;
    transform: translateZ(0); /* 启用GPU加速 */
    transition: transform 0.3s ease;
}

/* 避免重排和重绘 */
.layout-optimized {
    contain: layout style paint;
    overflow: hidden;
}

/* 虚拟滚动优化 */
.virtual-list {
    height: 400px;
    overflow-y: auto;
    contain: strict;
}

.virtual-item {
    height: 60px;
    contain: layout;
}

/* CSS Grid优化 */
.grid-optimized {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    contain: layout;
}

/* 图片优化 */
.responsive-image {
    content-visibility: auto;
    contain-intrinsic-size: 800px 600px;
}
```

### 打包优化

#### Webpack配置优化

```javascript
// webpack.optimization.js
module.exports = {
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                    priority: 10
                },
                common: {
                    name: 'common',
                    minChunks: 2,
                    chunks: 'all',
                    priority: 5,
                    enforce: true
                },
                ai: {
                    test: /[\\/]src[\\/]features[\\/]ai[\\/]/,
                    name: 'ai',
                    chunks: 'all',
                    priority: 15
                }
            }
        },
        runtimeChunk: {
            name: 'runtime'
        },
        moduleIds: 'deterministic',
        usedExports: true,
        sideEffects: false
    },
    
    plugins: [
        new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 8192,
            minRatio: 0.8
        }),
        
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false
        })
    ]
};
```

## 🌐 网络优化

### CDN配置

```nginx
# nginx CDN配置
upstream cdn_backend {
    least_conn;
    server cdn1.aiplatform.com:80 weight=3;
    server cdn2.aiplatform.com:80 weight=2;
    server cdn3.aiplatform.com:80 weight=1 backup;
}

# 静态资源CDN配置
server {
    listen 80;
    server_name cdn.aiplatform.com;
    
    # 缓存配置
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "HIT";
        
        # 压缩
        gzip_static on;
        gzip_types text/css application/javascript image/svg+xml;
        
        try_files $uri @cdn_backend;
    }
    
    # 动态内容不缓存
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header X-Cache-Status "MISS";
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### 负载均衡优化

```nginx
# 智能负载均衡
upstream api_backend {
    least_conn;
    server backend1:3000 weight=3 max_fails=3 fail_timeout=30s backup;
    server backend2:3000 weight=2 max_fails=3 fail_timeout=30s;
    server backend3:3000 weight=1 max_fails=3 fail_timeout=30s;
    
    # 健康检查
    check interval=5000 rise=2 fall=3 timeout=30000 type=http;
    check_http_send "GET /health HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx http_3xx;
}

# 连接池优化
server {
    listen 80;
    
    location /api/ {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 连接优化
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # 缓冲优化
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 8 8k;
        proxy_busy_buffers_size 16k;
        
        # 连接池
        keepalive 32;
    }
}
```

## 🖥️ 系统级优化

### 内核参数优化

```bash
# /etc/sysctl.conf 优化配置

# 网络优化
net.core.rmem_max = 134217728          # 128MB
net.core.wmem_max = 134217728          # 128MB
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_fastopenq = 1024

# 文件系统优化
fs.file-max = 2097152                # 最大文件句柄
fs.inotify.max_user_watches = 524288    # 监控文件数
vm.dirty_ratio = 15                     # 脏页比例
vm.dirty_background_ratio = 5             # 后台写入脏页比例
vm.swappiness = 10                     # swap使用倾向

# 进程优化
kernel.pid_max = 4194304                # 最大进程数
kernel.threads-max = 262144            # 最大线程数

# 应用配置
net.core.somaxconn = 65535             # 最大监听队列
net.ipv4.ip_local_port_range = 1024 65535
```

### Docker优化

```yaml
# docker-compose.yml 优化
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      target: production
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      - NODE_ENV=production
      - UV_THREADPOOL_SIZE=128
      - NODE_OPTIONS=--max-old-space-size=1536
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

## 📈 监控和调优

### 性能监控工具

#### 应用性能监控 (APM)

```javascript
// APM集成示例
const apm = require('elastic-apm-node').start({
    serviceName: 'aiplatform-backend',
    secretToken: process.env.ELASTIC_APM_SECRET,
    serverUrl: process.env.ELASTIC_APM_URL,
    environment: process.env.NODE_ENV,
    logLevel: 'info',
    captureBody: 'all',
    captureHeaders: true,
    transactionSampleRate: 0.1, // 采样10%
    captureSpanStackTraces: true,
    metricsInterval: 30,
    centralConfig: true
});

// 自定义性能指标
const customMetrics = {
    // AI处理时间
    aiProcessingTime: (duration, model) => {
        apm.setLabel('ai_model', model);
        apm.metrics('ai.processing.time', duration);
    },
    
    // 缓存命中率
    cacheHitRate: (hits, total) => {
        const hitRate = hits / total;
        apm.metrics('cache.hit_rate', hitRate);
    },
    
    // 数据库连接池状态
    dbPoolStatus: (pool) => {
        apm.metrics('db.pool.total', pool.total);
        apm.metrics('db.pool.idle', pool.idle);
        apm.metrics('db.pool.waiting', pool.waiting);
    }
};
```

#### 实时性能仪表板

```javascript
// 实时性能监控组件
import React, { useState, useEffect } from 'react';

const PerformanceDashboard = () => {
    const [metrics, setMetrics] = useState({
        cpu: 0,
        memory: 0,
        responseTime: 0,
        throughput: 0,
        errorRate: 0
    });
    
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3001/metrics');
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMetrics(data);
        };
        
        return () => ws.close();
    }, []);
    
    return (
        <div className="performance-dashboard">
            <div className="metric-card">
                <h3>CPU使用率</h3>
                <div className={`gauge ${metrics.cpu > 80 ? 'critical' : metrics.cpu > 60 ? 'warning' : 'normal'}`}>
                    {metrics.cpu}%
                </div>
            </div>
            
            <div className="metric-card">
                <h3>内存使用率</h3>
                <div className={`gauge ${metrics.memory > 85 ? 'critical' : metrics.memory > 70 ? 'warning' : 'normal'}`}>
                    {metrics.memory}%
                </div>
            </div>
            
            <div className="metric-card">
                <h3>平均响应时间</h3>
                <div className={`metric ${metrics.responseTime > 1000 ? 'critical' : metrics.responseTime > 300 ? 'warning' : 'normal'}`}>
                    {metrics.responseTime}ms
                </div>
            </div>
        </div>
    );
};
```

### 自动化调优

```javascript
// 自动性能调优脚本
class AutoTuner {
    constructor() {
        this.thresholds = {
            cpu: { warning: 70, critical: 85 },
            memory: { warning: 80, critical: 90 },
            responseTime: { warning: 500, critical: 1000 },
            errorRate: { warning: 0.05, critical: 0.1 }
        };
        
        this.tuningActions = {
            scaleUp: this.scaleUp.bind(this),
            scaleDown: this.scaleDown.bind(this),
            optimizeCache: this.optimizeCache.bind(this),
            restartService: this.restartService.bind(this)
        };
    }
    
    async monitorAndTune() {
        const metrics = await this.getCurrentMetrics();
        
        // CPU使用率过高
        if (metrics.cpu > this.thresholds.cpu.critical) {
            await this.tuningActions.scaleUp('backend');
        } else if (metrics.cpu > this.thresholds.cpu.warning) {
            console.warn('CPU usage high, monitoring...');
        }
        
        // 内存使用率过高
        if (metrics.memory > this.thresholds.memory.critical) {
            await this.tuningActions.restartService('backend');
            await this.tuningActions.optimizeCache();
        }
        
        // 响应时间过长
        if (metrics.responseTime > this.thresholds.responseTime.critical) {
            await this.tuningActions.scaleUp('backend');
            await this.tuningActions.optimizeDatabase();
        }
        
        // 错误率过高
        if (metrics.errorRate > this.thresholds.errorRate.critical) {
            await this.tuningActions.restartService('backend');
            await this.sendAlert('High error rate detected');
        }
    }
    
    async scaleUp(service) {
        console.log(`Scaling up ${service}...`);
        // 实现自动扩容逻辑
        await this.updateDockerScale(service, '+1');
    }
    
    async optimizeCache() {
        console.log('Optimizing cache...');
        // 清理过期缓存
        await this.clearExpiredCache();
        // 预热热点数据
        await this.warmupHotCache();
    }
    
    async getCurrentMetrics() {
        // 获取当前系统指标
        return {
            cpu: await this.getCpuUsage(),
            memory: await this.getMemoryUsage(),
            responseTime: await this.getAverageResponseTime(),
            errorRate: await this.getErrorRate()
        };
    }
}

// 启动自动调优
const tuner = new AutoTuner();
setInterval(() => {
    tuner.monitorAndTune();
}, 60000); // 每分钟检查一次
```

---

**文档版本**：v2.1.0  
**更新时间**：2024年1月  
**维护团队**：AiDesign性能优化团队

性能优化是一个持续的过程，需要定期监控系统指标，分析性能瓶颈，并根据实际使用情况调整优化策略。建议建立完善的性能监控体系和自动化调优机制。