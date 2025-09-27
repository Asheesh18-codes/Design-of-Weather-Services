from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union
import logging
import os
from dotenv import load_dotenv
import uvicorn
import json
import re
from datetime import datetime

# Import our custom modules
from nlp.notam_parser import NOTAMParser
from nlp.summary_model import WeatherSummarizer
from nlp.aviation_weather_api import AviationWeatherAPI

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Aviation Weather NLP Service",
    description="HuggingFace-powered NOTAM parsing and weather summarization service for aviation briefings",
    version="1.0.0"
)

# Enhanced CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5000",  # Node.js backend
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        os.getenv("BACKEND_URL", "http://localhost:5000")
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize services with lazy loading
weather_summarizer = None
notam_parser = None
aviation_api = None

def get_weather_summarizer():
    """Get or initialize weather summarizer with HuggingFace models"""
    global weather_summarizer
    if weather_summarizer is None:
        try:
            weather_summarizer = WeatherSummarizer()
            logger.info("WeatherSummarizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize WeatherSummarizer: {e}")
            weather_summarizer = None
    return weather_summarizer

def get_notam_parser():
    """Get or initialize NOTAM parser"""
    global notam_parser
    if notam_parser is None:
        try:
            notam_parser = NOTAMParser()
            logger.info("NOTAMParser initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize NOTAMParser: {e}")
            notam_parser = None
    return notam_parser

def get_aviation_api():
    """Get or initialize aviation weather API"""
    global aviation_api
    if aviation_api is None:
        try:
            aviation_api = AviationWeatherAPI()
            logger.info("AviationWeatherAPI initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AviationWeatherAPI: {e}")
            aviation_api = None
    return aviation_api

# Pydantic models for request/response
class NOTAMParseRequest(BaseModel):
    notam_text: str
    airport_code: Optional[str] = None

class SummarizeRequest(BaseModel):
    notam_text: Optional[str] = None
    weather_data: Optional[Dict[str, Any]] = None
    airport_code: Optional[str] = None

class NOTAMParseResponse(BaseModel):
    success: bool
    notam_id: Optional[str] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    location: Optional[str] = None
    subject: Optional[str] = None
    description: str
    coordinates: Optional[Dict[str, float]] = None
    altitude_affected: Optional[int] = None
    severity: str
    category: str
    processed_by: str = "Python NLP Service"
    processed_at: str

class SummarizeResponse(BaseModel):
    success: bool
    summary: str
    key_points: List[str]
    severity: str
    recommendations: List[str]
    processed_by: str = "Python NLP Service"
    processed_at: str

class TAFProcessRequest(BaseModel):
    taf_text: str
    icao: Optional[str] = None
    
class TAFProcessResponse(BaseModel):
    success: bool
    icao: Optional[str] = None
    raw_taf: str
    summary: str
    key_points: List[str]
    severity: str
    recommendations: List[str]
    processed_by: str = "Python NLP Service"
    processed_at: str


# Airport info endpoint
@app.get("/api/airport-info")
async def get_airport_info(icao: str):
    """
    Get airport coordinates and name for a given ICAO code using decoded METAR
    """
    aviation_api = get_aviation_api()
    if not aviation_api:
        raise HTTPException(status_code=500, detail="AviationWeatherAPI not available")
    result = aviation_api.fetch_metar(icao, hours=1, decoded=True)
    if not result.get("success") or not result.get("data"):
        raise HTTPException(status_code=404, detail=f"No METAR data found for ICAO {icao}")
    metar_data = result["data"]
    # Try to extract coordinates and name from decoded METAR
    if isinstance(metar_data, list) and len(metar_data) > 0:
        entry = metar_data[0]
        lat = entry.get("lat") or entry.get("latitude")
        lon = entry.get("lon") or entry.get("longitude")
        name = entry.get("station_name") or entry.get("name") or entry.get("station_id") or icao
        if lat is not None and lon is not None:
            return {"icao": icao, "lat": lat, "lon": lon, "name": name}
    raise HTTPException(status_code=404, detail=f"Coordinates not found for ICAO {icao}")

