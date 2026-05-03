import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent / "fraud.db"


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                department TEXT NOT NULL,
                city TEXT NOT NULL,
                ifsc_code TEXT NOT NULL,
                baseline_login_start INTEGER NOT NULL,
                baseline_login_end INTEGER NOT NULL,
                baseline_tx_min INTEGER NOT NULL,
                baseline_tx_max INTEGER NOT NULL,
                baseline_amt_min REAL NOT NULL,
                baseline_amt_max REAL NOT NULL,
                baseline_records_min INTEGER NOT NULL,
                baseline_records_max INTEGER NOT NULL,
                incident_count INTEGER NOT NULL DEFAULT 0,
                risk_score REAL NOT NULL DEFAULT 0,
                last_login TEXT,
                status TEXT NOT NULL DEFAULT 'ACTIVE'
            )
            """
        )
        user_columns = [row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "frozen" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN frozen INTEGER NOT NULL DEFAULT 0")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                txn_type TEXT NOT NULL,
                module TEXT NOT NULL,
                records_accessed INTEGER NOT NULL,
                location TEXT NOT NULL,
                failed_logins INTEGER NOT NULL,
                privilege_escalation_attempts INTEGER NOT NULL,
                access_after_hours INTEGER NOT NULL,
                location_changes INTEGER NOT NULL,
                is_attack INTEGER NOT NULL DEFAULT 0,
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        alert_columns = [row["name"] for row in conn.execute("PRAGMA table_info(alerts)").fetchall()]
        if "natural_language" not in alert_columns:
            conn.execute("ALTER TABLE alerts ADD COLUMN natural_language TEXT")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                risk_score REAL NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS behaviour_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                login_hour INTEGER NOT NULL,
                transaction_count INTEGER NOT NULL,
                avg_amount REAL NOT NULL,
                location_changes INTEGER NOT NULL,
                records_accessed INTEGER NOT NULL,
                failed_logins INTEGER NOT NULL,
                access_after_hours INTEGER NOT NULL,
                privilege_escalation_attempts INTEGER NOT NULL,
                ml_score REAL NOT NULL,
                rule_score REAL NOT NULL,
                final_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS risk_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                score REAL NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS generated_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                severity TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS frozen_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                frozen_by TEXT NOT NULL,
                frozen_at TEXT NOT NULL,
                reason TEXT,
                unfrozen_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                actor TEXT NOT NULL,
                target_user_id INTEGER,
                severity TEXT NOT NULL,
                details TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL
            )
            """
        )


def execute(query: str, params: tuple = ()) -> None:
    with get_conn() as conn:
        conn.execute(query, params)


def clear_all() -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM frozen_accounts")
        conn.execute("DELETE FROM generated_reports")
        conn.execute("DELETE FROM risk_history")
        conn.execute("DELETE FROM audit_logs")
        conn.execute("DELETE FROM behaviour_history")
        conn.execute("DELETE FROM alerts")
        conn.execute("DELETE FROM transactions")
        conn.execute("DELETE FROM users")


def fetch_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


def fetch_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute(query, params).fetchone()
    return dict(row) if row else None


def insert_user(user: Dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO users (
            name, role, department, city, ifsc_code,
            baseline_login_start, baseline_login_end,
            baseline_tx_min, baseline_tx_max,
            baseline_amt_min, baseline_amt_max,
            baseline_records_min, baseline_records_max,
            incident_count, risk_score, last_login, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user["name"],
            user["role"],
            user["department"],
            user["city"],
            user["ifsc_code"],
            user["baseline_login_start"],
            user["baseline_login_end"],
            user["baseline_tx_min"],
            user["baseline_tx_max"],
            user["baseline_amt_min"],
            user["baseline_amt_max"],
            user["baseline_records_min"],
            user["baseline_records_max"],
            user.get("incident_count", 0),
            user.get("risk_score", 0),
            user.get("last_login", datetime.utcnow().isoformat()),
            user.get("status", "ACTIVE"),
        ),
    )


