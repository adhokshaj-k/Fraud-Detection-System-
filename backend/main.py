import asyncio
import io
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas

from data_generator import generate_users, training_samples_for_user
from alerts import generate_natural_language_alert
from gemini import generate_ai_report
from ml_model import FEATURES, FraudAnomalyModel
from models import (
    clear_all,
    get_alerts,
    get_audit_logs,
    get_dashboard_stats,
    get_conn,
    get_department_risk,
    get_generated_reports,
    get_heatmap,
    get_peer_comparison,
    get_risk_history,
    get_transactions,
    get_user,
    get_user_behaviour,
    get_users,
    increment_incident,
    insert_frozen_account_record,
    insert_generated_report,
    insert_risk_snapshot,
    init_db,
    insert_alert,
    insert_audit_log,
    insert_behaviour,
    insert_transaction,
    insert_user,
    set_user_frozen,
    unfreeze_account_record,
    update_user_risk,
)
from scorer import composite_score, evaluate_rules, risk_level
from simulator import ATTACK_SCENARIOS, Simulator

IST = ZoneInfo("Asia/Kolkata")
SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"

app = FastAPI(title="Internal Fraud Early Warning System", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WebSocketHub:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, payload: Dict[str, Any]):
        dead = []
        for conn in self.connections:
            try:
                await conn.send_json(payload)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn)


hub = WebSocketHub()
model = FraudAnomalyModel()


def now_ist_iso() -> str:
    return datetime.now(IST).isoformat()


def write_audit_log(
    action_type: str,
    actor: str,
    details: str,
    severity: str = "LOW",
    target_user_id: int | None = None,
    metadata: Dict[str, Any] | None = None,
):
    insert_audit_log(
        {
            "action_type": action_type,
            "actor": actor,
            "target_user_id": target_user_id,
            "severity": severity,
            "details": details,
            "metadata": metadata or {},
            "created_at": now_ist_iso(),
        }
    )


class EventProcessor:
    def __init__(self):
        self.lock = threading.Lock()

    def get_users(self):
        return get_users()

    def snapshot_risk_scores(self):
        for user in get_users():
            insert_risk_snapshot(user["id"], user["risk_score"], now_ist_iso())

    def process_event(self, event: Dict[str, Any]):
        with self.lock:
            user = get_user(event["user_id"])
            if not user:
                return
            if user.get("frozen", 0):
                write_audit_log(
                    action_type="TRANSACTION_REJECTED",
                    actor="simulator",
                    target_user_id=user["id"],
                    severity="HIGH",
                    details=f"Auto-rejected transaction for frozen account: {user['name']}.",
                    metadata={"event": event},
                )
                insert_alert(
                    {
                        "user_id": user["id"],
                        "severity": "HIGH",
                        "message": f"Account frozen. Transaction rejected for {user['name']}.",
                        "natural_language": f"Account for {user['name']} is frozen, so the transaction was automatically rejected.",
                        "recommended_action": "Review freeze status before re-enabling access.",
                        "risk_score": user["risk_score"],
                        "metadata": {"reason": "frozen_rejection"},
                        "created_at": now_ist_iso(),
                    }
                )
                return

            feature_payload = {key: event.get(key, 0) for key in FEATURES}
            ml_score = model.score(feature_payload)
            rule_score, rule_flags = evaluate_rules(event)
            final_score = composite_score(ml_score, rule_score, user["incident_count"])
            level = risk_level(final_score)
            update_user_risk(event["user_id"], final_score, event["created_at"], level)

            insert_transaction(event)
            insert_behaviour(
                {
                    "user_id": event["user_id"],
                    "ml_score": ml_score,
                    "rule_score": rule_score,
                    "final_score": final_score,
                    "created_at": event["created_at"],
                    **feature_payload,
                }
            )

            if level in ("HIGH", "CRITICAL") or event.get("is_attack", 0) == 1:
                increment_incident(event["user_id"])
                alert_message = (
                    f"{level}: {user['name']} ({user['role']}) triggered anomalous behavior. "
                    f"Risk Score: {int(final_score)}/100. "
                )
                if event.get("is_attack", 0):
                    alert_message += f"Simulated attack: {event.get('attack_label', 'Unknown')}."
                elif rule_flags:
                    alert_message += " ".join(rule_flags[:2])
                else:
                    alert_message += "Model confidence indicates significant deviation."

                recommended_action = (
                    "Immediate account suspension recommended."
                    if level == "CRITICAL"
                    else "Escalate to fraud operations for manual review."
                )
                insert_alert(
                    {
                        "user_id": event["user_id"],
                        "severity": level,
                        "message": alert_message,
                        "natural_language": generate_natural_language_alert(user, event, rule_flags, level),
                        "recommended_action": recommended_action,
                        "risk_score": final_score,
                        "metadata": {"flags": rule_flags, "event": event},
                        "created_at": event["created_at"],
                    }
                )
                write_audit_log(
                    action_type="ALERT_RAISED",
                    actor="risk_engine",
                    target_user_id=event["user_id"],
                    severity=level,
                    details=alert_message,
                    metadata={"event_notes": event.get("notes", ""), "flags": rule_flags},
                )

            write_audit_log(
                action_type="TRANSACTION_PROCESSED",
                actor="simulator",
                target_user_id=event["user_id"],
                severity=level,
                details=(
                    f"Processed {event['txn_type']} event in {event['module']} "
                    f"with final risk {round(final_score, 2)}."
                ),
                metadata={
                    "amount": event["amount"],
                    "records_accessed": event["records_accessed"],
                    "is_attack": event.get("is_attack", 0),
                },
            )

            payload = {
                "type": "live_update",
                "stats": get_dashboard_stats(),
                "latest_transaction": get_transactions(limit=1)[0],
                "latest_alert": get_alerts(limit=1)[0] if get_alerts(limit=1) else None,
                "audit_log": get_audit_logs(limit=1)[0] if get_audit_logs(limit=1) else None,
                "top_users": get_users()[:5],
            }
            loop = asyncio.new_event_loop()
            loop.run_until_complete(hub.broadcast(payload))
            loop.close()


