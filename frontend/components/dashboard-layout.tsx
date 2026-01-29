'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  className?: string
}

export function DashboardLayout({ children, showHeader = true, className }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Grid background effect */}
      <div className="fixed inset-0 pointer-events-none bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2260%27%20height%3D%2760%27%20viewBox%3D%270%200%2060%2060%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cg%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%3E%3Cg%20fill%3D%27%23ffffff%27%20fill-opacity%3D%270.03%27%3E%3Cpath%20d%3D%27M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Aviation</h1>
                <p className="text-xs text-muted-foreground">Weather Briefing</p>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/briefing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Briefing
              </Link>
            </nav>

            <button className="inline-flex items-center px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm transition-colors">
              Get Started
            </button>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={cn('relative flex-1', className)}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 backdrop-blur-lg py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookies</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Connect</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-8 text-center text-xs text-muted-foreground">
            <p>&copy; 2024 Aviation Weather Briefing. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default DashboardLayout
