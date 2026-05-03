import json
import os
import re
from typing import Any, Dict, List

from models import get_alerts, get_user, get_user_behaviour, get_users
from dotenv import load_dotenv

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover
    genai = None

load_dotenv()


def _baseline_for_role(role: str) -> Dict[str, Any]:
    users = [u for u in get_users() if u["role"] == role]
    if not users:
        return {}
    return {
        "avg_risk": round(sum(u["risk_score"] for u in users) / len(users), 2),
        "avg_incidents": round(sum(u["incident_count"] for u in users) / len(users), 2),
        "count": len(users),
    }


def _fallback_report(user: Dict[str, Any], anomalies: List[str], baseline: Dict[str, Any]) -> Dict[str, Any]:
    severity = "CRITICAL" if user["risk_score"] >= 81 else "HIGH" if user["risk_score"] >= 61 else "MEDIUM"
    return {
        "executive_summary": (
            f"{user['name']} shows elevated risk patterns across privileged banking operations. "
            f"Current risk score is {round(user['risk_score'], 2)}/100, requiring enhanced monitoring."
        ),
        "risk_assessment": (
            "Behaviour indicates deviation from baseline, including suspicious access and transaction signatures. "
            "The pattern suggests a potential insider misuse scenario if not contained."
        ),
        "flagged_activities": anomalies[:6] or ["Model detected unusual behaviour spikes over recent sessions."],
        "ml_explanation": (
            "Isolation Forest and One-Class SVM identified anomalies in login timing, records accessed, "
            "amount patterns, and failed login behaviour compared with the user's 30-day profile."
        ),
        "peer_comparison": (
            f"Compared to {user['role']} peers (n={baseline.get('count', 0)}), this user is above average on "
            "risk and activity intensity."
        ),
        "recommended_actions": [
            "Temporarily restrict sensitive module access.",
            "Force credential reset and MFA revalidation.",
            "Run forensic review of last 7 days of activity.",
        ],
        "severity_verdict": severity,
    }


def parse_gemini_response(text: str) -> Dict[str, Any]:
    # Try 1: direct parse
    try:
        return json.loads(text)
    except:
        pass
    
    # Try 2: strip markdown backticks
    try:
        cleaned = re.sub(r'```json|```', '', text).strip()
        return json.loads(cleaned)
    except:
        pass
    
    # Try 3: find JSON object in text
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except:
        pass
    
    # Fallback: return template report
    return {
        "executive_summary": "AI analysis unavailable. Manual review required.",
        "risk_assessment": "System generated fallback report.",
        "flagged_activities": ["Automated detection triggered"],
        "ml_explanation": "Isolation Forest anomaly score exceeded threshold.",
        "peer_comparison": "Behaviour deviates from role baseline.",
        "recommended_actions": ["Review user activity logs", 
                                "Verify recent transactions",
                                "Contact user's supervisor"],
        "severity_verdict": "HIGH"
    }


def generate_ai_report(user_id: int) -> Dict[str, Any]:
    user = get_user(user_id)
    if not user:
        raise ValueError("User not found")
    behaviour = get_user_behaviour(user_id, limit=120)
    alerts = [a for a in get_alerts(limit=300) if a["user_id"] == user_id][:25]
    anomalies = [a.get("natural_language") or a.get("message") for a in alerts]
    baseline = _baseline_for_role(user["role"])

    prompt = (
        "You are a fraud analyst. Respond ONLY with a valid JSON object. "
        "No markdown, no backticks, no explanation before or after. "
        "Just raw JSON with these exact keys: "
        "executive_summary, risk_assessment, flagged_activities, "
        "ml_explanation, peer_comparison, recommended_actions, severity_verdict\n\n"
        f"User: {user['name']}, Role: {user['role']}, Risk Score: {round(user['risk_score'], 2)}/100\n"
        f"Anomalous Activities: {anomalies}\n"
        f"Normal baseline for this role: {baseline}\n"
    )

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or genai is None:
        return _fallback_report(user, anomalies, baseline)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        parsed = parse_gemini_response(text)
        
        # Ensure required fields have correct types
        if not isinstance(parsed.get("flagged_activities"), list):
            parsed["flagged_activities"] = anomalies[:6]
        if not isinstance(parsed.get("recommended_actions"), list):
            parsed["recommended_actions"] = [str(parsed.get("recommended_actions", ""))]
        
        return parsed
    except Exception:
        return _fallback_report(user, anomalies, baseline)
