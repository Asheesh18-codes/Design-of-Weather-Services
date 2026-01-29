'use client'

import Link from 'next/link'
import { ArrowRight, Cloud, MapPin, Zap, Lock, Database, Gauge } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Subtle gradient overlay for dark mode - using theme colors */}
      <div className="fixed inset-0 pointer-events-none dark:bg-background" />
      
      {/* Subtle noise texture for dark mode */}
      <div className="fixed inset-0 pointer-events-none dark:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2760%27%20height%3D%2760%27%20viewBox%3D%270%200%2060%2060%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cg%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%3E%3Cg%20fill%3D%27%23ffffff%27%20fill-opacity%3D%270.02%27%3E%3Cpath%20d%3D%27M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">Aviation</h1>
              <p className="text-xs text-muted-foreground">Weather Briefing</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2 mb-6 transition-colors duration-300">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Real-time Aviation Intelligence</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Intelligent Aviation
            <span className="block text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">
              Weather Briefing
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Advanced AI-powered weather analysis, real-time flight data, and comprehensive briefings for informed flight planning decisions.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-bold text-lg transition-all transform hover:scale-105"
            >
              Open Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center px-8 py-4 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold text-lg transition-colors backdrop-blur-sm"
            >
              Learn More
            </a>
          </div>

          {/* Demo image placeholder */}
          <div className="mt-16 rounded-xl border border-border bg-card p-8 backdrop-blur-sm overflow-hidden transition-colors duration-300">
            <div className="aspect-video bg-linear-to-br from-muted/50 to-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Cloud className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-border transition-colors duration-300">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything pilots need for comprehensive flight briefing and real-time weather analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-xl border border-border bg-card p-8 backdrop-blur-sm hover:border-primary transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/50 mb-4">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-Time Weather</h3>
              <p className="text-muted-foreground leading-relaxed">
                Access current METAR, TAF, and SIGMET data with AI-powered interpretation and severity analysis.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-border bg-card p-8 backdrop-blur-sm hover:border-primary transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/50 mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Route Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">
                Analyze weather along your flight route with segmented conditions, risks, and recommendations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-border bg-card p-8 backdrop-blur-sm hover:border-primary transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/50 mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Summaries</h3>
              <p className="text-muted-foreground leading-relaxed">
                Machine learning models automatically summarize complex weather patterns and NOTAMs intelligently.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-xl border border-border bg-card p-8 backdrop-blur-sm hover:border-primary transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/50 mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure & Reliable</h3>
              <p className="text-muted-foreground leading-relaxed">
                Enterprise-grade security with encrypted data transmission and compliance with aviation standards.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-xl border border-border bg-card p-8 backdrop-blur-sm hover:border-primary transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/50 mb-4">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Rich Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                Integration with NOTAM databases, PIREPs, and weather services for comprehensive briefings.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-xl border border-border bg-card p-8 backdrop-blur-sm hover:border-primary transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/50 mb-4">
                <Gauge className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Performance</h3>
              <p className="text-muted-foreground leading-relaxed">
                Optimized for speed with instant data retrieval and responsive interactive maps and charts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-border transition-colors duration-300">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Simple three-step process for comprehensive flight briefing
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-8">
              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/50">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Enter Flight Details</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Input your origin and destination airports, flight altitude, and any specific weather concerns you have.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-8">
              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/50">
                  <span className="text-lg font-bold text-primary">2</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Get Intelligent Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our AI systems analyze METAR, TAF, NOTAMs, and SIGMETs to provide actionable insights and severity ratings.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-8">
              <div className="shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/50">
                  <span className="text-lg font-bold text-primary">3</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Review & Decide</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Review comprehensive briefing with risk indicators, weather maps, and AI recommendations for your flight.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 border-t border-border transition-colors duration-300">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join pilots worldwide using intelligent aviation weather analysis for safer flight planning.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-bold text-lg transition-all transform hover:scale-105"
          >
            Open Dashboard Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card transition-colors duration-300 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Aviation Weather Briefing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