# Parse NOTAM endpoint
@app.post("/nlp/parse-notam", response_model=NOTAMParseResponse)
async def parse_notam(request: NOTAMParseRequest):
    """
    Parse NOTAM text into structured JSON format using NLP models
    """
    try:
        logger.info(f"Parsing NOTAM for {request.airport_code or 'unknown airport'}")
        
        parser = get_notam_parser()
        
        if parser:
            try:
                # Use the actual NLP parser
                parsed_result = parser.parse(request.notam_text)
                
                return NOTAMParseResponse(
                    success=True,
                    notam_id=parsed_result.get("notam_id"),
                    effective_date=parsed_result.get("effective_date"),
                    expiry_date=parsed_result.get("expiry_date"),
                    location=parsed_result.get("location", request.airport_code),
                    subject=parsed_result.get("subject"),
                    description=parsed_result.get("description", request.notam_text),
                    coordinates=parsed_result.get("coordinates"),
                    altitude_affected=parsed_result.get("altitude_affected"),
                    severity=parsed_result.get("severity", "MEDIUM"),
                    category=parsed_result.get("category", "GENERAL"),
                    processed_at=datetime.now().isoformat()
                )
                
            except Exception as nlp_error:
                logger.warning(f"NLP parsing failed, using fallback: {nlp_error}")
                # Fallback to simple parsing
                return _fallback_parse_notam(request)
        else:
            logger.warning("NLP parser not available, using fallback")
            return _fallback_parse_notam(request)
            
    except Exception as e:
        logger.error(f"NOTAM parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse NOTAM: {str(e)}")

def _fallback_parse_notam(request: NOTAMParseRequest) -> NOTAMParseResponse:
    """Fallback NOTAM parsing when NLP service is unavailable"""
    text = request.notam_text.upper()
    
    # Extract basic information using regex
    notam_id = None
    id_match = re.search(r'([A-Z]\d{4}/\d{2})', text)
    if id_match:
        notam_id = id_match.group(1)
    
    # Determine category and severity
    category = "GENERAL"
    severity = "MEDIUM"
    
    if any(word in text for word in ["RUNWAY", "RWY"]):
        category = "RUNWAY"
        severity = "HIGH"
    elif any(word in text for word in ["TAXIWAY", "TWY"]):
        category = "TAXIWAY"
        severity = "MEDIUM"
    elif any(word in text for word in ["NAVAID", "ILS", "VOR"]):
        category = "NAVIGATION"
        severity = "HIGH"
    elif any(word in text for word in ["CLOSED", "CLSD"]):
        severity = "HIGH"
    
    return NOTAMParseResponse(
        success=True,
        notam_id=notam_id,
        location=request.airport_code,
        subject=category,
        description=request.notam_text,
        severity=severity,
        category=category,
        processed_by="Fallback Parser",
        processed_at=datetime.now().isoformat()
    )

# Summarize endpoint
@app.post("/nlp/summarize", response_model=SummarizeResponse)
async def summarize_weather_notam(request: SummarizeRequest):
    """
    Summarize NOTAM and/or weather data into plain text using NLP models
    """
    try:
        logger.info(f"Summarizing data for {request.airport_code or 'unknown airport'}")
        
        if not request.notam_text and not request.weather_data:
            raise HTTPException(status_code=400, detail="Either NOTAM text or weather data is required")
        
        summarizer = get_weather_summarizer()
        
        # Prepare content for summarization
        content_parts = []
        if request.notam_text:
            content_parts.append(f"NOTAM: {request.notam_text}")
        if request.weather_data:
            weather_str = json.dumps(request.weather_data, indent=2)
            content_parts.append(f"Weather: {weather_str}")
        
        content = " | ".join(content_parts)
        
        if summarizer:
            try:
                # Use the actual NLP summarizer
                summary_result = summarizer.summarize(content, max_length=200, min_length=50)
                
                # Extract key points and generate recommendations
                key_points = _extract_key_points(content)
                recommendations = _generate_recommendations(content)
                severity = _assess_severity(content)
                
                return SummarizeResponse(
                    success=True,
                    summary=summary_result.get("summary", content[:200] + "..."),
                    key_points=key_points,
                    severity=severity,
                    recommendations=recommendations,
                    processed_at=datetime.now().isoformat()
                )
                
            except Exception as nlp_error:
                logger.warning(f"NLP summarization failed, using fallback: {nlp_error}")
                return _fallback_summarize(content)
        else:
            logger.warning("NLP summarizer not available, using fallback")
            return _fallback_summarize(content)
            
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to summarize data: {str(e)}")

