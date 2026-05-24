import os
import pandas as pd


class OutlookAccount:
    def __init__(self, email: str, password: str, client_id: str, refresh_token: str):
        self.email = email
        self.password = password
        self.client_id = client_id
        self.refresh_token = refresh_token

    def to_dict(self):
        return {
            "email": self.email,
            "password": self.password,
            "client_id": self.client_id,
            "refresh_token": self.refresh_token,
        }


def load_outlook_csv(file_path: str) -> list[OutlookAccount]:
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.read()
    return parse_outlook_lines(lines)


def parse_outlook_lines(data: str) -> list[OutlookAccount]:
    accounts = []
    data = data.strip()
    if not data:
        return accounts

    lines = data.split("\n")
    if len(lines) == 1:
        parts = data.split()
        for part in parts:
            part = part.strip()
            if not part:
                continue
            fields = part.split("----", 3)
            if len(fields) == 4:
                accounts.append(OutlookAccount(
                    fields[0].strip(), fields[1].strip(),
                    fields[2].strip(), fields[3].strip(),
                ))
    else:
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("----", 3)
            if len(parts) == 4:
                accounts.append(OutlookAccount(
                    parts[0].strip(), parts[1].strip(),
                    parts[2].strip(), parts[3].strip(),
                ))
    return accounts


def save_outlook_csv(file_path: str, accounts: list[OutlookAccount]):
    lines = []
    for acc in accounts:
        lines.append(f"{acc.email}----{acc.password}----{acc.client_id}----{acc.refresh_token}")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def to_dataframe(accounts: list[OutlookAccount]) -> pd.DataFrame:
    if not accounts:
        return pd.DataFrame()
    return pd.DataFrame([acc.to_dict() for acc in accounts])