processor = EventProcessor()
simulator = Simulator(processor)


def seed_users_and_train():
    init_db()
    clear_all()
    for user in generate_users():
        insert_user(user)
    users = get_users()

    training_rows = []
    for user in users:
        training_rows.extend(training_samples_for_user(user, days=30))
    model.train(training_rows)
    write_audit_log(
        action_type="MODEL_TRAINED",
        actor="system",
        severity="LOW",
        details=f"Initial model trained with {len(training_rows)} baseline samples.",
        metadata={"sample_count": len(training_rows)},
    )


def build_report_pdf(user_id: int) -> bytes:
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    behaviour = get_user_behaviour(user_id, limit=50)
    alerts = [a for a in get_alerts(limit=200) if a["user_id"] == user_id][:20]

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 40

    def write_line(text: str, size: int = 11, gap: int = 18):
        nonlocal y
        pdf.setFont("Helvetica", size)
        for line in simpleSplit(text, "Helvetica", size, width - 80):
            pdf.drawString(40, y, line)
            y -= gap
            if y < 80:
                pdf.showPage()
                y = height - 40

    write_line("Internal Fraud Incident Report", 16, 24)
    write_line(f"Generated at: {datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S IST')}")
    write_line(f"User: {user['name']} ({user['role']})")
    write_line(f"Department: {user['department']} | IFSC: {user['ifsc_code']}")
    write_line("Photo: [Placeholder]")
    write_line(f"Current Risk Score: {round(user['risk_score'], 2)} / 100")
    write_line("-" * 80)

    write_line("Risk Score Timeline (last events):")
    for b in behaviour[:15]:
        ts = b["created_at"]
        write_line(f"- {ts}: score={round(b['final_score'], 2)}, ml={round(b['ml_score'], 2)}")

    write_line("-" * 80)
    write_line("Flagged Activities:")
    if alerts:
        for al in alerts:
            write_line(f"- [{al['severity']}] {al['message']}")
    else:
        write_line("- No flagged incidents in selected window.")

    write_line("-" * 80)
    write_line("Model Explanation:")
    write_line(
        "The anomaly model compares current behavior against 30 days of baseline patterns "
        "using Isolation Forest plus One-Class SVM."
    )
    write_line("Top monitored indicators: " + ", ".join(FEATURES))
    write_line("Recommended remediation:")
    write_line("1) Temporary access lock.")
    write_line("2) Mandatory credential reset with MFA validation.")
    write_line("3) Detailed activity audit and management escalation.")
    write_line("Incident summary:")
    write_line(
        f"User recorded {len(alerts)} significant alerts with "
        f"{len([a for a in alerts if a['severity'] in ['HIGH', 'CRITICAL']])} high-severity events."
    )

    pdf.save()
    buffer.seek(0)
    return buffer.read()


