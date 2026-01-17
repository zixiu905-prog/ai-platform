-- 创建AiDesign主数据库
CREATE DATABASE IF NOT EXISTS aidesign;

-- 创建N8N数据库
CREATE DATABASE IF NOT EXISTS n8n;

-- 创建监控数据库
CREATE DATABASE IF NOT EXISTS monitoring;

-- 创建用户并授权
CREATE USER IF NOT EXISTS aidesign_user WITH PASSWORD 'placeholder_password';

GRANT ALL PRIVILEGES ON DATABASE aidesign TO aidesign_user;
GRANT ALL PRIVILEGES ON DATABASE n8n TO aidesign_user;
GRANT ALL PRIVILEGES ON DATABASE monitoring TO aidesign_user;

-- 连接到主数据库并设置权限
\c aidesign;
GRANT ALL ON SCHEMA public TO aidesign_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aidesign_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aidesign_user;

-- 连接到N8N数据库并设置权限
\c n8n;
GRANT ALL ON SCHEMA public TO aidesign_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aidesign_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aidesign_user;

-- 连接到监控数据库并设置权限
\c monitoring;
GRANT ALL ON SCHEMA public TO aidesign_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aidesign_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aidesign_user;

-- 设置数据库编码
ALTER DATABASE aidesign SET timezone = 'Asia/Shanghai';
ALTER DATABASE n8n SET timezone = 'Asia/Shanghai';
ALTER DATABASE monitoring SET timezone = 'Asia/Shanghai';