def _fallback_summarize(content: str) -> SummarizeResponse:
    """Fallback summarization when NLP service is unavailable"""
    
    # Simple extractive summarization
    sentences = content.split('. ')[:3]  # Take first 3 sentences
    summary = '. '.join(sentences)
    
    key_points = _extract_key_points(content)
    recommendations = _generate_recommendations(content)
    severity = _assess_severity(content)
    
    return SummarizeResponse(
        success=True,
        summary=summary,
        key_points=key_points,
        severity=severity,
        recommendations=recommendations,
        processed_by="Fallback Summarizer",
        processed_at=datetime.now().isoformat()
    )

def _extract_key_points(text: str) -> List[str]:
    """Extract key points from text"""
    upper_text = text.upper()
    key_points = []
    
    if "CLOSED" in upper_text or "CLSD" in upper_text:
        key_points.append("Facility or service closure reported")
    if "RUNWAY" in upper_text or "RWY" in upper_text:
        key_points.append("Runway operations affected")
    if "WEATHER" in upper_text:
        key_points.append("Weather conditions noted")
    if "VISIBILITY" in upper_text:
        key_points.append("Visibility restrictions present")
    if "WIND" in upper_text:
        key_points.append("Wind conditions reported")
        
    return key_points[:5]  # Limit to 5 key points

def _generate_recommendations(text: str) -> List[str]:
    """Generate basic recommendations based on content"""
    upper_text = text.upper()
    recommendations = []
    
    if "CLOSED" in upper_text or "CLSD" in upper_text:
        recommendations.append("Plan alternate routing or procedures")
    if "CONSTRUCTION" in upper_text:
        recommendations.append("Expect delays and allow extra time")
    if "LOW VISIBILITY" in upper_text or "FOG" in upper_text:
        recommendations.append("Consider IFR procedures and alternate airports")
    if "STRONG WIND" in upper_text or "GUSTS" in upper_text:
        recommendations.append("Monitor crosswind limitations for aircraft")
    if "THUNDERSTORM" in upper_text or "CONVECTIVE" in upper_text:
        recommendations.append("Avoid area or plan weather deviation")
        
    return recommendations[:3]  # Limit to 3 recommendations

def _assess_severity(text: str) -> str:
    """Assess severity level from text content"""
    upper_text = text.upper()
    
    # High severity conditions
    if any(term in upper_text for term in ["CLOSED", "CLSD", "THUNDERSTORM", "SEVERE"]):
        return "HIGH"
    
    # Medium severity conditions  
    if any(term in upper_text for term in ["RESTRICTED", "LIMITED", "CAUTION", "MODERATE"]):
        return "MEDIUM"
    
    # Default to low
    return "LOW"

@app.post("/nlp/process-taf", response_model=TAFProcessResponse)
async def process_taf(request: TAFProcessRequest):
    """
    Process TAF data with NLP summarization and analysis
    """
    try:
        logger.info(f"Processing TAF for {request.icao or 'unknown airport'}")
        
        # Get summarizer
        summarizer = get_weather_summarizer()
        
        if summarizer:
            try:
                # Use NLP summarizer for TAF
                summary = summarizer.summarize_taf(request.taf_text)
                key_points = _extract_taf_key_points(request.taf_text)
                recommendations = _generate_taf_recommendations(request.taf_text)
                severity = _assess_taf_severity(request.taf_text)
                
                return TAFProcessResponse(
                    success=True,
                    icao=request.icao,
                    raw_taf=request.taf_text,
                    summary=summary,
                    key_points=key_points,
                    severity=severity,
                    recommendations=recommendations,
                    processed_at=datetime.now().isoformat()
                )
                
            except Exception as e:
                logger.warning(f"NLP TAF processing failed: {e}, using fallback")
                return _fallback_process_taf(request)
        else:
            logger.warning("Weather summarizer not available, using fallback")
            return _fallback_process_taf(request)
            
    except Exception as e:
        logger.error(f"TAF processing error: {e}")
        raise HTTPException(status_code=500, detail=f"TAF processing failed: {str(e)}")

