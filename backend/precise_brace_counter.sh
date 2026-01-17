#!/bin/bash

file="src/routes/ai.ts"
counter=0
line_num=0

while IFS= read -r line; do
    line_num=$((line_num + 1))
    open_count=$(echo "$line" | grep -o '{' | wc -l)
    close_count=$(echo "$line" | grep -o '}' | wc -l)
    counter=$((counter + open_count - close_count))

    if [ $line_num -ge 474 ] && [ $line_num -le 516 ]; then
        echo "第 $line_num 行，计数: $counter"
        if [ $open_count -gt 0 ] || [ $close_count -gt 0 ]; then
            echo "  开: $open_count, 闭: $close_count"
            echo "  $line"
        fi
    fi
done < "$file"

echo "最终计数: $counter"
echo ""

# 检查是否应该是0或2
if [ $counter -eq 2 ]; then
    echo "需要在第516行之后添加2个闭括号来关闭router.post和async函数"
elif [ $counter -eq 1 ]; then
    echo "需要在第516行之后添加1个闭括号"
elif [ $counter -eq 0 ]; then
    echo "括号平衡，不需要修复"
else
    echo "异常情况: 计数=$counter"
fi
