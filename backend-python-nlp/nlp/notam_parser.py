import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import logging

logger = logging.getLogger(__name__)

class NOTAMParser:
    """
    Advanced NOTAM parser using regex patterns and NLP techniques
    to extract structured information from NOTAM text
    """
    
    def __init__(self):
        """Initialize NOTAM parser with pattern libraries"""
        
        # NOTAM classification patterns
        self.severity_patterns = {
            'high': [
                r'runway.*closed',
                r'airport.*closed',
                r'approach.*not.*available',
                r'ils.*out.*of.*service',
                r'tower.*closed',
                r'fuel.*not.*available',
                r'emergency.*only',
                r'military.*operation',
                r'danger.*area.*active',
                r'restricted.*area.*active'
            ],
            'medium': [
                r'taxiway.*closed',
                r'parking.*restricted',
                r'lighting.*out.*of.*service',
                r'navaid.*unreliable',
                r'frequency.*change',
                r'construction.*work',
                r'obstacle.*installed',
                r'bird.*activity'
            ],
            'low': [
                r'chart.*change',
                r'aerodrome.*information',
                r'pilots.*advised',
                r'information.*only',
                r'frequency.*available',
                r'contact.*information'
            ]
        }
        
        # Airport facilities patterns
        self.facility_patterns = {
            'runway': [
                r'rwy\s*(\d{2}[lrcLRC]?)',
                r'runway\s*(\d{2}[lrcLRC]?)',
                r'(\d{2}[lrcLRC]?)(?:\s*(?:left|right|center|centre))?'
            ],
            'taxiway': [
                r'twy\s*([A-Z]\d?)',
                r'taxiway\s*([A-Z]\d?)',
                r'taxi.*([A-Z]\d?)'
            ],
            'approach': [
                r'ils\s*rwy\s*(\d{2}[lrcLRC]?)',
                r'vor\s*rwy\s*(\d{2}[lrcLRC]?)',
                r'rnav\s*rwy\s*(\d{2}[lrcLRC]?)',
                r'app\s*rwy\s*(\d{2}[lrcLRC]?)'
            ],
            'navaid': [
                r'vor\s*([A-Z]{3})',
                r'vortac\s*([A-Z]{3})',
                r'ndb\s*([A-Z]{3})',
                r'dme\s*([A-Z]{3})'
            ],
            'frequency': [
                r'freq\s*(\d{3}\.\d{2,3})',
                r'frequency\s*(\d{3}\.\d{2,3})',
                r'(\d{3}\.\d{2,3})\s*mhz'
            ]
        }
        
        # Time patterns for NOTAM validity
        self.time_patterns = {
            'effective': [
                r'fm\s*(\d{10})',  # From YYMMDDhhmm
                r'effective\s*(\d{10})',
                r'(\d{10})\s*utc'
            ],
            'until': [
                r'til\s*(\d{10})',  # Until YYMMDDhhmm
                r'until\s*(\d{10})',
                r'(\d{10})\s*est'
            ],
            'daily': [
                r'daily\s*(\d{4})-(\d{4})',  # Daily hhmm-hhmm
                r'(\d{4})-(\d{4})\s*daily'
            ]
        }
        
        # Impact/action patterns
        self.impact_patterns = {
            'closure': [
                r'closed',
                r'clsd',
                r'not.*available',
                r'out.*of.*service',
                r'unavbl'
            ],
            'restriction': [
                r'restricted',
                r'limited',
                r'caution',
                r'avoid',
                r'displaced'
            ],
            'information': [
                r'advise',
                r'information',
                r'note',
                r'pilots.*advised',
                r'coord'
            ]
        }
        
        # Location patterns for coordinates/areas
        self.location_patterns = {
            'coordinates': [
                r'(\d{2})\s*(\d{2})\s*(\d{2})[nNsS]\s*(\d{3})\s*(\d{2})\s*(\d{2})[eEwW]',
                r'(\d{4}[nNsS]\d{5}[eEwW])',
                r'(\d{6}[nNsS]\d{7}[eEwW])'
            ],
            'radius': [
                r'(\d+)\s*nm.*radius',
                r'within\s*(\d+)\s*nm',
                r'radius\s*(\d+)\s*nm'
            ]
        }

    def parse(self, notam_text: str, airport_code: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse NOTAM text and extract structured information
        
        Args:
            notam_text: Raw NOTAM text
            airport_code: Optional airport code for context
            
        Returns:
            Structured NOTAM information dictionary
        """
        try:
            # First extract airport code from NOTAM text if not provided
            extracted_airport = self._extract_airport_code(notam_text)
            if not airport_code and extracted_airport:
                airport_code = extracted_airport
                
            parsed = {
                'raw_text': notam_text,
                'airport_code': airport_code,
                'airport': airport_code,  # Add for compatibility
                'parsed_at': datetime.utcnow().isoformat() + 'Z',
                'notam_id': self._extract_notam_id(notam_text),
                'severity': self._classify_severity(notam_text),
                'category': self._determine_category(notam_text),
                'type': self._determine_category(notam_text),  # Add for compatibility
                'affected_facilities': self._extract_facilities(notam_text),
                'time_info': self._extract_time_information(notam_text),
                'location': self._extract_location(notam_text),
                'impact': self._analyze_impact(notam_text),
                'description': self._clean_description(notam_text),
                'keywords': self._extract_keywords(notam_text),
                'coordinates': self._extract_coordinates(notam_text),
                'altitudes': self._extract_altitudes(notam_text)
            }
            
            # Add effective date fields for compatibility
            time_info = parsed['time_info']
            parsed['effective_from'] = time_info.get('effective_from')
            parsed['effective_until'] = time_info.get('effective_until')
            
            # Add flight impact assessment
            parsed['flight_impact'] = self._assess_flight_impact(parsed)
            
            return parsed
            
        except Exception as e:
            logger.error(f"NOTAM parsing error: {e}")
            return {
                'raw_text': notam_text,
                'error': str(e),
                'parsed_at': datetime.utcnow().isoformat() + 'Z',
                'severity': 'unknown',
                'category': 'unknown',
                'description': notam_text[:200] + '...' if len(notam_text) > 200 else notam_text
            }

    def _extract_notam_id(self, text: str) -> Optional[str]:
        """Extract NOTAM identifier"""
        patterns = [
            r'notam\s*([A-Z]\d{4}/\d{2})',
            r'([A-Z]\d{4}/\d{2})',
            r'notam\s*([A-Z]{4}\d{4})',
            r'([A-Z]{4}\d{4})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text.upper())
            if match:
                return match.group(1)
        
        return None

    def _extract_airport_code(self, text: str) -> Optional[str]:
        """Extract airport code from NOTAM text"""
        if not text:
            return None
            
        # Look for A) section which contains airport code
        a_section_match = re.search(r'A\)\s*([A-Z]{4})', text.upper())
        if a_section_match:
            return a_section_match.group(1)
            
        # Look for Q) section airport code (first 4 letters after Q))
        q_section_match = re.search(r'Q\)\s*([A-Z]{4})', text.upper())
        if q_section_match:
            return q_section_match.group(1)
            
        # Look for any 4-letter ICAO code pattern
        icao_match = re.search(r'\b([A-Z]{4})\b', text.upper())
        if icao_match:
            return icao_match.group(1)
            
        return None

    def _classify_severity(self, text: str) -> str:
        """Classify NOTAM severity based on content"""
        text_lower = text.lower()
        
        # Count matches for each severity level
        severity_scores = {'high': 0, 'medium': 0, 'low': 0}
        
        for severity, patterns in self.severity_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    severity_scores[severity] += 1
        
        # Return highest scoring severity (with high taking precedence in ties)
        if severity_scores['high'] > 0:
            return 'high'
        elif severity_scores['medium'] > 0:
            return 'medium'
        elif severity_scores['low'] > 0:
            return 'low'
        else:
            return 'medium'  # Default to medium if no patterns match

    def _determine_category(self, text: str) -> str:
        """Determine NOTAM category"""
        text_lower = text.lower()
        
        categories = {
            'runway': ['runway', 'rwy'],
            'taxiway': ['taxiway', 'twy'],
            'approach': ['approach', 'app', 'ils', 'vor', 'rnav'],
            'navigation': ['navaid', 'vor', 'ndb', 'dme', 'vortac'],
            'lighting': ['light', 'lighting', 'beacon'],
            'airspace': ['airspace', 'restricted', 'danger', 'prohibited'],
            'obstacle': ['obstacle', 'obstruction', 'crane', 'tower'],
            'service': ['fuel', 'service', 'maintenance', 'closed'],
            'frequency': ['frequency', 'freq', 'radio'],
            'other': []
        }
        
        for category, keywords in categories.items():
            if any(keyword in text_lower for keyword in keywords):
                return category
        
        return 'other'

    def _extract_facilities(self, text: str) -> List[Dict[str, str]]:
        """Extract affected facilities (runways, taxiways, etc.)"""
        facilities = []
        
        for facility_type, patterns in self.facility_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text.lower())
                for match in matches:
                    facilities.append({
                        'type': facility_type,
                        'identifier': match.group(1) if match.groups() else match.group(0),
                        'context': text[max(0, match.start()-20):match.end()+20].strip()
                    })
        
        return facilities

    def _extract_time_information(self, text: str) -> Dict[str, Any]:
        """Extract time/validity information"""
        time_info = {
            'effective_from': None,
            'effective_until': None,
            'daily_times': None,
            'is_permanent': False,
            'is_temporary': True
        }
        
        # Check for permanent NOTAMs
        if re.search(r'perm|permanent', text.lower()):
            time_info['is_permanent'] = True
            time_info['is_temporary'] = False
        
        # Extract effective dates
        for time_type, patterns in self.time_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text.lower())
                if match:
                    if time_type == 'effective':
                        time_info['effective_from'] = self._parse_notam_datetime(match.group(1))
                    elif time_type == 'until':
                        time_info['effective_until'] = self._parse_notam_datetime(match.group(1))
                    elif time_type == 'daily':
                        time_info['daily_times'] = {
                            'from': match.group(1),
                            'until': match.group(2)
                        }
        
        return time_info

    def _parse_notam_datetime(self, datetime_str: str) -> Optional[str]:
        """Parse NOTAM datetime format (YYMMDDhhmm) to ISO format"""
        try:
            if len(datetime_str) == 10:
                year = 2000 + int(datetime_str[:2])
                month = int(datetime_str[2:4])
                day = int(datetime_str[4:6])
                hour = int(datetime_str[6:8])
                minute = int(datetime_str[8:10])
                
                dt = datetime(year, month, day, hour, minute)
                return dt.isoformat() + 'Z'
        except (ValueError, IndexError):
            pass
        
        return None

    def _extract_location(self, text: str) -> Dict[str, Any]:
        """Extract location information"""
        location = {
            'coordinates': None,
            'radius': None,
            'area_description': None
        }
        
        # Extract coordinates
        for pattern in self.location_patterns['coordinates']:
            match = re.search(pattern, text)
            if match:
                location['coordinates'] = match.group(0)
                break
        
        # Extract radius information
        for pattern in self.location_patterns['radius']:
            match = re.search(pattern, text.lower())
            if match:
                location['radius'] = f"{match.group(1)} nm"
                break
        
        return location

    def _extract_coordinates(self, text: str) -> Optional[Dict[str, float]]:
        """Extract and convert coordinates to decimal degrees"""
        # Look for various coordinate formats
        coord_patterns = [
            r'(\d{2})(\d{2})(\d{2})[nNsS]\s*(\d{3})(\d{2})(\d{2})[eEwW]',
            r'(\d{4}[nNsS]\d{5}[eEwW])'
        ]
        
        for pattern in coord_patterns:
            match = re.search(pattern, text.upper())
            if match and len(match.groups()) >= 6:
                try:
                    lat_deg = int(match.group(1))
                    lat_min = int(match.group(2))
                    lat_sec = int(match.group(3))
                    lon_deg = int(match.group(4))
                    lon_min = int(match.group(5))
                    lon_sec = int(match.group(6))
                    
                    lat = lat_deg + lat_min/60 + lat_sec/3600
                    lon = lon_deg + lon_min/60 + lon_sec/3600
                    
                    # Determine hemispheres (simplified - assumes N/E positive)
                    if 'S' in match.group(0):
                        lat = -lat
                    if 'W' in match.group(0):
                        lon = -lon
                    
                    return {'latitude': lat, 'longitude': lon}
                except (ValueError, IndexError):
                    continue
        
        return None

    def _extract_altitudes(self, text: str) -> Dict[str, Any]:
        """Extract altitude restrictions/information"""
        altitudes = {
            'surface_to': None,
            'flight_levels': [],
            'restrictions': []
        }
        
        # Look for altitude patterns
        alt_patterns = [
            r'sfc.*fl(\d{3})',
            r'surface.*(\d{1,2},?\d{3})\s*ft',
            r'fl(\d{3})',
            r'(\d{1,2},?\d{3})\s*ft.*msl'
        ]
        
        for pattern in alt_patterns:
            matches = re.finditer(pattern, text.lower())
            for match in matches:
                if 'fl' in match.group(0):
                    fl = int(match.group(1))
                    altitudes['flight_levels'].append(fl * 100)
                else:
                    alt_str = match.group(1).replace(',', '')
                    altitudes['restrictions'].append(int(alt_str))
        
        return altitudes

    def _analyze_impact(self, text: str) -> Dict[str, Any]:
        """Analyze operational impact"""
        impact = {
            'type': 'unknown',
            'severity_score': 0,  # 0-10 scale
            'flight_operations': [],
            'affected_phases': []  # takeoff, landing, taxi, en-route
        }
        
        text_lower = text.lower()
        
        # Determine impact type
        for impact_type, patterns in self.impact_patterns.items():
            if any(re.search(pattern, text_lower) for pattern in patterns):
                impact['type'] = impact_type
                break
        
        # Calculate severity score
        high_impact_terms = ['closed', 'unavailable', 'emergency', 'danger']
        medium_impact_terms = ['restricted', 'caution', 'displaced', 'limited']
        
        for term in high_impact_terms:
            if term in text_lower:
                impact['severity_score'] += 3
        
        for term in medium_impact_terms:
            if term in text_lower:
                impact['severity_score'] += 1
        
        # Determine affected flight phases
        if any(term in text_lower for term in ['runway', 'takeoff', 'landing']):
            impact['affected_phases'].extend(['takeoff', 'landing'])
        if any(term in text_lower for term in ['taxiway', 'taxi', 'ground']):
            impact['affected_phases'].append('taxi')
        if any(term in text_lower for term in ['approach', 'ils', 'vor']):
            impact['affected_phases'].append('approach')
        if any(term in text_lower for term in ['airspace', 'navigation', 'en-route']):
            impact['affected_phases'].append('en-route')
        
        return impact

    def _clean_description(self, text: str) -> str:
        """Clean and format NOTAM description"""
        # Remove extra whitespace and normalize
        cleaned = re.sub(r'\s+', ' ', text.strip())
        
        # Remove NOTAM header if present
        cleaned = re.sub(r'^NOTAM\s+[A-Z]\d+/\d+\s*', '', cleaned, flags=re.IGNORECASE)
        
        # Limit length for readability
        if len(cleaned) > 300:
            cleaned = cleaned[:300] + '...'
        
        return cleaned

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords for search/filtering"""
        keywords = []
        
        # Aviation-specific keywords
        aviation_terms = [
            'runway', 'taxiway', 'approach', 'ils', 'vor', 'ndb', 'dme',
            'closed', 'restricted', 'unavailable', 'maintenance', 'construction',
            'lighting', 'fuel', 'frequency', 'navaid', 'obstacle', 'crane'
        ]
        
        text_lower = text.lower()
        for term in aviation_terms:
            if term in text_lower:
                keywords.append(term)
        
        # Extract runway/taxiway identifiers
        rwy_matches = re.findall(r'rwy\s*(\d{2}[lrcLRC]?)', text_lower)
        keywords.extend([f"runway_{rwy}" for rwy in rwy_matches])
        
        twy_matches = re.findall(r'twy\s*([A-Z]\d?)', text_lower)
        keywords.extend([f"taxiway_{twy}" for twy in twy_matches])
        
        return list(set(keywords))  # Remove duplicates

    def _assess_flight_impact(self, parsed_notam: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall impact on flight operations"""
        impact_assessment = {
            'overall_impact': 'low',
            'affected_operations': [],
            'pilot_action_required': False,
            'alternate_procedures': False,
            'go_no_go_factor': False
        }
        
        severity = parsed_notam.get('severity', 'low')
        category = parsed_notam.get('category', 'other')
        impact_info = parsed_notam.get('impact', {})
        
        # High-impact scenarios
        if (severity == 'high' or 
            category in ['runway', 'approach'] or
            'closed' in parsed_notam.get('description', '').lower()):
            impact_assessment['overall_impact'] = 'high'
            impact_assessment['go_no_go_factor'] = True
            impact_assessment['pilot_action_required'] = True
        
        # Medium-impact scenarios
        elif (severity == 'medium' or 
              category in ['taxiway', 'navigation', 'lighting'] or
              impact_info.get('severity_score', 0) >= 3):
            impact_assessment['overall_impact'] = 'medium'
            impact_assessment['alternate_procedures'] = True
            impact_assessment['pilot_action_required'] = True
        
        # Determine affected operations
        if category == 'runway':
            impact_assessment['affected_operations'].extend(['takeoff', 'landing'])
        elif category == 'taxiway':
            impact_assessment['affected_operations'].append('ground_operations')
        elif category == 'approach':
            impact_assessment['affected_operations'].extend(['approach', 'landing'])
        elif category == 'navigation':
            impact_assessment['affected_operations'].append('navigation')
        
        return impact_assessment

    def parse_multiple(self, notam_texts: List[str]) -> List[Dict[str, Any]]:
        """Parse multiple NOTAMs and return consolidated results"""
        parsed_notams = []
        
        for i, notam_text in enumerate(notam_texts):
            try:
                parsed = self.parse(notam_text)
                parsed['sequence_number'] = i + 1
                parsed_notams.append(parsed)
            except Exception as e:
                logger.error(f"Failed to parse NOTAM {i+1}: {e}")
                parsed_notams.append({
                    'sequence_number': i + 1,
                    'error': str(e),
                    'raw_text': notam_text[:100] + '...' if len(notam_text) > 100 else notam_text
                })
        
        return parsed_notams

    def get_summary_statistics(self, parsed_notams: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary statistics for a list of parsed NOTAMs"""
        if not parsed_notams:
            return {'total': 0, 'error': 'No NOTAMs provided'}
        
        stats = {
            'total_notams': len(parsed_notams),
            'by_severity': {'high': 0, 'medium': 0, 'low': 0, 'unknown': 0},
            'by_category': {},
            'high_impact_count': 0,
            'go_no_go_factors': 0,
            'airports_affected': set(),
            'most_common_keywords': {}
        }
        
        all_keywords = []
        
        for notam in parsed_notams:
            if 'error' in notam:
                continue
            
            # Count by severity
            severity = notam.get('severity', 'unknown')
            stats['by_severity'][severity] += 1
            
            # Count by category
            category = notam.get('category', 'other')
            stats['by_category'][category] = stats['by_category'].get(category, 0) + 1
            
            # High impact assessment
            flight_impact = notam.get('flight_impact', {})
            if flight_impact.get('overall_impact') == 'high':
                stats['high_impact_count'] += 1
            
            if flight_impact.get('go_no_go_factor'):
                stats['go_no_go_factors'] += 1
            
            # Collect airports
            if notam.get('airport_code'):
                stats['airports_affected'].add(notam['airport_code'])
            
            # Collect keywords
            keywords = notam.get('keywords', [])
            all_keywords.extend(keywords)
        
        # Convert set to list for JSON serialization
        stats['airports_affected'] = list(stats['airports_affected'])
        
        # Find most common keywords
        from collections import Counter
        keyword_counts = Counter(all_keywords)
        stats['most_common_keywords'] = dict(keyword_counts.most_common(10))
        
        return stats