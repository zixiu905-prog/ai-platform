#!/bin/bash

file="src/routes/ai.ts"

echo "修复ai.ts中的语法错误..."

# 1. 修复JSON对象中缺少逗号的问题
sed -i '/{$/{ N; /\s*}\s*$/! s/{/{/; }' "$file"

# 2. 修复对象字面量中缺少逗号
sed -i '/^\s*[a-zA-Z_][a-zA-Z0-9_]*:.*[^,{]$/{
    N
    /^\s*[a-zA-Z_][a-zA-Z0-9_]*: [^,{]\n\s*}/! s/$/,/
}' "$file"

# 3. 修复res.json()等调用中的语法错误
sed -i 's/}\s*timestamp:/},\n        timestamp:/g' "$file"

# 4. 修复try-catch结构问题
sed -i '/} catch/i\\n  try {' "$file"

echo "修复完成"