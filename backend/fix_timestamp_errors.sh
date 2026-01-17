#!/bin/bash

file="src/routes/ai.ts"

echo "批量修复timestamp语法错误..."

# 修复模式：缺少逗号的timestamp属性
sed -i '
# 查找这样的模式：
#     }
#         timestamp: new Date().toISOString()
#       });
# 替换为：
#     },
#         timestamp: new Date().toISOString()
#       });
/\s*}$/{
    N
    /\s*}\n\s*timestamp:/{
        s/\s*}\(\s*\)$/\1,/
    }
}
' "$file"

echo "批量修复完成"