import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors ${className}`}
      {...props}
    />
  )
}
