from typing import Dict, List, Tuple

RULE_WEIGHTS = {
    "after_hours_login": 30,
    "high_amount": 25,
    "high_records_accessed": 35,
    "new_location": 20,
    "failed_logins": 15,
    "bulk_download": 40,
    "privilege_escalation": 50,
    "rapid_modifications": 30,
}


def risk_level(score: float) -> str:
    if score <= 30:
        return "LOW"
    if score <= 60:
        return "MEDIUM"
    if score <= 80:
        return "HIGH"
    return "CRITICAL"


def evaluate_rules(event: Dict) -> Tuple[float, List[str]]:
    points = 0
    flags: List[str] = []

    if event["login_hour"] >= 22 or event["login_hour"] < 6:
        points += RULE_WEIGHTS["after_hours_login"]
        flags.append("Login occurred between 10 PM and 6 AM IST.")
    if event["amount"] > 5_000_000:
        points += RULE_WEIGHTS["high_amount"]
        flags.append("Transaction amount exceeded INR 50 Lakh.")
    if event["records_accessed"] > 500:
        points += RULE_WEIGHTS["high_records_accessed"]
        flags.append("Accessed over 500 records in one session.")
    if event["location_changes"] > 0:
        points += RULE_WEIGHTS["new_location"]
        flags.append("Login detected from a new location.")
    if event["failed_logins"] > 3:
        points += RULE_WEIGHTS["failed_logins"]
        flags.append("Failed login attempts exceeded threshold.")
    if event["records_accessed"] > 1000:
        points += RULE_WEIGHTS["bulk_download"]
        flags.append("Bulk data download exceeded 1000 records.")
    if event["privilege_escalation_attempts"] > 0:
        points += RULE_WEIGHTS["privilege_escalation"]
        flags.append("Privilege escalation attempt detected.")
    if event.get("rapid_account_modifications", 0) > 0:
        points += RULE_WEIGHTS["rapid_modifications"]
        flags.append("Multiple account changes in under 5 minutes.")

    return min(points, 100), flags


def composite_score(ml_score: float, rule_score: float, incident_count: int) -> float:
    incident_score = min(incident_count * 20, 100)
    final = (ml_score * 0.4) + (rule_score * 0.4) + (incident_score * 0.2)
    return round(min(final, 100), 2)
