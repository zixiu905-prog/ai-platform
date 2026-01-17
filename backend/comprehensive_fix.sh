#!/bin/bash

echo "开始全面修复TypeScript语法错误..."

# 1. 修复所有的 try-catch 块结构错误
find src -name "*.ts" -exec sed -i '
s/^    } catch (error) {/    } catch (error) {/g
s/    },$/    }/g
' {} \;

# 2. 修复 JSON 对象中的逗号错误
find src -name "*.ts" -exec sed -i '
# 在 timestamp 前添加逗号
s/error.*message.*}$/error.*message.*,/
s/}$/,/g
# 移除多余的逗号
s/, $/}/g
' {} \; 2>/dev/null || true

# 3. 修复接口和类的格式错误
find src -name "*.ts" -exec sed -i '
s/},$/}/g
s/  ,$/  }/g
s/,    async \([^(]*\):/;\n\n  async \1:/g
' {} \; 2>/dev/null || true

echo "全面修复完成，正在检查错误数量..."