def _fallback_process_taf(request: TAFProcessRequest) -> TAFProcessResponse:
    """Fallback TAF processing when NLP service is unavailable"""
    summary = _generate_basic_taf_summary(request.taf_text)
    key_points = _extract_taf_key_points(request.taf_text)
    recommendations = _generate_taf_recommendations(request.taf_text)
    severity = _assess_taf_severity(request.taf_text)
    
    return TAFProcessResponse(
        success=True,
        icao=request.icao,
        raw_taf=request.taf_text,
        summary=summary,
        key_points=key_points,
        severity=severity,
        recommendations=recommendations,
        processed_at=datetime.now().isoformat()
    )

def _generate_basic_taf_summary(taf_text: str) -> str:
    """Generate basic TAF summary using rule-based approach"""
    upper_text = taf_text.upper()
    
    # Extract airport code
    airport_match = re.search(r'TAF ([A-Z]{4})', upper_text)
    airport = airport_match.group(1) if airport_match else "airport"
    
    summary_parts = [f"TAF for {airport}:"]
    
    # Check for weather phenomena
    if 'TS' in upper_text:
        summary_parts.append("thunderstorms forecast")
    if 'RA' in upper_text:
        summary_parts.append("rain expected")
    if 'SN' in upper_text:
        summary_parts.append("snow conditions")
    if 'FG' in upper_text:
        summary_parts.append("fog possible")
        
    # Check for changing conditions
    if 'TEMPO' in upper_text:
        summary_parts.append("temporary conditions expected")
    if 'BECMG' in upper_text:
        summary_parts.append("gradual changes forecast")
    if 'FM' in upper_text:
        summary_parts.append("conditions changing")
        
    return " • ".join(summary_parts) if len(summary_parts) > 1 else f"Forecast conditions available for {airport}"

def _extract_taf_key_points(taf_text: str) -> List[str]:
    """Extract key points from TAF"""
    upper_text = taf_text.upper()
    key_points = []
    
    if 'TS' in upper_text:
        key_points.append("Thunderstorms forecast")
    if 'TEMPO' in upper_text:
        key_points.append("Temporary conditions expected")
    if 'BECMG' in upper_text:
        key_points.append("Conditions becoming")
    if re.search(r'\d{2}G\d{2}', upper_text):
        key_points.append("Gusty winds forecast")
    if re.search(r'[0-9]+SM', upper_text):
        vis_match = re.search(r'([0-9]+)SM', upper_text)
        if vis_match and int(vis_match.group(1)) < 3:
            key_points.append("Reduced visibility expected")
            
    return key_points[:5]

def _generate_taf_recommendations(taf_text: str) -> List[str]:
    """Generate recommendations based on TAF content"""
    upper_text = taf_text.upper()
    recommendations = []
    
    if 'TS' in upper_text:
        recommendations.append("Plan for thunderstorm avoidance procedures")
    if re.search(r'\d{2}G\d{2}', upper_text):
        recommendations.append("Monitor crosswind limitations")
    if 'TEMPO' in upper_text or 'BECMG' in upper_text:
        recommendations.append("Check alternate airports for changing conditions")
    if re.search(r'[0-2]SM', upper_text):
        recommendations.append("Consider IFR approach procedures for low visibility")
        
    return recommendations[:3]

def _assess_taf_severity(taf_text: str) -> str:
    """Assess TAF severity level"""
    upper_text = taf_text.upper()
    
    # High severity
    if any(term in upper_text for term in ['TS', '+RA', '+SN']):
        return "HIGH"
    
    # Medium severity
    if any(term in upper_text for term in ['TEMPO', 'BECMG', '-RA', 'BKN', 'OVC']):
        return "MEDIUM"
    
    return "LOW"

# Run the application
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )