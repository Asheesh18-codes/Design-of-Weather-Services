import requests
import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
import os
from dotenv import load_dotenv

# Load environment variables from root directory .env.example
load_dotenv(dotenv_path="../../.env.example")

logger = logging.getLogger(__name__)

class WeatherSummarizer:
    """
    Intelligent weather summarizer using HuggingFace models for flight briefings
    """

    def __init__(self, model="sshleifer/distilbart-cnn-12-6", provider="huggingface"):
        """
        Initialize weather summarizer

        Args:
            model: model name (default = DistilBART CNN)
            provider: "huggingface" or "llama"
        """
        self.model = model
        self.provider = provider
        
        # Configuration for different environments
        self._setup_api_configuration()
        
        # Weather condition mappings
        self.visibility_categories = {
            'excellent': ['10SM', 'P6SM', '9999'],
            'good': ['6SM', '5SM', '4SM'],
            'poor': ['3SM', '2SM', '1SM', '1/2SM', '1/4SM'],
            'very_poor': ['0SM', 'M1/4SM']
        }

        self.ceiling_categories = {
            'high': ['CLR', 'SKC', 'FEW'],
            'medium': ['SCT', 'BKN'],
            'low': ['OVC']
        }

    def _setup_api_configuration(self):
        """Setup API configuration based on environment"""
        # Running in local environment or production
        self._setup_local_config()

    def _setup_local_config(self):
        """Setup configuration for local/production environment"""
        try:
            # Ensure environment variables are loaded from .env.example
            from dotenv import load_dotenv
            load_dotenv(dotenv_path="../../.env.example", override=True)
            
            if self.provider == "huggingface":
                self.api_key = os.getenv('HF_TOKEN') or os.getenv('HUGGINGFACE_API_KEY')
                if not self.api_key:
                    logger.warning("❌ HF_TOKEN not found in environment variables.")
                    self._setup_fallback_config()
                    return
                self.api_url = f"https://api-inference.huggingface.co/models/{self.model}"
                self.headers = {"Authorization": f"Bearer {self.api_key}"}
            elif self.provider == "llama":
                self.api_key = os.getenv('GROQ_API_KEY') or os.getenv('LLAMA_API_KEY')
                if not self.api_key:
                    logger.warning("❌ GROQ_API_KEY not found in environment variables.")
                    self._setup_fallback_config()
                    return
                self.api_url = "https://api.groq.com/openai/v1/chat/completions"
                self.headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            else:
                raise ValueError("❌ Unsupported provider. Use 'huggingface' or 'llama'.")
        except Exception as e:
            logger.warning(f"Local configuration failed: {e}")
            self._setup_fallback_config()

    def _setup_fallback_config(self):
        """Setup fallback configuration when API keys are not available"""
        logger.info("Setting up fallback configuration - will use rule-based summarization")
        self.api_key = None
        self.api_url = None
        self.headers = None
        self.provider = "fallback"

    def summarize(self, text: str, max_length=300, min_length=50) -> str:
        """
        Summarize text using chosen model & provider
        """
        if self.provider == "huggingface":
            return self._call_hf_summarizer(text, max_length, min_length)
        elif self.provider == "llama":
            return self._call_llama_summarizer(text, max_length)
        elif self.provider == "fallback":
            return self._fallback_summary(text)
        else:
            return self._fallback_summary(text)

    def _call_hf_summarizer(self, text, max_length, min_length):
        """Call HuggingFace summarization API"""
        try:
            if not self.api_key:
                return self._fallback_summary(text)
            
            # Truncate input text to avoid token limits
            if len(text) > 1000:
                text = text[:1000] + "..."

            payload = {
                "inputs": text,
                "parameters": {
                    "max_length": max_length,
                    "min_length": min_length,
                    "do_sample": False,
                    "temperature": 0.3
                }
            }

            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )
            response.raise_for_status()

            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                summary = result[0].get("summary_text", "")
                if summary:
                    return summary
            
            # Fall back if no summary returned
            return self._fallback_summary(text)

        except Exception as e:
            logger.warning(f"HF summarization failed: {e}")
            return self._fallback_summary(text)

    def _call_llama_summarizer(self, text, max_length):
        """Call Llama/GROQ summarization API"""
        try:
            if not self.api_key:
                return self._fallback_summary(text)
                
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "Summarize the following weather information concisely for aviation purposes."},
                    {"role": "user", "content": text}
                ],
                "max_tokens": max_length,
                "temperature": 0.7,
                "stream": False
            }

            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )
            response.raise_for_status()

            result = response.json()
            if result and result.get("choices"):
                summary = result["choices"][0]["message"]["content"]
                if summary:
                    return summary
            
            return self._fallback_summary(text)

        except Exception as e:
            logger.error(f"Llama summarization failed: {e}")
            return self._fallback_summary(text)

    def _fallback_summary(self, text: str) -> str:
        """Generate fallback summary using rule-based approach"""
        summary_points = []
        text_upper = text.upper()

        # Check for VFR/IFR conditions
        if any(cond in text_upper for cond in ['10SM', 'P6SM', '9999', 'CLR', 'SKC', 'FEW']):
            summary_points.append("VFR conditions")
        elif any(cond in text_upper for cond in ['OVC', '1SM', '2SM', '1/2SM', '1/4SM', '0SM', 'M1/4SM']):
            summary_points.append("IFR conditions")
        elif any(cond in text_upper for cond in ['SCT', 'BKN', '3SM', '4SM', '5SM', '6SM']):
            summary_points.append("MVFR conditions")

        # Check for weather phenomena
        weather_phenomena = {
            'RA': 'rain', 'SN': 'snow', 'FG': 'fog',
            'TS': 'thunderstorms', 'BR': 'mist',
            'DZ': 'drizzle', 'FZ': 'freezing conditions',
            'VC': 'in the vicinity', 'SH': 'showers',
            'DR': 'drifting', 'BL': 'blowing', 'SQ': 'squalls',
            'PO': 'dust/sand whirls', 'SS': 'sandstorm',
            'DS': 'duststorm', 'GR': 'hail', 'GS': 'small hail/snow pellets',
            'UP': 'unknown precipitation', 'VA': 'volcanic ash'
        }

        for code, description in weather_phenomena.items():
            if code in text_upper:
                summary_points.append(description)

        # Check wind conditions
        wind_match = re.search(r'(\d{3})(\d{2})(?:G(\d{2}))?KT', text)
        if wind_match:
            direction = wind_match.group(1)
            speed = int(wind_match.group(2))
            gust = wind_match.group(3)

            if direction == '000':
                wind_desc = "Calm winds"
            else:
                wind_desc = f"Wind from {direction}° at {speed} knots"
                if gust:
                    wind_desc += f", gusting to {gust} knots"

            if speed > 20 or (gust and int(gust) > 25):
                summary_points.append("strong winds")
            elif speed > 10:
                summary_points.append("moderate winds")
            summary_points.append(wind_desc)

        # Add temperature if found
        temp_match = re.search(r'(M?\d{2})/(M?\d{2})', text_upper)
        if temp_match:
            temp_str = temp_match.group(1)
            temp = int(temp_str.replace('M', '-'))
            summary_points.append(f"Temp {temp}°C")

        if summary_points:
            # Remove duplicates while preserving order
            seen = set()
            summary_points_unique = []
            for item in summary_points:
                if item not in seen:
                    seen.add(item)
                    summary_points_unique.append(item)
            return f"Weather: {', '.join(summary_points_unique)}"
        else:
            return "Weather conditions require pilot review"

    def _enhanced_pilot_metar_summary(self, raw_metar: str) -> str:
        """
        Generate enhanced pilot-focused METAR summary with 7-8 key points
        """
        try:
            metar_upper = raw_metar.upper()
            summary_lines = []
            
            # 1. Extract station and time
            station_match = re.search(r'METAR\s+([A-Z]{4})', metar_upper)
            time_match = re.search(r'(\d{6})Z', metar_upper)
            if station_match and time_match:
                station = station_match.group(1)
                time = time_match.group(1)
                summary_lines.append(f"STATION: {station} at {time[2:4]}:{time[4:6]}Z")
            
            # 2. Flight category assessment
            flight_category = "Unknown"
            ceiling = visibility = None
            
            # Check visibility
            vis_match = re.search(r'(\d+)SM|(\d{4})', metar_upper)
            if vis_match:
                if vis_match.group(1):  # Statute miles
                    visibility = int(vis_match.group(1))
                elif vis_match.group(2):  # Meters
                    visibility = int(vis_match.group(2)) / 1609  # Convert to miles
            
            # Check ceiling
            ceiling_match = re.search(r'(BKN|OVC)(\d{3})', metar_upper)
            if ceiling_match:
                ceiling = int(ceiling_match.group(2)) * 100
            
            # Determine flight category
            if visibility and ceiling:
                if visibility >= 5 and ceiling >= 3000:
                    flight_category = "VFR"
                elif visibility >= 3 and ceiling >= 1000:
                    flight_category = "MVFR"
                elif visibility >= 1 and ceiling >= 500:
                    flight_category = "IFR"
                else:
                    flight_category = "LIFR"
            
            summary_lines.append(f"FLIGHT CATEGORY: {flight_category}")
            
            # 3. Visibility and ceiling
            vis_str = f"{visibility:.0f}SM" if visibility else "Unknown"
            ceil_str = f"{ceiling}ft" if ceiling else "Unlimited/High"
            summary_lines.append(f"VISIBILITY: {vis_str} | CEILING: {ceil_str}")
            
            # 4. Wind analysis
            wind_match = re.search(r'(\d{3})(\d{2})(?:G(\d{2}))?KT', metar_upper)
            if wind_match:
                direction = int(wind_match.group(1))
                speed = int(wind_match.group(2))
                gust = int(wind_match.group(3)) if wind_match.group(3) else None
                
                if direction == 0:
                    wind_desc = "CALM"
                else:
                    wind_desc = f"{direction:03d}° at {speed}kt"
                    if gust:
                        wind_desc += f" gusting {gust}kt"
                        
                summary_lines.append(f"WINDS: {wind_desc}")
            
            # 5. Weather phenomena
            weather_codes = {
                'RA': 'Rain', 'SN': 'Snow', 'FG': 'Fog', 'BR': 'Mist',
                'TS': 'Thunderstorms', 'DZ': 'Drizzle', 'SH': 'Showers',
                'FZ': 'Freezing conditions', 'BL': 'Blowing', 'GR': 'Hail'
            }
            
            weather_present = []
            for code, desc in weather_codes.items():
                if code in metar_upper:
                    weather_present.append(desc)
            
            if weather_present:
                summary_lines.append(f"WEATHER: {', '.join(weather_present)}")
            else:
                summary_lines.append("WEATHER: Clear of significant phenomena")
            
            # 6. Temperature and pressure
            temp_match = re.search(r'(M?\d{2})/(M?\d{2})', metar_upper)
            pressure_match = re.search(r'A(\d{4})', metar_upper)
            
            if temp_match:
                temp_str = temp_match.group(1).replace('M', '-')
                dew_str = temp_match.group(2).replace('M', '-')
                temp_line = f"TEMP: {temp_str}°C | DEWPOINT: {dew_str}°C"
                
                if pressure_match:
                    pressure = int(pressure_match.group(1)) / 100
                    temp_line += f" | ALTIMETER: {pressure:.2f} inHg"
                    
                summary_lines.append(temp_line)
            
            # 7. Flight safety assessment
            safety_concerns = []
            if flight_category in ['IFR', 'LIFR']:
                safety_concerns.append("Instrument conditions")
            if visibility and visibility < 3:
                safety_concerns.append("Reduced visibility")
            if ceiling and ceiling < 1000:
                safety_concerns.append("Low ceiling")
            if wind_match and (int(wind_match.group(2)) > 15 or wind_match.group(3)):
                safety_concerns.append("Strong/gusty winds")
            if any(wx in metar_upper for wx in ['TS', 'FG', 'SN', 'FZRA']):
                safety_concerns.append("Adverse weather")
                
            if safety_concerns:
                summary_lines.append(f"CAUTIONS: {', '.join(safety_concerns)}")
            else:
                summary_lines.append("ASSESSMENT: Favorable flying conditions")
                
            # 8. Pilot recommendations
            if flight_category == 'VFR':
                summary_lines.append("RECOMMENDATION: VFR flight operations suitable")
            elif flight_category == 'MVFR':
                summary_lines.append("RECOMMENDATION: Monitor conditions, consider IFR procedures")
            elif flight_category in ['IFR', 'LIFR']:
                summary_lines.append("RECOMMENDATION: IFR procedures required, consider delays")
            else:
                summary_lines.append("RECOMMENDATION: Review current conditions carefully")
            
            return "\n".join(summary_lines)
            
        except Exception as e:
            logger.error(f"Enhanced METAR summary error: {e}")
            return f"METAR BRIEF: {raw_metar[:100]}... (Review full report for flight planning)"

    def summarize_report(self, report_data: Any, report_type: str, max_length=200) -> str:
        """
        Universal report summarizer for all aviation weather report types
        
        Args:
            report_data: Raw text, dict, or list of reports
            report_type: Type of report ('metar', 'taf', 'pirep', 'sigmet', 'airmet', 'notam')
            max_length: Maximum summary length
            
        Returns:
            Formatted summary appropriate for the report type
        """
        try:
            if report_type.lower() == 'metar':
                return self.summarize_metar(report_data, max_length)
            elif report_type.lower() == 'taf':
                return self.summarize_taf(report_data, max_length)
            elif report_type.lower() == 'pirep':
                return self.summarize_pirep(report_data, max_length)
            elif report_type.lower() == 'sigmet':
                return self.summarize_sigmet(report_data, max_length)
            elif report_type.lower() == 'airmet':
                return self.summarize_airmet(report_data, max_length)
            elif report_type.lower() == 'notam':
                return self.summarize_notam(report_data, max_length)
            else:
                return self.summarize(str(report_data), max_length)
        except Exception as e:
            logger.error(f"Report summarization error for {report_type}: {e}")
            return f"Unable to summarize {report_type}: {str(report_data)[:100]}..."

    def summarize_metar(self, metar_data: Any, max_length=200) -> str:
        """
        Summarize METAR reports with pilot-centralized 7-8 line assessment
        
        Args:
            metar_data: METAR text or structured data
            max_length: Maximum summary length
            
        Returns:
            Comprehensive pilot-focused METAR brief
        """
        try:
            # Extract raw METAR text
            if isinstance(metar_data, dict):
                raw_metar = metar_data.get('rawOb', metar_data.get('raw', str(metar_data)))
            elif isinstance(metar_data, list):
                if metar_data:
                    raw_metar = metar_data[0].get('rawOb', str(metar_data[0])) if isinstance(metar_data[0], dict) else str(metar_data[0])
                else:
                    return "No METAR data available"
            else:
                raw_metar = str(metar_data)
            
            # Try AI summarization with detailed pilot context
            if self.provider != "fallback":
                prompt = f"""Provide a comprehensive pilot briefing for this METAR in 7-8 lines covering:
1. Flight category (VFR/MVFR/IFR/LIFR)
2. Current visibility and ceiling conditions
3. Wind direction, speed, and gusts (crosswind concerns)
4. Weather phenomena and precipitation
5. Temperature and altimeter setting
6. Flight safety considerations
7. Operational recommendations
METAR: {raw_metar}"""
                summary = self.summarize(prompt, max_length=400)
                if summary and not summary.startswith("❌"):
                    return summary
            
            # Enhanced fallback summary
            return self._enhanced_pilot_metar_summary(raw_metar)
            
        except Exception as e:
            logger.error(f"METAR summarization error: {e}")
            return self._enhanced_pilot_metar_summary(str(metar_data))

    def summarize_taf(self, taf_data: Any, max_length=250) -> str:
        """
        Summarize TAF (Terminal Aerodrome Forecast) reports
        
        Args:
            taf_data: TAF text or structured data
            max_length: Maximum summary length
            
        Returns:
            Flight-focused TAF summary with trend analysis
        """
        try:
            # Extract raw TAF text
            if isinstance(taf_data, dict):
                raw_taf = taf_data.get('rawTaf', taf_data.get('raw', str(taf_data)))
            elif isinstance(taf_data, list):
                if taf_data:
                    raw_taf = taf_data[0].get('rawTaf', str(taf_data[0])) if isinstance(taf_data[0], dict) else str(taf_data[0])
                else:
                    return "No TAF data available"
            else:
                raw_taf = str(taf_data)
            
            # Try AI summarization with forecast context
            if self.provider != "fallback":
                prompt = f"Summarize this TAF forecast for flight planning, highlighting changing conditions, trends, and timing: {raw_taf}"
                summary = self.summarize(prompt, max_length)
                if summary and not summary.startswith("❌"):
                    return f"TAF Summary: {summary}"
            
            # Fallback to rule-based TAF summary
            return self._fallback_taf_summary(raw_taf)
            
        except Exception as e:
            logger.error(f"TAF summarization error: {e}")
            return self._fallback_taf_summary(str(taf_data))

    def summarize_pirep(self, pirep_data: Any, max_length=150) -> str:
        """
        Summarize PIREP (Pilot Reports) with emphasis on hazards
        
        Args:
            pirep_data: PIREP text or structured data
            max_length: Maximum summary length
            
        Returns:
            Safety-focused PIREP summary
        """
        try:
            # Handle multiple PIREPs
            if isinstance(pirep_data, list):
                if not pirep_data:
                    return "No pilot reports available"
                
                summaries = []
                for i, pirep in enumerate(pirep_data[:3]):  # Limit to 3 most recent
                    pirep_text = pirep.get('rawOb', pirep.get('reportText', str(pirep))) if isinstance(pirep, dict) else str(pirep)
                    summary = self._fallback_pirep_summary(pirep_text)
                    summaries.append(f"PIREP {i+1}: {summary}")
                
                return "\n".join(summaries)
            
            # Single PIREP
            if isinstance(pirep_data, dict):
                raw_pirep = pirep_data.get('rawOb', pirep_data.get('reportText', str(pirep_data)))
            else:
                raw_pirep = str(pirep_data)
            
            # Try AI summarization with safety focus
            if self.provider != "fallback":
                prompt = f"Summarize this pilot report focusing on flight hazards, turbulence, icing, and visibility: {raw_pirep}"
                summary = self.summarize(prompt, max_length)
                if summary and not summary.startswith("❌"):
                    return f"PIREP: {summary}"
            
            return self._fallback_pirep_summary(raw_pirep)
            
        except Exception as e:
            logger.error(f"PIREP summarization error: {e}")
            return self._fallback_pirep_summary(str(pirep_data))

    def summarize_sigmet(self, sigmet_data: Any, max_length=200) -> str:
        """
        Summarize SIGMET (Significant Meteorological Information)
        
        Args:
            sigmet_data: SIGMET text or structured data
            max_length: Maximum summary length
            
        Returns:
            Hazard-focused SIGMET summary
        """
        try:
            # Handle multiple SIGMETs
            if isinstance(sigmet_data, list):
                if not sigmet_data:
                    return "No SIGMETs active"
                
                hazard_count = len(sigmet_data)
                if hazard_count == 1:
                    sigmet_text = str(sigmet_data[0])
                else:
                    return f"⚠️ {hazard_count} Active SIGMETs - Significant weather hazards present. Review individual reports for details."
            else:
                sigmet_text = str(sigmet_data)
            
            # Try AI summarization with hazard focus
            if self.provider != "fallback":
                prompt = f"Summarize this SIGMET focusing on flight hazards, affected areas, and validity times: {sigmet_text}"
                summary = self.summarize(prompt, max_length)
                if summary and not summary.startswith("❌"):
                    return f"⚠️ SIGMET: {summary}"
            
            return self._fallback_sigmet_summary(sigmet_text)
            
        except Exception as e:
            logger.error(f"SIGMET summarization error: {e}")
            return self._fallback_sigmet_summary(str(sigmet_data))

    def summarize_airmet(self, airmet_data: Any, max_length=200) -> str:
        """
        Summarize AIRMET (Airmen's Meteorological Information)
        
        Args:
            airmet_data: AIRMET text or structured data
            max_length: Maximum summary length
            
        Returns:
            AIRMET summary with flight impact
        """
        try:
            # Handle multiple AIRMETs
            if isinstance(airmet_data, list):
                if not airmet_data:
                    return "No AIRMETs active"
                
                airmet_count = len(airmet_data)
                if airmet_count == 1:
                    airmet_text = str(airmet_data[0])
                else:
                    return f"📋 {airmet_count} Active AIRMETs - Moderate weather conditions. Check individual reports for affected areas."
            else:
                airmet_text = str(airmet_data)
            
            # Try AI summarization
            if self.provider != "fallback":
                prompt = f"Summarize this AIRMET focusing on weather conditions and flight impacts: {airmet_text}"
                summary = self.summarize(prompt, max_length)
                if summary and not summary.startswith("❌"):
                    return f"📋 AIRMET: {summary}"
            
            return self._fallback_airmet_summary(airmet_text)
            
        except Exception as e:
            logger.error(f"AIRMET summarization error: {e}")
            return self._fallback_airmet_summary(str(airmet_data))

    def summarize_notam(self, notam_text: str, max_length=200) -> str:
        """
        Summarize NOTAM information for flight briefings
        
        Args:
            notam_text: Raw or parsed NOTAM text
            max_length: Maximum summary length
            
        Returns:
            Concise NOTAM summary
        """
        try:
            # If it's already parsed NOTAM (dict), convert to text
            if isinstance(notam_text, dict):
                text = self._format_notam_dict_for_summary(notam_text)
            else:
                text = str(notam_text)
            
            # Try AI summarization first
            if self.provider != "fallback":
                summary = self.summarize(text, max_length)
                if summary and not summary.startswith("❌"):
                    return summary
            
            # Fallback to rule-based NOTAM summary
            return self._fallback_notam_summary(text)
            
        except Exception as e:
            logger.error(f"NOTAM summarization error: {e}")
            return self._fallback_notam_summary(notam_text)

    def _format_notam_dict_for_summary(self, notam_dict: Dict[str, Any]) -> str:
        """Format parsed NOTAM dictionary for summarization"""
        parts = []
        
        # Add key information
        if notam_dict.get('severity'):
            parts.append(f"Severity: {notam_dict['severity']}")
        
        if notam_dict.get('category'):
            parts.append(f"Category: {notam_dict['category']}")
        
        if notam_dict.get('description'):
            parts.append(f"Description: {notam_dict['description']}")
        
        if notam_dict.get('affected_facilities'):
            facilities = [f"{f.get('type', 'unknown')} {f.get('identifier', '')}" 
                         for f in notam_dict['affected_facilities']]
            parts.append(f"Affected: {', '.join(facilities)}")
        
        if notam_dict.get('impact', {}).get('type'):
            parts.append(f"Impact: {notam_dict['impact']['type']}")
        
        return ". ".join(parts)

    def _fallback_notam_summary(self, text: str) -> str:
        """Generate rule-based NOTAM summary"""
        text_lower = str(text).lower()
        summary_parts = []
        
        # Extract key NOTAM components
        if 'runway' in text_lower or 'rwy' in text_lower:
            if 'closed' in text_lower:
                summary_parts.append("Runway closure")
            elif 'construction' in text_lower:
                summary_parts.append("Runway construction")
            else:
                summary_parts.append("Runway NOTAM")
        
        if 'taxiway' in text_lower or 'twy' in text_lower:
            summary_parts.append("Taxiway restrictions")
        
        if any(term in text_lower for term in ['approach', 'ils', 'vor']):
            summary_parts.append("Navigation/approach changes")
        
        if 'lighting' in text_lower:
            summary_parts.append("Lighting issues")
        
        if any(term in text_lower for term in ['fuel', 'service']):
            summary_parts.append("Service limitations")
        
        if 'frequency' in text_lower:
            summary_parts.append("Frequency changes")
        
        # Add severity indicators
        if any(term in text_lower for term in ['closed', 'unavailable', 'emergency']):
            summary_parts.append("[HIGH IMPACT]")
        elif any(term in text_lower for term in ['restricted', 'caution', 'limited']):
            summary_parts.append("[MODERATE IMPACT]")
        
        if summary_parts:
            return f"NOTAM: {', '.join(summary_parts)}"
        else:
            # Extract first meaningful sentence
            sentences = text.split('.')
            for sentence in sentences:
                if len(sentence.strip()) > 20:
                    return f"NOTAM: {sentence.strip()[:100]}..."
            
            return f"NOTAM requires pilot review: {str(text)[:50]}..."

    def _fallback_metar_summary(self, metar_text: str) -> str:
        """Generate rule-based METAR summary"""
        try:
            metar_upper = metar_text.upper()
            summary_parts = []
            
            # Extract airport
            airport_match = re.search(r'METAR ([A-Z]{4})', metar_upper)
            if airport_match:
                summary_parts.append(f"METAR {airport_match.group(1)}:")
            else:
                summary_parts.append("METAR:")
            
            # Flight conditions assessment
            if any(vfr in metar_upper for vfr in ['10SM', 'P6SM', '9999', 'CLR', 'SKC']):
                summary_parts.append("VFR conditions")
            elif any(ifr in metar_upper for ifr in ['OVC', '1SM', '2SM', '1/2SM', '1/4SM']):
                summary_parts.append("IFR conditions")
            elif any(mvfr in metar_upper for mvfr in ['SCT', 'BKN', '3SM', '4SM', '5SM']):
                summary_parts.append("MVFR conditions")
            
            # Wind analysis
            wind_match = re.search(r'(\d{3})(\d{2})(?:G(\d{2}))?KT', metar_upper)
            if wind_match:
                speed = int(wind_match.group(2))
                gust = wind_match.group(3)
                if speed == 0:
                    summary_parts.append("calm winds")
                elif speed > 20 or (gust and int(gust) > 25):
                    summary_parts.append("strong winds")
                elif speed > 10:
                    summary_parts.append(f"{speed}kt winds")
            
            # Weather phenomena
            if 'TS' in metar_upper:
                summary_parts.append("thunderstorms")
            if any(wx in metar_upper for wx in ['RA', 'SN', 'FZ']):
                summary_parts.append("precipitation")
            if any(vis in metar_upper for vis in ['FG', 'BR']):
                summary_parts.append("reduced visibility")
            
            return " • ".join(summary_parts) if summary_parts else "Weather conditions available"
            
        except Exception as e:
            logger.error(f"METAR fallback error: {e}")
            return f"METAR summary unavailable: {metar_text[:50]}..."

    def _fallback_taf_summary(self, taf_text: str) -> str:
        """Generate rule-based TAF summary"""
        try:
            taf_upper = taf_text.upper()
            summary_parts = []
            
            # Extract airport and validity
            airport_match = re.search(r'TAF ([A-Z]{4})', taf_upper)
            if airport_match:
                summary_parts.append(f"TAF {airport_match.group(1)}:")
            else:
                summary_parts.append("TAF:")
            
            # Look for changing conditions
            if 'TEMPO' in taf_upper:
                summary_parts.append("temporary conditions expected")
            if 'BECMG' in taf_upper:
                summary_parts.append("conditions becoming")
            if 'FM' in taf_upper:
                summary_parts.append("changing conditions")
            
            # Weather trends
            if 'TS' in taf_upper:
                summary_parts.append("thunderstorms forecast")
            if any(wx in taf_upper for wx in ['-RA', 'RA', '+RA']):
                if '-RA' in taf_upper:
                    summary_parts.append("light rain")
                elif '+RA' in taf_upper:
                    summary_parts.append("heavy rain")
                else:
                    summary_parts.append("rain forecast")
            if 'SN' in taf_upper:
                summary_parts.append("snow forecast")
            if any(vis in taf_upper for vis in ['FG', 'BR']):
                summary_parts.append("visibility restrictions")
            
            # Ceiling changes
            if 'OVC' in taf_upper:
                summary_parts.append("overcast periods")
            elif 'BKN' in taf_upper:
                summary_parts.append("broken cloud layers")
            
            return " • ".join(summary_parts) if len(summary_parts) > 1 else "Forecast conditions available"
            
        except Exception as e:
            logger.error(f"TAF fallback error: {e}")
            return f"TAF summary unavailable: {taf_text[:50]}..."

    def _fallback_pirep_summary(self, pirep_text: str) -> str:
        """Generate rule-based PIREP summary"""
        try:
            pirep_upper = pirep_text.upper()
            summary_parts = []
            
            # Extract key PIREP information
            if any(turb in pirep_upper for turb in ['TURB', 'TURBULENCE']):
                if 'SEV' in pirep_upper or 'SEVERE' in pirep_upper:
                    summary_parts.append("severe turbulence reported")
                elif 'MOD' in pirep_upper or 'MODERATE' in pirep_upper:
                    summary_parts.append("moderate turbulence")
                else:
                    summary_parts.append("turbulence reported")
            
            # Icing conditions
            if any(ice in pirep_upper for ice in ['ICE', 'ICING']):
                if 'SEV' in pirep_upper:
                    summary_parts.append("severe icing")
                elif 'MOD' in pirep_upper:
                    summary_parts.append("moderate icing")
                else:
                    summary_parts.append("icing conditions")
            
            # Cloud information
            if any(cloud in pirep_upper for cloud in ['TOPS', 'BASE']):
                summary_parts.append("cloud layer info")
            
            # Visibility
            if any(vis in pirep_upper for vis in ['VIS', 'VISIBILITY']):
                summary_parts.append("visibility report")
            
            # Smooth conditions (positive report)
            if any(smooth in pirep_upper for smooth in ['SMOOTH', 'NO TURB']):
                summary_parts.append("smooth flight conditions")
            
            # Extract altitude if available
            alt_match = re.search(r'(\d{3})', pirep_upper)
            if alt_match:
                alt = int(alt_match.group(1)) * 100
                summary_parts.append(f"at {alt}ft")
            
            if summary_parts:
                return "Pilot reports: " + " • ".join(summary_parts)
            else:
                return f"Pilot report: {pirep_text[:80]}..."
                
        except Exception as e:
            logger.error(f"PIREP fallback error: {e}")
            return f"Pilot report available: {pirep_text[:50]}..."

    def _fallback_sigmet_summary(self, sigmet_text: str) -> str:
        """Generate rule-based SIGMET summary"""
        try:
            sigmet_upper = sigmet_text.upper()
            summary_parts = []
            
            # SIGMET type identification
            if 'CONVECTIVE' in sigmet_upper or 'CONVECTV' in sigmet_upper:
                summary_parts.append("⚠️ Convective SIGMET")
            else:
                summary_parts.append("⚠️ SIGMET")
            
            # Hazard identification
            hazards = []
            if any(ts in sigmet_upper for ts in ['TSTM', 'THUNDERSTORM', 'TS']):
                hazards.append("thunderstorms")
            if any(turb in sigmet_upper for turb in ['TURB', 'TURBULENCE']):
                if 'SEV' in sigmet_upper:
                    hazards.append("severe turbulence")
                else:
                    hazards.append("turbulence")
            if any(ice in sigmet_upper for ice in ['ICE', 'ICING']):
                hazards.append("icing")
            if any(wind in sigmet_upper for wind in ['WIND', 'LLWS']):
                hazards.append("wind shear")
            if 'DUST' in sigmet_upper or 'SAND' in sigmet_upper:
                hazards.append("dust/sand")
            if 'ASH' in sigmet_upper:
                hazards.append("volcanic ash")
            
            if hazards:
                summary_parts.append(f"Hazards: {', '.join(hazards)}")
            
            # Validity time
            time_match = re.search(r'VALID (\d{6})/(\d{6})', sigmet_upper)
            if time_match:
                summary_parts.append(f"Valid {time_match.group(1)}-{time_match.group(2)}Z")
            
            return " • ".join(summary_parts) if summary_parts else "Significant weather warning active"
            
        except Exception as e:
            logger.error(f"SIGMET fallback error: {e}")
            return f"⚠️ SIGMET active: {sigmet_text[:50]}..."

    def _fallback_airmet_summary(self, airmet_text: str) -> str:
        """Generate rule-based AIRMET summary"""
        try:
            airmet_upper = airmet_text.upper()
            summary_parts = []
            
            # AIRMET type
            if 'SIERRA' in airmet_upper:
                summary_parts.append("📋 AIRMET Sierra (IFR/Mountain Obscuration)")
            elif 'TANGO' in airmet_upper:
                summary_parts.append("📋 AIRMET Tango (Turbulence)")
            elif 'ZULU' in airmet_upper:
                summary_parts.append("📋 AIRMET Zulu (Icing)")
            else:
                summary_parts.append("📋 AIRMET")
            
            # Conditions
            conditions = []
            if any(ifr in airmet_upper for ifr in ['IFR', 'MVFR']):
                conditions.append("reduced visibility")
            if 'TURB' in airmet_upper:
                conditions.append("moderate turbulence")
            if 'ICE' in airmet_upper or 'ICING' in airmet_upper:
                conditions.append("icing conditions")
            if any(wind in airmet_upper for wind in ['WIND', 'SFC WIND']):
                conditions.append("surface winds")
            if 'MTN OBSCN' in airmet_upper:
                conditions.append("mountain obscuration")
            
            if conditions:
                summary_parts.append(f"Conditions: {', '.join(conditions)}")
            
            # Altitude range
            alt_match = re.search(r'(\d{3})-(\d{3})', airmet_upper)
            if alt_match:
                low_alt = int(alt_match.group(1)) * 100
                high_alt = int(alt_match.group(2)) * 100
                summary_parts.append(f"{low_alt}-{high_alt}ft")
            
            return " • ".join(summary_parts) if summary_parts else "Moderate weather conditions forecast"
            
        except Exception as e:
            logger.error(f"AIRMET fallback error: {e}")
            return f"📋 AIRMET active: {airmet_text[:50]}..."

    def generate_comprehensive_briefing(self, weather_data: Dict[str, Any], route_info: Dict[str, Any] = None) -> str:
        """
        Generate comprehensive flight briefing from all available weather data sources
        
        Args:
            weather_data: Dictionary containing all weather report types
            route_info: Optional flight route information
            
        Returns:
            Complete flight weather briefing
        """
        try:
            briefing_sections = []
            
            # Header
            if route_info:
                departure = route_info.get('departure', 'N/A')
                arrival = route_info.get('arrival', 'N/A')
                briefing_sections.append(f"COMPREHENSIVE WEATHER BRIEFING")
                briefing_sections.append(f"Route: {departure} → {arrival}")
            else:
                briefing_sections.append("WEATHER BRIEFING")
            
            briefing_sections.append(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
            briefing_sections.append("=" * 60)
            
            # Current Conditions (METARs)
            if weather_data.get('metars') or weather_data.get('current_conditions'):
                briefing_sections.append("\n🌤️  CURRENT CONDITIONS (METARs)")
                briefing_sections.append("-" * 40)
                
                metar_data = weather_data.get('metars') or weather_data.get('current_conditions')
                if isinstance(metar_data, dict):
                    for airport, metar in metar_data.items():
                        summary = self.summarize_metar(metar)
                        briefing_sections.append(f"{airport}: {summary}")
                elif isinstance(metar_data, list):
                    for i, metar in enumerate(metar_data[:5]):  # Limit to 5
                        summary = self.summarize_metar(metar)
                        briefing_sections.append(f"Station {i+1}: {summary}")
                else:
                    summary = self.summarize_metar(metar_data)
                    briefing_sections.append(summary)
            
            # Forecasts (TAFs)
            if weather_data.get('tafs') or weather_data.get('forecasts'):
                briefing_sections.append("\n🔮 TERMINAL FORECASTS (TAFs)")
                briefing_sections.append("-" * 40)
                
                taf_data = weather_data.get('tafs') or weather_data.get('forecasts')
                if isinstance(taf_data, dict):
                    for airport, taf in taf_data.items():
                        summary = self.summarize_taf(taf)
                        briefing_sections.append(f"{airport}: {summary}")
                elif isinstance(taf_data, list):
                    for i, taf in enumerate(taf_data[:5]):
                        summary = self.summarize_taf(taf)
                        briefing_sections.append(f"Forecast {i+1}: {summary}")
                else:
                    summary = self.summarize_taf(taf_data)
                    briefing_sections.append(summary)
            
            # Pilot Reports (PIREPs)
            if weather_data.get('pireps') or weather_data.get('pilot_reports'):
                briefing_sections.append("\n✈️  PILOT REPORTS (PIREPs)")
                briefing_sections.append("-" * 40)
                
                pirep_data = weather_data.get('pireps') or weather_data.get('pilot_reports')
                summary = self.summarize_pirep(pirep_data)
                briefing_sections.append(summary)
            
            # SIGMETs (Significant Weather)
            if weather_data.get('sigmets') or weather_data.get('hazards', {}).get('sigmets'):
                briefing_sections.append("\n⚠️  SIGNIFICANT WEATHER (SIGMETs)")
                briefing_sections.append("-" * 40)
                
                sigmet_data = weather_data.get('sigmets') or weather_data.get('hazards', {}).get('sigmets')
                summary = self.summarize_sigmet(sigmet_data)
                briefing_sections.append(summary)
            
            # AIRMETs
            if weather_data.get('airmets') or weather_data.get('hazards', {}).get('airmets'):
                briefing_sections.append("\n📋 AIRMEN'S WEATHER (AIRMETs)")
                briefing_sections.append("-" * 40)
                
                airmet_data = weather_data.get('airmets') or weather_data.get('hazards', {}).get('airmets')
                summary = self.summarize_airmet(airmet_data)
                briefing_sections.append(summary)
            
            # NOTAMs
            if weather_data.get('notams'):
                briefing_sections.append("\n📢 NOTICES TO AIRMEN (NOTAMs)")
                briefing_sections.append("-" * 40)
                
                notam_data = weather_data.get('notams')
                if isinstance(notam_data, list):
                    high_priority = [n for n in notam_data if isinstance(n, dict) and n.get('severity') == 'high']
                    if high_priority:
                        briefing_sections.append(f"🔴 {len(high_priority)} High-Priority NOTAMs:")
                        for notam in high_priority[:3]:
                            summary = self.summarize_notam(notam)
                            briefing_sections.append(f"• {summary}")
                    
                    if len(notam_data) > len(high_priority):
                        briefing_sections.append(f"📝 {len(notam_data) - len(high_priority)} Additional NOTAMs (review individually)")
                else:
                    summary = self.summarize_notam(notam_data)
                    briefing_sections.append(summary)
            
            # Flight Recommendation
            briefing_sections.append("\n🎯 FLIGHT RECOMMENDATION")
            briefing_sections.append("-" * 40)
            assessment = self.assess_flight_conditions(weather_data)
            briefing_sections.append(f"Overall Status: {assessment['overall_status']}")
            briefing_sections.append(f"Confidence: {assessment['confidence']}")
            if assessment['risk_factors']:
                briefing_sections.append(f"Risk Factors: {', '.join(assessment['risk_factors'])}")
            if assessment['recommendations']:
                briefing_sections.append(f"Recommendation: {assessment['recommendations'][0]}")
            
            # Generate executive summary using AI
            full_briefing = "\n".join(briefing_sections)
            
            try:
                if self.provider != "fallback":
                    exec_summary = self.summarize(
                        f"Create an executive summary of this flight weather briefing focusing on key decisions and safety factors: {full_briefing}",
                        max_length=200
                    )
                    if exec_summary and not exec_summary.startswith("❌"):
                        final_briefing = f"EXECUTIVE SUMMARY:\n{exec_summary}\n\n{full_briefing}"
                        return final_briefing
            except Exception as e:
                logger.error(f"Executive summary generation failed: {e}")
            
            return full_briefing
            
        except Exception as e:
            logger.error(f"Comprehensive briefing generation error: {e}")
            return f"Error generating comprehensive briefing: {str(e)}"

    def get_weather_highlights(self, weather_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract key highlights from all weather data for dashboard display
        
        Args:
            weather_data: Complete weather data dictionary
            
        Returns:
            Dictionary with key weather highlights and alerts
        """
        try:
            highlights = {
                'overall_conditions': 'UNKNOWN',
                'visibility': 'Unknown',
                'winds': 'Unknown',
                'precipitation': None,
                'hazards': [],
                'alerts': [],
                'flight_category': 'UNKNOWN',
                'confidence': 'LOW'
            }
            
            # Analyze METARs for current conditions
            metar_data = weather_data.get('metars') or weather_data.get('current_conditions')
            if metar_data:
                if isinstance(metar_data, dict):
                    # Take the first METAR for overall assessment
                    sample_metar = list(metar_data.values())[0]
                elif isinstance(metar_data, list) and metar_data:
                    sample_metar = metar_data[0]
                else:
                    sample_metar = metar_data
                
                # Extract key conditions from METAR
                metar_text = str(sample_metar.get('rawOb', sample_metar) if isinstance(sample_metar, dict) else sample_metar).upper()
                
                # Flight category
                if any(vfr in metar_text for vfr in ['10SM', 'P6SM', '9999', 'CLR', 'SKC']):
                    highlights['flight_category'] = 'VFR'
                elif any(ifr in metar_text for ifr in ['OVC', '1SM', '2SM']):
                    highlights['flight_category'] = 'IFR'
                else:
                    highlights['flight_category'] = 'MVFR'
                
                # Wind analysis
                wind_match = re.search(r'(\d{3})(\d{2})(?:G(\d{2}))?KT', metar_text)
                if wind_match:
                    speed = int(wind_match.group(2))
                    gust = wind_match.group(3)
                    direction = wind_match.group(1)
                    
                    if speed == 0:
                        highlights['winds'] = 'Calm'
                    elif speed > 25 or (gust and int(gust) > 35):
                        highlights['winds'] = f'Strong ({speed}kt from {direction}°)'
                        highlights['alerts'].append('Strong winds')
                    else:
                        highlights['winds'] = f'{speed}kt from {direction}°'
                
                # Weather phenomena
                if 'TS' in metar_text:
                    highlights['precipitation'] = 'Thunderstorms'
                    highlights['hazards'].append('Thunderstorms')
                elif any(precip in metar_text for precip in ['RA', 'SN', 'DZ']):
                    highlights['precipitation'] = 'Yes'
                
                highlights['confidence'] = 'HIGH'
            
            # Check for hazards in SIGMETs/AIRMETs
            if weather_data.get('sigmets') or weather_data.get('hazards', {}).get('sigmets'):
                highlights['hazards'].append('SIGMET Active')
                highlights['alerts'].append('Significant weather hazards')
            
            if weather_data.get('airmets') or weather_data.get('hazards', {}).get('airmets'):
                highlights['hazards'].append('AIRMET Active')
            
            # Overall conditions assessment
            if highlights['flight_category'] == 'VFR' and not highlights['hazards']:
                highlights['overall_conditions'] = 'GOOD'
            elif highlights['flight_category'] == 'MVFR' or highlights['hazards']:
                highlights['overall_conditions'] = 'FAIR'
            else:
                highlights['overall_conditions'] = 'POOR'
            
            return highlights
            
        except Exception as e:
            logger.error(f"Weather highlights extraction error: {e}")
            return {
                'overall_conditions': 'ERROR',
                'error': str(e),
                'confidence': 'LOW'
            }

    def generate_flight_briefing(self, route_info: Dict, weather_data: Dict, notams: List[Dict] = None) -> str:
        """
        Generate comprehensive flight weather briefing

        Args:
            route_info: Flight route information
            weather_data: Weather data for route
            notams: List of parsed NOTAMs

        Returns:
            Formatted flight briefing text
        """
        departure = route_info.get('departure', 'UNKNOWN')
        arrival = route_info.get('arrival', 'UNKNOWN')
        intermediate = route_info.get('intermediate_stops', [])

        # Build briefing content
        briefing_content = f"FLIGHT WEATHER BRIEFING - {departure} to {arrival}\n"
        briefing_content += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}\n\n"

        # Current conditions summary
        current_conditions = weather_data.get('current_conditions', {})
        briefing_content += "CURRENT CONDITIONS:\n"

        for airport, metar in current_conditions.items():
            raw_metar = metar.get('rawOb', 'No data available')
            briefing_content += f"{airport}: {raw_metar}\n"

        # Forecast summary
        forecasts = weather_data.get('forecasts', {})
        if forecasts:
            briefing_content += "\nFORECASTS:\n"
            for airport, taf in forecasts.items():
                raw_taf = taf.get('rawTaf', 'No forecast available')
                # Truncate long TAFs
                if len(raw_taf) > 200:
                    raw_taf = raw_taf[:200] + "..."
                briefing_content += f"{airport}: {raw_taf}\n"

        # Pilot reports
        pireps = weather_data.get('pilot_reports', [])
        if pireps:
            briefing_content += "\nPILOT REPORTS:\n"
            for i, pirep in enumerate(pireps[:3]):  # Limit to 3 most recent
                raw_pirep = pirep.get('rawOb', pirep.get('reportText', 'No data'))
                if len(raw_pirep) > 150:
                    raw_pirep = raw_pirep[:150] + "..."
                briefing_content += f"PIREP {i+1}: {raw_pirep}\n"

        # Weather hazards
        hazards = weather_data.get('hazards', {})
        hazard_summary = []

        if hazards.get('sigmets'):
            hazard_summary.append(f"{len(hazards['sigmets'])} SIGMET(s)")
        if hazards.get('airmets'):
            hazard_summary.append(f"{len(hazards['airmets'])} AIRMET(s)")

        if hazard_summary:
            briefing_content += f"\nWEATHER HAZARDS: {', '.join(hazard_summary)} active\n"

        # NOTAMs summary
        if notams:
            high_severity_notams = [n for n in notams if n.get('severity') == 'high']
            briefing_content += f"\nNOTAMs: {len(notams)} total"
            if high_severity_notams:
                briefing_content += f", {len(high_severity_notams)} high-priority\n"
                # Add summaries of high-priority NOTAMs
                for notam in high_severity_notams[:3]:  # Limit to 3 most critical
                    summary = self.summarize_notam(notam, max_length=100)
                    briefing_content += f"• {summary}\n"
            else:
                briefing_content += "\n"

        # Generate AI summary of all conditions
        try:
            ai_summary = self.summarize(briefing_content, max_length=300)
            if ai_summary and not ai_summary.startswith("❌"):
                return f"EXECUTIVE SUMMARY:\n{ai_summary}\n\n{briefing_content}"
            else:
                return briefing_content
        except Exception as e:
            logger.error(f"AI summary generation failed: {e}")
            return briefing_content

    def explain_metar(self, metar_text: str) -> str:
        """
        Explain METAR in plain English

        Args:
            metar_text: Raw METAR string

        Returns:
            Plain English explanation
        """
        try:
            explanation_parts = []

            # Extract airport code
            airport_match = re.search(r'METAR ([A-Z]{4})', metar_text)
            if airport_match:
                explanation_parts.append(f"Weather report for {airport_match.group(1)}")

            # Extract observation time
            time_match = re.search(r'(\d{6}Z)', metar_text)
            if time_match:
                time_str = time_match.group(1)
                day = time_str[:2]
                hour = time_str[2:4]
                minute = time_str[4:6]
                explanation_parts.append(f"observed on day {day} at {hour}:{minute} UTC")

            # Extract wind information
            wind_match = re.search(r'(\d{3})(\d{2})(?:G(\d{2}))?KT', metar_text)
            if wind_match:
                direction = wind_match.group(1)
                speed = int(wind_match.group(2))
                gust = wind_match.group(3)

                if direction == '000':
                    wind_desc = "Calm winds"
                else:
                    wind_desc = f"Wind from {direction}° at {speed} knots"
                    if gust:
                        wind_desc += f", gusting to {gust} knots"

                explanation_parts.append(wind_desc)

            # Extract visibility
            vis_match = re.search(r'(\d{1,2}SM|M?\d/\d+SM|P6SM|9999)', metar_text)
            if vis_match:
                vis = vis_match.group(1)
                if vis == 'P6SM' or vis == '9999':
                    explanation_parts.append("Visibility greater than 6 miles")
                elif 'SM' in vis:
                    explanation_parts.append(f"Visibility {vis.replace('SM', ' miles')}")

            # Extract clouds
            cloud_matches = re.findall(r'(CLR|SKC|FEW|SCT|BKN|OVC)(\d{3})?', metar_text)
            if cloud_matches:
                cloud_desc = []
                for coverage, height in cloud_matches:
                    if coverage == 'CLR' or coverage == 'SKC':
                        cloud_desc.append("Clear skies")
                    else:
                        coverage_names = {
                            'FEW': 'Few clouds',
                            'SCT': 'Scattered clouds',
                            'BKN': 'Broken clouds',
                            'OVC': 'Overcast'
                        }
                        if height:
                            altitude = int(height) * 100
                            cloud_desc.append(f"{coverage_names[coverage]} at {altitude} feet")
                        else:
                            cloud_desc.append(coverage_names[coverage])

                if cloud_desc:
                    explanation_parts.append(", ".join(cloud_desc))

            # Extract temperature and dewpoint
            temp_match = re.search(r'(M?\d{2})/(M?\d{2})', metar_text)
            if temp_match:
                temp_str = temp_match.group(1)
                dew_str = temp_match.group(2)

                temp = int(temp_str.replace('M', '-'))
                dew = int(dew_str.replace('M', '-'))

                explanation_parts.append(f"Temperature {temp}°C, dewpoint {dew}°C")

            # Extract pressure
            pressure_match = re.search(r'A(\d{4})', metar_text)
            if pressure_match:
                pressure = pressure_match.group(1)
                pressure_inhg = f"{pressure[:2]}.{pressure[2:]}"
                explanation_parts.append(f"Barometric pressure {pressure_inhg} inHg")

            # Weather phenomena
            weather_codes = {
                'RA': 'rain', 'SN': 'snow', 'FG': 'fog', 'BR': 'mist',
                'TS': 'thunderstorms', 'DZ': 'drizzle', 'FZ': 'freezing',
                'SH': 'showers', 'BL': 'blowing', 'DR': 'drifting'
            }

            for code, description in weather_codes.items():
                if code in metar_text:
                    explanation_parts.append(f"Current weather: {description}")
                    break

            # Combine explanation
            if explanation_parts:
                full_explanation = ". ".join(explanation_parts) + "."

                # Try to enhance with AI if possible
                try:
                    ai_explanation = self.summarize(
                        f"Weather report: {full_explanation}. Summarize flight conditions.",
                        max_length=150
                    )
                    if ai_explanation and not ai_explanation.startswith("❌"):
                        return f"{ai_explanation}\n\nDetailed: {full_explanation}"
                    else:
                        return full_explanation
                except Exception as e:
                    logger.error(f"AI explanation generation failed: {e}")
                    return full_explanation
            else:
                return f"Raw METAR: {metar_text}"

        except Exception as e:
            logger.error(f"METAR explanation error: {e}")
            return f"Unable to parse METAR. Raw text: {metar_text}"

    def generate_quick_summary(self, departure: str, arrival: str,
                             weather_conditions: List[str], flight_level: str = "FL350") -> str:
        """
        Generate a quick weather summary for route planning

        Args:
            departure: Departure airport
            arrival: Arrival airport
            weather_conditions: List of METAR/weather strings
            flight_level: Planned flight level

        Returns:
            Quick weather summary
        """
        try:
            summary_data = {
                'route': f"{departure} → {arrival}",
                'flight_level': flight_level,
                'conditions': [],
                'overall_rating': 'GOOD',
                'recommendations': []
            }

            # Analyze each weather condition
            vfr_count = 0
            ifr_count = 0
            weather_issues = []

            for condition in weather_conditions:
                condition_upper = condition.upper()

                # VFR/IFR classification
                if any(good in condition_upper for good in ['10SM', 'CLR', 'SKC', 'FEW']):
                    vfr_count += 1
                    summary_data['conditions'].append('VFR')
                elif any(poor in condition_upper for poor in ['OVC', '1SM', '2SM', 'BKN']):
                    ifr_count += 1
                    summary_data['conditions'].append('IFR')
                else:
                    summary_data['conditions'].append('MVFR')

                # Check for weather phenomena
                if 'TS' in condition_upper:
                    weather_issues.append('thunderstorms')
                if 'FG' in condition_upper:
                    weather_issues.append('fog')
                if any(wind in condition_upper for wind in ['G25', 'G30', 'G35']):
                    weather_issues.append('strong winds')
                if 'FZ' in condition_upper:
                    weather_issues.append('icing conditions')

            # Determine overall rating
            if ifr_count > vfr_count or 'thunderstorms' in weather_issues:
                summary_data['overall_rating'] = 'POOR'
                summary_data['recommendations'].append('Consider alternate route or delay')
            elif weather_issues or ifr_count > 0:
                summary_data['overall_rating'] = 'FAIR'
                summary_data['recommendations'].append('Monitor weather developments')
            else:
                summary_data['overall_rating'] = 'GOOD'
                summary_data['recommendations'].append('Favorable conditions for flight')

            # Build summary text
            summary_text = f"QUICK WEATHER SUMMARY\n"
            summary_text += f"Route: {summary_data['route']} at {flight_level}\n"
            summary_text += f"Overall Rating: 🟢 {summary_data['overall_rating']}\n\n"

            if weather_issues:
                summary_text += f"Weather Hazards: {', '.join(set(weather_issues))}\n"

            summary_text += f"Conditions: {' → '.join(summary_data['conditions'])}\n"
            summary_text += f"Recommendation: {summary_data['recommendations'][0]}\n"

            return summary_text

        except Exception as e:
            logger.error(f"Quick summary generation error: {e}")
            return f"Weather analysis for {departure} → {arrival}: Please review detailed conditions manually."

    def assess_flight_conditions(self, weather_data: Dict) -> Dict:
        """
        Assess overall flight conditions and provide go/no-go recommendation

        Args:
            weather_data: Complete weather data for route

        Returns:
            Flight assessment with recommendations
        """
        assessment = {
            'overall_status': 'GO',
            'confidence': 'HIGH',
            'risk_factors': [],
            'recommendations': [],
            'severity_score': 0  # 0-10 scale, 0=excellent, 10=no-go
        }

        try:
            # Analyze current conditions
            current_conditions = weather_data.get('current_conditions', {})
            for airport, metar in current_conditions.items():
                raw_metar = metar.get('rawOb', '').upper()

                # Check for severe conditions
                if any(severe in raw_metar for severe in ['TS', 'FZRA', '+SN']):
                    assessment['risk_factors'].append(f'{airport}: Severe weather')
                    assessment['severity_score'] += 3

                # Check for IFR conditions
                if any(ifr in raw_metar for ifr in ['OVC', '1SM', '2SM']):
                    assessment['risk_factors'].append(f'{airport}: IFR conditions')
                    assessment['severity_score'] += 1

                # Check for strong winds
                wind_match = re.search(r'\d{3}(\d{2})(?:G(\d{2}))?KT', raw_metar)
                if wind_match:
                    wind_speed = int(wind_match.group(1))
                    gust_speed = int(wind_match.group(2)) if wind_match.group(2) else 0

                    if wind_speed > 25 or gust_speed > 35:
                        assessment['risk_factors'].append(f'{airport}: Strong winds')
                        assessment['severity_score'] += 2

            # Check hazards
            hazards = weather_data.get('hazards', {})
            if hazards.get('sigmets'):
                assessment['risk_factors'].append('Active SIGMETs')
                assessment['severity_score'] += 2

            if hazards.get('airmets'):
                assessment['risk_factors'].append('Active AIRMETs')
                assessment['severity_score'] += 1

            # Determine final assessment
            if assessment['severity_score'] >= 7:
                assessment['overall_status'] = 'NO-GO'
                assessment['confidence'] = 'HIGH'
                assessment['recommendations'].append('Do not attempt flight - severe conditions')
            elif assessment['severity_score'] >= 4:
                assessment['overall_status'] = 'CAUTION'
                assessment['confidence'] = 'MEDIUM'
                assessment['recommendations'].append('Exercise extreme caution - consider alternate plans')
            elif assessment['severity_score'] >= 2:
                assessment['overall_status'] = 'GO'
                assessment['confidence'] = 'MEDIUM'
                assessment['recommendations'].append('Proceed with caution - monitor conditions')
            else:
                assessment['overall_status'] = 'GO'
                assessment['confidence'] = 'HIGH'
                assessment['recommendations'].append('Good conditions for flight')

            return assessment

        except Exception as e:
            logger.error(f"Flight assessment error: {e}")
            return {
                'overall_status': 'UNKNOWN',
                'confidence': 'LOW',
                'risk_factors': ['Assessment error'],
                'recommendations': ['Manual weather review required'],
                'severity_score': 5
            }

    def categorize_weather_conditions(self, metar_text: str) -> Dict[str, Any]:
        """
        Categorize weather conditions as Clear, Significant, or Severe with detailed explanations
        Based on the aviation weather categorization standards
        """
        try:
            metar_upper = metar_text.upper()
            category = "Clear"
            explanation = ""
            severity_factors = []
            flight_impact = "Minimal"
            
            # Check for severe conditions first
            severe_conditions = []
            
            # Thunderstorms
            if 'TS' in metar_upper:
                severe_conditions.append("Thunderstorms present")
                severity_factors.append("Electrical activity and severe turbulence risk")
            
            # Severe turbulence indicators
            if any(x in metar_upper for x in ['G30', 'G35', 'G40', 'G45']):
                severe_conditions.append("Strong gusting winds (30+ knots)")
                severity_factors.append("Severe wind gusts affecting aircraft control")
            
            # Very low visibility (LIFR conditions)
            if any(x in metar_upper for x in ['0SM', 'M1/4SM', '1/4SM', '1/2SM']):
                severe_conditions.append("Extremely low visibility (< 1 mile)")
                severity_factors.append("Visibility below safe minimums for most operations")
            
            # Very low ceiling (LIFR)
            ceiling_match = re.search(r'(BKN|OVC)00[0-2]', metar_upper)
            if ceiling_match:
                severe_conditions.append("Extremely low ceiling (< 500 feet)")
                severity_factors.append("Ceiling below approach minimums")
            
            # Freezing precipitation
            if any(x in metar_upper for x in ['FZRA', 'FZDZ', 'FZFG']):
                severe_conditions.append("Freezing precipitation")
                severity_factors.append("Severe aircraft icing conditions")
            
            # Heavy precipitation
            if any(x in metar_upper for x in ['+RA', '+SN', '+SHSN', '+TSRA']):
                severe_conditions.append("Heavy precipitation")
                severity_factors.append("Reduced visibility and aircraft performance impact")
            
            # Severe icing conditions
            if 'ICE' in metar_upper or 'FZFG' in metar_upper:
                severe_conditions.append("Severe icing conditions")
                severity_factors.append("Critical aircraft icing hazard")
            
            # Check for significant conditions if not severe
            significant_conditions = []
            
            if not severe_conditions:
                # Moderate wind gusts
                if any(x in metar_upper for x in ['G20', 'G25']):
                    significant_conditions.append("Moderate wind gusts (20-29 knots)")
                    severity_factors.append("Increased difficulty in aircraft handling")
                
                # Reduced visibility (IFR/MVFR)
                if any(x in metar_upper for x in ['1SM', '2SM', '3SM']):
                    significant_conditions.append("Reduced visibility (1-3 miles)")
                    severity_factors.append("IFR conditions requiring instrument approach")
                
                # Low ceiling (IFR/MVFR)
                ceiling_match = re.search(r'(BKN|OVC)00[3-9]|010|015|020', metar_upper)
                if ceiling_match:
                    significant_conditions.append("Low ceiling (500-2000 feet)")
                    severity_factors.append("Restricted VFR operations")
                
                # Light to moderate precipitation
                if any(x in metar_upper for x in ['RA', 'SN', 'DZ', 'SH']):
                    if not any(x in metar_upper for x in ['+RA', '+SN', '+DZ']):
                        significant_conditions.append("Light to moderate precipitation")
                        severity_factors.append("Potential visibility reduction")
                
                # Mist, fog, or haze affecting visibility
                if any(x in metar_upper for x in ['BR', 'FG', 'HZ']):
                    significant_conditions.append("Visibility restrictions (mist/fog/haze)")
                    severity_factors.append("Reduced visibility conditions")
                
                # Crosswinds
                wind_match = re.search(r'(\d{3})(\d{2})KT', metar_upper)
                if wind_match:
                    wind_speed = int(wind_match.group(2))
                    if wind_speed >= 15:
                        significant_conditions.append(f"Strong winds ({wind_speed} knots)")
                        severity_factors.append("Challenging crosswind conditions")
            
            # Determine final category
            if severe_conditions:
                category = "Severe"
                flight_impact = "Critical"
                explanation = f"SEVERE weather conditions present: {', '.join(severe_conditions)}. "
                explanation += f"Reasons for severe classification: {'; '.join(severity_factors)}."
            elif significant_conditions:
                category = "Significant"
                flight_impact = "Moderate"
                explanation = f"SIGNIFICANT weather conditions present: {', '.join(significant_conditions)}. "
                explanation += f"Reasons for significant classification: {'; '.join(severity_factors)}."
            else:
                category = "Clear"
                flight_impact = "Minimal"
                explanation = "CLEAR weather conditions - no significant weather phenomena affecting flight operations. VFR conditions with good visibility and manageable winds."
            
            return {
                'category': category,
                'explanation': explanation,
                'flight_impact': flight_impact,
                'severity_factors': severity_factors,
                'conditions_present': severe_conditions + significant_conditions,
                'raw_metar': metar_text
            }
            
        except Exception as e:
            return {
                'category': 'Unknown',
                'explanation': f'Weather categorization failed: {str(e)}',
                'flight_impact': 'Unknown',
                'severity_factors': ['Processing error'],
                'conditions_present': [],
                'raw_metar': metar_text
            }

    def enhanced_route_weather_summary(self, departure: str, arrival: str, altitude: str, 
                                     departure_metar: str = None, arrival_metar: str = None) -> Dict[str, Any]:
        """
        Generate comprehensive route weather summary with categorization
        Includes from/to locations, altitude considerations, and weather categorization
        """
        try:
            summary_data = {
                'route': f"{departure} → {arrival}",
                'altitude': altitude,
                'departure_analysis': {},
                'arrival_analysis': {},
                'route_analysis': {},
                'overall_assessment': {},
                'recommendations': []
            }
            
            # Analyze departure weather
            if departure_metar:
                dep_category = self.categorize_weather_conditions(departure_metar)
                summary_data['departure_analysis'] = {
                    'airport': departure,
                    'category': dep_category['category'],
                    'explanation': dep_category['explanation'],
                    'flight_impact': dep_category['flight_impact'],
                    'metar_summary': self._enhanced_pilot_metar_summary(departure_metar)
                }
            else:
                summary_data['departure_analysis'] = {
                    'airport': departure,
                    'category': 'Unknown',
                    'explanation': 'Current weather data required for analysis',
                    'flight_impact': 'Unknown'
                }
            
            # Analyze arrival weather
            if arrival_metar:
                arr_category = self.categorize_weather_conditions(arrival_metar)
                summary_data['arrival_analysis'] = {
                    'airport': arrival,
                    'category': arr_category['category'],
                    'explanation': arr_category['explanation'],
                    'flight_impact': arr_category['flight_impact'],
                    'metar_summary': self._enhanced_pilot_metar_summary(arrival_metar)
                }
            else:
                summary_data['arrival_analysis'] = {
                    'airport': arrival,
                    'category': 'Unknown',
                    'explanation': 'Forecast weather data recommended for analysis',
                    'flight_impact': 'Unknown'
                }
            
            # Analyze altitude-specific factors
            flight_level = self._extract_flight_level(altitude)
            altitude_analysis = {}
            
            if flight_level >= 18000:  # High altitude
                altitude_analysis = {
                    'level': 'High Altitude',
                    'considerations': [
                        'Monitor jet stream winds and clear air turbulence',
                        'Potential for severe turbulence in jet stream areas',
                        'Temperature inversions and wind shear possible',
                        'Reduced oxygen - pressurization critical'
                    ],
                    'weather_factors': ['Jet stream effects', 'CAT risk', 'Wind patterns'],
                    'flight_impact': 'Monitor winds aloft forecasts and turbulence reports'
                }
            elif flight_level >= 10000:  # Medium altitude
                altitude_analysis = {
                    'level': 'Medium Altitude',
                    'considerations': [
                        'Transition between surface and high-level weather systems',
                        'Potential for moderate turbulence',
                        'Cloud layers and icing conditions possible',
                        'Weather system interactions'
                    ],
                    'weather_factors': ['Cloud layers', 'Moderate turbulence', 'Icing potential'],
                    'flight_impact': 'Monitor pireps and weather system movement'
                }
            else:  # Low altitude
                altitude_analysis = {
                    'level': 'Low Altitude',
                    'considerations': [
                        'Surface weather strongly influences flight conditions',
                        'Terrain effects on winds and weather',
                        'Local weather phenomena impact',
                        'Visibility and ceiling restrictions critical'
                    ],
                    'weather_factors': ['Surface weather', 'Terrain effects', 'Local phenomena'],
                    'flight_impact': 'Surface weather conditions are primary concern'
                }
            
            summary_data['route_analysis'] = {
                'altitude_info': altitude_analysis,
                'enroute_considerations': f"Flight at {altitude} ({altitude_analysis['level']})"
            }
            
            # Overall assessment
            dep_cat = summary_data['departure_analysis'].get('category', 'Unknown')
            arr_cat = summary_data['arrival_analysis'].get('category', 'Unknown')
            
            # Determine overall category (worst case between departure and arrival)
            if 'Severe' in [dep_cat, arr_cat]:
                overall_cat = 'Severe'
                overall_impact = 'Critical - Flight operations significantly impacted'
            elif 'Significant' in [dep_cat, arr_cat]:
                overall_cat = 'Significant'
                overall_impact = 'Moderate - Enhanced planning and monitoring required'
            elif 'Clear' in [dep_cat, arr_cat] and 'Unknown' not in [dep_cat, arr_cat]:
                overall_cat = 'Clear'
                overall_impact = 'Minimal - Standard flight operations'
            else:
                overall_cat = 'Assessment Required'
                overall_impact = 'Weather data needed for proper assessment'
            
            summary_data['overall_assessment'] = {
                'category': overall_cat,
                'impact': overall_impact,
                'departure_status': f"{departure}: {dep_cat}",
                'arrival_status': f"{arrival}: {arr_cat}",
                'route_status': f"Altitude: {altitude} - {altitude_analysis['level']}"
            }
            
            # Generate recommendations
            recommendations = []
            if overall_cat == 'Severe':
                recommendations.extend([
                    'Consider delaying or canceling flight due to severe weather conditions',
                    'If proceeding, ensure alternate airports and extra fuel',
                    'Monitor weather updates continuously',
                    'Brief passengers on potential severe turbulence'
                ])
            elif overall_cat == 'Significant':
                recommendations.extend([
                    'File IFR flight plan as backup even for VFR flight',
                    'Monitor weather conditions and have alternate plans',
                    'Brief crew and passengers on weather conditions',
                    'Ensure adequate fuel for possible diversions'
                ])
            else:
                recommendations.extend([
                    'Standard flight planning procedures apply',
                    'Monitor routine weather updates',
                    'Standard fuel and alternate planning'
                ])
            
            # Add altitude-specific recommendations
            recommendations.extend(altitude_analysis.get('considerations', [])[:2])
            summary_data['recommendations'] = recommendations
            
            return summary_data
            
        except Exception as e:
            return {
                'route': f"{departure} → {arrival}",
                'altitude': altitude,
                'error': f"Route analysis failed: {str(e)}",
                'overall_assessment': {
                    'category': 'Analysis Error',
                    'impact': 'Manual weather review required'
                },
                'recommendations': ['Obtain weather briefing through alternate means']
            }

    def _extract_flight_level(self, altitude_str: str) -> int:
        """Extract numeric altitude from altitude string"""
        try:
            altitude_upper = altitude_str.upper().replace(" ", "")
            
            if altitude_upper.startswith("FL"):
                fl_num = int(altitude_upper[2:])
                return fl_num * 100
            elif altitude_upper.endswith("FT"):
                return int(altitude_upper[:-2])
            elif altitude_upper.isdigit():
                return int(altitude_upper)
            else:
                return 10000
        except (ValueError, IndexError):
            return 10000
