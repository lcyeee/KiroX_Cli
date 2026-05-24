import os
from dotenv import load_dotenv

load_dotenv()

DEFAULT_OUTPUT_PATH = "output/results.json"
DEFAULT_MOEMAIL_URL = "https://api.moemail.app"
DEFAULT_OUTLOOK_CSV = "outlook.csv"

MOEMAIL_URL = os.getenv("MOEMAIL_BASE_URL", DEFAULT_MOEMAIL_URL)
MOEMAIL_KEY = os.getenv("MOEMAIL_API_KEY", "")

PROXY_PATTERN = r"^(https?|socks5)://[^\s]+$"

CLI_PARAM_MAP = {
    "count": "-n",
    "output": "-o",
    "proxy": "-p",
    "delay": "-d",
    "concurrency": "-j",
    "use_outlook": "-outlook",
    "outlook_csv": "-outlook-csv",
    "moemail_url": "-moemail-url",
    "moemail_key": "-moemail-key",
    "debug": "-debug",
}
