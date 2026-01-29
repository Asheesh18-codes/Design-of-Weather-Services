'use client'

import React, { useEffect, useRef, useState } from 'react'

interface RouteMapProps {
  origin: {
    icao: string
    lat: number
    lon: number
    name?: string
  }
  destination: {
    icao: string
    lat: number
    lon: number
    name?: string
  }
  waypoints?: Array<{
    lat: number
    lon: number
    name?: string
    type?: string
  }>
  severity?: string
}

export function RouteMap({ origin, destination, waypoints = [], severity }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    if (map.current) return // Initialize map only once

    const token = process.env.NEXT_PUBLIC_MAPBOX_KEY || ''
    
    if (!token) {
      setMapError('Mapbox token not configured. Please add NEXT_PUBLIC_MAPBOX_KEY to your environment variables.')
      return
    }

    let isMounted = true

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      if (!isMounted) return

      mapboxgl.accessToken = token
      if (!mapboxgl.supported()) {
        setMapError('Mapbox GL is not supported in this browser/environment.')
        return
      }

      try {
        // Calculate center point
        const centerLon = (origin.lon + destination.lon) / 2
        const centerLat = (origin.lat + destination.lat) / 2

        // Initialize map
        const mapStyle = process.env.NEXT_PUBLIC_MAP_STYLE || 'mapbox://styles/mapbox/streets-v12'

        if (!mapContainer.current) return

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: mapStyle,
          center: [centerLon, centerLat],
          zoom: 4
        })

        map.current.on('load', () => {
          if (!map.current) return

          // Determine route color based on severity
          const routeColor = 
            severity === 'SEVERE' ? '#ef4444' :
            severity === 'SIGNIFICANT' ? '#f59e0b' :
            '#0ea5e4'

          // Create route coordinates
          const routeCoordinates: [number, number][] = []
          
          // Add origin
          routeCoordinates.push([origin.lon, origin.lat])
          
          // Add waypoints if available
          if (waypoints && waypoints.length > 0) {
            waypoints.forEach(wp => {
              routeCoordinates.push([wp.lon, wp.lat])
            })
          }
          
          // Add destination (if not already added via waypoints)
          if (waypoints.length === 0 || 
              waypoints[waypoints.length - 1].lat !== destination.lat ||
              waypoints[waypoints.length - 1].lon !== destination.lon) {
            routeCoordinates.push([destination.lon, destination.lat])
          }

          // Add route line
          map.current!.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }
          })

          map.current!.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeColor,
              'line-width': 4,
              'line-opacity': 0.8
            }
          })

          // Add origin marker
          const originMarker = document.createElement('div')
          originMarker.className = 'marker'
          originMarker.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzBmYTVlNCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI2IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+)'
          originMarker.style.width = '32px'
          originMarker.style.height = '32px'
          originMarker.style.backgroundSize = '100%'

          new mapboxgl.Marker(originMarker)
            .setLngLat([origin.lon, origin.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<div style=\"padding:8px\"><strong>${origin.icao}</strong><br/>${origin.name || 'Origin'}</div>`)
            )
            .addTo(map.current!)

          // Add destination marker
          const destMarker = document.createElement('div')
          destMarker.className = 'marker'
          destMarker.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iI2VmNDQ0NCIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI2IiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+)'
          destMarker.style.width = '32px'
          destMarker.style.height = '32px'
          destMarker.style.backgroundSize = '100%'

          new mapboxgl.Marker(destMarker)
            .setLngLat([destination.lon, destination.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`<div style=\"padding:8px\"><strong>${destination.icao}</strong><br/>${destination.name || 'Destination'}</div>`)
            )
            .addTo(map.current!)

          // Add waypoint markers
          waypoints.forEach((waypoint, index) => {
            // Skip if waypoint is origin or destination
            if (
              (waypoint.lat === origin.lat && waypoint.lon === origin.lon) ||
              (waypoint.lat === destination.lat && waypoint.lon === destination.lon)
            ) {
              return
            }

            const waypointMarker = document.createElement('div')
            waypointMarker.className = 'waypoint-marker'
            waypointMarker.innerHTML = `<div style=\"background:#6b7280;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2)\">${index + 1}</div>`

            new mapboxgl.Marker(waypointMarker)
              .setLngLat([waypoint.lon, waypoint.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 15 })
                  .setHTML(`<div style=\"padding:8px\"><strong>${waypoint.name || `Waypoint ${index + 1}`}</strong></div>`)
              )
              .addTo(map.current!)
          })

          // Fit map to bounds
          const bounds = new mapboxgl.LngLatBounds()
          routeCoordinates.forEach(coord => bounds.extend(coord))
          map.current!.fitBounds(bounds, { padding: 80 })
          map.current!.resize()
          requestAnimationFrame(() => map.current?.resize())
        })

        map.current.on('error', (e: any) => {
          console.error('Mapbox error:', e)
          setMapError('Failed to load map. Please check your Mapbox configuration.')
        })

      } catch (error) {
        console.error('Map initialization error:', error)
        setMapError('Failed to initialize map.')
      }
    }

    initMap()

    return () => {
      isMounted = false
      map.current?.remove()
    }
  }, [origin, destination, waypoints, severity])

  if (mapError) {
    return (
      <div className="w-full h-[500px] rounded-xl border border-destructive/50 bg-destructive/10 flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-destructive font-semibold mb-2">Map Error</p>
          <p className="text-sm text-muted-foreground">{mapError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-border shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}
