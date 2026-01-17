import React from 'react';
import { cn } from '../../utils/cn';

type AlertVariant = 'default' | 'destructive' | 'warning' | 'success' | 'info';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: AlertVariant;
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ className, children, variant = 'default', ...props }) => {
  const variantStyles: Record<AlertVariant, string> = {
    default: "border-gray-200 bg-white text-gray-950",
    destructive: "border-red-200 bg-red-50 text-red-900",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
    success: "border-green-200 bg-green-50 text-green-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const AlertDescription: React.FC<AlertDescriptionProps> = ({ className, children, ...props }) => {
  return (
    <p
      className={cn("text-sm leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  );
};

export { Alert, AlertDescription };