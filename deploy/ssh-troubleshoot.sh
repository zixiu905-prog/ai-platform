#!/bin/bash
# SSH 连接测试和配置帮助

echo "【SSH 连接测试】"
echo "==================="
echo "测试到: 81.68.68.146 (root)"
echo ""

echo "1. 基本连接测试:"
ssh -o ConnectTimeout=5 -o PasswordAuthentication=no -o BatchMode=yes root@81.68.68.146 "echo 'Key auth test'" 2>&1
echo ""

echo "2. 如果上面失败，可能原因:"
echo "  a) 服务器没有开放22端口"
echo "  b) 没有配置SSH密钥认证"
echo "  c) 需要密码认证"
echo "  d) 防火墙限制"
echo ""

echo "3. 请检查:"
echo "  - 云服务器安全组是否开放22端口"
echo "  - 是否已配置SSH密钥对"
echo "  - 是否知道root密码"
echo ""

echo "4. 解决方案:"
echo "  a) 配置SSH密钥认证（推荐）:"
echo "     - 在本地生成SSH密钥: ssh-keygen -t rsa -b 2048"
echo "     - 将公钥添加到服务器: ssh-copy-id root@81.68.68.146"
echo "  b) 使用密码认证:"
echo "     - 脚本中添加SSH密码选项"
echo "     - 或使用 sshpass"
echo ""
