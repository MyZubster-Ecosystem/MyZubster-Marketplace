"""
EVA IONI 2.0 - Richer API for Developers
API per sviluppatori complete per integrazione
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel

from ..sensors.environmental import environmental
from ..irrigation.controller import irrigation
from ..biodiversity.mapper import biodiversity
from ..ai.recommendations import ai_recommendations

router = APIRouter(prefix="/api/eva", tags=["EVA IONI"])

# ============================================================
# ENVIRONMENTAL SENSORS API
# ============================================================

@router.get("/sensors/environmental")
async def get_environmental_data():
    return {
        "success": True,
        "data": environmental.get_current_data()
    }

@router.get("/sensors/environmental/history")
async def get_environmental_history(limit: int = 100):
    return {
        "success": True,
        "data": environmental.get_history(limit)
    }

@router.get("/sensors/air-quality")
async def get_air_quality():
    return {
        "success": True,
        "data": environmental.get_air_quality()
    }

@router.get("/sensors/weather")
async def get_weather_forecast():
    return {
        "success": True,
        "data": environmental.get_weather_forecast()
    }

@router.post("/sensors/calibrate")
async def calibrate_sensors():
    result = await environmental.calibrate()
    return result

# ============================================================
# IRRIGATION API
# ============================================================

@router.get("/irrigation/status")
async def get_irrigation_status():
    return {
        "success": True,
        "data": irrigation.get_report()
    }

class IrrigationStartRequest(BaseModel):
    zone: str
    duration: Optional[int] = None

@router.post("/irrigation/start")
async def start_irrigation(request: IrrigationStartRequest):
    result = irrigation.start_zone(request.zone, request.duration)
    return result

class IrrigationStopRequest(BaseModel):
    zone: str

@router.post("/irrigation/stop")
async def stop_irrigation(request: IrrigationStopRequest):
    result = irrigation.stop_zone(request.zone)
    return result

class IrrigationAutoRequest(BaseModel):
    enable: bool

@router.post("/irrigation/auto")
async def set_auto_mode(request: IrrigationAutoRequest):
    irrigation.auto_mode = request.enable
    return {"success": True, "auto_mode": irrigation.auto_mode}

class IrrigationScheduleRequest(BaseModel):
    schedules: list

@router.post("/irrigation/schedule")
async def set_schedule(request: IrrigationScheduleRequest):
    result = irrigation.schedule_irrigation(request.schedules)
    return result

# ============================================================
# BIODIVERSITY API
# ============================================================

@router.get("/biodiversity")
async def get_biodiversity_report():
    return {
        "success": True,
        "data": biodiversity.get_report()
    }

class DetectSpeciesRequest(BaseModel):
    image: Optional[str] = None

@router.post("/biodiversity/detect")
async def detect_species(request: DetectSpeciesRequest):
    result = biodiversity.detect_species(request.image)
    return {"success": True, "data": result}

class InvasiveReportRequest(BaseModel):
    name: str
    description: str
    location: Optional[str] = None

@router.post("/biodiversity/invasive")
async def report_invasive(request: InvasiveReportRequest):
    result = biodiversity.report_invasive(
        request.name, 
        request.description, 
        request.location
    )
    return result

@router.post("/biodiversity/citizen")
async def citizen_report(data: Dict[str, Any]):
    result = biodiversity.citizen_report(data)
    return result

@router.get("/biodiversity/map")
async def get_biodiversity_map():
    return {
        "success": True,
        "data": biodiversity.get_map_data()
    }

# ============================================================
# AI RECOMMENDATIONS API
# ============================================================

@router.post("/ai/recommendations")
async def get_ai_recommendations(data: Dict[str, Any]):
    result = await ai_recommendations.get_recommendations(data)
    return result

@router.get("/ai/stats")
async def get_ai_stats():
    return {
        "success": True,
        "data": ai_recommendations.get_stats()
    }

class LearnRequest(BaseModel):
    plant: Dict[str, Any]
    outcome: str

@router.post("/ai/learn")
async def learn_from_data(request: LearnRequest):
    ai_recommendations.learn(request.plant, request.outcome)
    return {"success": True, "message": "AI updated"}

# ============================================================
# API DOCUMENTATION
# ============================================================

@router.get("/docs")
async def get_api_docs():
    return {
        "name": "EVA IONI 2.0 API",
        "version": "2.0.0",
        "endpoints": {
            "sensors": {
                "/sensors/environmental": "Get current environmental data",
                "/sensors/environmental/history": "Get historical data",
                "/sensors/air-quality": "Get air quality metrics",
                "/sensors/weather": "Get weather forecast",
                "/sensors/calibrate": "Calibrate sensors"
            },
            "irrigation": {
                "/irrigation/status": "Get irrigation status",
                "/irrigation/start": "Start irrigation zone",
                "/irrigation/stop": "Stop irrigation zone",
                "/irrigation/auto": "Enable/disable auto mode",
                "/irrigation/schedule": "Set irrigation schedule"
            },
            "biodiversity": {
                "/biodiversity": "Get biodiversity report",
                "/biodiversity/detect": "Detect species from image",
                "/biodiversity/invasive": "Report invasive species",
                "/biodiversity/citizen": "Submit citizen science report",
                "/biodiversity/map": "Get map data"
            },
            "ai": {
                "/ai/recommendations": "Get AI recommendations",
                "/ai/stats": "Get AI statistics",
                "/ai/learn": "Train AI with new data"
            }
        }
    }
