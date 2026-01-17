import React from 'react';
import { cn } from '../../utils/cn';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ScrollArea: React.FC<ScrollAreaProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "overflow-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { ScrollArea };
