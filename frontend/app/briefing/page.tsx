'use client'

import React, { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle, Cloud, MapPin, TrendingDown, Wind, Plane } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { RouteMap } from '@/components/route-map'
import { cn, getSeverityColor, getSeverityBgColor, getSeverityBorderColor } from '@/lib/utils'
import api from '@/lib/api'

function BriefingContent() {
  const searchParams = useSearchParams()
  const origin = searchParams.get('origin') || 'KJFK'
  const destination = searchParams.get('destination') || 'KSFO'
  
  const [briefing, setBriefing] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureWeather, setDepartureWeather] = useState<any>(null)
  const [arrivalWeather, setArrivalWeather] = useState<any>(null)

  useEffect(() => {
    const fetchBriefing = async () => {
      if (!origin || !destination) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const [briefingData, depWeather, arrWeather] = await Promise.all([
          api.briefing.getFlightBriefing({
            origin,
            destination,
            altitude: 35000,
            departureTime: new Date().toISOString()
          }),
          api.weather.getLatestMetar(origin),
          api.weather.getLatestMetar(destination)
        ])
        setBriefing(briefingData)
        setDepartureWeather(depWeather)
        setArrivalWeather(arrWeather)
      } catch (err) {
        console.error('Failed to fetch briefing:', err)
        setError('Failed to load briefing data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchBriefing()
  }, [origin, destination])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading briefing data...</p>
        </div>
      </div>
    )
  }

  if (error || !briefing) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{error || 'No briefing data available'}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const severityColor = briefing.severity === 'SEVERE' ? 'text-destructive' : briefing.severity === 'SIGNIFICANT' ? 'text-amber-400' : 'text-green-400'
  const severityBg =
    briefing.severity === 'SEVERE' ? 'bg-destructive/20' : briefing.severity === 'SIGNIFICANT' ? 'bg-amber-900/30' : 'bg-green-900/30'
  const severityBorder =
    briefing.severity === 'SEVERE' ? 'border-destructive' : briefing.severity === 'SIGNIFICANT' ? 'border-amber-700' : 'border-green-700'

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Subtle gradient overlay for dark mode - using theme colors */}
      <div className="fixed inset-0 pointer-events-none dark:bg-background" />
      
      {/* Subtle noise texture for dark mode */}
      <div className="fixed inset-0 pointer-events-none dark:bg-[url('data:image/svg+xml;utf8,%3Csvg%20width%3D%2760%27%20height%3D%2760%27%20viewBox%3D%270%200%2060%2060%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cg%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%3E%3Cg%20fill%3D%27%23ffffff%27%20fill-opacity%3D%270.02%27%3E%3Cpath%20d%3D%27M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold group-hover:text-primary transition-colors">Aviation</h1>
              <p className="text-xs text-muted-foreground">Weather Briefing</p>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-card hover:bg-muted text-foreground border border-border font-semibold text-sm transition-colors"
            >
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-4xl font-bold">Flight Briefing</h1>
              <div className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold', severityBg, severityBorder, 'border')}>
                <div className={cn('h-2 w-2 rounded-full', severityColor === 'text-destructive' ? 'bg-destructive' : severityColor === 'text-amber-400' ? 'bg-amber-400' : 'bg-green-400')} />
                <span className={severityColor}>{briefing.severity}</span>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              {origin} to {destination}
            </p>
          </div>

          {/* Flight Overview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Route Information */}
            <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Route Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origin:</span>
                  <span className="font-semibold">{briefing.route?.origin?.icao || origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destination:</span>
                  <span className="font-semibold">{briefing.route?.destination?.icao || destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flight Rules:</span>
                  <span className="font-semibold text-primary">VFR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Generated:</span>
                  <span className="font-semibold">-</span>
                </div>
                {briefing.waypoints && briefing.waypoints.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-2">Waypoints:</span>
                    <ul className="space-y-1 text-sm">
                      {briefing.waypoints.map((wp: any, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{wp.name || `WP${idx + 1}`}</span>
                          {wp.lat && wp.lon && (
                            <span className="text-muted-foreground text-xs">
                              ({wp.lat.toFixed(2)}, {wp.lon.toFixed(2)})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Weather Summary */}
            <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                Weather Summary
              </h2>
              <p className="text-foreground/90 leading-relaxed mb-4">
                {briefing.summary || briefing.hf_summary || 'Flight briefing generated successfully'}
              </p>
              <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold', severityBg, severityBorder, 'border')}>
                <span className="text-xs">Overall Severity:</span>
                <div className={cn('h-2 w-2 rounded-full', severityColor === 'text-destructive' ? 'bg-destructive' : severityColor === 'text-amber-400' ? 'bg-amber-400' : 'bg-green-400')} />
                <span className={severityColor}>{briefing.category || 'Clear'}</span>
              </div>
            </div>
          </div>

          {/* Briefing Summary Stats */}
          <div className="mb-8 rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Distance</p>
                <p className="text-lg font-semibold">{briefing.flightPlan?.distance || briefing.distance || 'N/A'} nm</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Flight Time</p>
                <p className="text-lg font-semibold">{briefing.flightPlan?.totalTime || briefing.flightTime || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Altitude</p>
                <p className="text-lg font-semibold">{briefing.parsed?.altitude || briefing.recommendedAltitude || '35000'} ft</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Flight Rules</p>
                <p className="text-lg font-semibold text-primary">VFR/MVFR</p>
              </div>
            </div>
          </div>

          {/* Cloud Conditions */}
          <div className="mb-8 rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Cloud className="h-6 w-6 text-primary" />
              Cloud Conditions
            </h2>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Cloud Layers:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className="text-foreground">FEW 2000 ft</li>
              </ul>
            </div>
          </div>

          {/* Departure Airport */}
          <div className="mb-8 rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary transform -rotate-45" />
              Departure Airport
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Airport Info */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Airport Information
                </h3>
                <div className="space-y-2">
                  <div><span className="font-semibold">ICAO:</span> {briefing.route?.origin?.icao || origin}</div>
                  <div><span className="font-semibold">Location:</span> {briefing.route?.origin?.name || 'Airport'}</div>
                  <div><span className="font-semibold">Coordinates:</span> {briefing.route?.origin?.lat?.toFixed(4)}°N, {Math.abs(briefing.route?.origin?.lon)?.toFixed(4)}°W</div>
                </div>
              </div>
              {/* Current Weather */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" />
                  Current Weather (METAR)
                </h3>
                <div className="space-y-2">
                  <div><span className="font-semibold">Conditions:</span> VFR</div>
                  <div><span className="font-semibold">Temperature:</span> 25°C/12°C</div>
                  <div><span className="font-semibold">Wind:</span> 180° at 05 knots</div>
                  <div><span className="font-semibold">Visibility:</span> 2716 meters</div>
                  <div><span className="font-semibold">Clouds:</span> Few at 2000 feet, Scattered at 25000 feet</div>
                </div>
                {departureWeather?.raw && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground">{departureWeather.raw}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* En-route Weather Hazards */}
          <div className="mb-8 rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              En-route Weather Hazards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SIGMETs */}
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  SIGMETs
                </h3>
                <ul className="space-y-3">
                  <li className="text-sm">
                    <p className="font-semibold mb-1">SIGMET NOVEMBER #2</p>
                    <p className="text-muted-foreground">is valid from 27th, 18:00 UTC to 27th, 22:00 UTC in the New York FIR. Severe turbulence is forecast between 18000 and 34000 feet.</p>
                    <p className="text-xs mt-2 font-mono bg-background/50 p-2 rounded">SIGMET NOVEMBER 2 VALID 271800/272200 KZNY- SEV TURB FCST BTN FL180 AND FL340</p>
                  </li>
                </ul>
              </div>
              {/* PIREPs */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  PIREPs
                </h3>
                <ul className="space-y-3">
                  <li className="text-sm">
                    <p className="font-semibold mb-1">Pilot report near DCA270015</p>
                    <p className="text-muted-foreground">At 19:20 UTC, a B737 reported moderate turbulence and none icing at 8000 feet. Sky condition: broken clouds at 7000 feet, tops at 9000 feet.</p>
                    <p className="text-xs mt-2 font-mono bg-background/50 p-2 rounded">UA /OV DCA270015 /TM 1920 /FL080 /TP B737 /TB MOD /IC NEG /SK BKN070-TOP090</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Arrival Airport */}
          <div className="mb-8 rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary transform rotate-45" />
              Arrival Airport
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Airport Info */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Airport Information
                </h3>
                <div className="space-y-2">
                  <div><span className="font-semibold">ICAO:</span> {briefing.route?.destination?.icao || destination}</div>
                  <div><span className="font-semibold">Location:</span> {briefing.route?.destination?.name || 'Airport'}</div>
                  <div><span className="font-semibold">Coordinates:</span> {briefing.route?.destination?.lat?.toFixed(4)}°N, {Math.abs(briefing.route?.destination?.lon)?.toFixed(4)}°W</div>
                </div>
              </div>
              {/* Current Weather */}
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-primary" />
                  Current Weather (METAR)
                </h3>
                <div className="space-y-2">
                  <div><span className="font-semibold">Conditions:</span> VFR</div>
                  <div><span className="font-semibold">Temperature:</span> 18°C/12°C</div>
                  <div><span className="font-semibold">Wind:</span> 290° at 10 knots</div>
                  <div><span className="font-semibold">Visibility:</span> 2716 meters</div>
                  <div><span className="font-semibold">Clouds:</span> Few at 800 feet, Scattered at 25000 feet</div>
                </div>
                {arrivalWeather?.raw && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs font-mono text-muted-foreground">{arrivalWeather.raw}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Route Conditions */}
          {briefing.conditions && briefing.conditions.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Route Conditions</h2>
            <div className="space-y-4">
              {briefing.conditions?.map((condition: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-border bg-background/40 p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {idx === 0 || idx === (briefing.conditions?.length || 0) - 1 ? (
                        <MapPin className="h-6 w-6 text-primary" />
                      ) : (
                        <Wind className="h-6 w-6 text-muted-foreground" />
                      )}
                      <h3 className="text-lg font-bold text-foreground">{condition.location}</h3>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
                        condition.conditions === 'VFR'
                          ? 'bg-green-900/30 text-green-300 border border-green-700'
                          : condition.conditions === 'MVFR'
                            ? 'bg-amber-900/30 text-amber-300 border border-amber-700'
                            : 'bg-destructive/20 text-destructive border border-destructive'
                      )}
                    >
                      {condition.conditions === 'VFR' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      {condition.conditions}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Temperature</p>
                      <p className="text-sm text-foreground">{condition.temp}°C</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Wind</p>
                      <p className="text-sm text-foreground">{condition.wind}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Visibility</p>
                      <p className="text-sm text-foreground">{condition.visibility}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Trend</p>
                      <p className="text-sm text-foreground flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        Moderate
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          ) : null}

          {/* Route Map */}
          {briefing.route?.origin && briefing.route?.destination && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Route Map</h2>
              <RouteMap
                origin={briefing.route.origin}
                destination={briefing.route.destination}
                waypoints={briefing.waypoints || []}
                severity={briefing.category || briefing.severity}
              />
            </div>
          )}

          {/* Show placeholder only if no route data and no conditions */}
          {!briefing.route?.origin && !briefing.conditions?.length && (
            <div className="mb-8 rounded-xl border border-border bg-card p-6 text-center">
              <Cloud className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Detailed route conditions will be available soon</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold transition-all transform hover:scale-105 hover:opacity-90">
              Print Briefing
            </button>
            <button className="px-6 py-3 rounded-lg border border-border bg-background/40 hover:bg-background/60 text-foreground font-semibold transition-colors">
              Export PDF
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg border border-border bg-background/40 hover:bg-background/60 text-foreground font-semibold transition-colors"
            >
              New Briefing
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 backdrop-blur-lg py-8 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Aviation Weather Briefing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default function BriefingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BriefingContent />
    </Suspense>
  )
}
