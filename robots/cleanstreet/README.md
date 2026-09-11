# 🧹 CleanStreetBot - Robot per Pulizia Strade

## Funzionalità
- 🔍 Rilevamento rifiuti (segnalazioni)
- 🗺️ Mappatura zone da pulire
- 📊 Report automatici per Comune e Hera
- 💰 Pagamenti in MYZ/XMR per km pulito
- 🔗 Integrazione Hera

## Endpoint

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/cleanstreet/report` | Segnala un rifiuto |
| GET | `/api/cleanstreet/status` | Stato del robot |
| GET | `/api/cleanstreet/reports` | Lista segnalazioni |
| POST | `/api/cleanstreet/clean` | Avvia pulizia zona |
| POST | `/api/cleanstreet/hera-report` | Invia report a Hera |

## Pagamenti

| Tipo | Ricompensa |
|------|------------|
| Segnalazione rifiuto | 5 MYZ |
| Pulizia zona | 50 MYZ |
| Rifiuto pericoloso | 150 MYZ |
| Report a Hera | 20 MYZ |

## Integrazione Hera
- Report automatici via API
- Segnalazioni urgenti con priorità alta
- Dashboard per il Comune
