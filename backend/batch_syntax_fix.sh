#!/bin/bash

echo "开始批量修复语法错误..."

# 获取所有有TS1005错误的文件
error_files=$(npx tsc --noEmit 2>&1 | grep "TS1005" | cut -d'(' -f1 | sed 's/src\///' | sort | uniq)

for file in $error_files; do
    if [ -f "src/$file" ]; then
        echo "修复文件: src/$file"
        
        # 1. 修复 where 语句后的逗号
        sed -i '/where: {[^}]*}$/{ s/}$/},/; }' "src/$file"
        
        # 2. 修复 include、orderBy 等后面的逗号
        sed -i '/^\s*\(include\|orderBy\|skip\|take\|select\): {$/{ 
            N
            /^\s*\(include\|orderBy\|skip\|take\|select\): {\s*}$/! s/$/,/
        }' "src/$file"
        
        # 3. 修复对象字面量中缺少逗号的问题
        sed -i '/^\s*[a-zA-Z_][a-zA-Z0-9_]*: {$/{ 
            N
            /^\s*[a-zA-Z_][a-zA-Z0-9_]*: {\s*}$/! s/$/,/
        }' "src/$file"
        
        # 4. 修复简单的键值对缺少逗号
        sed -i '/^\s*[a-zA-Z_][a-zA-Z0-9_]*: [^,{]*$/{
            N
            /^\s*[a-zA-Z_][a-zA-Z0-9_]*: [^,{]*\n\s*}/! s/$/,/
        }' "src/$file"
        
        echo "完成修复: src/$file"
    fi
done

echo "批量修复完成"