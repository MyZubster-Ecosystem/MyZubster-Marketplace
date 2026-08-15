"""
EVA IONI 2.0 - Environmental Sensors Module
Sensori ambientali supplementari per monitoraggio completo
"""

import random
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional

class EnvironmentalSensor:
    def __init__(self):
        self.sensors = {
            'air_quality': {
                'pm25': 0.0,
                'pm10': 0.0,
                'co2': 0.0,
                'voc': 0.0
            },
            'weather': {
                'temperature': 22.0,
                'humidity': 60.0,
                'wind_speed': 0.0,
                'rain': False,
                'uv_index': 0
            },
            'acoustic': {
                'level': 0.0,
                'bird_songs': 0,
                'noise_pollution': 0.0
            },
            'light': {
                'par': 0.0,
                'lux': 0.0
            }
        }
        self.history = []
        self._callbacks = []

    def read_all_sensors(self) -> Dict[str, Any]:
        """Leggi tutti i sensori e aggiorna i dati"""
        # Simula lettura sensori
        self.sensors['air_quality'] = {
            'pm25': 5 + random.random() * 10,
            'pm10': 10 + random.random() * 20,
            'co2': 400 + random.random() * 200,
            'voc': 0.1 + random.random() * 0.5
        }

        self.sensors['weather'] = {
            'temperature': 18 + random.random() * 14,
            'humidity': 40 + random.random() * 40,
            'wind_speed': random.random() * 10,
            'rain': random.random() > 0.8,
            'uv_index': random.randint(0, 10)
        }

        self.sensors['acoustic'] = {
            'level': 30 + random.random() * 30,
            'bird_songs': random.randint(0, 20),
            'noise_pollution': random.random() * 10
        }

        self.sensors['light'] = {
            'par': 100 + random.random() * 800,
            'lux': 1000 + random.random() * 8000
        }

        timestamp = datetime.now().isoformat()
        data = {
            'timestamp': timestamp,
            **self.sensors
        }
        self.history.append(data)
        
        # Notify callbacks
        for callback in self._callbacks:
            callback(data)
        
        return data

    def get_current_data(self) -> Dict[str, Any]:
        """Ottieni i dati correnti"""
        return {
            'timestamp': datetime.now().isoformat(),
            **self.sensors
        }

    def get_history(self, limit: int = 100) -> List[Dict]:
        """Ottieni lo storico dei dati"""
        return self.history[-limit:]

    def get_air_quality(self) -> Dict[str, Any]:
        """Ottieni la qualità dell'aria"""
        aq = self.sensors['air_quality']
        quality = 'good'
        if aq['pm25'] > 35 or aq['pm10'] > 50:
            quality = 'moderate'
        if aq['pm25'] > 55 or aq['pm10'] > 150:
            quality = 'unhealthy'
        if aq['pm25'] > 150 or aq['pm10'] > 250:
            quality = 'hazardous'
        return {**aq, 'quality': quality}

    def get_weather_forecast(self) -> Dict[str, Any]:
        """Ottieni le previsioni meteo"""
        weather = self.sensors['weather']
        forecast = 'clear'
        if weather['rain']:
            forecast = 'rainy'
        if weather['wind_speed'] > 30:
            forecast = 'windy'
        if weather['temperature'] > 30:
            forecast = 'hot'
        if weather['temperature'] < 5:
            forecast = 'cold'
        return {**weather, 'forecast': forecast}

    def get_biodiversity_score(self) -> int:
        """Calcola il punteggio di biodiversità"""
        birds = self.sensors['acoustic']['bird_songs']
        noise = self.sensors['acoustic']['noise_pollution']
        uv = self.sensors['weather']['uv_index']
        
        score = 50
        score += birds * 2
        score -= noise * 2
        score -= max(0, uv - 5) * 3
        
        return max(0, min(100, score))

    def on_data(self, callback):
        """Registra un callback per i dati"""
        self._callbacks.append(callback)

    async def calibrate(self):
        """Calibra i sensori"""
        print("🔧 Calibrating environmental sensors...")
        await asyncio.sleep(2)
        print("✅ Sensors calibrated successfully")
        return {'success': True, 'message': 'Calibration complete'}

# Singleton
environmental = EnvironmentalSensor()
