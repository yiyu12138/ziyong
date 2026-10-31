import hashlib
import json
import os
import re
import shutil
import subprocess
import urllib.parse

from . import db

UPSTREAM_REPO = "https://github.com/QingRex/LoonKissSurge"
RAW_BASE = "https://raw.githubusercontent.com/QingRex/LoonKissSurge/refs/heads/main/"
CLONE_DIR = os.environ.get("CLONE_DIR", "/tmp/lks")

AUTHOR_RE = re.compile(r"\[(https?://[^\]]+)\]")
GENERIC_CAT = {"Key", "Module", "BetaModule", "去广告", "工具", "订阅管理",
               "机场流量信息", "Enhancement", "配置管理", "DNS", "签到", "定时任务"}


def _meta(text):
    meta = {}
    for line in text.splitlines():
        if not line.startswith("#!"):
            break
        body = line[2:]
        if "=" in body:
            k, v = body.split("=", 1)
            meta.setdefault(k.strip(), v.strip())
    return meta


def _author(meta, text):
    raw = meta.get("author", "").strip()
    if raw:
        first = raw.split(",")[0].strip()
        m = AUTHOR_RE.search(first)
        name = AUTHOR_RE.sub("", first).strip()
        name = re.sub(r"[🅥✅⭐️\s]+$", "", name).strip() or first
        link = ""
        if m:
            link = m.group(1).split("/blob/")[0]
            mm = re.match(r"(https://github\.com/[^/]+)", link)
            if mm:
                link = mm.group(1)
        return name, link

    cat = re.sub(r"[🐻🍟☁️⭐️\s]+", "", (meta.get("category") or "").strip())
    if cat and cat not in GENERIC_CAT and len(cat) <= 20:
        return cat, ("https://github.com/" + cat if re.fullmatch(r"[A-Za-z0-9_.-]+", cat) else "")

    m = re.search(r"^#\s*Thank[s]?\s+(.+)$", text, re.M)
    if m:
        cand = re.split(r"[,，、\s]+", m.group(1).strip())[0].lstrip("@")
        if cand and len(cand) <= 20:
            return cand, ("https://github.com/" + cand if re.fullmatch(r"[A-Za-z0-9_.-]+", cand) else "")
    return "", ""


def parse_arguments(raw):
    """`名称:值,名称:值` → [{k, v}]；值为 -- 的是分组标题。"""
    if not raw:
        return []
    out = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            k, v = part.split(":", 1)
        else:
            k, v = part, ""
        out.append({"k": k.strip(), "v": v.strip()})
    return out


def _clean_desc(v):
    v = v.replace("\\n", " ")
    return re.sub(r"\s+", " ", v).strip()


def clone_or_pull():
    parent = os.path.dirname(CLONE_DIR) or "."
    os.makedirs(parent, exist_ok=True)
    if os.path.isdir(os.path.join(CLONE_DIR, ".git")):
        subprocess.run(["git", "-C", CLONE_DIR, "fetch", "--depth", "1", "origin", "main"],
                       check=True, capture_output=True, timeout=300)
        subprocess.run(["git", "-C", CLONE_DIR, "reset", "--hard", "origin/main"],
                       check=True, capture_output=True, timeout=300)
    else:
        shutil.rmtree(CLONE_DIR, ignore_errors=True)
        subprocess.run(["git", "clone", "--depth", "1", UPSTREAM_REPO, CLONE_DIR],
                       check=True, capture_output=True, timeout=600)


def sync():
    clone_or_pull()
    root = CLONE_DIR
    seen = set()
    added = updated = 0

    with db.conn() as c:
        rows = {r["module_url"]: r for r in c.execute(
            "SELECT id, module_url, content_hash FROM plugins WHERE is_self=0")}

        for dirpath, dirnames, filenames in os.walk(root):
            if "/.git" in dirpath:
                continue
            for fn in filenames:
                if not fn.endswith(".sgmodule"):
                    continue
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, root).replace(os.sep, "/")
                if not rel.startswith("Surge/"):
                    continue

                text = open(full, encoding="utf-8", errors="ignore").read()
                meta = _meta(text)
                h = hashlib.md5(text.encode("utf-8", "ignore")).hexdigest()
                url = RAW_BASE + urllib.parse.quote(rel)
                seen.add(url)

                name = meta.get("name") or fn[:-9]
                desc = _clean_desc(meta.get("desc", "")) or "（作者未写说明）"
                author, author_url = _author(meta, text)
                grp = ("Beta" if "/Beta/" in rel else
                       "Official" if rel.startswith("Surge/Official/") else "正式版")
                nkey = db.norm_key(name)
                args_json = json.dumps(parse_arguments(meta.get("arguments", "")), ensure_ascii=False) if meta.get("arguments") else ""
                tags = meta.get("tag", "")
                has_script = 1 if re.search(r"^\[Script\]", text, re.M) else 0
                has_mitm = 1 if re.search(r"^\[MITM\]", text, re.M) else 0
                repo = meta.get("homepage", "")
                if not repo:
                    repo = "https://github.com/luestr/ProxyResource" if grp == "正式版" else author_url

                old = rows.get(url)
                if old is None:
                    c.execute("""INSERT INTO plugins
                        (name,description,author,author_url,repo_url,module_url,grp,tags,
                         has_script,has_mitm,content_hash,source_repo,source_path,norm_key,args,is_self,unread)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)""",
                              (name, desc, author, author_url, repo, url, grp, tags,
                               has_script, has_mitm, h, UPSTREAM_REPO, rel, nkey, args_json))
                    added += 1
                elif old["content_hash"] != h:
                    c.execute("""UPDATE plugins SET name=?,description=?,author=?,author_url=?,
                        repo_url=?,grp=?,tags=?,has_script=?,has_mitm=?,content_hash=?,
                        source_path=?,norm_key=?,args=?,unread=1,updated_at=datetime('now','localtime')
                        WHERE id=?""",
                              (name, desc, author, author_url, repo, grp, tags, has_script,
                               has_mitm, h, rel, nkey, args_json, old["id"]))
                    updated += 1
                elif args_json:
                    # 内容没变，但可能是新版本才解析参数，补一下
                    c.execute("UPDATE plugins SET args=? WHERE id=? AND IFNULL(args,'')<>?",
                              (args_json, old["id"], args_json))

        # 回填历史数据的 norm_key
        for r in c.execute("SELECT id, name, norm_key FROM plugins").fetchall():
            nk = db.norm_key(r["name"])
            if (r["norm_key"] or "") != nk:
                c.execute("UPDATE plugins SET norm_key=? WHERE id=?", (nk, r["id"]))

        c.execute("INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
                  ("last_sync", __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

    removed = [u for u in rows if u not in seen]
    return {"added": added, "updated": updated, "missing": len(removed), "total": len(seen),
            "last_sync": db.get_setting("last_sync")}
