import React, { createContext, useContext, useState } from "react"

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = createContext<SelectContextValue | undefined>(undefined)

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children, disabled = false }) => {
  const [open, setOpen] = useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative" style={{ opacity: disabled ? 0.5 : 1 }}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => {
  const context = useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be used within a Select")

  const { open, setOpen } = context

  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  )
}

const SelectValue: React.FC<{ placeholder?: string; className?: string }> = ({ 
  placeholder, 
  className 
}) => {
  const context = useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within a Select")

  const { value } = context

  return (
    <span className={`block truncate ${className}`}>
      {value || placeholder}
    </span>
  )
}

const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be used within a Select")

  const { open, setOpen } = context

  if (!open) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-50" 
        onClick={() => setOpen(false)}
      />
      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
        <div className="p-1">
          {children}
        </div>
      </div>
    </>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children, className }) => {
  const context = useContext(SelectContext)
  if (!context) throw new Error("SelectItem must be used within a Select")

  const { onValueChange, setOpen } = context

  return (
    <div
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className}`}
      onClick={() => {
        onValueChange(value)
        setOpen(false)
      }}
    >
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }