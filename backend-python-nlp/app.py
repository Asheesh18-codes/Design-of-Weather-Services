from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union
import logging
import os
from dotenv import load_dotenv
import uvicorn

# Import our custom modules
from nlp.notam_parser import NOTAMParser
from nlp.summary_model import WeatherSummarizer
from nlp.aviation_weather_api import AviationWeatherAPI

# Load environment variables from root directory .env.example file
load_dotenv(dotenv_path="../.env.example")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Weather NLP Microservice",
    description="HuggingFace-powered NOTAM parsing and weather summarization service",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services with lazy loading
weather_summarizer = None
notam_parser = None
aviation_api = None

def get_weather_summarizer():
    """Get or initialize weather summarizer with HuggingFace/Llama models"""
    global weather_summarizer
    if weather_summarizer is None:
        try:
            # Try HuggingFace first, then Llama, then fallback
            hf_token = os.getenv("HF_TOKEN")
            groq_api_key = os.getenv("GROQ_API_KEY")
            
            if hf_token:
                weather_summarizer = WeatherSummarizer(
                    model="sshleifer/distilbart-cnn-12-6",
                    provider="huggingface"
                )
                logger.info("✅ WeatherSummarizer initialized with HuggingFace")
            elif groq_api_key:
                weather_summarizer = WeatherSummarizer(
                    model="llama3-8b-8192",
                    provider="llama"
                )
                logger.info("✅ WeatherSummarizer initialized with Llama/GROQ")
            else:
                weather_summarizer = WeatherSummarizer(provider="fallback")
                logger.info("✅ WeatherSummarizer initialized (fallback mode)")
                
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize WeatherSummarizer: {e}")
            weather_summarizer = WeatherSummarizer(provider="fallback")
            logger.info("✅ WeatherSummarizer initialized (fallback mode)")
    return weather_summarizer

def get_notam_parser():
    """Get or initialize NOTAM parser"""
    global notam_parser
    if notam_parser is None:
        try:
            notam_parser = NOTAMParser()
            logger.info("✅ NOTAMParser initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize NOTAMParser: {e}")
            # Return a minimal parser or raise error
            raise e
    return notam_parser

def get_aviation_api():
    """Get or initialize Aviation Weather API client"""
    global aviation_api
    if aviation_api is None:
        try:
            aviation_api = AviationWeatherAPI()
            logger.info("✅ AviationWeatherAPI initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ Failed to initialize AviationWeatherAPI: {e}")
            raise e
    return aviation_api

# Pydantic models for request/response
class NOTAMRequest(BaseModel):
    notam_text: str
    airport_code: Optional[str] = None

class WeatherSummaryRequest(BaseModel):
    weather_data: Dict[str, Any]
    route_info: Optional[Dict[str, Any]] = None
    max_length: Optional[int] = 300
    min_length: Optional[int] = 50

class FlightBriefingRequest(BaseModel):
    route_info: Dict[str, Any]
    weather_data: Dict[str, Any]
    notams: Optional[List[Dict]] = None

class METARExplanationRequest(BaseModel):
    metar_text: str

class QuickSummaryRequest(BaseModel):
    departure: str
    arrival: str
    weather_conditions: List[str]
    flight_level: Optional[str] = "FL350"

class FlightAssessmentRequest(BaseModel):
    weather_data: Dict[str, Any]

class ComprehensiveBriefingRequest(BaseModel):
    weather_data: Dict[str, Any]
    route_info: Optional[Dict[str, Any]] = None

class ReportSummaryRequest(BaseModel):
    report_data: Any  # Can be text, dict, or list
    report_type: str  # 'metar', 'taf', 'pirep', 'sigmet', 'airmet', 'notam'
    max_length: Optional[int] = 200

class WeatherHighlightsRequest(BaseModel):
    weather_data: Dict[str, Any]

# Aviation Weather API Request Models
class StationWeatherRequest(BaseModel):
    stations: Union[str, List[str]]
    hours: Optional[int] = 3
    decoded: Optional[bool] = True

class PIREPRequest(BaseModel):
    stations: Optional[Union[str, List[str]]] = None
    hours: Optional[int] = 6
    age: Optional[int] = 6
    distance: Optional[int] = 100  # Radial distance in nautical miles

class SIGMETRequest(BaseModel):
    hazard: Optional[str] = None  # 'convective', 'non_convective', 'outlook'
    level: Optional[str] = 'low'  # 'low' or 'high'

class AIRMETRequest(BaseModel):
    hazard: Optional[str] = None  # 'sierra', 'tango', 'zulu'

class RouteWeatherRequest(BaseModel):
    departure: str  # Airport code (e.g., "KJFK")
    arrival: str    # Airport code (e.g., "KLAX") 
    altitude: Optional[str] = "FL350"  # Flight level (e.g., "FL350", "8000ft")
    metar_override: Optional[str] = None  # Optional METAR text to include
    include_enroute: Optional[bool] = True  # Include enroute weather
    max_summary_length: Optional[int] = 300

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Weather NLP Microservice",
        "models_loaded": {
            "weather_summarizer": weather_summarizer is not None,
            "notam_parser": notam_parser is not None
        }
    }

# NOTAM parsing endpoint
@app.post("/parse-notam")
async def parse_notam(request: NOTAMRequest):
    """
    Parse NOTAM text and extract structured information
    
    Returns structured JSON with parsed NOTAM components
    """
    try:
        parser = get_notam_parser()
        parsed_notam = parser.parse(request.notam_text, request.airport_code)
        
        return {
            "success": True,
            "data": parsed_notam,
            "message": "NOTAM parsed successfully"
        }
    
    except Exception as e:
        logger.error(f"NOTAM parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"NOTAM parsing failed: {str(e)}")

# Weather/NOTAM summarization endpoint
@app.post("/summarize")
async def summarize_weather(request: WeatherSummaryRequest):
    """
    Summarize weather data using HuggingFace models
    
    Returns AI-generated summary of weather conditions
    """
    try:
        summarizer = get_weather_summarizer()
        
        # Convert weather data to text for summarization
        weather_text = _format_weather_for_summary(request.weather_data)
        
        summary = summarizer.summarize(
            weather_text,
            max_length=request.max_length,
            min_length=request.min_length
        )
        
        return {
            "success": True,
            "data": {
                "summary": summary,
                "original_length": len(weather_text),
                "summary_length": len(summary)
            },
            "message": "Weather summarized successfully"
        }
    
    except Exception as e:
        logger.error(f"Weather summarization error: {e}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

# Flight briefing generation endpoint
@app.post("/flight-briefing")
async def generate_flight_briefing(request: FlightBriefingRequest):
    """
    Generate comprehensive flight weather briefing
    
    Returns formatted flight briefing with AI-enhanced summary
    """
    try:
        summarizer = get_weather_summarizer()
        
        briefing = summarizer.generate_flight_briefing(
            request.route_info,
            request.weather_data,
            request.notams
        )
        
        return {
            "success": True,
            "data": {
                "briefing": briefing,
                "route": f"{request.route_info.get('departure', 'N/A')} → {request.route_info.get('arrival', 'N/A')}",
                "generated_at": briefing.split('\n')[1] if '\n' in briefing else "Unknown"
            },
            "message": "Flight briefing generated successfully"
        }
    
    except Exception as e:
        logger.error(f"Flight briefing error: {e}")
        raise HTTPException(status_code=500, detail=f"Briefing generation failed: {str(e)}")

# METAR explanation endpoint
@app.post("/explain-metar")
async def explain_metar(request: METARExplanationRequest):
    """
    Explain METAR in plain English
    
    Returns human-readable explanation of METAR code
    """
    try:
        summarizer = get_weather_summarizer()
        
        explanation = summarizer.explain_metar(request.metar_text)
        
        return {
            "success": True,
            "data": {
                "explanation": explanation,
                "original_metar": request.metar_text
            },
            "message": "METAR explained successfully"
        }
    
    except Exception as e:
        logger.error(f"METAR explanation error: {e}")
        raise HTTPException(status_code=500, detail=f"METAR explanation failed: {str(e)}")

# Quick weather summary endpoint
@app.post("/quick-summary")
async def quick_weather_summary(request: QuickSummaryRequest):
    """
    Generate quick weather summary for route planning
    
    Returns concise weather assessment for flight planning
    """
    try:
        summarizer = get_weather_summarizer()
        
        summary = summarizer.generate_quick_summary(
            request.departure,
            request.arrival,
            request.weather_conditions,
            request.flight_level
        )
        
        return {
            "success": True,
            "data": {
                "summary": summary,
                "route": f"{request.departure} → {request.arrival}",
                "flight_level": request.flight_level
            },
            "message": "Quick summary generated successfully"
        }
    
    except Exception as e:
        logger.error(f"Quick summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Quick summary generation failed: {str(e)}")

# Flight conditions assessment endpoint
@app.post("/assess-conditions")
async def assess_flight_conditions(request: FlightAssessmentRequest):
    """
    Assess overall flight conditions and provide go/no-go recommendation
    
    Returns flight safety assessment with recommendations
    """
    try:
        summarizer = get_weather_summarizer()
        
        assessment = summarizer.assess_flight_conditions(request.weather_data)
        
        return {
            "success": True,
            "data": assessment,
            "message": "Flight conditions assessed successfully"
        }
    
    except Exception as e:
        logger.error(f"Flight assessment error: {e}")
        raise HTTPException(status_code=500, detail=f"Flight assessment failed: {str(e)}")

# Comprehensive briefing endpoint
@app.post("/comprehensive-briefing")
async def generate_comprehensive_briefing(request: ComprehensiveBriefingRequest):
    """
    Generate comprehensive flight briefing from all weather report types
    
    Processes METARs, TAFs, PIREPs, SIGMETs, AIRMETs, and NOTAMs into a complete briefing
    """
    try:
        summarizer = get_weather_summarizer()
        
        briefing = summarizer.generate_comprehensive_briefing(
            request.weather_data,
            request.route_info
        )
        
        # Get additional highlights
        highlights = summarizer.get_weather_highlights(request.weather_data)
        
        return {
            "success": True,
            "data": {
                "briefing": briefing,
                "highlights": highlights,
                "route": f"{request.route_info.get('departure', 'N/A')} → {request.route_info.get('arrival', 'N/A')}" if request.route_info else "General briefing",
                "generated_at": briefing.split('\n')[1] if '\n' in briefing else "Unknown"
            },
            "message": "Comprehensive briefing generated successfully"
        }
    
    except Exception as e:
        logger.error(f"Comprehensive briefing error: {e}")
        raise HTTPException(status_code=500, detail=f"Comprehensive briefing generation failed: {str(e)}")

# Universal report summarizer endpoint
@app.post("/summarize-report")
async def summarize_report(request: ReportSummaryRequest):
    """
    Summarize any type of aviation weather report
    
    Supports: METAR, TAF, PIREP, SIGMET, AIRMET, NOTAM
    """
    try:
        summarizer = get_weather_summarizer()
        
        summary = summarizer.summarize_report(
            request.report_data,
            request.report_type,
            request.max_length
        )
        
        return {
            "success": True,
            "data": {
                "summary": summary,
                "report_type": request.report_type.upper(),
                "original_data": request.report_data
            },
            "message": f"{request.report_type.upper()} summarized successfully"
        }
    
    except Exception as e:
        logger.error(f"Report summarization error: {e}")
        raise HTTPException(status_code=500, detail=f"Report summarization failed: {str(e)}")

# Weather highlights endpoint
@app.post("/weather-highlights")
async def get_weather_highlights(request: WeatherHighlightsRequest):
    """
    Extract key weather highlights for dashboard display
    
    Returns condensed weather information for quick assessment
    """
    try:
        summarizer = get_weather_summarizer()
        
        highlights = summarizer.get_weather_highlights(request.weather_data)
        
        return {
            "success": True,
            "data": highlights,
            "message": "Weather highlights extracted successfully"
        }
    
    except Exception as e:
        logger.error(f"Weather highlights error: {e}")
        raise HTTPException(status_code=500, detail=f"Weather highlights extraction failed: {str(e)}")

# Batch report processing endpoint
@app.post("/batch-summarize")
async def batch_summarize_reports(reports: List[Dict[str, Any]]):
    """
    Process multiple reports of different types in a single request
    
    Expected format: [{"data": ..., "type": "metar"}, {"data": ..., "type": "taf"}, ...]
    """
    try:
        summarizer = get_weather_summarizer()
        
        results = []
        
        for i, report in enumerate(reports):
            try:
                report_data = report.get('data')
                report_type = report.get('type', 'unknown')
                max_length = report.get('max_length', 200)
                
                summary = summarizer.summarize_report(
                    report_data,
                    report_type,
                    max_length
                )
                
                results.append({
                    "index": i,
                    "type": report_type,
                    "summary": summary,
                    "success": True
                })
                
            except Exception as e:
                logger.error(f"Batch processing error for report {i}: {e}")
                results.append({
                    "index": i,
                    "type": report.get('type', 'unknown'),
                    "error": str(e),
                    "success": False
                })
        
        success_count = sum(1 for r in results if r['success'])
        
        return {
            "success": True,
            "data": {
                "results": results,
                "total_processed": len(reports),
                "successful": success_count,
                "failed": len(reports) - success_count
            },
            "message": f"Batch processing completed: {success_count}/{len(reports)} successful"
        }
    
    except Exception as e:
        logger.error(f"Batch summarization error: {e}")
        raise HTTPException(status_code=500, detail=f"Batch summarization failed: {str(e)}")

# Simplified flight planning endpoint for main web page
@app.post("/flight-weather-brief")
async def get_flight_weather_brief(
    departure: str, 
    arrival: str, 
    altitude: str = "FL350",
    metar: Optional[str] = None
):
    """
    Simplified endpoint for main web page pilot form
    
    Takes basic flight info and returns concise weather briefing
    Perfect for the main webpage where pilots enter FROM/TO/ALTITUDE
    """
    try:
        summarizer = get_weather_summarizer()
        
        # Create request object
        request_data = RouteWeatherRequest(
            departure=departure.upper(),
            arrival=arrival.upper(), 
            altitude=altitude,
            metar_override=metar,
            include_enroute=True,
            max_summary_length=250
        )
        
        # Generate route summary
        route_summary = await _generate_route_weather_summary(
            request_data.departure,
            request_data.arrival,
            request_data.altitude, 
            request_data.metar_override,
            request_data.include_enroute,
            request_data.max_summary_length,
            summarizer
        )
        
        # Format for simple display
        brief_response = {
            "route": f"{departure.upper()} → {arrival.upper()}",
            "altitude": altitude,
            "weather_brief": route_summary["summary"],
            "flight_conditions": route_summary["flight_category"],
            "key_points": route_summary["conditions"][:3],  # Top 3 points
            "recommendation": route_summary["recommendations"][0] if route_summary["recommendations"] else "Standard procedures apply",
            "hazards_present": len(route_summary["hazards"]) > 0,
            "hazard_summary": ", ".join(route_summary["hazards"]) if route_summary["hazards"] else "None identified"
        }
        
        return {
            "success": True,
            "data": brief_response,
            "message": "Flight weather briefing generated"
        }
        
    except Exception as e:
        logger.error(f"Flight weather brief error: {e}")
        # Provide fallback response
        return {
            "success": False,
            "data": {
                "route": f"{departure.upper()} → {arrival.upper()}",
                "altitude": altitude,
                "weather_brief": f"Weather briefing for flight from {departure.upper()} to {arrival.upper()} at {altitude}. Please review current weather conditions manually due to system error.",
                "flight_conditions": "UNKNOWN",
                "key_points": ["Manual weather review required", "Contact FSS for briefing", "Check NOTAMs independently"],
                "recommendation": "Obtain weather briefing through alternate means",
                "hazards_present": True,
                "hazard_summary": "System error - manual verification required"
            },
            "error": str(e),
            "message": "Weather briefing system error - use backup methods"
        }

# Route-based weather summary endpoint for pilot flight planning
@app.post("/route-weather-summary")
async def get_route_weather_summary(request: RouteWeatherRequest):
    """
    Generate weather summary for flight route from departure to arrival
    
    This is the main endpoint for pilots to get weather briefing by entering:
    - Departure airport (FROM)
    - Arrival airport (TO) 
    - Flight altitude
    - Optional METAR override
    
    Returns concise weather conditions along the flight path
    """
    try:
        summarizer = get_weather_summarizer()
        
        # Generate route-specific weather summary
        route_summary = await _generate_route_weather_summary(
            request.departure,
            request.arrival, 
            request.altitude,
            request.metar_override,
            request.include_enroute,
            request.max_summary_length,
            summarizer
        )
        
        return {
            "success": True,
            "data": {
                "route": f"{request.departure} → {request.arrival}",
                "altitude": request.altitude,
                "summary": route_summary["summary"],
                "conditions": route_summary["conditions"],
                "recommendations": route_summary["recommendations"],
                "hazards": route_summary["hazards"],
                "flight_category": route_summary["flight_category"],
                "confidence": route_summary["confidence"]
            },
            "message": "Route weather summary generated successfully"
        }
    
    except Exception as e:
        logger.error(f"Route weather summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Route weather summary failed: {str(e)}")

async def _generate_route_weather_summary(
    departure: str, 
    arrival: str, 
    altitude: str,
    metar_override: Optional[str],
    include_enroute: bool,
    max_length: int,
    summarizer
) -> Dict[str, Any]:
    """
    Generate comprehensive route weather summary
    
    This simulates fetching weather data for the route and provides intelligent analysis
    """
    try:
        route_weather = {
            "summary": "",
            "conditions": [],
            "recommendations": [],
            "hazards": [],
            "flight_category": "VFR",
            "confidence": "HIGH"
        }
        
        # Build route description
        route_desc = f"Flight from {departure} to {arrival} at {altitude}"
        
        # Process departure weather
        departure_conditions = []
        if metar_override:
            # Use pilot-provided METAR
            metar_summary = summarizer.summarize_metar(metar_override)
            departure_conditions.append(f"Departure ({departure}): {metar_summary}")
            
            # Analyze flight category from METAR
            metar_upper = metar_override.upper()
            if any(vfr in metar_upper for vfr in ['10SM', 'P6SM', '9999', 'CLR', 'SKC']):
                route_weather["flight_category"] = "VFR"
            elif any(ifr in metar_upper for ifr in ['OVC', '1SM', '2SM']):
                route_weather["flight_category"] = "IFR" 
            else:
                route_weather["flight_category"] = "MVFR"
                
            # Check for hazards in METAR
            if 'TS' in metar_upper:
                route_weather["hazards"].append("Thunderstorms at departure")
            if any(wind in metar_upper for wind in ['G25', 'G30', 'G35']):
                route_weather["hazards"].append("Strong winds at departure")
            if 'FG' in metar_upper or 'BR' in metar_upper:
                route_weather["hazards"].append("Reduced visibility at departure")
        else:
            # Simulate typical conditions for departure airport
            departure_conditions.append(f"Departure ({departure}): Current conditions require review")
        
        # Simulate arrival conditions
        arrival_conditions = []
        arrival_conditions.append(f"Arrival ({arrival}): Forecast conditions require review")
        
        # Simulate enroute conditions if requested
        enroute_conditions = []
        if include_enroute:
            # Extract flight level for altitude-specific analysis
            flight_level = _extract_flight_level(altitude)
            
            if flight_level >= 18000:  # Above 18,000 ft
                enroute_conditions.append(f"High altitude flight ({altitude}): Monitor jet stream winds")
                enroute_conditions.append("Potential for moderate turbulence in jet stream")
            elif flight_level >= 10000:  # 10,000 - 18,000 ft
                enroute_conditions.append(f"Mid-level flight ({altitude}): Standard enroute conditions expected")
            else:  # Below 10,000 ft
                enroute_conditions.append(f"Low altitude flight ({altitude}): Monitor surface weather influence")
        
        # Combine all conditions
        all_conditions = departure_conditions + arrival_conditions + enroute_conditions
        route_weather["conditions"] = all_conditions
        
        # Generate recommendations based on analysis
        recommendations = []
        if route_weather["flight_category"] == "IFR":
            recommendations.append("IFR flight rules required - file IFR flight plan")
            recommendations.append("Monitor weather minimums at destination")
        elif route_weather["flight_category"] == "MVFR":
            recommendations.append("MVFR conditions - consider IFR flight plan as backup")
        else:
            recommendations.append("VFR conditions favorable for flight")
        
        if route_weather["hazards"]:
            recommendations.append("Monitor weather updates due to identified hazards")
        else:
            recommendations.append("No significant weather hazards identified")
        
        # Add altitude-specific recommendations
        flight_level = _extract_flight_level(altitude)
        if flight_level >= 18000:
            recommendations.append("Monitor winds aloft and turbulence reports")
            
        route_weather["recommendations"] = recommendations
        
        # Create comprehensive summary text
        summary_parts = [
            f"ROUTE WEATHER BRIEFING: {route_desc}",
            f"Overall Conditions: {route_weather['flight_category']}",
        ]
        
        if route_weather["hazards"]:
            summary_parts.append(f"Weather Hazards: {', '.join(route_weather['hazards'])}")
        
        summary_parts.extend([
            f"Departure: {departure_conditions[0].split(': ', 1)[1] if departure_conditions else 'Conditions require review'}",
            f"Arrival: {arrival_conditions[0].split(': ', 1)[1] if arrival_conditions else 'Forecast requires review'}",
        ])
        
        if enroute_conditions:
            summary_parts.append(f"Enroute: {len(enroute_conditions)} factors to monitor")
        
        summary_parts.append(f"Primary Recommendation: {recommendations[0] if recommendations else 'Standard flight procedures'}")
        
        # Try AI enhancement if available
        base_summary = " • ".join(summary_parts)
        try:
            if summarizer.provider != "fallback":
                ai_summary = summarizer.summarize(
                    f"Create a concise flight weather briefing: {base_summary}. Focus on safety and key decisions for pilots.",
                    max_length=max_length
                )
                if ai_summary and not ai_summary.startswith("❌"):
                    route_weather["summary"] = ai_summary
                else:
                    route_weather["summary"] = base_summary
            else:
                route_weather["summary"] = base_summary
        except Exception as e:
            logger.error(f"AI summary enhancement failed: {e}")
            route_weather["summary"] = base_summary
        
        return route_weather
        
    except Exception as e:
        logger.error(f"Route weather generation error: {e}")
        # Return minimal fallback response
        return {
            "summary": f"Weather briefing for {departure} to {arrival} at {altitude}. Manual weather review recommended due to processing error: {str(e)}",
            "conditions": [f"Route: {departure} → {arrival}", f"Altitude: {altitude}", "Weather data processing error"],
            "recommendations": ["Obtain weather briefing through alternate means", "Contact FSS for current conditions"],
            "hazards": ["Processing error - manual verification required"],
            "flight_category": "UNKNOWN",
            "confidence": "LOW"
        }

def _extract_flight_level(altitude_str: str) -> int:
    """Extract numeric altitude from altitude string"""
    try:
        # Handle different altitude formats
        altitude_upper = altitude_str.upper().replace(" ", "")
        
        if altitude_upper.startswith("FL"):
            # Flight level (FL350 = 35,000 ft)
            fl_num = int(altitude_upper[2:])
            return fl_num * 100
        elif altitude_upper.endswith("FT"):
            # Direct feet notation (8000ft)
            return int(altitude_upper[:-2])
        elif altitude_upper.isdigit():
            # Just numbers, assume feet
            return int(altitude_upper)
        else:
            # Default to mid-level if can't parse
            return 10000
    except (ValueError, IndexError):
        # Default altitude if parsing fails
        return 10000

# Utility function to format weather data for summarization
def _format_weather_for_summary(weather_data: Dict[str, Any]) -> str:
    """Convert structured weather data to text for AI summarization"""
    text_parts = []
    
    # Current conditions
    current = weather_data.get('current_conditions', {})
    if current:
        text_parts.append("CURRENT CONDITIONS:")
        for airport, metar in current.items():
            text_parts.append(f"{airport}: {metar.get('rawOb', 'No data')}")
    
    # Forecasts
    forecasts = weather_data.get('forecasts', {})
    if forecasts:
        text_parts.append("FORECASTS:")
        for airport, taf in forecasts.items():
            text_parts.append(f"{airport}: {taf.get('rawTaf', 'No forecast')}")
    
    # PIREPs
    pireps = weather_data.get('pilot_reports', [])
    if pireps:
        text_parts.append("PILOT REPORTS:")
        for i, pirep in enumerate(pireps[:3]):
            text_parts.append(f"PIREP {i+1}: {pirep.get('rawOb', pirep.get('reportText', 'No data'))}")
    
    # Hazards
    hazards = weather_data.get('hazards', {})
    if hazards:
        if hazards.get('sigmets'):
            text_parts.append(f"SIGMETS: {len(hazards['sigmets'])} active")
        if hazards.get('airmets'):
            text_parts.append(f"AIRMETS: {len(hazards['airmets'])} active")
    
    return "\n".join(text_parts) if text_parts else "No weather data available"

# ============================================================================
# AVIATION WEATHER API ENDPOINTS - Real-time data from aviationweather.gov
# ============================================================================

@app.post("/fetch-metar")
async def fetch_metar_data(request: StationWeatherRequest):
    """
    Fetch real-time METAR data from aviationweather.gov API
    
    Returns current weather observations for specified airports
    """
    try:
        api_client = get_aviation_api()
        data = api_client.fetch_metar(
            stations=request.stations,
            hours=request.hours,
            decoded=request.decoded
        )
        
        # Extract raw METAR text for AI summarization
        if data.get('success'):
            raw_texts = api_client.extract_raw_text(data, 'metar')
            data['raw_texts'] = raw_texts
            
            # Generate AI summaries
            summarizer = get_weather_summarizer()
            ai_summaries = []
            
            for raw_text in raw_texts:
                try:
                    summary = summarizer.summarize_report(raw_text, 'metar')
                    ai_summaries.append(summary)
                except Exception as e:
                    logger.warning(f"Summary generation failed for metar: {e}")
                    ai_summaries.append(f"Raw metar: {raw_text[:100]}...")
            
            data['ai_summaries'] = ai_summaries
            data['summary_count'] = len(ai_summaries)
        
        return {
            "success": True,
            "data": data,
            "message": f"METAR data fetched for {request.stations}"
        }
        
    except Exception as e:
        logger.error(f"METAR fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch METAR data: {str(e)}")

@app.post("/fetch-taf")
async def fetch_taf_data(request: StationWeatherRequest):
    """
    Fetch real-time TAF data from aviationweather.gov API
    
    Returns terminal aerodrome forecasts for specified airports
    """
    try:
        api_client = get_aviation_api()
        data = api_client.fetch_taf(
            stations=request.stations,
            hours=request.hours,
            decoded=request.decoded
        )
        
        # Extract raw TAF text for AI summarization
        if data.get('success'):
            raw_texts = api_client.extract_raw_text(data, 'taf')
            data['raw_texts'] = raw_texts
            
            # Generate AI summaries
            summarizer = get_weather_summarizer()
            ai_summaries = []
            
            for raw_text in raw_texts:
                try:
                    summary = summarizer.summarize_report(raw_text, 'taf')
                    ai_summaries.append(summary)
                except Exception as e:
                    logger.warning(f"Summary generation failed for taf: {e}")
                    ai_summaries.append(f"Raw taf: {str(raw_text)[:100]}...")
            
            data['ai_summaries'] = ai_summaries
            data['summary_count'] = len(ai_summaries)
        
        return {
            "success": True,
            "data": data,
            "message": f"TAF data fetched for {request.stations}"
        }
        
    except Exception as e:
        logger.error(f"TAF fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch TAF data: {str(e)}")

@app.post("/fetch-pirep")
async def fetch_pirep_data(request: PIREPRequest):
    """
    Fetch real-time PIREP data from aviationweather.gov API
    
    Returns pilot reports for specified area or airports
    """
    try:
        api_client = get_aviation_api()
        data = api_client.fetch_pirep(
            stations=request.stations,
            hours=request.hours,
            age=request.age,
            distance=request.distance
        )
        
        # Extract raw PIREP text for AI summarization
        if data.get('success'):
            raw_texts = api_client.extract_raw_text(data, 'pirep')
            data['raw_texts'] = raw_texts
            
            # Generate AI summaries for PIREPs (if any available)
            summarizer = get_weather_summarizer()
            ai_summaries = []
            
            for raw_text in raw_texts:
                try:
                    summary = summarizer.summarize_report(raw_text, 'pirep')
                    ai_summaries.append(summary)
                except Exception as e:
                    logger.warning(f"Summary generation failed for pirep: {e}")
                    ai_summaries.append(f"Raw pirep: {str(raw_text)[:100]}...")
            
            data['ai_summaries'] = ai_summaries
            data['summary_count'] = len(ai_summaries)
        
        return {
            "success": True,
            "data": data,
            "message": f"PIREP data fetched (hours: {request.hours})"
        }
        
    except Exception as e:
        logger.error(f"PIREP fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch PIREP data: {str(e)}")

@app.post("/fetch-sigmet")
async def fetch_sigmet_data(request: SIGMETRequest):
    """
    Fetch real-time SIGMET data from aviationweather.gov API
    
    Returns significant meteorological information
    """
    try:
        api_client = get_aviation_api()
        data = api_client.fetch_sigmet(
            hazard=request.hazard,
            level=request.level
        )
        
        # Extract raw SIGMET text for AI summarization
        if data.get('success'):
            raw_texts = api_client.extract_raw_text(data, 'sigmet')
            data['raw_texts'] = raw_texts
            
            # Generate AI summaries for SIGMETs
            summarizer = get_weather_summarizer()
            ai_summaries = []
            
            for raw_text in raw_texts:
                try:
                    summary = summarizer.summarize_report(raw_text, 'sigmet')
                    ai_summaries.append(summary)
                except Exception as e:
                    logger.warning(f"Summary generation failed for sigmet: {e}")
                    ai_summaries.append(f"Raw sigmet: {str(raw_text)[:100]}...")
            
            data['ai_summaries'] = ai_summaries
            data['summary_count'] = len(ai_summaries)
        
        return {
            "success": True,
            "data": data,
            "message": f"SIGMET data fetched (level: {request.level})"
        }
        
    except Exception as e:
        logger.error(f"SIGMET fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch SIGMET data: {str(e)}")

@app.post("/fetch-airmet")
async def fetch_airmet_data(request: AIRMETRequest):
    """
    Fetch real-time AIRMET data from aviationweather.gov API
    
    Returns airmen's meteorological information
    """
    try:
        api_client = get_aviation_api()
        data = api_client.fetch_airmet(hazard=request.hazard)
        
        # Extract raw AIRMET text for AI summarization
        if data.get('success'):
            raw_texts = api_client.extract_raw_text(data, 'airmet')
            data['raw_texts'] = raw_texts
            
            # Generate AI summaries for AIRMETs
            summarizer = get_weather_summarizer()
            ai_summaries = []
            
            for raw_text in raw_texts:
                try:
                    summary = summarizer.summarize_report(raw_text, 'airmet')
                    ai_summaries.append(summary)
                except Exception as e:
                    logger.warning(f"Summary generation failed for airmet: {e}")
                    ai_summaries.append(f"Raw airmet: {str(raw_text)[:100]}...")
            
            data['ai_summaries'] = ai_summaries
            data['summary_count'] = len(ai_summaries)
        
        return {
            "success": True,
            "data": data,
            "message": f"AIRMET data fetched (hazard: {request.hazard or 'all'})"
        }
        
    except Exception as e:
        logger.error(f"AIRMET fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch AIRMET data: {str(e)}")

# NOTAM API endpoint removed - using local parser only

@app.post("/fetch-comprehensive-weather")
async def fetch_comprehensive_weather_data(departure: str, arrival: str, enroute: List[str] = None):
    """
    Fetch comprehensive weather data for a flight route from aviationweather.gov API
    
    Returns weather data types (METAR, TAF, PIREP, SIGMET, AIRMET) - NOTAM uses local parser
    """
    try:
        api_client = get_aviation_api()
        data = api_client.fetch_comprehensive_weather(
            departure=departure,
            arrival=arrival,
            enroute_stations=enroute or []
        )
        
        # Process and enhance data with summaries
        if data.get('route'):
            summarizer = get_weather_summarizer()
            
            # Add AI summaries for each data type (excluding NOTAM - using local parser)
            for data_type in ['metar', 'taf', 'pirep', 'sigmet', 'airmet']:
                if data.get(data_type, {}).get('success'):
                    raw_texts = api_client.extract_raw_text(data[data_type], data_type)
                    if raw_texts:
                        # Generate AI summaries for each raw text
                        summaries = []
                        for text in raw_texts[:5]:  # Limit to first 5 items
                            try:
                                summary = summarizer.summarize_report(text, data_type, max_length=150)
                                summaries.append(summary)
                            except Exception as e:
                                logger.warning(f"Summary generation failed for {data_type}: {e}")
                                summaries.append(f"Raw {data_type}: {text[:100]}...")
                        
                        data[data_type]['ai_summaries'] = summaries
        
        return {
            "success": True,
            "data": data,
            "message": f"Comprehensive weather data fetched for route {departure} -> {arrival}"
        }
        
    except Exception as e:
        logger.error(f"Comprehensive weather fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch comprehensive weather: {str(e)}")

@app.get("/api-status")
async def check_aviation_api_status():
    """
    Check Aviation Weather API availability and response times
    
    Returns status of all aviationweather.gov endpoints
    """
    try:
        api_client = get_aviation_api()
        status = api_client.get_api_status()
        
        return {
            "success": True,
            "data": status,
            "message": "Aviation Weather API status checked"
        }
        
    except Exception as e:
        logger.error(f"API status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check API status: {str(e)}")

# ============================================================================
# ENHANCED WEATHER CATEGORIZATION ENDPOINTS
# ============================================================================

class WeatherCategorizationRequest(BaseModel):
    metar_text: str

class EnhancedRouteWeatherRequest(BaseModel):
    departure: str
    arrival: str
    altitude: str
    departure_metar: Optional[str] = None
    arrival_metar: Optional[str] = None

@app.post("/categorize-weather")
async def categorize_weather_conditions(request: WeatherCategorizationRequest):
    """
    Categorize weather conditions as Clear, Significant, or Severe with detailed explanations
    
    Returns categorization based on aviation weather standards with reasons for classification
    """
    try:
        summarizer = get_weather_summarizer()
        categorization = summarizer.categorize_weather_conditions(request.metar_text)
        
        return {
            "success": True,
            "data": categorization,
            "message": f"Weather categorized as {categorization['category']}"
        }
        
    except Exception as e:
        logger.error(f"Weather categorization error: {e}")
        raise HTTPException(status_code=500, detail=f"Weather categorization failed: {str(e)}")

@app.post("/enhanced-route-weather")
async def enhanced_route_weather_analysis(request: EnhancedRouteWeatherRequest):
    """
    Generate comprehensive route weather analysis with categorization
    
    Includes from/to locations, altitude considerations, and detailed weather categorization
    for both departure and arrival airports with specific explanations
    """
    try:
        summarizer = get_weather_summarizer()
        analysis = summarizer.enhanced_route_weather_summary(
            departure=request.departure,
            arrival=request.arrival,
            altitude=request.altitude,
            departure_metar=request.departure_metar,
            arrival_metar=request.arrival_metar
        )
        
        return {
            "success": True,
            "data": analysis,
            "message": f"Enhanced route analysis completed for {request.departure} → {request.arrival}"
        }
        
    except Exception as e:
        logger.error(f"Enhanced route analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Enhanced route analysis failed: {str(e)}")

@app.post("/batch-categorize-weather")
async def batch_categorize_weather(airports_weather: List[Dict[str, str]]):
    """
    Batch categorize weather conditions for multiple airports
    
    Expected format: [{"airport": "KSFO", "metar": "METAR KSFO ..."}, ...]
    Returns categorization table similar to the provided example
    """
    try:
        summarizer = get_weather_summarizer()
        results = []
        
        for airport_data in airports_weather:
            airport = airport_data.get('airport', 'Unknown')
            metar = airport_data.get('metar', '')
            
            if metar:
                try:
                    categorization = summarizer.categorize_weather_conditions(metar)
                    weather_summary = summarizer._enhanced_pilot_metar_summary(metar)
                    
                    results.append({
                        'airport': airport,
                        'weather_summary': weather_summary,
                        'category': categorization['category'],
                        'explanation': categorization['explanation'],
                        'flight_impact': categorization['flight_impact'],
                        'conditions_present': categorization['conditions_present'],
                        'raw_metar': metar
                    })
                except Exception as e:
                    results.append({
                        'airport': airport,
                        'weather_summary': f'Analysis failed: {str(e)}',
                        'category': 'Error',
                        'explanation': 'Processing error occurred',
                        'flight_impact': 'Unknown',
                        'conditions_present': [],
                        'raw_metar': metar
                    })
            else:
                results.append({
                    'airport': airport,
                    'weather_summary': 'No METAR data provided',
                    'category': 'No Data',
                    'explanation': 'METAR required for analysis',
                    'flight_impact': 'Unknown',
                    'conditions_present': [],
                    'raw_metar': ''
                })
        
        # Generate summary statistics
        categories = [r['category'] for r in results if r['category'] not in ['Error', 'No Data']]
        category_counts = {
            'Clear': categories.count('Clear'),
            'Significant': categories.count('Significant'),
            'Severe': categories.count('Severe')
        }
        
        return {
            "success": True,
            "data": {
                "airports_analysis": results,
                "summary_statistics": category_counts,
                "total_analyzed": len([r for r in results if r['category'] not in ['Error', 'No Data']]),
                "airports_processed": len(results)
            },
            "message": f"Batch weather categorization completed for {len(results)} airports"
        }
        
    except Exception as e:
        logger.error(f"Batch categorization error: {e}")
        raise HTTPException(status_code=500, detail=f"Batch categorization failed: {str(e)}")

# Run the application
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
