'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

interface SearchOption {
  icao: string
  iata: string
  name: string
  city: string
}

interface WeatherSearchProps {
  onSelect: (airport: SearchOption) => void
  placeholder?: string
  label?: string
  className?: string
}

// Get API base URL from environment
const API_BASE = process.env.NEXT_PUBLIC_NODE_API_BASE || 'http://localhost:5000/api'

export function WeatherSearch({ onSelect, placeholder = 'Enter ICAO or airport name', label, className }: WeatherSearchProps) {
  const [value, setValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setValue(query)

    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setIsOpen(true)

    try {
      // Call the real API endpoint
      const response = await axios.get(`${API_BASE}/airports/search`, {
        params: { q: query, limit: 10 },
        timeout: 5000
      })

      if (response.data.success && response.data.airports) {
        // Transform backend response to match our interface
        const transformed = response.data.airports.map((airport: any) => ({
          icao: airport.code || airport.icao || '',
          iata: airport.iata || '',
          name: airport.name || '',
          city: airport.municipality || airport.location?.municipality || airport.city || ''
        }))
        
        setSuggestions(transformed)
      } else {
        setSuggestions([])
      }
    } catch (error) {
      console.error('Airport search failed:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (airport: SearchOption) => {
    onSelect(airport)
    setValue('')
    setSuggestions([])
    setIsOpen(false)
  }

  const handleClear = () => {
    setValue('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => value && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Searching...</div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No airports found</div>
          ) : (
            <div className="divide-y divide-border">
              {suggestions.map((airport) => (
                <button
                  key={airport.icao}
                  onClick={() => handleSelect(airport)}
                  className="w-full px-4 py-3 text-left hover:bg-background/80 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {airport.icao} · {airport.iata}
                      </div>
                      <div className="text-sm text-muted-foreground">{airport.name}</div>
                      <div className="text-xs text-muted-foreground/70">{airport.city}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WeatherSearch
