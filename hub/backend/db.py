import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("DB_PATH", "/app/data/hub.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS plugins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  author       TEXT DEFAULT '',
  author_url   TEXT DEFAULT '',
  repo_url     TEXT DEFAULT '',
  module_url   TEXT NOT NULL UNIQUE,
  grp          TEXT NOT NULL,          -- 自建 / 正式版 / Official
  tags         TEXT DEFAULT '',         -- 逗号分隔
  has_script   INTEGER DEFAULT 0,
  has_mitm     INTEGER DEFAULT 0,
  content_hash TEXT DEFAULT '',
  source_repo  TEXT DEFAULT '',
  source_path  TEXT DEFAULT '',
  norm_key     TEXT DEFAULT '',
  args         TEXT DEFAULT '',
  icon         TEXT DEFAULT '',
  pinyin       TEXT DEFAULT '',
  is_self      INTEGER DEFAULT 0,
  favorite     INTEGER DEFAULT 0,
  installed    INTEGER DEFAULT 0,
  unread       INTEGER DEFAULT 0,       -- 上游有更新
  created_at   TEXT DEFAULT (datetime('now','localtime')),
  updated_at   TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  dir  TEXT DEFAULT '',
  kind TEXT DEFAULT 'module',
  sort INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT
);
CREATE INDEX IF NOT EXISTS idx_plugins_grp ON plugins(grp);
"""


@contextmanager
def conn():
    c = sqlite3.connect(DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with conn() as c:
        c.executescript(SCHEMA)
        cols = {r[1] for r in c.execute("PRAGMA table_info(plugins)")}
        if "norm_key" not in cols:
            c.execute("ALTER TABLE plugins ADD COLUMN norm_key TEXT DEFAULT ''")
        if "args" not in cols:
            c.execute("ALTER TABLE plugins ADD COLUMN args TEXT DEFAULT ''")
        if "kind" not in cols:
            c.execute("ALTER TABLE plugins ADD COLUMN kind TEXT DEFAULT 'module'")
        if "icon" not in cols:
            c.execute("ALTER TABLE plugins ADD COLUMN icon TEXT DEFAULT ''")
        if "pinyin" not in cols:
            c.execute("ALTER TABLE plugins ADD COLUMN pinyin TEXT DEFAULT ''")
        # 首次：用现有条目的分组兜底生成分类
        if c.execute("SELECT COUNT(*) n FROM categories").fetchone()[0] == 0:
            for name, in c.execute("SELECT DISTINCT grp FROM plugins WHERE IFNULL(grp,'')<>''").fetchall():
                c.execute("INSERT OR IGNORE INTO categories(name,dir,kind,sort) VALUES(?,?,?,?)",
                          (name, 'egern/' if name in ('去广告', '工具') else '', 'module',
                           {'去广告': 0, '工具': 1, '订阅': 2}.get(name, 9)))
        c.execute("CREATE INDEX IF NOT EXISTS idx_plugins_norm ON plugins(norm_key)")


def pinyin_key(name):
    try:
        from pypinyin import lazy_pinyin, Style
        full = "".join(lazy_pinyin(name))
        ini = "".join(lazy_pinyin(name, style=Style.FIRST_LETTER))
        return (full + " " + ini).lower()
    except Exception:
        return ""


def norm_key(name):
    import re
    s = (name or "").lower()
    s = re.sub(r"[（(\[【].*?[)）\]】]", "", s)
    s = s.replace("去广告", "").replace("广告", "")
    s = re.sub(r"[\s\-_·・—]+", "", s)
    return s or (name or "").lower()


def get_setting(k, default=None):
    with conn() as c:
        row = c.execute("SELECT v FROM settings WHERE k=?", (k,)).fetchone()
        return row["v"] if row else default


def set_setting(k, v):
    with conn() as c:
        c.execute("INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, str(v)))
