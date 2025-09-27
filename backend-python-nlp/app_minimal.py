"""
Aviation Weather Briefing - Python NLP Service (Minimal Version)
Fallback version for Windows systems with dependency issues
"""

import os
import logging
import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Aviation Weather NLP Service (Minimal)",
    description="Simplified NLP processing for aviation weather data - Windows compatible",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, BACKEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class NotamParseRequest(BaseModel):
    notam_text: str = Field(..., description="Raw NOTAM text to parse")
    include_severity: bool = Field(default=True, description="Include severity classification")

class NotamParseResponse(BaseModel):
    success: bool
    parsed_notam: Dict[str, Any]
    severity: Optional[str] = None
    confidence: Optional[float] = None
    processing_time: float

class SummaryRequest(BaseModel):
    text: str = Field(..., description="Text to summarize")
    max_length: Optional[int] = Field(default=200, ge=50, le=500)
    min_length: Optional[int] = Field(default=50, ge=20, le=200)

class SummaryResponse(BaseModel):
    success: bool
    summary: str
    original_length: int
    summary_length: int
    processing_time: float

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    service: str
    dependencies: Dict[str, str]

# Simple NOTAM parsing logic (rule-based)
class SimpleNotamParser:
    def __init__(self):
        self.severity_keywords = {
            'high': ['closed', 'failure', 'out of service', 'unavailable', 'inoperative'],
            'medium': ['reduced', 'limited', 'caution', 'warning', 'temporary'],
            'low': ['information', 'advisory', 'notice', 'scheduled', 'maintenance']
        }
        
        self.location_pattern = r'([A-Z]{4})'  # Airport codes
        self.date_pattern = r'(\d{2}/\d{2}/\d{4}|\d{6})'  # Date patterns
        self.time_pattern = r'(\d{4}Z|\d{2}:\d{2})'  # Time patterns
    
    def parse_notam(self, notam_text: str) -> Dict[str, Any]:
        """Parse NOTAM text using rule-based approach"""
        notam_text = notam_text.upper()
        
        # Extract basic information
        airports = re.findall(self.location_pattern, notam_text)
        dates = re.findall(self.date_pattern, notam_text)
        times = re.findall(self.time_pattern, notam_text)
        
        # Determine severity
        severity, confidence = self._classify_severity(notam_text)
        
        # Extract facility type
        facility_type = self._extract_facility_type(notam_text)
        
        # Extract coordinates if present
        coordinates = self._extract_coordinates(notam_text)
        
        parsed_data = {
            'airports': list(set(airports)),
            'dates': dates,
            'times': times,
            'facility_type': facility_type,
            'coordinates': coordinates,
            'severity': severity,
            'confidence': confidence,
            'raw_text': notam_text,
            'parsed_by': 'rule_based_parser',
            'timestamp': datetime.now().isoformat()
        }
        
        return parsed_data
    
    def _classify_severity(self, text: str) -> tuple[str, float]:
        """Classify NOTAM severity based on keywords"""
        text_lower = text.lower()
        
        severity_scores = {'high': 0, 'medium': 0, 'low': 0}
        
        for severity, keywords in self.severity_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    severity_scores[severity] += 1
        
        # Determine highest scoring severity
        max_score = max(severity_scores.values())
        if max_score == 0:
            return 'medium', 0.3  # Default to medium with low confidence
        
        for severity, score in severity_scores.items():
            if score == max_score:
                confidence = min(score * 0.2 + 0.5, 1.0)  # Scale to 0.5-1.0
                return severity, confidence
        
        return 'medium', 0.5
    
    def _extract_facility_type(self, text: str) -> Optional[str]:
        """Extract facility type from NOTAM text"""
        facility_keywords = {
            'runway': ['runway', 'rwy'],
            'taxiway': ['taxiway', 'twy'],
            'approach': ['ils', 'vor', 'ndb', 'rnav', 'approach'],
            'lighting': ['lighting', 'lights', 'papi', 'vasi'],
            'navigation': ['navaid', 'navigation', 'beacon'],
            'airport': ['airport', 'airfield']
        }
        
        text_lower = text.lower()
        for facility, keywords in facility_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return facility
        
        return None
    
    def _extract_coordinates(self, text: str) -> Optional[Dict[str, float]]:
        """Extract coordinates from NOTAM text"""
        # Simple coordinate pattern matching
        coord_pattern = r'(\d{2})(\d{2})(\d{2})([NS])\s*(\d{3})(\d{2})(\d{2})([EW])'
        match = re.search(coord_pattern, text)
        
        if match:
            lat_deg, lat_min, lat_sec, lat_dir = match.groups()[:4]
            lng_deg, lng_min, lng_sec, lng_dir = match.groups()[4:]
            
            latitude = int(lat_deg) + int(lat_min)/60 + int(lat_sec)/3600
            longitude = int(lng_deg) + int(lng_min)/60 + int(lng_sec)/3600
            
            if lat_dir == 'S':
                latitude = -latitude
            if lng_dir == 'W':
                longitude = -longitude
            
            return {'latitude': latitude, 'longitude': longitude}
        
        return None

