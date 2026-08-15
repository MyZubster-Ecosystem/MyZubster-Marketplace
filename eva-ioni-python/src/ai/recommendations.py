"""
EVA IONI 2.0 - AI Recommendations Engine
Miglioramento delle raccomandazioni per orti urbani
"""

import random
from datetime import datetime
from typing import Dict, Any, List, Optional

class AIRecommendations:
    def __init__(self):
        self.knowledge_base = {
            'plants': {
                'Pomodoro': {'water': 70, 'sun': 80, 'soil': 'pH 6.0-6.8', 'spacing': '60cm'},
                'Basilico': {'water': 60, 'sun': 90, 'soil': 'pH 6.0-7.0', 'spacing': '30cm'},
                'Lavanda': {'water': 30, 'sun': 100, 'soil': 'pH 6.5-7.5', 'spacing': '45cm'},
                'Rosmarino': {'water': 25, 'sun': 100, 'soil': 'pH 6.0-7.5', 'spacing': '40cm'},
                'Girasole': {'water': 50, 'sun': 100, 'soil': 'pH 6.0-7.5', 'spacing': '60cm'}
            },
            'pests': {
                'Afidi': {'treatment': 'Sapone di potassio', 'prevention': 'Nasturzio'},
                'Oidio': {'treatment': 'Zolfo', 'prevention': 'Bicarbonato'},
                'Mosca bianca': {'treatment': 'Olio di neem', 'prevention': 'Menta'}
            }
        }
        self.plant_log = []
        self.recommendations = []
        self.confidence = 0.8
        self._listeners = []

    async def get_recommendations(self, garden_data: Dict) -> Dict:
        """Ottieni raccomandazioni per un orto"""
        recommendations = []
        soil_data = garden_data.get('soil_data')
        weather_data = garden_data.get('weather_data')
        plant_type = garden_data.get('plant_type')

        # Raccomandazioni suolo
        if soil_data:
            soil_advice = self._analyze_soil(soil_data)
            recommendations.extend(soil_advice)

        # Raccomandazioni meteo
        if weather_data:
            weather_advice = self._analyze_weather(weather_data)
            recommendations.extend(weather_advice)

        # Raccomandazioni piante
        if plant_type and plant_type in self.knowledge_base['plants']:
            plant_advice = self._get_plant_advice(plant_type)
            if plant_advice:
                recommendations.append(plant_advice)

        # Raccomandazioni parassiti
        pest_advice = self._check_pests(garden_data)
        if pest_advice:
            recommendations.append(pest_advice)

        self.recommendations = recommendations
        self._notify({'type': 'recommendations', 'data': recommendations})
        
        return {
            'success': True,
            'recommendations': recommendations,
            'confidence': self.confidence,
            'timestamp': datetime.now().isoformat()
        }

    def _analyze_soil(self, soil_data: Dict) -> List[Dict]:
        """Analizza il suolo"""
        advice = []
        
        if 'ph' in soil_data:
            if soil_data['ph'] < 6.0:
                advice.append({
                    'type': 'soil',
                    'title': '⚠️ pH troppo acido',
                    'action': 'Aggiungi calce per aumentare il pH',
                    'priority': 'high'
                })
            elif soil_data['ph'] > 7.5:
                advice.append({
                    'type': 'soil',
                    'title': '⚠️ pH troppo alcalino',
                    'action': 'Aggiungi zolfo per abbassare il pH',
                    'priority': 'high'
                })
            else:
                advice.append({
                    'type': 'soil',
                    'title': '✅ pH ottimale',
                    'action': 'pH nella norma, continua così!',
                    'priority': 'low'
                })

        if 'moisture' in soil_data:
            if soil_data['moisture'] < 30:
                advice.append({
                    'type': 'soil',
                    'title': '💧 Umidità bassa',
                    'action': 'Irrigazione consigliata',
                    'priority': 'medium'
                })

        return advice

    def _analyze_weather(self, weather_data: Dict) -> List[Dict]:
        """Analizza il meteo"""
        advice = []
        
        if 'temperature' in weather_data:
            if weather_data['temperature'] > 30:
                advice.append({
                    'type': 'weather',
                    'title': '☀️ Temperature elevate',
                    'action': 'Irriga e ombreggia le piante',
                    'priority': 'high'
                })

        if weather_data.get('rain', False):
            advice.append({
                'type': 'weather',
                'title': '🌧️ Pioggia prevista',
                'action': 'Sospendi l\'irrigazione automatica',
                'priority': 'medium'
            })

        return advice

    def _get_plant_advice(self, plant_type: str) -> Optional[Dict]:
        """Ottieni consigli per le piante"""
        plant = self.knowledge_base['plants'].get(plant_type)
        if not plant:
            return None
        
        return {
            'type': 'plant',
            'title': f'🌱 Consigli per {plant_type}',
            'action': f"Acqua: {plant['water']}% • Sole: {plant['sun']}% • Spaziatura: {plant['spacing']}",
            'details': f"pH ideale: {plant['soil']}",
            'priority': 'medium'
        }

    def _check_pests(self, garden_data: Dict) -> Optional[Dict]:
        """Controlla i parassiti"""
        # Simula rilevamento parassiti
        if random.random() > 0.7:
            pest_name = random.choice(list(self.knowledge_base['pests'].keys()))
            pest = self.knowledge_base['pests'][pest_name]
            return {
                'type': 'pest',
                'title': f'🐛 Rilevato: {pest_name}',
                'action': f"Trattamento: {pest['treatment']}",
                'prevention': f"Prevenzione: {pest['prevention']}",
                'priority': 'high'
            }
        return None

    def learn(self, plant_data: Dict, outcome: str):
        """Impara dall'esperienza"""
        self.plant_log.append({
            'plant': plant_data,
            'outcome': outcome,
            'timestamp': datetime.now().isoformat()
        })
        self.confidence = min(1, self.confidence + 0.01)
        self._notify({'type': 'learn', 'data': {'plant': plant_data, 'outcome': outcome}})

    def get_stats(self) -> Dict:
        """Ottieni le statistiche AI"""
        return {
            'total_recommendations': len(self.recommendations),
            'confidence': self.confidence,
            'plant_log': len(self.plant_log),
            'knowledge_base': {
                'plants': len(self.knowledge_base['plants']),
                'pests': len(self.knowledge_base['pests'])
            }
        }

    def on_update(self, callback):
        """Registra un listener"""
        self._listeners.append(callback)

    def _notify(self, data):
        for listener in self._listeners:
            listener(data)

# Singleton
ai_recommendations = AIRecommendations()
