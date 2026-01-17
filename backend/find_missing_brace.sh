#!/bin/bash

file="src/routes/ai.ts"
counter=0
line_num=0
missing_line=-1

while IFS= read -r line; do
    line_num=$((line_num + 1))
    open_count=$(echo "$line" | grep -o '{' | wc -l)
    close_count=$(echo "$line" | grep -o '}' | wc -l)
    counter=$((counter + open_count - close_count))

    if [ $counter -lt 0 ]; then
        missing_line=$line_num
        break
    fi
done < "$file"

if [ $missing_line -ne -1 ]; then
    echo "在第 $missing_line 行之前可能缺少开括号或有多余的闭括号"
    echo "当前括号计数: $counter"
else
    echo "文件结束时括号计数: $counter"
    if [ $counter -gt 0 ]; then
        echo "文件可能缺少 $counter 个闭括号"
    fi
fi
