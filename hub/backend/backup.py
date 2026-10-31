import datetime
import os
import sqlite3

from . import db

BACKUP_DIR = os.environ.get("BACKUP_DIR", "/app/data/backups")
KEEP = int(os.environ.get("BACKUP_KEEP", "7"))


def run():
    """每天留一份副本，保留 KEEP 天。"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    src = db.DB_PATH
    if not os.path.exists(src):
        return None
    stamp = datetime.datetime.now().strftime("%Y%m%d")
    dst = os.path.join(BACKUP_DIR, f"hub-{stamp}.db")
    if not os.path.exists(dst):
        s = sqlite3.connect(src)
        d = sqlite3.connect(dst)
        try:
            s.backup(d)
        finally:
            d.close()
            s.close()
    files = sorted(f for f in os.listdir(BACKUP_DIR)
                   if f.startswith("hub-") and f.endswith(".db"))
    for f in files[:-KEEP] if len(files) > KEEP else []:
        try:
            os.remove(os.path.join(BACKUP_DIR, f))
        except OSError:
            pass
    return dst