def insert_transaction(txn: Dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO transactions (
                user_id, amount, txn_type, module, records_accessed,
                location, failed_logins, privilege_escalation_attempts,
                access_after_hours, location_changes, is_attack, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                txn["user_id"],
                txn["amount"],
                txn["txn_type"],
                txn["module"],
                txn["records_accessed"],
                txn["location"],
                txn["failed_logins"],
                txn["privilege_escalation_attempts"],
                txn["access_after_hours"],
                txn["location_changes"],
                txn.get("is_attack", 0),
                txn.get("notes", ""),
                txn["created_at"],
            ),
        )
        return int(cur.lastrowid)


def insert_alert(alert: Dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO alerts (
                user_id, severity, message, recommended_action,
                risk_score, metadata, created_at, natural_language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                alert["user_id"],
                alert["severity"],
                alert["message"],
                alert["recommended_action"],
                alert["risk_score"],
                json.dumps(alert.get("metadata", {})),
                alert["created_at"],
                alert.get("natural_language", alert["message"]),
            ),
        )
        alert_id = int(cur.lastrowid)
        
        # Create inbox email for CRITICAL and HIGH severity alerts
        if alert["severity"] in ["CRITICAL", "HIGH"]:
            user = get_user(alert["user_id"])
            if user:
                # Generate email content
                subject = f"[{alert['severity']}] Suspicious Activity — {user['name']}"
                preview = alert.get("natural_language", alert["message"])[:150] + "..."
                
                # Generate detailed email body
                body_html = f"""
🚨 ALERT SUMMARY
User: {user['name']} | Role: {user['role']} | Risk Score: {alert['risk_score']}/100
Detected: {alert['created_at']}

📋 INCIDENT DETAILS
{alert.get("natural_language", alert["message"])}

📊 RISK BREAKDOWN
Risk Score: {alert['risk_score']}/100
Severity: {alert['severity']}
Recommended Action: {alert['recommended_action']}

🔧 RECOMMENDED ACTIONS
1. Immediately restrict access to sensitive banking modules
2. Force credential reset and enable multi-factor authentication
3. Conduct forensic review of last 7 days of user activity
4. Contact user's department head for immediate verification
5. Generate comprehensive incident report for compliance

⚡ QUICK ACTIONS
- View User Profile: Investigate user's complete activity history
- Freeze Account: Immediately suspend all user access
- Generate Full Report: Create detailed incident documentation
                """.strip()
                
                conn.execute(
                    """
                    INSERT INTO inbox_emails (
                        subject, preview, body_html, severity, user_id, user_name, 
                        user_role, user_risk_score, is_important, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        subject,
                        preview,
                        body_html,
                        alert["severity"],
                        user["id"],
                        user["name"],
                        user["role"],
                        alert["risk_score"],
                        1 if alert["severity"] == "CRITICAL" else 0,  # Mark critical as important
                        alert["created_at"]
                    )
                )
        
        return alert_id


def insert_behaviour(record: Dict[str, Any]) -> None:
    execute(
        """
        INSERT INTO behaviour_history (
            user_id, login_hour, transaction_count, avg_amount,
            location_changes, records_accessed, failed_logins,
            access_after_hours, privilege_escalation_attempts,
            ml_score, rule_score, final_score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record["user_id"],
            record["login_hour"],
            record["transaction_count"],
            record["avg_amount"],
            record["location_changes"],
            record["records_accessed"],
            record["failed_logins"],
            record["access_after_hours"],
            record["privilege_escalation_attempts"],
            record["ml_score"],
            record["rule_score"],
            record["final_score"],
            record["created_at"],
        ),
    )


def update_user_risk(user_id: int, risk_score: float, last_login: str, status: str) -> None:
    execute(
        "UPDATE users SET risk_score = ?, last_login = ?, status = ? WHERE id = ?",
        (risk_score, last_login, status, user_id),
    )


def increment_incident(user_id: int) -> None:
    execute("UPDATE users SET incident_count = incident_count + 1 WHERE id = ?", (user_id,))


