import React from 'react';
import { cn } from '../../utils/cn';

interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  className?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value = 0, min = 0, max = 100, step = 1, onChange, className }, ref) => {
    return (
      <div className={cn('w-full', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(Number((e.target as HTMLInputElement).value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';
