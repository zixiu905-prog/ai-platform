#!/bin/bash

echo "开始智能修复语法错误..."

# 创建临时工作目录
mkdir -p /tmp/fix_logs
echo "开始时间: $(date)" > /tmp/fix_logs/progress.log

# 1. 修复最常见的模式 - JSON对象中的逗号问题
echo "步骤1: 修复JSON对象逗号问题..."
find src -name "*.ts" -exec sed -i.bak '/{$/{ N; /\s*}\s*$/! s/{$/{$/; }' {} \;

# 2. 修复where语句后的逗号
echo "步骤2: 修复where语句逗号..."
find src -name "*.ts" -exec sed -i '/where: {[^}]*}$/ s/}$/},/' {} \;

# 3. 修复函数调用中缺少的逗号
echo "步骤3: 修复函数调用逗号..."
find src -name "*.ts" -exec sed -i '/^\s*[a-zA-Z_][a-zA-Z0-9_]*: {$/{ 
    N; 
    /^\s*[a-zA-Z_][a-zA-Z0-9_]*: {\s*}$/! s/$/,/ 
}' {} \;

# 4. 修复数组元素后的逗号
echo "步骤4: 修复数组元素逗号..."
find src -name "*.ts" -exec sed -i '/^\s*{[^}]*}$/{
    N
    /^\s*{[^}]*}\n\s*}/! s/$/,/
}' {} \;

echo "智能修复完成: $(date)" >> /tmp/fix_logs/progress.log

# 统计修复效果
echo "修复统计:"
echo "修复前错误数: 13520"
current_errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS")
echo "修复后错误数: $current_errors"
echo "减少错误数: $((13520 - current_errors))"