# Simple text summarization (extractive)
class SimpleTextSummarizer:
    def __init__(self):
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being'
        }
    
    def summarize(self, text: str, max_length: int = 200, min_length: int = 50) -> str:
        """Simple extractive summarization"""
        sentences = self._split_sentences(text)
        
        if len(sentences) <= 2:
            return text  # Too short to summarize
        
        # Score sentences based on word frequency
        word_freq = self._calculate_word_frequency(text)
        sentence_scores = self._score_sentences(sentences, word_freq)
        
        # Select top sentences
        num_sentences = max(1, min(3, len(sentences) // 2))
        top_sentences = sorted(sentence_scores.items(), 
                             key=lambda x: x[1], reverse=True)[:num_sentences]
        
        # Maintain original order
        selected_sentences = []
        for sentence, _ in sentence_scores.items():
            if any(sentence == top_sent for top_sent, _ in top_sentences):
                selected_sentences.append(sentence)
        
        summary = ' '.join(selected_sentences)
        
        # Trim to length if needed
        if len(summary) > max_length:
            summary = summary[:max_length].rsplit(' ', 1)[0] + '...'
        
        return summary if len(summary) >= min_length else text
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        import re
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _calculate_word_frequency(self, text: str) -> Dict[str, int]:
        """Calculate word frequency"""
        words = re.findall(r'\w+', text.lower())
        word_freq = {}
        
        for word in words:
            if word not in self.stop_words and len(word) > 2:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        return word_freq
    
    def _score_sentences(self, sentences: List[str], word_freq: Dict[str, int]) -> Dict[str, float]:
        """Score sentences based on word frequency"""
        sentence_scores = {}
        
        for sentence in sentences:
            words = re.findall(r'\w+', sentence.lower())
            score = sum(word_freq.get(word, 0) for word in words)
            sentence_scores[sentence] = score / len(words) if words else 0
        
        return sentence_scores

# Initialize services
notam_parser = SimpleNotamParser()
text_summarizer = SimpleTextSummarizer()

# API Routes
@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        service="aviation-weather-nlp-minimal",
        dependencies={
            "fastapi": "minimal",
            "parser": "rule_based",
            "summarizer": "extractive"
        }
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        service="aviation-weather-nlp-minimal",
        dependencies={
            "fastapi": "available",
            "notam_parser": "rule_based",
            "text_summarizer": "extractive",
            "ml_models": "not_required"
        }
    )

@app.post("/nlp/parse-notam", response_model=NotamParseResponse)
async def parse_notam(request: NotamParseRequest):
    """Parse NOTAM using rule-based approach"""
    start_time = datetime.now()
    
    try:
        logger.info(f"Parsing NOTAM: {request.notam_text[:100]}...")
        
        parsed_data = notam_parser.parse_notam(request.notam_text)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return NotamParseResponse(
            success=True,
            parsed_notam=parsed_data,
            severity=parsed_data.get('severity') if request.include_severity else None,
            confidence=parsed_data.get('confidence') if request.include_severity else None,
            processing_time=processing_time
        )
    
    except Exception as e:
        logger.error(f"NOTAM parsing error: {str(e)}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return NotamParseResponse(
            success=False,
            parsed_notam={
                'error': str(e),
                'raw_text': request.notam_text,
                'parsed_by': 'error_handler'
            },
            severity='unknown' if request.include_severity else None,
            confidence=0.0 if request.include_severity else None,
            processing_time=processing_time
        )

@app.post("/nlp/summarize", response_model=SummaryResponse)
async def summarize_text(request: SummaryRequest):
    """Summarize text using extractive approach"""
    start_time = datetime.now()
    
    try:
        logger.info(f"Summarizing text of length: {len(request.text)}")
        
        summary = text_summarizer.summarize(
            request.text, 
            request.max_length or 200,
            request.min_length or 50
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return SummaryResponse(
            success=True,
            summary=summary,
            original_length=len(request.text),
            summary_length=len(summary),
            processing_time=processing_time
        )
    
    except Exception as e:
        logger.error(f"Text summarization error: {str(e)}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return SummaryResponse(
            success=False,
            summary=f"Error: {str(e)}",
            original_length=len(request.text),
            summary_length=0,
            processing_time=processing_time
        )

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP {exc.status_code}: {exc.detail}")
    return {"error": exc.detail, "status_code": exc.status_code}

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}")
    return {"error": "Internal server error", "details": str(exc)}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    
    logger.info("Starting Aviation Weather NLP Service (Minimal)")
    logger.info(f"Service running on port {port}")
    logger.info("Using rule-based parsing and extractive summarization")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )