import * as React from 'react'

import { cn } from '@/lib/utils'

export interface AccentedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  accentColor?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

function AccentedButton({
  className,
  accentColor = 'var(--primary)',
  variant = 'default',
  size = 'md',
  children,
  ...props
}: AccentedButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantClasses = {
    default: 'bg-card text-foreground border-border hover:bg-muted/50',
    outline: 'bg-transparent text-foreground border-border hover:bg-muted/30',
    ghost: 'bg-transparent text-foreground border-transparent hover:bg-muted/30',
  }

  return (
    <button
      className={cn(
        'accented-button group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border font-medium shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      style={
        {
          '--accent-color': accentColor,
        } as React.CSSProperties
      }
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span
        className="absolute bottom-0 left-0 h-[3px] w-full origin-left transition-all duration-300 group-hover:h-[4px] group-active:h-[3px]"
        style={{
          backgroundColor: accentColor,
        }}
      />
    </button>
  )
}

AccentedButton.displayName = 'AccentedButton'

export { AccentedButton }
