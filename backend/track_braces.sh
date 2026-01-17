#!/bin/bash

file="src/routes/ai.ts"
counter=0
line_num=0
last_line_with_positive_counter=0

while IFS= read -r line; do
    line_num=$((line_num + 1))
    open_count=$(echo "$line" | grep -o '{' | wc -l)
    close_count=$(echo "$line" | grep -o '}' | wc -l)
    counter=$((counter + open_count - close_count))

    if [ $counter -gt 0 ]; then
        last_line_with_positive_counter=$line_num
        echo "第 $line_num 行，计数: $counter"
        echo "内容: $line"
    fi

    # 只在关键行检查
    if [ $line_num -eq $((last_line_with_positive_counter)) ] && [ $counter -gt 0 ]; then
        echo "最后一行正计数: 第 $last_line_with_positive_counter 行"
    fi
done < "$file"

echo "最终计数: $counter"
echo "最后一行正计数: 第 $last_line_with_positive_counter 行"
