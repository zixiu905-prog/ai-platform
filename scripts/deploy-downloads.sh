#!/bin/bash

# 复制下载文件到nginx容器并重启

echo "复制下载文件到nginx容器..."

# 确保目录存在
docker exec nginx-prod mkdir -p /usr/share/nginx/html/downloads/desktop

# 复制文件
docker cp downloads/desktop/version.json nginx-prod:/usr/share/nginx/html/downloads/desktop/
docker cp downloads/desktop/AI智能体平台-1.0.0-linux-x64.tar.gz nginx-prod:/usr/share/nginx/html/downloads/desktop/
docker cp downloads/desktop/checksums.md5 nginx-prod:/usr/share/nginx/html/downloads/desktop/
docker cp downloads/desktop/checksums.sha256 nginx-prod:/usr/share/nginx/html/downloads/desktop/

# 设置权限
docker exec nginx-prod chmod -R 644 /usr/share/nginx/html/downloads/desktop/
docker exec nginx-prod chmod -R 755 /usr/share/nginx/html/downloads/desktop/

# 重启nginx
docker restart nginx-prod

echo "完成！"
echo "测试下载："
echo "https://www.aidesign.ltd/downloads/desktop/version.json"
echo "https://www.aidesign.ltd/downloads/desktop/AI智能体平台-1.0.0-linux-x64.tar.gz"
