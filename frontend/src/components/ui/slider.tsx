import React from "react"

interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number[]
  onValueChange: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, onValueChange, max = 100, min = 0, step = 1, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value)
      onValueChange([newValue])
    }

    return (
      <div
        ref={ref}
        className={`relative flex w-full touch-none select-none items-center ${className}`}
        {...props}
      >
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute h-full bg-primary"
            style={{
              left: "0%",
              right: `${100 - ((value[0] - min) / (max - min)) * 100}%`,
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          disabled={disabled}
          className="absolute h-2 w-full cursor-pointer appearance-none bg-transparent opacity-0"
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }