import random
from typing import Dict, List

from faker import Faker

fake = Faker("en_IN")

CITY_POOL = [
    "Mumbai",
    "Delhi",
    "Bengaluru",
    "Hyderabad",
    "Chennai",
    "Pune",
    "Kolkata",
    "Ahmedabad",
]

ROLE_PLAN = [
    ("Teller", "Retail Operations", 10),
    ("Loan Officer", "Retail Lending", 8),
    ("Treasury Manager", "Treasury", 4),
    ("System Admin", "IT Security", 2),
    ("Super Admin", "Enterprise Risk", 1),
]


MODULES_BY_ROLE = {
    "Teller": ["Core Banking", "Customer Database"],
    "Loan Officer": ["Core Banking", "Loan Origination", "Customer Database"],
    "Treasury Manager": ["Treasury", "Core Banking", "Audit Logs"],
    "System Admin": ["Audit Logs", "Core Banking", "Customer Database"],
    "Super Admin": ["Core Banking", "Treasury", "Loan Origination", "Customer Database", "Audit Logs"],
}


def generate_ifsc() -> str:
    bank_codes = ["HDFC", "ICIC", "SBIN", "AXIS", "KKBK", "UTIB"]
    return f"{random.choice(bank_codes)}0{random.randint(100000, 999999)}"


def generate_users() -> List[Dict]:
    users = []
    for role, dept, count in ROLE_PLAN:
        for _ in range(count):
            city = random.choice(CITY_POOL)
            baseline_tx_min = random.randint(5, 10)
            baseline_tx_max = random.randint(11, 20)
            baseline_amt_min = random.randint(1_000, 25_000)
            baseline_amt_max = random.randint(150_000, 500_000)

            users.append(
                {
                    "name": fake.name(),
                    "role": role,
                    "department": dept,
                    "city": city,
                    "ifsc_code": generate_ifsc(),
                    "baseline_login_start": 9,
                    "baseline_login_end": 18,
                    "baseline_tx_min": baseline_tx_min,
                    "baseline_tx_max": baseline_tx_max,
                    "baseline_amt_min": baseline_amt_min,
                    "baseline_amt_max": baseline_amt_max,
                    "baseline_records_min": random.randint(10, 20),
                    "baseline_records_max": random.randint(30, 50),
                    "incident_count": 0,
                    "risk_score": 0,
                    "status": "ACTIVE",
                }
            )
    random.shuffle(users)
    return users


def training_samples_for_user(user: Dict, days: int = 30) -> List[Dict]:
    samples = []
    for _ in range(days):
        for _ in range(random.randint(2, 5)):
            hour = random.randint(user["baseline_login_start"], user["baseline_login_end"])
            tx_count = random.randint(user["baseline_tx_min"], user["baseline_tx_max"])
            avg_amount = random.uniform(user["baseline_amt_min"], user["baseline_amt_max"])
            records = random.randint(user["baseline_records_min"], user["baseline_records_max"])
            samples.append(
                {
                    "login_hour": hour,
                    "transaction_count": tx_count,
                    "avg_amount": avg_amount,
                    "location_changes": random.choice([0, 0, 1]),
                    "records_accessed": records,
                    "failed_logins": random.choice([0, 0, 1]),
                    "access_after_hours": 1 if hour < 9 or hour > 18 else 0,
                    "privilege_escalation_attempts": 0,
                }
            )
    return samples
