#!/bin/bash

file="src/routes/ai.ts"
counter=0
line_num=0
last_positive_line=0

while IFS= read -r line; do
    line_num=$((line_num + 1))
    open_count=$(echo "$line" | grep -o '{' | wc -l)
    close_count=$(echo "$line" | grep -o '}' | wc -l)
    counter=$((counter + open_count - close_count))

    if [ $counter -gt 0 ]; then
        last_positive_line=$line_num
        echo "第 $line_num 行，计数: $counter"
        echo "  $line"
    fi

    if [ $counter -lt 0 ]; then
        echo "第 $line_num 行：发现多余闭括号！"
        echo "  $line"
        exit 1
    fi
done < "$file"

echo ""
echo "最终计数: $counter"
echo "最后一行正计数: 第 $last_positive_line 行"

if [ $counter -gt 0 ]; then
    echo ""
    echo "建议：需要在第 $last_positive_line 行之后添加 $counter 个闭括号"
fi
