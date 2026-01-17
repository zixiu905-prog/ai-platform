import React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'destructive'
}

const Alert: React.FC<AlertProps> = ({ className, children, variant = 'default', ...props }) => {
  const variantClass = variant === 'destructive'
    ? 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive'
    : 'border-border text-foreground'

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

const AlertDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ 
  className, 
  children, 
  ...props 
}) => {
  return (
    <div
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export { Alert, AlertDescription }