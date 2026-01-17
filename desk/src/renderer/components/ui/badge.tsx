import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'default', 
  size = 'default', 
  children,
  ...props 
}) => {
  const baseClasses = "inline-flex items-center rounded-full font-medium";
  
  const variants = {
    default: "bg-blue-600 text-white",
    secondary: "bg-gray-100 text-gray-800",
    destructive: "bg-red-600 text-white",
    outline: "border border-gray-300 bg-white text-gray-800"
  };
  
  const sizes = {
    default: "px-3 py-1 text-xs",
    sm: "px-2 py-0.5 text-xs",
    lg: "px-4 py-1.5 text-sm"
  };

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Badge };