#!/bin/bash

# 修复service文件中的常见语法错误
files=(
    "src/services/unifiedTenantService.ts"
    "src/services/softwareApiManagementService.ts"
    "src/services/unifiedWorkflowService.ts"
    "src/routes/settings.ts"
    "src/services/appStoreService.ts"
    "src/services/whisperAdvancedService.ts"
    "src/services/advancedAIService.ts"
    "src/services/desktopCommunicationService.ts"
    "src/services/ssoService.ts"
    "src/services/aiDesignIntegrationService.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "修复文件: $file"
        
        # 修复缺少逗号的常见模式
        # where语句后缺少逗号
        sed -i '/where: {$/{ N; s/where: {\s*}/where: {}/; }' "$file"
        sed -i '/where: {[^}]*}/{ /where: {[^}]*}.*$/!{ N; s/where: {\s*$/where: { },/; } }' "$file"
        
        # data前缺少逗号
        sed -i 's/}$/},/g' "$file" | sed -i '/},$/N; s/},},/},/g' "$file"
        
        # JSON对象中缺少逗号
        sed -i 's/:$/,/g' "$file"
        
        echo "完成修复: $file"
    fi
done

echo "批量修复完成"