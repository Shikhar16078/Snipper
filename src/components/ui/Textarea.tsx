import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-fg placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none font-mono ${className}`}
      {...props}
    />
  )
}