def generate_sample_reports() -> None:
    try:
        SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
        # Warm up with deterministic demo incidents.
        simulator.inject_attack("off_hours_bulk_transfer")
        simulator.inject_attack("credential_stuffing")
        simulator.inject_attack("insider_trading_pattern")
        risky_users = get_users()[:3]
        for user in risky_users:
            data = build_report_pdf(user["id"])
            sample_path = SAMPLES_DIR / f"incident_report_user_{user['id']}.pdf"
            sample_path.write_bytes(data)
            write_audit_log(
                action_type="SAMPLE_REPORT_GENERATED",
                actor="system",
                target_user_id=user["id"],
                severity="LOW",
                details=f"Sample report generated at {sample_path.name}",
            )
    except Exception as exc:
        write_audit_log(
            action_type="SAMPLE_REPORT_FAILED",
            actor="system",
            severity="MEDIUM",
            details=f"Sample report generation failed: {exc}",
        )


@app.on_event("startup")
def startup():
    # Create missing database tables
    with get_conn() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS risk_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            score REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS generated_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content_json TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            severity TEXT
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS frozen_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            frozen_by TEXT,
            frozen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reason TEXT,
            unfrozen_at DATETIME
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS inbox_emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT,
            preview TEXT,
            body_html TEXT,
            severity TEXT,
            user_id INTEGER,
            user_name TEXT,
            user_role TEXT,
            user_risk_score REAL,
            is_read INTEGER DEFAULT 0,
            is_important INTEGER DEFAULT 0,
            is_resolved INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")
        db.commit()
    print("✅ Database tables verified/created")
    
    seed_users_and_train()
    simulator.start()
    threading.Thread(target=generate_sample_reports, daemon=True).start()


@app.on_event("shutdown")
def shutdown():
    simulator.stop()


@app.get("/api/users")
def api_users():
    return get_users()


@app.get("/api/users/{user_id}/behaviour")
def api_user_behaviour(user_id: int, limit: int = 120):
    return get_user_behaviour(user_id, limit=limit)


@app.get("/api/alerts")
def api_alerts():
    return get_alerts()


@app.get("/api/transactions")
def api_transactions():
    return get_transactions()


@app.get("/api/dashboard/stats")
def api_dashboard_stats():
    return get_dashboard_stats()


@app.post("/api/model/retrain")
def api_model_retrain():
    users = get_users()
    training_rows = []
    for user in users:
        training_rows.extend(training_samples_for_user(user, days=30))
    model.train(training_rows)
    write_audit_log(
        action_type="MODEL_RETRAINED",
        actor="analyst_api",
        severity="LOW",
        details=f"Model retrained via API using {len(training_rows)} samples.",
        metadata={"sample_count": len(training_rows)},
    )
    return {"status": "ok", "samples": len(training_rows)}


@app.post("/api/attack/inject")
def api_attack_inject(payload: Dict[str, str]):
    attack_type = payload.get("attack_type")
    if attack_type not in ATTACK_SCENARIOS:
        raise HTTPException(status_code=400, detail="Invalid attack type")
    result = simulator.inject_attack(attack_type)
    write_audit_log(
        action_type="ATTACK_INJECTED",
        actor="analyst_api",
        target_user_id=result["user_id"],
        severity="HIGH",
        details=f"Attack scenario injected: {result['label']}",
        metadata={"attack_type": attack_type},
    )
    return {"status": "injected", **result}


@app.post("/api/users/{user_id}/freeze")
def api_freeze_user(user_id: int, payload: Dict[str, str]):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = payload.get("role", "Unknown")
    reason = payload.get("reason", "Suspicious activity")
    ts = now_ist_iso()
    set_user_frozen(user_id, True)
    insert_frozen_account_record(user_id, role, ts, reason)
    write_audit_log(
        action_type="ACCOUNT_FROZEN",
        actor=role,
        target_user_id=user_id,
        severity="CRITICAL",
        details=f"Account frozen by {role} at {ts}",
        metadata={"reason": reason},
    )
    insert_alert(
        {
            "user_id": user_id,
            "severity": "CRITICAL",
            "message": f"Account frozen by {role} at {ts}",
            "natural_language": f"Account for {user['name']} was frozen by {role} at {ts} IST.",
            "recommended_action": "Maintain freeze until investigation completes.",
            "risk_score": max(user["risk_score"], 90),
            "metadata": {"frozen_by": role, "reason": reason},
            "created_at": ts,
        }
    )
    return {"status": "frozen", "user_id": user_id}


