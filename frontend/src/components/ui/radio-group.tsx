import React, { createContext, useContext } from 'react'

const RadioGroupContext = createContext<{
  value: string
  onValueChange: (value: string) => void
} | undefined>(undefined)

interface RadioGroupProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

const RadioGroup: React.FC<RadioGroupProps> = ({ value, onValueChange, children, className }) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </RadioGroupContext.Provider>
  )
}

interface RadioGroupItemProps {
  value: string
  id: string
  children?: React.ReactNode
  className?: string
}

const RadioGroupItem: React.FC<RadioGroupItemProps> = ({ value, id, className }) => {
  const context = useContext(RadioGroupContext)
  if (!context) throw new Error('RadioGroupItem must be used within a RadioGroup')

  const { value: groupValue, onValueChange } = context

  return (
    <input
      type="radio"
      id={id}
      name="radio-group"
      value={value}
      checked={groupValue === value}
      onChange={() => onValueChange(value)}
      className={className}
    />
  )
}

export { RadioGroup, RadioGroupItem }
