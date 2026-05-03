from typing import Dict, List

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM

FEATURES = [
    "login_hour",
    "transaction_count",
    "avg_amount",
    "location_changes",
    "records_accessed",
    "failed_logins",
    "access_after_hours",
    "privilege_escalation_attempts",
]


class FraudAnomalyModel:
    def __init__(self) -> None:
        self.scaler = StandardScaler()
        self.iso = IsolationForest(contamination=0.1, random_state=42, n_estimators=250)
        self.ocsvm = OneClassSVM(nu=0.1, gamma="scale")
        self.trained = False

    def _to_matrix(self, rows: List[Dict]) -> np.ndarray:
        return np.array([[float(r[k]) for k in FEATURES] for r in rows], dtype=float)

    def train(self, training_rows: List[Dict]) -> None:
        if not training_rows:
            raise ValueError("No training rows supplied")
        x = self._to_matrix(training_rows)
        x_scaled = self.scaler.fit_transform(x)
        self.iso.fit(x_scaled)
        self.ocsvm.fit(x_scaled)
        self.trained = True

    def score(self, row: Dict) -> float:
        if not self.trained:
            raise RuntimeError("Model not trained")

        x = self._to_matrix([row])
        x_scaled = self.scaler.transform(x)

        iso_anomaly = -self.iso.decision_function(x_scaled)[0]
        iso_prob = 1.0 / (1.0 + np.exp(-iso_anomaly * 3.5))

        svm_anomaly = -self.ocsvm.decision_function(x_scaled)[0]
        svm_prob = 1.0 / (1.0 + np.exp(-svm_anomaly * 2.8))

        combined = (iso_prob * 0.7) + (svm_prob * 0.3)
        return float(np.clip(combined * 100.0, 0.0, 100.0))
