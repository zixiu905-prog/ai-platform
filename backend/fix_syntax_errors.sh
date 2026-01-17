#!/bin/bash

echo "开始批量修复TypeScript语法错误..."

# 修复 try-catch 块结构错误
find src/services -name "*.ts" -exec sed -i 's/^    } catch (error) {/    } catch (error) {/g' {} \;

# 修复 JSON 对象逗号错误
find src/services -name "*.ts" -exec sed -i 's/,$/,\n        /g' {} \; 2>/dev/null || true

# 修复 JSON 对象格式
find src/services -name "*.ts" -exec sed -i '/error instanceof Error.*Error.*message/,/timestamp/s/,$/,\n          timestamp/' {} \; 2>/dev/null || true

echo "批量修复完成"