@app.post("/api/users/{user_id}/unfreeze")
def api_unfreeze_user(user_id: int, payload: Dict[str, str]):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = payload.get("role", "Unknown")
    ts = now_ist_iso()
    set_user_frozen(user_id, False)
    unfreeze_account_record(user_id, ts)
    write_audit_log(
        action_type="ACCOUNT_UNFROZEN",
        actor=role,
        target_user_id=user_id,
        severity="MEDIUM",
        details=f"Account unfrozen by {role} at {ts}",
    )
    return {"status": "unfrozen", "user_id": user_id}


@app.get("/api/users/{user_id}/risk-history")
def api_user_risk_history(user_id: int, days: int = 7):
    return get_risk_history(user_id, days=days)


@app.get("/api/users/{user_id}/peer-comparison")
def api_user_peer_comparison(user_id: int):
    data = get_peer_comparison(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return data


@app.get("/api/heatmap")
def api_heatmap():
    return get_heatmap()


@app.get("/api/departments/risk")
def api_departments_risk():
    return get_department_risk()


@app.post("/api/reports/generate/{user_id}")
def api_generate_ai_report(user_id: int):
    report = generate_ai_report(user_id)
    severity = report.get("severity_verdict", "MEDIUM")
    report_id = insert_generated_report(user_id, report, severity, now_ist_iso())
    write_audit_log(
        action_type="AI_REPORT_GENERATED",
        actor="analyst_api",
        target_user_id=user_id,
        severity=severity,
        details=f"Generated AI report #{report_id} for user {user_id}",
    )
    return {"report_id": report_id, "user_id": user_id, "content": report}


@app.get("/api/reports/all")
def api_reports_all():
    try:
        with get_conn() as db:
            reports = db.execute("""
                SELECT gr.id, gr.user_id, gr.content_json, 
                       gr.created_at, gr.severity,
                       u.name as user_name, u.role, 
                       u.risk_score
                FROM generated_reports gr
                JOIN users u ON gr.user_id = u.id
                ORDER BY gr.created_at DESC
            """).fetchall()
            return [dict(r) for r in reports]
    except Exception as e:
        return []


@app.get("/api/reports/{user_id}")
def api_report(user_id: int):
    data = build_report_pdf(user_id)
    write_audit_log(
        action_type="REPORT_GENERATED",
        actor="analyst_api",
        target_user_id=user_id,
        severity="LOW",
        details=f"Incident report requested for user {user_id}.",
    )
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=incident_report_{user_id}.pdf"},
    )


@app.get("/api/attack/types")
def api_attack_types():
    return [
        {"key": key, "label": value["label"]}
        for key, value in ATTACK_SCENARIOS.items()
    ]


@app.get("/api/audit/logs")
def api_audit_logs():
    return get_audit_logs()


