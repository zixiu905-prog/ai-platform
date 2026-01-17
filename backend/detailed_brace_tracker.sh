#!/bin/bash

file="src/routes/ai.ts"
counter=0
line_num=0

while IFS= read -r line; do
    line_num=$((line_num + 1))
    open_count=$(echo "$line" | grep -o '{' | wc -l)
    close_count=$(echo "$line" | grep -o '}' | wc -l)
    counter=$((counter + open_count - close_count))

    if [ $line_num -ge 474 ] && [ $line_num -le 518 ]; then
        echo "第 $line_num 行，计数: $counter"
        if [ $open_count -gt 0 ] || [ $close_count -gt 0 ]; then
            echo "  开括号: $open_count, 闭括号: $close_count"
            echo "  内容: $line"
        fi
    fi
done < "$file"

echo "最终计数: $counter"