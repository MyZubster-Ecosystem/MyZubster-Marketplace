"""
EVA IONI 2.0 - Autonomous Irrigation Controller
Supporto all'irrigazione autonomo con AI e sensori
"""

import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional

class IrrigationController:
    def __init__(self):
        self.zones = {
            'vegetable': {
                'name': 'Verdure',
                'moisture': 0,
                'target': 60,
                'duration': 10,
                'status': 'off'
            },
            'flowers': {
                'name': 'Fiori',
                'moisture': 0,
                'target': 50,
                'duration': 8,
                'status': 'off'
            },
            'lawn': {
                'name': 'Prato',
                'moisture': 0,
                'target': 40,
                'duration': 15,
                'status': 'off'
            },
            'trees': {
                'name': 'Alberi',
                'moisture': 0,
                'target': 30,
                'duration': 20,
                'status': 'off'
            }
        }
        self.schedules = []
        self.water_usage = 0
        self.is_active = False
        self.auto_mode = True
        self.weather_aware = True
        self._listeners = []

    def start(self):
        """Avvia il sistema"""
        self.is_active = True
        print("💧 Irrigation system started")
        self._notify({'status': 'running', 'auto_mode': self.auto_mode})

    def stop(self):
        """Ferma il sistema"""
        self.is_active = False
        for key in self.zones:
            self.zones[key]['status'] = 'off'
        print("💧 Irrigation system stopped")
        self._notify({'status': 'stopped'})

    def update_moisture(self, zone: str, moisture: float):
        """Aggiorna l'umidità per una zona"""
        if zone in self.zones:
            self.zones[zone]['moisture'] = moisture
            self._notify({'zone': zone, 'moisture': moisture})

    def start_zone(self, zone: str, duration: Optional[int] = None) -> Dict:
        """Avvia l'irrigazione per una zona"""
        if zone not in self.zones:
            return {'error': 'Zona non trovata'}
        if not self.is_active:
            return {'error': 'Sistema non attivo'}
        
        zone_data = self.zones[zone]
        time = duration or zone_data['duration']
        
        zone_data['status'] = 'running'
        self.water_usage += time * 5
        
        self._notify({'zone': zone, 'duration': time, 'action': 'start'})
        
        # Simula irrigazione
        async def stop_after_time():
            await asyncio.sleep(time)
            zone_data['status'] = 'off'
            zone_data['moisture'] = min(100, zone_data['moisture'] + 20)
            self._notify({'zone': zone, 'action': 'stop'})
        
        asyncio.create_task(stop_after_time())
        
        return {
            'success': True,
            'message': f"Irrigazione avviata per {zone_data['name']}",
            'duration': time,
            'estimated_water': time * 5
        }

    def stop_zone(self, zone: str) -> Dict:
        """Ferma l'irrigazione per una zona"""
        if zone not in self.zones:
            return {'error': 'Zona non trovata'}
        self.zones[zone]['status'] = 'off'
        self._notify({'zone': zone, 'action': 'stop'})
        return {
            'success': True,
            'message': f"Irrigazione fermata per {self.zones[zone]['name']}"
        }

    def auto_cycle(self):
        """Esegue il ciclo automatico"""
        if not self.auto_mode or not self.is_active:
            return
        
        for zone, data in self.zones.items():
            if data['moisture'] < data['target']:
                self.start_zone(zone)

    def schedule_irrigation(self, schedules: List) -> Dict:
        """Programma l'irrigazione"""
        self.schedules = schedules
        self._notify({'schedules': schedules})
        return {'success': True, 'schedules': self.schedules}

    def update_weather(self, forecast: str) -> Dict:
        """Aggiorna con le previsioni meteo"""
        if self.weather_aware and 'rain' in forecast.lower():
            self.stop()
            self._notify({
                'status': 'suspended',
                'reason': 'rain_forecast'
            })
            return {'status': 'suspended', 'reason': 'rain_forecast'}
        return {'status': 'active'}

    def resume(self):
        """Riprende il sistema dopo sospensione"""
        if not self.is_active:
            self.start()
            self._notify({'message': 'Sistema ripreso'})

    def get_report(self) -> Dict:
        """Ottieni il report completo"""
        return {
            'active': self.is_active,
            'auto_mode': self.auto_mode,
            'weather_aware': self.weather_aware,
            'water_usage': self.water_usage,
            'zones': self.zones,
            'schedules': self.schedules
        }

    def on_update(self, callback):
        """Registra un listener per gli aggiornamenti"""
        self._listeners.append(callback)

    def _notify(self, data):
        for listener in self._listeners:
            listener(data)

# Singleton
irrigation = IrrigationController()
