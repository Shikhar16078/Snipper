import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent hover:bg-accent-h text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:   'text-fg-2 hover:text-fg hover:bg-fg/6 px-3 py-1.5 rounded-lg text-sm transition-colors',
  danger:  'text-red-500 hover:bg-red-500/8 px-3 py-1.5 rounded-lg text-sm transition-colors',
  icon:    'text-muted hover:text-fg-2 hover:bg-fg/8 p-1.5 rounded-md transition-colors flex items-center justify-center',
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
