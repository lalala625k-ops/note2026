import os
import json
from typing import Dict, Any

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DATA_FILE = os.path.join(DATA_DIR, "cards.json")
os.makedirs(DATA_DIR, exist_ok=True)

def load_data_from_disk() -> Dict[str, Any]:
    if not os.path.exists(DATA_FILE):
        return {"cards": [], "groups": []}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return {"cards": data, "groups": []}
            return data
    except Exception as e:
        print(f"Error reading {DATA_FILE}: {e}")
        return {"cards": [], "groups": []}

def save_data_to_disk(data: Dict[str, Any]):
    tmp_file = DATA_FILE + ".tmp"
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, DATA_FILE)
