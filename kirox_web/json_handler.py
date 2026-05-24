import os
import json


def load_results(json_path: str) -> list[dict]:
    if not os.path.exists(json_path):
        return []
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        return []
    except (json.JSONDecodeError, IOError):
        return []


def get_success_count(results: list[dict]) -> int:
    return len(results)


def results_to_display(results: list[dict]) -> list[dict]:
    display = []
    for r in results:
        display.append({
            "email": r.get("email", ""),
            "refreshToken": r.get("refreshToken", ""),
            "clientId": r.get("clientId", ""),
            "clientSecret": r.get("clientSecret", ""),
            "subscription": r.get("subscription", ""),
            "creditUsed": r.get("creditUsed", ""),
            "creditLimit": r.get("creditLimit", ""),
            "region": r.get("region", ""),
            "provider": r.get("provider", ""),
        })
    return display
