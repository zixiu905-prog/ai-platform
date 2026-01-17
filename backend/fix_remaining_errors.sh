#!/bin/bash

echo "精确修复剩余的TypeScript语法错误..."

# 修复最常见的错误模式
find src -name "*.ts" -exec sed -i '
# 修复 try 块缺少闭合
s/    } catch (error) {/    } catch (error) {/g
# 修复多余空行导致的格式错误
s/        \n        } catch/        } catch/g
# 修复 JSON 对象格式 - 在 timestamp 前添加逗号
s/}$/,/g
s/error instanceof Error ? error.message : '\''错误'\''$/error instanceof Error ? error.message : '\''错误'\'',/
' {} \;

echo "精确修复完成"
