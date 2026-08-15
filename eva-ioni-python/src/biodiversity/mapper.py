"""
EVA IONI 2.0 - Biodiversity Mapping Module
Mappatura della biodiversità con AI e citizen science
"""

import random
from datetime import datetime
from typing import Dict, Any, List, Optional

class BiodiversityMapper:
    def __init__(self):
        self.species = {
            'plants': [],
            'birds': [],
            'insects': [],
            'mammals': []
        }
        self.invasive_species = []
        self.pollinators = []
        self.biodiversity_score = 0
        self.history = []
        self.citizen_reports = []
        self._listeners = []

    def detect_species(self, image=None) -> Dict:
        """Rileva specie via AI"""
        # Simula riconoscimento AI
        plants = ['Pomodoro', 'Basilico', 'Lavanda', 'Rosmarino', 'Girasole']
        birds = ['Passero', 'Merlo', 'Cinciallegra', 'Pettirosso']
        insects = ['Ape', 'Farfalla', 'Coccinella', 'Formica']
        
        detected = {
            'plants': [random.choice(plants)],
            'birds': [random.choice(birds)],
            'insects': [random.choice(insects)]
        }
        
        self._add_species(detected)
        self._notify({'type': 'species_detected', 'data': detected})
        
        return detected

    def _add_species(self, species: Dict):
        """Aggiungi specie al database"""
        if 'plants' in species:
            self.species['plants'].extend(species['plants'])
        if 'birds' in species:
            self.species['birds'].extend(species['birds'])
        if 'insects' in species:
            self.species['insects'].extend(species['insects'])
        if 'mammals' in species:
            self.species['mammals'].extend(species['mammals'])
        
        self._update_score()
        self.history.append({
            'timestamp': datetime.now().isoformat(),
            'species': species,
            'score': self.biodiversity_score
        })

    def track_pollinator(self, pollinator_type: str = 'bee', count: int = None):
        """Traccia gli impollinatori"""
        if count is None:
            count = random.randint(1, 20)
        
        record = {
            'type': pollinator_type,
            'count': count,
            'timestamp': datetime.now().isoformat()
        }
        self.pollinators.append(record)
        self._notify({'type': 'pollinator', 'data': record})
        return record

    def report_invasive(self, name: str, description: str, location: str = None) -> Dict:
        """Segnala una specie invasiva"""
        report = {
            'name': name,
            'description': description,
            'location': location or 'Coordinate non disponibili',
            'reported_at': datetime.now().isoformat()
        }
        self.invasive_species.append(report)
        self._update_score()
        self._notify({'type': 'invasive', 'data': report})
        return report

    def citizen_report(self, data: Dict) -> Dict:
        """Registra un report citizen science"""
        report = {
            'id': f"citizen-{int(datetime.now().timestamp())}",
            **data,
            'reported_at': datetime.now().isoformat(),
            'verified': False
        }
        self.citizen_reports.append(report)
        self._notify({'type': 'citizen', 'data': report})
        return report

    def _update_score(self):
        """Calcola il punteggio di biodiversità"""
        score = 0
        score += len(self.species['plants']) * 2
        score += len(self.species['birds']) * 3
        score += len(self.species['insects']) * 2
        score += len(self.species['mammals']) * 4
        score -= len(self.invasive_species) * 5
        
        self.biodiversity_score = max(0, min(100, score))
        self._notify({'type': 'score_update', 'score': self.biodiversity_score})

    def get_report(self) -> Dict:
        """Ottieni il report completo"""
        return {
            'species': self.species,
            'invasive_species': self.invasive_species,
            'pollinators': self.pollinators,
            'biodiversity_score': self.biodiversity_score,
            'total_species': sum(len(v) for v in self.species.values()),
            'citizen_reports': len(self.citizen_reports),
            'last_updated': datetime.now().isoformat()
        }

    def get_map_data(self) -> Dict:
        """Genera dati per la mappa"""
        return {
            'species': self.species,
            'invasive': self.invasive_species,
            'score': self.biodiversity_score,
            'timestamp': datetime.now().isoformat()
        }

    def on_update(self, callback):
        """Registra un listener"""
        self._listeners.append(callback)

    def _notify(self, data):
        for listener in self._listeners:
            listener(data)

# Singleton
biodiversity = BiodiversityMapper()
