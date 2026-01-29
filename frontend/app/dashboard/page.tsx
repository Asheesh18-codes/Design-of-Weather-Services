'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { WeatherSearch } from '@/components/weather-search'
import { DataCard } from '@/components/ui/data-card'
import { ThemeToggle } from '@/components/theme-toggle'
import { Cloud, Wind, Droplets, Eye, AlertTriangle, Plane, MapPin, Gauge } from 'lucide-react'
import { cn, formatTemp, formatWind, formatVisibility, getSeverityColor, getSeverityBgColor, getSeverityBorderColor } from '@/lib/utils'
import api from '@/lib/api'

interface SelectedAirport {
  icao: string
  iata: string
  name: string
  city: string
}

interface WeatherData {
  metar?: {
    temp: number
    dewpoint: number
    wind_direction: number
    wind_speed: number
    wind_gust?: number
    visibility: string
    altimeter: number
    flight_rules: string
    clouds: string
    raw: string
  }
  taf?: {
    valid_period: string
    summary: string
    raw: string
  }
  notams?: Array<{
    text: string
    severity: string
  }>
}

export default function DashboardPage() {
  const [selectedOrigin, setSelectedOrigin] = useState<SelectedAirport | null>(null)
  const [selectedDestination, setSelectedDestination] = useState<SelectedAirport | null>(null)
  const [weatherData, setWeatherData] = useState<{ origin?: WeatherData; destination?: WeatherData }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAirportSelect = async (airport: SelectedAirport, type: 'origin' | 'destination') => {
    if (type === 'origin') {
      setSelectedOrigin(airport)
    } else {
      setSelectedDestination(airport)
    }

    // Fetch real weather data from API
    setIsLoading(true)
    setError(null)
    try {
      const [metarData, tafData] = await Promise.all([
        api.weather.getLatestMetar(airport.icao),
        api.weather.getLatestTaf(airport.icao)
      ])

      const weather = {
        metar: {
          temp: 'N/A',
          wind: 'N/A', 
          visibility: 'N/A',
          clouds: 'N/A',
          raw: metarData.raw || 'N/A'
        },
        taf: {
          valid_period: 'N/A',
          summary: 'N/A',
          raw: tafData.raw || 'N/A'
        },
        notams: []
      }

      setWeatherData((prev) => ({
        ...prev,
        [type]: weather,
      }))
    } catch (err) {
      setError('Failed to fetch weather data')
      console.error('Weather fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetBriefing = () => {
    if (selectedOrigin && selectedDestination) {
      // Navigate to briefing page with airport codes
      window.location.href = `/briefing?origin=${selectedOrigin.icao}&destination=${selectedDestination.icao}`
    }
  }

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
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="inline-flex items-center px-4 py-2 rounded-lg bg-card hover:bg-muted text-foreground border border-border font-semibold text-sm transition-colors">
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Title */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-3">Weather Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Search for airports and view real-time weather briefing data
            </p>
          </div>

          {/* Search Section */}
          <div className="mb-12 rounded-xl border border-border bg-card p-8 backdrop-blur-sm transition-colors duration-300">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
              <WeatherSearch
                label="Origin Airport"
                placeholder="e.g., KJFK or New York"
                onSelect={(airport) => handleAirportSelect(airport, 'origin')}
              />
              <WeatherSearch
                label="Destination Airport"
                placeholder="e.g., KSFO or San Francisco"
                onSelect={(airport) => handleAirportSelect(airport, 'destination')}
              />
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleGetBriefing}
                disabled={!selectedOrigin || !selectedDestination || isLoading}
                className={cn(
                  'px-8 py-3 rounded-lg font-semibold transition-all transform',
                  selectedOrigin && selectedDestination
                    ? 'bg-primary hover:opacity-90 text-primary-foreground hover:scale-105'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {isLoading ? 'Loading...' : 'Get Flight Briefing'}
              </button>

              {(selectedOrigin || selectedDestination) && (
                <button
                  onClick={() => {
                    setSelectedOrigin(null)
                    setSelectedDestination(null)
                    setWeatherData({})
                    setError(null)
                  }}
                  className="px-6 py-3 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Weather Data Display */}
          {(selectedOrigin || selectedDestination) && (
            <div className="space-y-8">
              {/* Origin Weather */}
              {selectedOrigin && weatherData.origin && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">
                      {selectedOrigin.icao} - {selectedOrigin.name}
                    </h2>
                  </div>

                  {/* METAR Data */}
                  {weatherData.origin?.metar && (
                    <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Cloud className="h-5 w-5 text-primary" />
                        Current Conditions (METAR)
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                        <DataCard
                          label="Temperature"
                          value={formatTemp(weatherData.origin.metar.temp)}
                          icon={<Cloud className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Dewpoint"
                          value={formatTemp(weatherData.origin.metar.dewpoint)}
                          icon={<Droplets className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Wind"
                          value={formatWind(
                            weatherData.origin.metar.wind_direction,
                            weatherData.origin.metar.wind_speed,
                            weatherData.origin.metar.wind_gust
                          )}
                          icon={<Wind className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Visibility"
                          value={weatherData.origin.metar.visibility}
                          icon={<Eye className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Altimeter"
                          value={weatherData.origin.metar.altimeter}
                          unit="inHg"
                          icon={<Gauge className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Flight Rules"
                          value={weatherData.origin.metar.flight_rules}
                          variant={
                            weatherData.origin.metar.flight_rules === 'VFR'
                              ? 'success'
                              : weatherData.origin.metar.flight_rules === 'MVFR'
                                ? 'default'
                                : 'danger'
                          }
                        />
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Cloud Layers</p>
                        <p className="text-sm text-foreground/90">{weatherData.origin.metar.clouds}</p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Raw METAR</p>
                        <p className="text-sm font-mono text-muted-foreground break-all">{weatherData.origin.metar.raw}</p>
                      </div>
                    </div>
                  )}

                  {/* TAF Data */}
                  {weatherData.origin?.taf && (
                    <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Plane className="h-5 w-5 text-primary" />
                        Forecast (TAF)
                      </h3>

                      <div className="grid gap-4 mb-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Valid Period</p>
                          <p className="text-sm text-foreground/90">{weatherData.origin.taf.valid_period}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
                          <p className="text-sm text-foreground/90">{weatherData.origin.taf.summary}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Raw TAF</p>
                        <p className="text-sm font-mono text-muted-foreground break-all">{weatherData.origin.taf.raw}</p>
                      </div>
                    </div>
                  )}

                  {/* NOTAMs */}
                  {weatherData.origin.notams && weatherData.origin.notams.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                        NOTAMs ({weatherData.origin.notams.length})
                      </h3>

                      <div className="space-y-3">
                        {weatherData.origin.notams.map((notam, idx) => (
                          <div key={idx} className={cn('p-3 rounded-lg border', getSeverityBgColor(notam.severity), getSeverityBorderColor(notam.severity))}>
                            <p className="text-sm text-foreground">{notam.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Destination Weather */}
              {selectedDestination && weatherData.destination && (
                <div className="space-y-4 pt-8 border-t border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">
                      {selectedDestination.icao} - {selectedDestination.name}
                    </h2>
                  </div>

                  {/* TAF Data */}
                  {weatherData.destination?.taf && (
                    <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Plane className="h-5 w-5 text-primary" />
                        Forecast (TAF)
                      </h3>

                      <div className="grid gap-4 mb-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Valid Period</p>
                          <p className="text-sm text-foreground/90">{weatherData.destination.taf.valid_period}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
                          <p className="text-sm text-foreground/90">{weatherData.destination.taf.summary}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Raw TAF</p>
                        <p className="text-sm font-mono text-muted-foreground break-all">{weatherData.destination.taf.raw}</p>
                      </div>
                    </div>
                  )}

                  {/* NOTAMs */}
                  {weatherData.destination?.notams && weatherData.destination.notams.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                        NOTAMs ({weatherData.destination.notams.length})
                      </h3>

                      <div className="space-y-3">
                        {weatherData.destination.notams.map((notam, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'p-4 rounded-lg border',
                              getSeverityBgColor(notam.severity),
                              getSeverityBorderColor(notam.severity)
                            )}
                          >
                            <p className="text-sm text-foreground">{notam.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Destination Weather */}
              {selectedDestination && weatherData.destination && (
                <div className="space-y-4 pt-8 border-t border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold">
                      {selectedDestination.icao} - {selectedDestination.name}
                    </h2>
                  </div>

                  {/* METAR Data */}
                  {weatherData.destination?.metar && (
                    <div className="rounded-xl border border-border bg-card p-6 backdrop-blur-sm transition-colors duration-300">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Cloud className="h-5 w-5 text-primary" />
                        Current Conditions (METAR)
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                        <DataCard
                          label="Temperature"
                          value={formatTemp(weatherData.destination.metar.temp)}
                          icon={<Cloud className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Dewpoint"
                          value={formatTemp(weatherData.destination.metar.dewpoint)}
                          icon={<Droplets className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Wind"
                          value={formatWind(
                            weatherData.destination.metar.wind_direction,
                            weatherData.destination.metar.wind_speed,
                            weatherData.destination.metar.wind_gust
                          )}
                          icon={<Wind className="h-5 w-5" />}
                          variant="default"
                        />
                        <DataCard
                          label="Visibility"
                          value={weatherData.destination.metar.visibility}
                          icon={<Eye className="h-5 w-5" />}
                          variant="default"
                        />
                      </div>

                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Raw METAR</p>
                        <p className="text-sm font-mono text-muted-foreground break-all">{weatherData.destination.metar.raw}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!selectedOrigin && !selectedDestination && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center transition-colors duration-300">
              <Cloud className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No airports selected</h3>
              <p className="text-muted-foreground">Search for origin and destination airports to view weather data</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card backdrop-blur-lg py-8 mt-12 transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Aviation Weather Briefing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
