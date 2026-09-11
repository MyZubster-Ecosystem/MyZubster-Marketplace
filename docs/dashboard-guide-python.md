# Dashboard Orti Urbani - Guida Python con Streamlit

## Panoramica
Dashboard interattiva per visualizzare i dati degli orti urbani di MyZubster, realizzata con Python e Streamlit.

## Tech Stack
- Python 3.10+
- Streamlit - Framework per dashboard
- Pandas - Manipolazione dati
- Plotly - Grafici interattivi
- Requests - Chiamate API

## Installazione

```bash
pip install streamlit pandas plotly requests python-dotenv
```

## Struttura del Progetto

```
dashboard-orti/
├── app.py
├── utils/
│   ├── api.py
│   └── data_processor.py
├── components/
│   ├── metrics.py
│   └── charts.py
└── requirements.txt
```

## Esempio API Client

```python
import requests

API_BASE = 'http://188.213.161.186:4000/api'

def fetch_gardens():
    response = requests.get(f'{API_BASE}/gardens')
    if response.status_code == 200:
        return response.json().get('data', [])
    return []

def fetch_latest_sensor(garden_id):
    response = requests.get(f'{API_BASE}/sensors/garden/{garden_id}/latest')
    if response.status_code == 200:
        return response.json().get('data', {})
    return {}
```

## Esempio Dashboard

```python
import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title='MyZubster Dashboard', layout='wide')
st.title('🌱 Dashboard Orti Urbani')

col1, col2, col3 = st.columns(3)
with col1: st.metric('Orti Totali', '5')
with col2: st.metric('pH Medio', '6.8')
with col3: st.metric('Temperatura', '22°C')
```

## Ricompensa
- 200 MYZ + 1% lifetime
- Bounty: #746
