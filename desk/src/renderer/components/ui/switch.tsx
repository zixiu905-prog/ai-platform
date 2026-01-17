import React, { useState } from 'react';
import { cn } from '../../utils/cn';

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled = false, className }, ref) => {
    const [isChecked, setIsChecked] = useState(checked);

    const handleChange = () => {
      const newValue = !isChecked;
      setIsChecked(newValue);
      onCheckedChange?.(newValue);
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isChecked ? 'bg-blue-600' : 'bg-gray-200',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <span
          className={cn(
            'inline-block w-5 h-5 transform rounded-full transition-transform duration-200 ease-in-out',
            isChecked ? 'translate-x-6 bg-white' : 'translate-x-1 bg-white'
          )}
        />
        <span
          className={cn(
            'sr-only',
            isChecked ? 'translate-x-4' : 'translate-x-1'
          )}
        >
          {isChecked ? '开' : '关'}
        </span>
      </button>
    );
  }
);

Switch.displayName = 'Switch';