def get_users() -> List[Dict[str, Any]]:
    return fetch_all("SELECT * FROM users ORDER BY risk_score DESC, name ASC")


def get_user(user_id: int) -> Optional[Dict[str, Any]]:
    return fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))


def get_user_behaviour(user_id: int, limit: int = 120) -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT * FROM behaviour_history
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (user_id, limit),
    )


def get_alerts(limit: int = 100) -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT a.*, u.name, u.role, u.department
        FROM alerts a
        JOIN users u ON u.id = a.user_id
        ORDER BY a.id DESC
        LIMIT ?
        """,
        (limit,),
    )


def get_transactions(limit: int = 200) -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT t.*, u.name, u.role
        FROM transactions t
        JOIN users u ON u.id = t.user_id
        ORDER BY t.id DESC
        LIMIT ?
        """,
        (limit,),
    )


def get_dashboard_stats() -> Dict[str, Any]:
    users = fetch_one("SELECT COUNT(*) AS c FROM users")["c"]
    active_alerts = fetch_one(
        "SELECT COUNT(*) AS c FROM alerts WHERE severity IN ('HIGH', 'CRITICAL')"
    )["c"]
    high_risk_users = fetch_one("SELECT COUNT(*) AS c FROM users WHERE risk_score >= 61")["c"]
    tx_today = fetch_one(
        """
        SELECT COUNT(*) AS c FROM transactions
        WHERE date(created_at) = date('now')
        """
    )["c"]
    return {
        "total_users": users,
        "active_alerts": active_alerts,
        "high_risk_users": high_risk_users,
        "transactions_today": tx_today,
    }


def set_user_frozen(user_id: int, frozen: bool) -> None:
    execute("UPDATE users SET frozen = ? WHERE id = ?", (1 if frozen else 0, user_id))


def insert_frozen_account_record(user_id: int, frozen_by: str, frozen_at: str, reason: str = "") -> None:
    execute(
        """
        INSERT INTO frozen_accounts (user_id, frozen_by, frozen_at, reason, unfrozen_at)
        VALUES (?, ?, ?, ?, NULL)
        """,
        (user_id, frozen_by, frozen_at, reason),
    )


def unfreeze_account_record(user_id: int, unfrozen_at: str) -> None:
    execute(
        """
        UPDATE frozen_accounts
        SET unfrozen_at = ?
        WHERE id = (
            SELECT id FROM frozen_accounts
            WHERE user_id = ? AND unfrozen_at IS NULL
            ORDER BY id DESC LIMIT 1
        )
        """,
        (unfrozen_at, user_id),
    )


def insert_risk_snapshot(user_id: int, score: float, timestamp: str) -> None:
    execute(
        "INSERT INTO risk_history (user_id, score, timestamp) VALUES (?, ?, ?)",
        (user_id, score, timestamp),
    )


