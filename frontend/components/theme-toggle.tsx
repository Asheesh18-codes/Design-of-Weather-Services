'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-muted/50"
      aria-label="Toggle theme"
    >
      <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
        {isDark ? (
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform" />
        ) : (
          <Moon className="h-5 w-5 rotate-0 scale-100 transition-transform" />
        )}
      </div>
    </button>
  )
}
