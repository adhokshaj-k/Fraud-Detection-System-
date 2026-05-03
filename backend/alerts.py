from typing import Dict, List


def _safe_multiplier(value: float, baseline: float) -> float:
    if baseline <= 0:
        return 0.0
    return round(value / baseline, 2)


def generate_natural_language_alert(user: Dict, event: Dict, flags: List[str], severity: str) -> str:
    name = user.get("name", "User")
    role = user.get("role", "Unknown")
    avg_records = (user.get("baseline_records_min", 10) + user.get("baseline_records_max", 50)) / 2
    avg_amount = (user.get("baseline_amt_min", 1000) + user.get("baseline_amt_max", 500000)) / 2
    login_start = user.get("baseline_login_start", 9)
    login_end = user.get("baseline_login_end", 18)
    hour = int(event.get("login_hour", 0))

    if event.get("privilege_escalation_attempts", 0) > 0:
        return (
            f"{name} (role: {role}) attempted to access restricted modules "
            f"{event.get('privilege_escalation_attempts', 1)} times in 5 minutes. "
            "This action requires higher clearance."
        )
    if event.get("records_accessed", 0) > 1000:
        multiplier = _safe_multiplier(event.get("records_accessed", 0), avg_records)
        return (
            f"{name} downloaded {event.get('records_accessed', 0)} customer records in 3 minutes. "
            f"Their daily average is {int(avg_records)}. This is {multiplier}x above normal behaviour."
        )
    if event.get("amount", 0) > 5_000_000:
        multiplier = _safe_multiplier(event.get("amount", 0), avg_amount)
        return (
            f"{name} initiated a transfer of Rs {int(event.get('amount', 0)):,} at {hour:02d}:00 IST. "
            f"Their typical transaction average is Rs {int(avg_amount):,}. This is {multiplier}x above normal."
        )
    if event.get("location_changes", 0) > 0:
        return (
            f"{name} logged in from {event.get('location', 'a new city')}, which is a new location. "
            f"Their last logins were from {user.get('city', 'home city')}."
        )
    if hour >= 22 or hour < 6:
        outside = login_start - hour if hour < login_start else hour - login_end
        multiplier = _safe_multiplier(event.get("records_accessed", 0), avg_records)
        return (
            f"{name} logged in at {hour:02d}:00 - {max(outside, 1)} hours outside their normal pattern. "
            f"They accessed {event.get('records_accessed', 0)} records, which is {multiplier}x "
            f"their 30-day average of {int(avg_records)}."
        )

    if flags:
        return f"{name} triggered {severity} anomaly conditions: {'; '.join(flags[:2])}"
    return f"{name} triggered a {severity} fraud anomaly based on behaviour and model deviation."