def get_risk_history(user_id: int, days: int = 7) -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT timestamp, score
        FROM risk_history
        WHERE user_id = ? AND datetime(timestamp) >= datetime('now', ?)
        ORDER BY timestamp ASC
        """,
        (user_id, f"-{max(1, days)} days"),
    )


def get_peer_comparison(user_id: int) -> Optional[Dict[str, Any]]:
    user = get_user(user_id)
    if not user:
        return None
    user_metrics = fetch_one(
        """
        SELECT
            AVG(transaction_count) AS transactions_per_day,
            AVG(avg_amount) AS avg_amount,
            AVG(records_accessed) AS avg_records,
            AVG(login_hour) AS login_hour_avg,
            SUM(access_after_hours) AS after_hours_count
        FROM behaviour_history
        WHERE user_id = ?
        """,
        (user_id,),
    ) or {}

    peer_metrics = fetch_one(
        """
        SELECT
            AVG(b.transaction_count) AS transactions_per_day,
            AVG(b.avg_amount) AS avg_amount,
            AVG(b.records_accessed) AS avg_records,
            AVG(b.login_hour) AS login_hour_avg,
            AVG(b.access_after_hours) * 30 AS after_hours_count
        FROM behaviour_history b
        JOIN users u ON u.id = b.user_id
        WHERE u.role = ?
        """,
        (user["role"],),
    ) or {}

    percentiles = {}
    metric_map = {
        "transactions_per_day": "AVG(transaction_count)",
        "avg_amount": "AVG(avg_amount)",
        "avg_records": "AVG(records_accessed)",
        "login_hour_avg": "AVG(login_hour)",
    }
    for key, sql_metric in metric_map.items():
        rank = fetch_one(
            f"""
            WITH role_values AS (
                SELECT u.id AS user_id, {sql_metric} AS metric
                FROM behaviour_history b
                JOIN users u ON u.id = b.user_id
                WHERE u.role = ?
                GROUP BY u.id
            )
            SELECT
                (SELECT COUNT(*) FROM role_values WHERE metric <= rv.metric) * 100.0 /
                NULLIF((SELECT COUNT(*) FROM role_values), 0) AS pct
            FROM role_values rv
            WHERE rv.user_id = ?
            LIMIT 1
            """,
            (user["role"], user_id),
        )
        percentiles[key] = round((rank or {}).get("pct", 0) or 0, 2)

    return {"user": user_metrics, "peer_avg": peer_metrics, "percentiles": percentiles}


def get_heatmap() -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT
            t.module AS department,
            CAST(strftime('%H', t.created_at) AS INTEGER) AS hour,
            SUM(CASE WHEN b.final_score >= 61 THEN 1 ELSE 0 END) AS anomaly_count,
            AVG(b.final_score) AS avg_risk
        FROM transactions t
        LEFT JOIN behaviour_history b
            ON b.user_id = t.user_id
            AND ABS(strftime('%s', b.created_at) - strftime('%s', t.created_at)) <= 120
        GROUP BY t.module, hour
        ORDER BY t.module, hour
        """
    )


def get_department_risk() -> List[Dict[str, Any]]:
    rows = fetch_all(
        """
        SELECT
            department,
            COUNT(*) AS user_count,
            AVG(risk_score) AS avg_risk,
            SUM(CASE WHEN risk_score >= 61 THEN 1 ELSE 0 END) AS high_risk_count,
            SUM(CASE WHEN risk_score >= 81 THEN 1 ELSE 0 END) AS critical_count
        FROM users
        GROUP BY department
        ORDER BY avg_risk DESC
        """
    )
    for row in rows:
        if row["avg_risk"] >= 65:
            row["trend"] = "up"
        elif row["avg_risk"] <= 35:
            row["trend"] = "down"
        else:
            row["trend"] = "stable"
    return rows


def insert_generated_report(user_id: int, content_json: Dict[str, Any], severity: str, created_at: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO generated_reports (user_id, content_json, created_at, severity)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, json.dumps(content_json), created_at, severity),
        )
        return int(cur.lastrowid)


def get_generated_reports(limit: int = 200) -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT g.*, u.name, u.role, u.department, u.risk_score
        FROM generated_reports g
        JOIN users u ON u.id = g.user_id
        ORDER BY g.id DESC
        LIMIT ?
        """,
        (limit,),
    )


def insert_audit_log(log: Dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO audit_logs (
                action_type, actor, target_user_id, severity, details, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                log["action_type"],
                log["actor"],
                log.get("target_user_id"),
                log.get("severity", "LOW"),
                log["details"],
                json.dumps(log.get("metadata", {})),
                log["created_at"],
            ),
        )
        return int(cur.lastrowid)


def get_audit_logs(limit: int = 500) -> List[Dict[str, Any]]:
    return fetch_all(
        """
        SELECT l.*, u.name AS target_name, u.role AS target_role
        FROM audit_logs l
        LEFT JOIN users u ON u.id = l.target_user_id
        ORDER BY l.id DESC
        LIMIT ?
        """,
        (limit,),
    )
