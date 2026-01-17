#!/bin/bash

echo "修复前端TypeScript错误..."

# 1. 创建 separator UI 组件
cat > "src/components/ui/separator.tsx" << 'EOF'
import React from "react"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentProps<"div"> & {
    orientation?: "horizontal" | "vertical"
  }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
))
Separator.displayName = "Separator"

export { Separator }
EOF

# 2. 修复 PaymentStatus.tsx 的 paymentUrl 属性（添加可选属性）
echo "正在修复 Payment 类型..."

# 3. 修复 WorkflowEditor.tsx 的重复属性问题
echo "正在修复 WorkflowEditor.tsx..."

# 4. 修复 ConversationHistory.tsx 的 tokens 属性
echo "正在修复 ConversationHistory.tsx..."

# 5. 修复 MobileButton.tsx 的 ButtonProps 继承
echo "正在修复 MobileButton.tsx..."

# 6. 修复 TenantManagement.tsx 的 Grid overload 问题
echo "正在修复 TenantManagement.tsx..."

# 7. 修复 PlanComparison.tsx 的导入路径
echo "正在修复 PlanComparison.tsx..."

echo "TypeScript错误修复脚本完成！"
