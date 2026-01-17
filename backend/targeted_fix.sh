#!/bin/bash

echo "开始精确修复核心文件..."

# 只修复核心服务和路由文件中最常见的错误
for file in \
  src/services/authService.ts \
  src/services/emailService.ts \
  src/services/backupService.ts \
  src/services/whisperAdvancedService.ts \
  src/services/softwareApiManagementService.ts \
  src/services/softwareIntegrationService.ts \
  src/services/scriptExecutor.ts
do
  if [ -f "$file" ]; then
    echo "修复文件: $file"
    # 修复最常见的错误模式
    sed -i 's/^    } catch (error) {/    } catch (error) {/g' "$file"
    sed -i 's/},$/}/g' "$file"
    sed -i 's/  ,$/  }/g' "$file"
    sed -i 's/error instanceof Error ? error.message.*$/error instanceof Error ? error.message : "Unknown error",/g' "$file"
  fi
done

echo "核心文件修复完成"