# Inbox endpoints
@app.get("/api/inbox")
def api_inbox(limit: int = 200):
    with get_conn() as db:
        emails = db.execute("""
            SELECT 
                id, subject, preview, body_html, severity, user_id, user_name, user_role, user_risk_score,
                is_read, is_important, is_resolved, is_archived, created_at
            FROM inbox_emails 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (limit,)).fetchall()
        return [dict(email) for email in emails]


@app.get("/api/inbox/unread-count")
def api_inbox_unread_count():
    with get_conn() as db:
        count = db.execute("""
            SELECT COUNT(*) as count 
            FROM inbox_emails 
            WHERE is_read = 0 AND is_archived = 0
        """).fetchone()
        return {"count": count["count"]}


@app.post("/api/inbox/{email_id}/read")
def api_mark_email_read(email_id: int):
    with get_conn() as db:
        db.execute("""
            UPDATE inbox_emails 
            SET is_read = 1 
            WHERE id = ?
        """, (email_id,))
        db.commit()
    return {"status": "ok"}


@app.post("/api/inbox/{email_id}/important")
def api_toggle_email_important(email_id: int):
    with get_conn() as db:
        # Toggle the important status
        current = db.execute("""
            SELECT is_important FROM inbox_emails WHERE id = ?
        """, (email_id,)).fetchone()
        
        if current:
            new_status = 1 - current["is_important"]
            db.execute("""
                UPDATE inbox_emails 
                SET is_important = ? 
                WHERE id = ?
            """, (new_status, email_id))
            db.commit()
            return {"status": "ok", "is_important": bool(new_status)}
        else:
            raise HTTPException(status_code=404, detail="Email not found")


@app.post("/api/inbox/{email_id}/resolve")
def api_mark_email_resolved(email_id: int):
    with get_conn() as db:
        db.execute("""
            UPDATE inbox_emails 
            SET is_resolved = 1, is_read = 1 
            WHERE id = ?
        """, (email_id,))
        db.commit()
    return {"status": "ok"}


@app.post("/api/inbox/{email_id}/archive")
def api_archive_email(email_id: int):
    with get_conn() as db:
        db.execute("""
            UPDATE inbox_emails 
            SET is_archived = 1 
            WHERE id = ?
        """, (email_id,))
        db.commit()
    return {"status": "ok"}


@app.post("/api/inbox/mark-all-read")
def api_mark_all_read():
    with get_conn() as db:
        db.execute("""
            UPDATE inbox_emails 
            SET is_read = 1 
            WHERE is_read = 0 AND is_archived = 0
        """)
        db.commit()
    return {"status": "ok"}


# Global search endpoint
@app.get("/api/search")
def api_search(q: str = ""):
    if not q or len(q.strip()) < 2:
        return {"users": [], "alerts": [], "transactions": []}

    q_like = f"%{q.strip()}%"

    with get_conn() as db:
        try:
            users = db.execute(
                """
            SELECT id, name, role, department,
                   ROUND(risk_score, 1) as risk_score,
                   status, frozen
            FROM users
            WHERE name LIKE ?
               OR role LIKE ?
               OR department LIKE ?
            ORDER BY risk_score DESC
            LIMIT 6
        """,
                (q_like, q_like, q_like),
            ).fetchall()
        except Exception as e:
            print(f"User search error: {e}")
            users = []

        try:
            alerts = db.execute(
                """
            SELECT a.id,
                   COALESCE(a.natural_language, a.message,
                            'Alert') as description,
                   a.severity,
                   a.created_at,
                   a.risk_score,
                   u.name as user_name
            FROM alerts a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.message LIKE ?
               OR a.severity LIKE ?
               OR u.name LIKE ?
               OR COALESCE(a.natural_language, '') LIKE ?
            ORDER BY a.created_at DESC
            LIMIT 6
        """,
                (q_like, q_like, q_like, q_like),
            ).fetchall()
        except Exception as e:
            print(f"Alert search error: {e}")
            alerts = []

        try:
            transactions = db.execute(
                """
            SELECT t.id,
                   ROUND(t.amount, 2) as amount,
                   t.module,
                   t.location,
                   t.txn_type,
                   t.is_attack,
                   u.name as user_name
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.name LIKE ?
               OR t.module LIKE ?
               OR t.location LIKE ?
               OR t.txn_type LIKE ?
               OR CAST(ROUND(t.amount) AS TEXT) LIKE ?
            ORDER BY t.created_at DESC
            LIMIT 6
        """,
                (q_like, q_like, q_like, q_like, q_like),
            ).fetchall()
        except Exception as e:
            print(f"Transaction search error: {e}")
            transactions = []

    return {
        "users": [dict(u) for u in users],
        "alerts": [dict(a) for a in alerts],
        "transactions": [dict(t) for t in transactions],
    }


# System health endpoint
@app.get("/api/health")
def api_health():
    try:
        # Check database connection
        with get_conn() as db:
            db.execute("SELECT 1").fetchone()
            db_status = "connected"
    except Exception:
        db_status = "error"
    
    # Check if model is loaded
    model_status = "loaded" if model else "error"
    
    # Check WebSocket connections
    ws_status = "healthy" if len(hub.connections) >= 0 else "error"
    
    return {
        "backend": "healthy",
        "model": model_status,
        "database": db_status,
        "websocket_connections": len(hub.connections),
        "uptime_seconds": 3600  # This would be calculated from app start time
    }


@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await hub.connect(websocket)
    try:
        await websocket.send_json(
            {
                "type": "bootstrap",
                "stats": get_dashboard_stats(),
                "top_users": get_users()[:5],
                "latest_transaction": get_transactions(limit=1)[0] if get_transactions(limit=1) else None,
                "latest_alert": get_alerts(limit=1)[0] if get_alerts(limit=1) else None,
            }
        )
        while True:
            try:
                # Wait for ping/pong or any message with 30 second timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # If we receive any message, send pong back
                await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_text("ping")
                except:
                    break
    except WebSocketDisconnect:
        hub.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        hub.disconnect(websocket)
