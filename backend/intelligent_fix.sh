#!/bin/bash

file="src/services/unifiedTenantService.ts"

echo "开始修复 $file"

# 1. 修复 where 语句后的逗号问题
sed -i 's/where: { id: tenantId }/where: { id: tenantId },/' "$file"
sed -i 's/where: { id: tenantId ,$/where: { id: tenantId }/' "$file"

# 2. 修复 JSON 对象中缺少逗号的问题
# 查找连续的属性行，在没有逗号的地方添加逗号
sed -i '/:$/{ N; /:,$/! s/:$/,/; }' "$file"

# 3. 修复对象字面量中的语法错误
# 将没有逗号的属性行末尾添加逗号（除非是最后一个属性）
sed -i '/^\s*[a-zA-Z_][a-zA-Z0-9_]*:.*[^,]$/{
    N
    /^\s*[a-zA-Z_][a-zA-Z0-9_]*:.*[^,]\n\s*}/! s/$/,/
}' "$file"

echo "修复完成"