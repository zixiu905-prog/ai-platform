import React from 'react';
import { cn } from '../../utils/cn';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <>
      {children}
    </>
  );
};

interface DialogTriggerProps {
  children: React.ReactNode;
  onClick?: () => void;
}

const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, onClick }) => {
  return <div onClick={onClick}>{children}</div>;
};

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClose?: () => void;
}

const DialogContent: React.ForwardRefRenderFunction<HTMLDivElement, DialogContentProps> =
  ({ className, children, onClose, ...props }, ref) => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div
          ref={ref}
          className={cn(
            "relative z-50 bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4",
            className
          )}
          {...props}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
          {children}
        </div>
      </div>
    );
  };

const ForwardedDialogContent = React.forwardRef(DialogContent);

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ className, children, ...props }) => (
  <div className={cn("mb-4", className)} {...props}>
    {children}
  </div>
);

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogFooter: React.FC<DialogFooterProps> = ({ className, children, ...props }) => (
  <div className={cn("mt-6 flex justify-end space-x-2", className)} {...props}>
    {children}
  </div>
);

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const DialogTitle: React.FC<DialogTitleProps> = ({ className, children, ...props }) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props}>
    {children}
  </h2>
);

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const DialogDescription: React.FC<DialogDescriptionProps> = ({ className, children, ...props }) => (
  <p className={cn("text-sm text-gray-600", className)} {...props}>
    {children}
  </p>
);

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
