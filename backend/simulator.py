import random
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from data_generator import CITY_POOL, MODULES_BY_ROLE

IST = ZoneInfo("Asia/Kolkata")

TXN_TYPES = ["NEFT", "RTGS", "IMPS", "Internal Transfer", "Account Update"]


def now_ist_iso() -> str:
    return datetime.now(IST).isoformat()


def random_amount(min_value, max_value) -> float:
    low = float(min_value)
    high = float(max_value)
    if low > high:
        low, high = high, low
    return round(random.uniform(low, high), 2)


def generate_normal_transaction(user: dict) -> dict:
    login_hour = random.randint(user["baseline_login_start"], user["baseline_login_end"])
    return {
        "user_id": user["id"],
        "amount": random_amount(user["baseline_amt_min"], user["baseline_amt_max"]),
        "txn_type": random.choice(TXN_TYPES),
        "module": random.choice(MODULES_BY_ROLE.get(user["role"], ["Core Banking"])),
        "records_accessed": random.randint(user["baseline_records_min"], user["baseline_records_max"]),
        "location": user["city"],
        "failed_logins": random.choice([0, 0, 1]),
        "privilege_escalation_attempts": 0,
        "access_after_hours": 1 if login_hour < 9 or login_hour > 18 else 0,
        "location_changes": 0,
        "login_hour": login_hour,
        "transaction_count": random.randint(user["baseline_tx_min"], user["baseline_tx_max"]),
        "avg_amount": random_amount(user["baseline_amt_min"], user["baseline_amt_max"]),
        "rapid_account_modifications": 0,
        "is_attack": 0,
        "notes": "Routine banking activity.",
        "created_at": now_ist_iso(),
    }


def generate_suspicious_transaction(user: dict) -> dict:
    new_city = random.choice([city for city in CITY_POOL if city != user["city"]])
    login_hour = random.choice([23, 1, 2, 4, 5])
    return {
        "user_id": user["id"],
        "amount": float(random.randint(1_000_000, 7_000_000)),
        "txn_type": random.choice(TXN_TYPES),
        "module": random.choice(MODULES_BY_ROLE.get(user["role"], ["Core Banking"])),
        "records_accessed": random.randint(200, 650),
        "location": new_city,
        "failed_logins": random.randint(1, 6),
        "privilege_escalation_attempts": random.choice([0, 1]),
        "access_after_hours": 1 if login_hour < 9 or login_hour > 18 else 0,
        "location_changes": 1,
        "login_hour": login_hour,
        "transaction_count": random.randint(user["baseline_tx_max"], user["baseline_tx_max"] + 10),
        "avg_amount": float(random.randint(500_000, 6_000_000)),
        "rapid_account_modifications": random.choice([0, 1]),
        "is_attack": 0,
        "notes": "Pattern deviation detected.",
        "created_at": now_ist_iso(),
    }


ATTACK_SCENARIOS = {
    "off_hours_bulk_transfer": {
        "label": "Off-Hours Bulk Transfer",
        "overrides": {
            "login_hour": 2,
            "amount": 9_500_000.0,
            "records_accessed": 800,
            "failed_logins": 0,
            "access_after_hours": 1,
            "location_changes": 0,
            "privilege_escalation_attempts": 0,
            "rapid_account_modifications": 1,
            "notes": "User logged in at 2 AM and attempted INR 95 Lakh transfer.",
        },
    },
    "privilege_escalation": {
        "label": "Privilege Escalation",
        "force_role": "Teller",
        "overrides": {
            "login_hour": 11,
            "amount": 250_000.0,
            "records_accessed": 420,
            "failed_logins": 4,
            "access_after_hours": 0,
            "location_changes": 0,
            "privilege_escalation_attempts": 7,
            "rapid_account_modifications": 1,
            "notes": "Repeated admin function access attempts by teller.",
        },
    },
    "bulk_data_exfiltration": {
        "label": "Bulk Data Exfiltration",
        "overrides": {
            "login_hour": 14,
            "amount": 90_000.0,
            "records_accessed": 2000,
            "failed_logins": 1,
            "access_after_hours": 0,
            "location_changes": 0,
            "privilege_escalation_attempts": 0,
            "rapid_account_modifications": 1,
            "notes": "Downloaded 2000 customer records in 3 minutes.",
        },
    },
    "credential_stuffing": {
        "label": "Credential Stuffing",
        "overrides": {
            "login_hour": 10,
            "amount": 180_000.0,
            "records_accessed": 240,
            "failed_logins": 15,
            "access_after_hours": 0,
            "location_changes": 1,
            "privilege_escalation_attempts": 0,
            "rapid_account_modifications": 0,
            "notes": "15 failed logins followed by success from a different city.",
        },
    },
    "insider_trading_pattern": {
        "label": "Insider Trading Pattern",
        "force_role": "Treasury Manager",
        "overrides": {
            "login_hour": 6,
            "amount": 3_500_000.0,
            "records_accessed": 780,
            "failed_logins": 0,
            "access_after_hours": 1,
            "location_changes": 0,
            "privilege_escalation_attempts": 0,
            "rapid_account_modifications": 1,
            "notes": "Repeated pre-market sensitive data access.",
        },
    },
}


class Simulator:
    def __init__(self, event_handler):
        self.event_handler = event_handler
        self._stop = threading.Event()
        self.thread = None
        self.last_snapshot_ts = time.time()

    def start(self):
        if self.thread and self.thread.is_alive():
            return
        self._stop.clear()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def stop(self):
        self._stop.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)

    def _run(self):
        while not self._stop.is_set():
            now = time.time()
            if now - self.last_snapshot_ts >= 60:
                self.event_handler.snapshot_risk_scores()
                self.last_snapshot_ts = now
            users = self.event_handler.get_users()
            if not users:
                time.sleep(2)
                continue
            user = random.choice(users)
            event = (
                generate_suspicious_transaction(user)
                if random.random() <= 0.1
                else generate_normal_transaction(user)
            )
            self.event_handler.process_event(event)
            time.sleep(random.uniform(2.0, 3.0))

    def inject_attack(self, attack_type: str):
        scenario = ATTACK_SCENARIOS.get(attack_type)
        if not scenario:
            raise ValueError("Unknown attack type")
        users = self.event_handler.get_users()
        if not users:
            raise ValueError("No users available")

        force_role = scenario.get("force_role")
        candidates = [u for u in users if u["role"] == force_role] if force_role else users
        chosen = random.choice(candidates or users)
        event = generate_suspicious_transaction(chosen)
        event.update(scenario["overrides"])
        event["module"] = random.choice(MODULES_BY_ROLE.get(chosen["role"], ["Core Banking"]))
        event["is_attack"] = 1
        event["attack_label"] = scenario["label"]
        event["created_at"] = now_ist_iso()

        # Keep attack observable for judges by creating a short burst of events.
        for _ in range(2):
            self.event_handler.process_event(dict(event))
            time.sleep(1.5)

        return {"user_id": chosen["id"], "attack_type": attack_type, "label": scenario["label"]}
