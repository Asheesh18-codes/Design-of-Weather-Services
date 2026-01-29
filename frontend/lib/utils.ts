import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTemp(celsius: number | null | undefined): string {
  if (celsius === null || celsius === undefined) return '-'
  return `${Math.round(celsius)}°C`
}

export function formatWind(direction: number | null | undefined, speed: number | null | undefined, gust?: number | null | undefined): string {
  if (direction === null || direction === undefined || speed === null || speed === undefined) return '-'
  let windText = `${Math.round(direction)}° @ ${Math.round(speed)}kt`
  if (gust) windText += ` G${Math.round(gust)}`
  return windText
}

export function formatVisibility(meters: number | string | null | undefined): string {
  if (!meters) return '-'
  if (typeof meters === 'number') {
    if (meters >= 10000) return '10+ km'
    return `${(meters / 1000).toFixed(1)} km`
  }
  return String(meters)
}

export function formatAltimeter(inHg: number | null | undefined): string {
  if (inHg === null || inHg === undefined) return '-'
  return `${inHg.toFixed(2)} inHg`
}

export function getSeverityColor(severity?: string): string {
  if (!severity) return '#6b7280'
  const severityLower = severity.toLowerCase()
  
  if (severityLower.includes('high') || severityLower.includes('severe')) return '#dc2626'
  if (severityLower.includes('medium') || severityLower.includes('significant')) return '#f59e0b'
  if (severityLower.includes('low') || severityLower.includes('clear')) return '#10b981'
  return '#6b7280'
}

export function getSeverityBgColor(severity?: string): string {
  if (!severity) return 'bg-background'
  const severityLower = severity.toLowerCase()
  
  if (severityLower.includes('high') || severityLower.includes('severe')) return 'bg-destructive/20'
  if (severityLower.includes('medium') || severityLower.includes('significant')) return 'bg-amber-900/30'
  if (severityLower.includes('low') || severityLower.includes('clear')) return 'bg-green-900/30'
  return 'bg-background/30'
}

export function getSeverityBorderColor(severity?: string): string {
  if (!severity) return 'border-border'
  const severityLower = severity.toLowerCase()
  
  if (severityLower.includes('high') || severityLower.includes('severe')) return 'border-destructive'
  if (severityLower.includes('medium') || severityLower.includes('significant')) return 'border-amber-700'
  if (severityLower.includes('low') || severityLower.includes('clear')) return 'border-green-700'
  return 'border-border'
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const λ1 = (lon1 * Math.PI) / 180
  const λ2 = (lon2 * Math.PI) / 180
  
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  let θ = Math.atan2(y, x)
  θ = (θ * 180) / Math.PI
  θ = (θ + 360) % 360
  return θ
}

export function formatDistanceNautical(km: number): string {
  const nm = km * 0.539957
  return `${nm.toFixed(0)} nm`
}

export function formatDistanceKm(km: number): string {
  return `${km.toFixed(0)} km`
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.substring(0, length) + '...' : text
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}
