"""
Aviation Weather API Client
Fetches real-time weather data from aviationweather.gov API
https://aviationweather.gov/data/api/#schema
"""

import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import json

logger = logging.getLogger(__name__)

class AviationWeatherAPI:
    """
    Client for Aviation Weather Center API
    Fetches METAR, TAF, PIREP, SIGMET, AIRMET, and NOTAM data
    """
    
    def __init__(self):
        """Initialize Aviation Weather API client"""
        self.base_url = "https://aviationweather.gov/api/data"
        self.timeout = 30  # seconds
        
        # API endpoint mappings
        self.endpoints = {
            'metar': '/metar',
            'taf': '/taf', 
            'pirep': '/pirep',
            'sigmet': '/isigmet',  # International SIGMETs
            'airmet': '/airmet',
            'notam': '/notam'
        }
        
        # Default parameters
        self.default_params = {
            'format': 'json',
            'taf': 'false',  # For METAR requests
            'hours': 12      # Hours of data to retrieve
        }

    def fetch_metar(self, stations: Union[str, List[str]], 
                   hours: int = 3, decoded: bool = True) -> Dict[str, Any]:
        """
        Fetch METAR data for specified stations
        
        Args:
            stations: Airport codes (single string or list)
            hours: Hours of data to retrieve (default 3)
            decoded: Include decoded METAR data
            
        Returns:
            Dictionary with METAR data
        """
        try:
            # Format station codes
            if isinstance(stations, list):
                station_ids = ','.join(stations)
            else:
                station_ids = stations
                
            params = {
                'ids': station_ids,
                'format': 'json',
                'taf': 'false',
                'hours': hours,
                'bbox': '',  # Can be used for area queries
                'decoded': str(decoded).lower()
            }
            
            logger.info(f"Fetching METAR data for stations: {station_ids}")
            
            response = requests.get(
                f"{self.base_url}{self.endpoints['metar']}",
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data,
                'stations': stations,
                'hours': hours,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'count': len(data) if isinstance(data, list) else 0
            }
            
        except Exception as e:
            logger.error(f"METAR fetch error: {e}")
            return {
                'success': False,
                'error': str(e),
                'stations': stations,
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }

    def fetch_taf(self, stations: Union[str, List[str]], 
                  hours: int = 30, decoded: bool = True) -> Dict[str, Any]:
        """
        Fetch TAF (Terminal Aerodrome Forecast) data
        
        Args:
            stations: Airport codes (single string or list)
            hours: Hours of forecast data (default 30)
            decoded: Include decoded TAF data
            
        Returns:
            Dictionary with TAF data
        """
        try:
            if isinstance(stations, list):
                station_ids = ','.join(stations)
            else:
                station_ids = stations
                
            params = {
                'ids': station_ids,
                'format': 'json',
                'hours': hours,
                'decoded': str(decoded).lower()
            }
            
            logger.info(f"Fetching TAF data for stations: {station_ids}")
            
            response = requests.get(
                f"{self.base_url}{self.endpoints['taf']}",
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data,
                'stations': stations,
                'hours': hours,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'count': len(data) if isinstance(data, list) else 0
            }
            
        except Exception as e:
            logger.error(f"TAF fetch error: {e}")
            return {
                'success': False,
                'error': str(e),
                'stations': stations,
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }

    def fetch_pirep(self, stations: Union[str, List[str]] = None,
                   hours: int = 6, age: int = 6, distance: int = 100) -> Dict[str, Any]:
        """
        Fetch PIREP (Pilot Reports) data
        
        Args:
            stations: Airport codes (required for PIREP API)
            hours: Hours of data to retrieve
            age: Maximum age of reports in hours
            distance: Radial distance from stations in nautical miles
            
        Returns:
            Dictionary with PIREP data
        """
        try:
            params = {
                'format': 'json',
                'hours': hours,
                'age': age
            }
            
            if stations:
                # PIREP API requires stations with radial distance
                if isinstance(stations, list):
                    params['ids'] = ','.join(stations)
                else:
                    params['ids'] = stations
                params['radial'] = distance  # Required with station IDs
            else:
                # Use continental US bounding box if no stations specified
                params['bbox'] = '-125,25,-65,50'  # West, South, East, North
                logger.info("Using Continental US bounding box for PIREP fetch")
                    
            logger.info(f"Fetching PIREP data (hours: {hours}, stations: {stations})")
            
            response = requests.get(
                f"{self.base_url}{self.endpoints['pirep']}",
                params=params,
                timeout=self.timeout
            )
            
            # Handle 204 No Content (successful but empty response)
            if response.status_code == 204:
                return {
                    'success': True,
                    'data': [],
                    'hours': hours,
                    'age': age,
                    'stations': stations,
                    'fetched_at': datetime.utcnow().isoformat() + 'Z',
                    'count': 0,
                    'message': 'No PIREPs available for specified criteria'
                }
            
            response.raise_for_status()
            data = response.json()
            
            return {
                'success': True,
                'data': data,
                'hours': hours,
                'age': age,
                'stations': stations,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'count': len(data) if isinstance(data, list) else 0
            }
            
        except Exception as e:
            logger.error(f"PIREP fetch error: {e}")
            return {
                'success': False,
                'error': str(e),
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }

    def fetch_sigmet(self, hazard: str = None, level: str = 'low') -> Dict[str, Any]:
        """
        Fetch SIGMET (Significant Meteorological Information) data
        
        Args:
            hazard: Type of hazard ('convective', 'non_convective', 'outlook')
            level: Flight level ('low' for < FL250, 'high' for >= FL250)
            
        Returns:
            Dictionary with SIGMET data
        """
        try:
            params = {
                'format': 'json',
                'level': level
            }
            
            if hazard:
                params['hazard'] = hazard
                
            logger.info(f"Fetching SIGMET data (level: {level})")
            
            response = requests.get(
                f"{self.base_url}{self.endpoints['sigmet']}",
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data,
                'hazard': hazard,
                'level': level,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'count': len(data) if isinstance(data, list) else 0
            }
            
        except Exception as e:
            logger.error(f"SIGMET fetch error: {e}")
            return {
                'success': False,
                'error': str(e),
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }

    def fetch_airmet(self, hazard: str = None) -> Dict[str, Any]:
        """
        Fetch AIRMET (Airmen's Meteorological Information) data
        
        Args:
            hazard: Type of hazard ('sierra', 'tango', 'zulu')
                   sierra = IFR/Mountain Obscuration
                   tango = Turbulence  
                   zulu = Icing
            
        Returns:
            Dictionary with AIRMET data
        """
        try:
            params = {
                'format': 'json'
            }
            
            if hazard:
                params['hazard'] = hazard
                
            logger.info(f"Fetching AIRMET data (hazard: {hazard or 'all'})")
            
            response = requests.get(
                f"{self.base_url}{self.endpoints['airmet']}",
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data,
                'hazard': hazard,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'count': len(data) if isinstance(data, list) else 0
            }
            
        except Exception as e:
            logger.error(f"AIRMET fetch error: {e}")
            return {
                'success': False,
                'error': str(e),
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }

    def fetch_notam(self, stations: Union[str, List[str]]) -> Dict[str, Any]:
        """
        Fetch NOTAM (Notice to Airmen) data
        
        Args:
            stations: Airport codes (single string or list)
            
        Returns:
            Dictionary with NOTAM data
        """
        try:
            if isinstance(stations, list):
                station_ids = ','.join(stations)
            else:
                station_ids = stations
                
            params = {
                'ids': station_ids,
                'format': 'json'
            }
            
            logger.info(f"Fetching NOTAM data for stations: {station_ids}")
            
            response = requests.get(
                f"{self.base_url}{self.endpoints['notam']}",
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data,
                'stations': stations,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
                'count': len(data) if isinstance(data, list) else 0
            }
            
        except Exception as e:
            logger.error(f"NOTAM fetch error: {e}")
            return {
                'success': False,
                'error': str(e),
                'stations': stations,
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }

    def fetch_comprehensive_weather(self, departure: str, arrival: str, 
                                  enroute_stations: List[str] = None) -> Dict[str, Any]:
        """
        Fetch comprehensive weather data for a flight route
        
        Args:
            departure: Departure airport code
            arrival: Arrival airport code
            enroute_stations: Optional list of enroute weather stations
            
        Returns:
            Dictionary with all weather data types
        """
        try:
            # Build station list
            stations = [departure, arrival]
            if enroute_stations:
                stations.extend(enroute_stations)
                
            # Remove duplicates while preserving order
            stations = list(dict.fromkeys(stations))
            
            logger.info(f"Fetching comprehensive weather for route: {departure} -> {arrival}")
            
            # Fetch all weather data types
            weather_data = {
                'route': {
                    'departure': departure,
                    'arrival': arrival,
                    'enroute': enroute_stations or [],
                    'all_stations': stations
                },
                'metar': self.fetch_metar(stations),
                'taf': self.fetch_taf(stations),
                'pirep': self.fetch_pirep(),  # Get all PIREPs in area
                'sigmet': self.fetch_sigmet(),
                'airmet': self.fetch_airmet(),
                'notam': self.fetch_notam(stations),
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }
            
            # Count successful fetches
            success_count = sum(1 for key, data in weather_data.items() 
                              if key not in ['route', 'fetched_at'] and 
                              isinstance(data, dict) and data.get('success'))
            
            weather_data['summary'] = {
                'total_requests': 6,
                'successful_requests': success_count,
                'stations_queried': len(stations),
                'route_coverage': f"{departure} -> {arrival}"
            }
            
            return weather_data
            
        except Exception as e:
            logger.error(f"Comprehensive weather fetch error: {e}")
            return {
                'route': {
                    'departure': departure,
                    'arrival': arrival,
                    'error': str(e)
                },
                'error': str(e),
                'fetched_at': datetime.utcnow().isoformat() + 'Z'
            }

    def extract_raw_text(self, api_response: Dict[str, Any], 
                        data_type: str) -> List[str]:
        """
        Extract raw text from API response for parsing
        
        Args:
            api_response: Response from API fetch methods
            data_type: Type of data ('metar', 'taf', 'pirep', etc.)
            
        Returns:
            List of raw text strings for parsing
        """
        try:
            if not api_response.get('success') or not api_response.get('data'):
                return []
                
            data = api_response['data']
            raw_texts = []
            
            if data_type.lower() == 'metar':
                for item in data:
                    if isinstance(item, dict):
                        # Try different field names for raw METAR text
                        raw_text = (item.get('rawOb') or 
                                  item.get('raw_text') or 
                                  item.get('raw') or 
                                  str(item))
                        if raw_text:
                            raw_texts.append(raw_text)
                            
            elif data_type.lower() == 'taf':
                for item in data:
                    if isinstance(item, dict):
                        raw_text = (item.get('rawTaf') or 
                                  item.get('raw_text') or 
                                  item.get('raw') or 
                                  str(item))
                        if raw_text:
                            raw_texts.append(raw_text)
                            
            elif data_type.lower() == 'pirep':
                for item in data:
                    if isinstance(item, dict):
                        raw_text = (item.get('rawOb') or 
                                  item.get('reportText') or 
                                  item.get('raw') or 
                                  str(item))
                        if raw_text:
                            raw_texts.append(raw_text)
                            
            elif data_type.lower() in ['sigmet', 'airmet']:
                for item in data:
                    if isinstance(item, dict):
                        raw_text = (item.get('rawSigmet') or 
                                  item.get('rawAirmet') or 
                                  item.get('raw_text') or 
                                  item.get('hazard') or 
                                  str(item))
                        if raw_text:
                            raw_texts.append(raw_text)
                            
            elif data_type.lower() == 'notam':
                for item in data:
                    if isinstance(item, dict):
                        raw_text = (item.get('notamText') or 
                                  item.get('text') or 
                                  item.get('raw') or 
                                  str(item))
                        if raw_text:
                            raw_texts.append(raw_text)
                            
            return raw_texts
            
        except Exception as e:
            logger.error(f"Raw text extraction error for {data_type}: {e}")
            return []

    def get_api_status(self) -> Dict[str, Any]:
        """
        Check API availability and response times
        
        Returns:
            Dictionary with API status information
        """
        status = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'base_url': self.base_url,
            'endpoints': {}
        }
        
        # Test each endpoint with a minimal request
        test_params = {
            'metar': {'ids': 'KJFK', 'hours': 1},
            'taf': {'ids': 'KJFK', 'hours': 6},
            'pirep': {'hours': 1},
            'sigmet': {'format': 'json'},
            'airmet': {'format': 'json'},
            'notam': {'ids': 'KJFK'}
        }
        
        for endpoint_name, endpoint_path in self.endpoints.items():
            try:
                start_time = datetime.utcnow()
                
                response = requests.get(
                    f"{self.base_url}{endpoint_path}",
                    params=test_params.get(endpoint_name, {'format': 'json'}),
                    timeout=10
                )
                
                end_time = datetime.utcnow()
                response_time = (end_time - start_time).total_seconds()
                
                status['endpoints'][endpoint_name] = {
                    'available': response.status_code == 200,
                    'status_code': response.status_code,
                    'response_time_seconds': response_time,
                    'url': f"{self.base_url}{endpoint_path}"
                }
                
            except Exception as e:
                status['endpoints'][endpoint_name] = {
                    'available': False,
                    'error': str(e),
                    'url': f"{self.base_url}{endpoint_path}"
                }
                
        # Overall status
        available_count = sum(1 for ep in status['endpoints'].values() 
                            if ep.get('available', False))
        total_count = len(status['endpoints'])
        
        status['summary'] = {
            'total_endpoints': total_count,
            'available_endpoints': available_count,
            'availability_percentage': (available_count / total_count) * 100 if total_count > 0 else 0,
            'overall_status': 'healthy' if available_count == total_count else 
                            'partial' if available_count > 0 else 'down'
        }
        
        return status