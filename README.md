# Fraud Detection System

AI-powered Early Warning System for **internal and privileged-user fraud detection** in a banking environment.  
Built as an MCA competition-ready full-stack project with real-time simulation, anomaly detection, alerting, and incident reporting.

## Highlights

- Real-time monitoring of 25 bank employees across privileged roles.
- Synthetic Indian banking activity with IFSC codes, INR amounts, and role-specific modules.
- ML anomaly detection using Isolation Forest + One-Class SVM.
- Composite risk scoring engine (ML + rules + incident history).
- Live attack injection scenarios for demo-ready judge walkthrough.
- Real-time dashboard updates via WebSockets.
- PDF incident report generation for each user.
- Clickable user detail modal with full behavior history.
- Dedicated audit log page and API.
- Auto-generated sample incident reports in `/samples`.

## Tech Stack

- **Backend:** FastAPI, scikit-learn, Faker, Pandas, NumPy, ReportLab
- **Frontend:** React (Vite), Tailwind CSS, Chart.js
- **Database:** SQLite (auto-created)
- **Realtime:** REST + WebSockets

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                       React Dashboard                        │
│  Cards | Alerts | Transactions | Charts | Attack Controls   │
└───────────────┬──────────────────────────────────────────────┘
                │ REST + WS (/ws/live)
┌───────────────▼──────────────────────────────────────────────┐
│                         FastAPI API                          │
│ /api/users /api/alerts /api/transactions /api/attack/inject │
│ /api/model/retrain /api/reports/{user_id}                   │
└───────┬───────────────────────────┬──────────────────────────┘
        │                           │
┌───────▼────────┐          ┌───────▼──────────────────────────┐
│ Risk Scorer    │          │ ML Engine                        │
│ Rules + Weights│          │ IsolationForest + OneClassSVM    │
└───────┬────────┘          └───────┬──────────────────────────┘
        │                           │
┌───────▼───────────────────────────▼──────────────────────────┐
│               Simulator + Attack Injector Engine             │
│       Generates baseline + suspicious banking activity       │
└───────────────────────┬──────────────────────────────────────┘
                        │
                 ┌──────▼──────┐
                 │ SQLite DB   │
                 │ users, txns │
                 │ alerts, hist│
                 └─────────────┘
```

## Project Structure

```text
fraud-detection-system/
├── backend/
│   ├── main.py
│   ├── simulator.py
│   ├── ml_model.py
│   ├── data_generator.py
│   ├── scorer.py
│   ├── models.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AlertFeed.jsx
│   │   │   ├── UserTable.jsx
│   │   │   ├── BehaviourChart.jsx
│   │   │   ├── TransactionFeed.jsx
│   │   │   └── RiskScoreCard.jsx
│   │   ├── index.jsx
│   │   ├── index.css
│   │   └── utils.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```
## Validation 

###1)backend 
```bash
python -m compileall backend
```
###2)frontend 
```bash
npm run build
```
## Setup & Run

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8000`

## Gemini API Setup

1. Go to [Google AI Studio API keys](http       s://aistudio.google.com/app/apikey)
2. Create a free API key
3. In WSL terminal: `export GEMINI_API_KEY="your-key-here"`
4. Or add to `backend/.env`:
   `GEMINI_API_KEY=your-key-here`

## API Endpoints

- `GET /api/users`
- `GET /api/users/{id}/behaviour`
- `GET /api/alerts`
- `GET /api/transactions`
- `GET /api/dashboard/stats`
- `GET /api/audit/logs`
- `POST /api/attack/inject`
- `POST /api/model/retrain`
- `GET /api/reports/{user_id}`
- `POST /api/reports/generate/{user_id}`
- `GET /api/reports/all`
- `POST /api/users/{id}/freeze`
- `POST /api/users/{id}/unfreeze`
- `GET /api/users/{id}/risk-history`
- `GET /api/users/{id}/peer-comparison`
- `GET /api/heatmap`
- `GET /api/departments/risk`
- `WS /ws/live`

## Demo Flow (for judges)

1. Launch backend and frontend.
2. Show live transaction stream and risk cards updating every few seconds.
3. Open **Alert Feed** and explain severity badges.
4. Trigger **Simulate Attack** (pick one scenario).
5. Within a few seconds, observe:
   - risk score spike,
   - red-highlighted user row,
   - alert with explanation,
   - anomaly spike in chart.
6. Click **Generate Report** for the impacted user and download PDF.
7. Switch to **Audit Log** tab and show the full chronological action trail.
8. Open `/samples` and show pre-generated incident PDFs.
9. Call `POST /api/model/retrain` and explain model refresh capability.

## ML Model (Simple Explanation)

The system first learns what “normal” employee behavior looks like (login times, transaction amounts, accessed records, failed logins, etc.) from 30 days of generated baseline data.

For each new activity:

1. **Isolation Forest** detects outliers.
2. **One-Class SVM** validates unusual patterns.
3. Their combined anomaly result becomes an ML risk score (0–100).
4. A rule engine adds context-based risk (for example, off-hours access or bulk data downloads).
5. Historical incidents are included for repeat offenders.

Final risk score uses weighted fusion:

- ML anomaly: 40%
- Rule flags: 40%
- Incident history: 20%

## Attack Scenarios Included

- Off-Hours Bulk Transfer
- Privilege Escalation
- Bulk Data Exfiltration
- Credential Stuffing
- Insider Trading Pattern

## Notes

- SQLite DB auto-creates on first run.
- Model auto-trains at startup.
- CORS is enabled for localhost frontend.
- Dashboard is responsive and optimized for dark-theme SOC-style presentation.
