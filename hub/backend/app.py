import asyncio
import datetime
import json
import os
import re
import urllib.parse
import urllib.request

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import db, sync as upstream

WEB_DIR = os.environ.get("WEB_DIR", "/app/web")
CUSTOM_DIR = os.environ.get("CUSTOM_DIR", "/app/data/custom")
CLONE_DIR = os.environ.get("CLONE_DIR", "/tmp/lks")
GH_REPO = os.environ.get("SOURCE_REPO", "yiyu12138/ziyong")
GH_BRANCH = os.environ.get("SOURCE_BRANCH", "main")
GH_RAW = f"https://raw.githubusercontent.com/{GH_REPO}/{GH_BRANCH}/"
GH_API = f"https://api.github.com/repos/{GH_REPO}/contents/"
CONFIG_EXT = (".yaml", ".yml", ".sgmodule", ".json", ".list", ".conf")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
SYNC_AT = os.environ.get("SYNC_AT", "04:17")
SYNC_ENABLED = os.environ.get("SYNC_ENABLED", "0") == "1"

app = FastAPI(title="Egern 插件库")


# ---------- 工具 ----------
def require_admin(request: Request):
    if not ADMIN_TOKEN:
        return
    if request.headers.get("x-auth-token", "") != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="需要口令")


def row_to_dict(r):
    return {
        "id": r["id"], "name": r["name"], "desc": r["description"],
        "author": r["author"], "author_url": r["author_url"], "repo_url": r["repo_url"],
        "url": r["module_url"], "group": r["grp"], "tags": r["tags"],
        "has_script": bool(r["has_script"]), "has_mitm": bool(r["has_mitm"]),
        "is_self": bool(r["is_self"]), "favorite": bool(r["favorite"]),
        "installed": bool(r["installed"]), "unread": bool(r["unread"]),
        "updated_at": r["updated_at"], "norm_key": r["norm_key"],
        "args": json.loads(r["args"]) if r["args"] else [],
        "kind": r["kind"] or "module",
    }


def parse_meta(text):
    """同时支持 Surge/Loon 的 #! 头和 Egern 的 yaml 头。"""
    meta = {}
    if text.lstrip().startswith("#!"):
        for line in text.splitlines():
            if not line.startswith("#!"):
                break
            body = line[2:]
            if "=" in body:
                k, v = body.split("=", 1)
                meta.setdefault(k.strip(), v.strip())
        return meta
    for key in ("name", "description", "desc", "author", "homepage"):
        m = re.search(rf"^{key}\s*:\s*['\"]?(.+?)['\"]?\s*$", text, re.M)
        if m:
            meta[key] = m.group(1).strip()
    if "description" in meta and "desc" not in meta:
        meta["desc"] = meta["description"]
    return meta


# ---------- 启动 ----------
@app.on_event("startup")
async def startup():
    db.init()
    if SYNC_ENABLED:
        if db.get_setting("last_sync") is None:
            try:
                await asyncio.to_thread(upstream.sync)
            except Exception as e:  # 首次失败不影响页面
                print("首次同步失败:", e)
        asyncio.create_task(scheduler())


async def scheduler():
    while True:
        now = datetime.datetime.now()
        target = now.replace(hour=int(SYNC_AT.split(":")[0]),
                             minute=int(SYNC_AT.split(":")[1]), second=0, microsecond=0)
        if target <= now:
            target += datetime.timedelta(days=1)
        await asyncio.sleep((target - now).total_seconds())
        try:
            await asyncio.to_thread(upstream.sync)
        except Exception as e:
            print("定时同步失败:", e)


# ---------- 读接口 ----------
GROUP_ORDER = {"自用": 0}


def build_groups(rows):
    buckets = {}
    for r in rows:
        it = row_to_dict(r)
        k = it.get("norm_key") or it["name"].lower()
        buckets.setdefault(k, []).append(it)
    groups = []
    for k, vs in buckets.items():
        vs.sort(key=lambda v: (GROUP_ORDER.get(v["group"], 9), v["name"]))
        # 上游存在不同文件但 #!name 相同的情况，同分组同名只留一个
        seen, dedup = set(), []
        for v in vs:
            sig = (v["group"], v["name"])
            if sig in seen:
                continue
            seen.add(sig)
            dedup.append(v)
        vs = dedup
        main = vs[0]
        groups.append({
            "key": k,
            "name": main["name"],
            "desc": main["desc"],
            "tags": main["tags"],
            "author": main["author"],
            "author_url": main["author_url"],
            "repo_url": main["repo_url"],
            "group": main["group"],
            "has_script": any(v["has_script"] for v in vs),
            "favorite": any(v["favorite"] for v in vs),
            "installed": any(v["installed"] for v in vs),
            "unread": any(v["unread"] for v in vs),
            "variants": vs,
        })
    groups.sort(key=lambda g: (not g["favorite"], GROUP_ORDER.get(g["group"], 9), g["name"]))
    return groups


@app.get("/api/bootstrap")
def bootstrap():
    with db.conn() as c:
        rows = c.execute("SELECT * FROM plugins").fetchall()
    groups = build_groups(rows)
    counts = {"全部": len(groups), "自建": 0, "正式版": 0, "Official": 0, "Beta": 0}
    tags = {}
    for g in groups:
        seen = set()
        for v in g["variants"]:
            counts[v["group"]] = counts.get(v["group"], 0) + (0 if v["group"] in seen else 1)
            seen.add(v["group"])
            for t in (v["tags"] or "").split(","):
                t = t.strip()
                if t and t not in seen:
                    tags[t] = tags.get(t, 0) + 1
    total = len(groups)
    unread = sum(1 for g in groups if g["unread"])
    order = ["全部"] + sorted([k for k in counts if k != "全部" and counts[k]],
                              key=lambda k: (-counts[k], k))
    return {
        "total": total, "unread": unread,
        "groups": [{"key": k, "count": counts.get(k, 0)} for k in order],
        "tags": sorted([{"tag": k, "count": v} for k, v in tags.items()], key=lambda x: -x["count"]),
        "last_sync": db.get_setting("last_sync"),
        "admin": bool(ADMIN_TOKEN),
        "sync_enabled": SYNC_ENABLED,
    }


@app.get("/api/plugins")
def list_plugins(group: str = "全部", tag: str = "", q: str = "", only_fav: int = 0):
    with db.conn() as c:
        rows = c.execute("SELECT * FROM plugins").fetchall()
    groups = build_groups(rows)
    out = []
    kw = (q or "").strip().lower()
    for g in groups:
        if group != "全部" and group not in [v["group"] for v in g["variants"]]:
            continue
        if only_fav and not g["favorite"]:
            continue
        if tag and not any(tag == t.strip() for v in g["variants"] for t in (v["tags"] or "").split(",")):
            continue
        if kw:
            hay = " ".join([v["name"] + " " + v["desc"] + " " + v["author"] for v in g["variants"]]).lower()
            if kw not in hay:
                continue
        out.append(g)
    return out


@app.get("/api/plugins/{pid}")
def get_plugin(pid: int):
    with db.conn() as c:
        r = c.execute("SELECT * FROM plugins WHERE id=?", (pid,)).fetchone()
    if not r:
        raise HTTPException(404)
    return row_to_dict(r)


# ---------- 写接口 ----------
@app.post("/api/plugins")
async def create_plugin(request: Request, payload: dict = Body(...)):
    require_admin(request)
    name = (payload.get("name") or "").strip()
    url = (payload.get("url") or "").strip()
    if not name or not url:
        raise HTTPException(400, "名称和模块地址必填")
    with db.conn() as c:
        try:
            c.execute("""INSERT INTO plugins
              (name,description,author,author_url,repo_url,module_url,grp,tags,norm_key,is_self,unread)
              VALUES (?,?,?,?,?,?,?,?,?,1,0)""",
                      (name, payload.get("desc", ""), payload.get("author", ""),
                       payload.get("author_url", ""), payload.get("repo_url", ""), url,
                       (payload.get("group") or "自用").strip(), payload.get("tags", ""),
                       db.norm_key(name)))
            pid = c.execute("SELECT last_insert_rowid() id").fetchone()["id"]
        except Exception:
            raise HTTPException(400, "这个模块地址已经收录过了")
    return {"id": pid}


@app.put("/api/plugins/{pid}")
async def update_plugin(request: Request, pid: int, payload: dict = Body(...)):
    require_admin(request)
    with db.conn() as c:
        r = c.execute("SELECT * FROM plugins WHERE id=?", (pid,)).fetchone()
        if not r:
            raise HTTPException(404)
        if not r["is_self"]:
            raise HTTPException(400, "上游插件不能改，只能改自建的")
        c.execute("""UPDATE plugins SET name=?,description=?,author=?,author_url=?,
                     repo_url=?,module_url=?,grp=?,norm_key=?,updated_at=datetime('now','localtime')
                     WHERE id=?""",
                  (payload.get("name", r["name"]), payload.get("desc", r["description"]),
                   payload.get("author", r["author"]), payload.get("author_url", r["author_url"]),
                   payload.get("repo_url", r["repo_url"]), payload.get("url", r["module_url"]),
                   payload.get("group", r["grp"]),
                   db.norm_key(payload.get("name", r["name"])), pid))
    return {"ok": True}


@app.delete("/api/plugins/{pid}")
async def delete_plugin(request: Request, pid: int):
    require_admin(request)
    with db.conn() as c:
        r = c.execute("SELECT is_self FROM plugins WHERE id=?", (pid,)).fetchone()
        if not r:
            raise HTTPException(404)
        if not r["is_self"]:
            raise HTTPException(400, "上游插件不能删")
        c.execute("DELETE FROM plugins WHERE id=?", (pid,))
    return {"ok": True}


@app.post("/api/plugins/{pid}/favorite")
def toggle_fav(pid: int):
    with db.conn() as c:
        r = c.execute("SELECT favorite FROM plugins WHERE id=?", (pid,)).fetchone()
        if not r:
            raise HTTPException(404)
        v = 0 if r["favorite"] else 1
        c.execute("UPDATE plugins SET favorite=? WHERE id=?", (v, pid))
    return {"favorite": bool(v)}


@app.post("/api/plugins/{pid}/installed")
def mark_installed(pid: int):
    with db.conn() as c:
        c.execute("UPDATE plugins SET installed=1, unread=0 WHERE id=?", (pid,))
    return {"ok": True}


@app.post("/api/plugins/{pid}/read")
def mark_read(pid: int):
    with db.conn() as c:
        c.execute("UPDATE plugins SET unread=0 WHERE id=?", (pid,))
    return {"ok": True}


@app.post("/api/sync")
async def do_sync(request: Request):
    require_admin(request)
    if not SYNC_ENABLED:
        raise HTTPException(400, "上游同步已关闭，插件由你手动维护")
    try:
        return await asyncio.to_thread(upstream.sync)
    except Exception as e:
        raise HTTPException(500, f"同步失败：{e}")


def _read_module_text(row):
    sp = row["source_path"] or ""
    if sp:
        local = os.path.join(CLONE_DIR, sp)
        if os.path.exists(local):
            return open(local, encoding="utf-8", errors="ignore").read()
    req = urllib.request.Request(row["module_url"], headers={"User-Agent": "egern-hub/1.0"})
    return urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")


@app.get("/api/plugins/{pid}/args")
def plugin_args(pid: int):
    with db.conn() as c:
        r = c.execute("SELECT * FROM plugins WHERE id=?", (pid,)).fetchone()
    if not r:
        raise HTTPException(404)
    return {"name": r["name"], "url": r["module_url"],
            "args": json.loads(r["args"]) if r["args"] else []}


@app.post("/api/plugins/{pid}/customize")
def customize_plugin(request: Request, pid: int, payload: dict = Body(...)):
    require_admin(request)
    values = payload.get("values") or {}
    with db.conn() as c:
        r = c.execute("SELECT * FROM plugins WHERE id=?", (pid,)).fetchone()
    if not r:
        raise HTTPException(404)
    try:
        text = _read_module_text(r)
    except Exception as e:
        raise HTTPException(400, f"读取模块失败：{e}")

    defined = [a["k"] for a in (json.loads(r["args"]) if r["args"] else [])]
    for k in defined:
        if k in values:
            text = re.sub(r"\{\{\{\s*" + re.escape(k) + r"\s*\}\}\}", str(values[k]), text)
    # 参数已固化，去掉声明行
    text = re.sub(r"^#!arguments=.*\n", "", text, flags=re.M)
    text = re.sub(r"^#!arguments-desc=.*\n", "", text, flags=re.M)
    text = text.replace("{;}", ",")

    os.makedirs(CUSTOM_DIR, exist_ok=True)
    digest = __import__("hashlib").sha1(text.encode("utf-8")).hexdigest()[:16]
    fname = f"{r['id']}-{digest}.sgmodule"
    with open(os.path.join(CUSTOM_DIR, fname), "w", encoding="utf-8") as f:
        f.write(text)
    return {"url": "/custom/" + fname, "name": r["name"]}


@app.post("/api/fetch-meta")
def fetch_meta(request: Request, payload: dict = Body(...)):
    require_admin(request)
    url = (payload.get("url") or "").strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "地址不对")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "egern-hub/1.0"})
        text = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
    except Exception as e:
        raise HTTPException(400, f"读取失败：{e}")
    meta = parse_meta(text)
    author = meta.get("author", "")
    m = re.search(r"\[(https?://[^\]]+)\]", author)
    author_url = m.group(1) if m else ""
    author = re.sub(r"\[.*?\]", "", author).strip()
    repo = meta.get("homepage", "")
    mm = re.match(r"https://raw\.githubusercontent\.com/([^/]+)/([^/]+)/", url)
    if mm and not repo:
        repo = f"https://github.com/{mm.group(1)}/{mm.group(2)}"
    if not author and mm:
        author = mm.group(1)
        author_url = author_url or f"https://github.com/{mm.group(1)}"
    return {"name": meta.get("name", ""), "desc": meta.get("desc", ""),
            "author": author, "author_url": author_url, "repo_url": repo,
            "has_script": bool(re.search(r"^\[Script\]", text, re.M))}


# ---------- 分类 ----------
@app.get("/api/categories")
def list_categories():
    with db.conn() as c:
        rows = c.execute("""SELECT c.*, (SELECT COUNT(*) FROM plugins p WHERE p.grp=c.name) n
                            FROM categories c ORDER BY c.sort, c.name""").fetchall()
    return [dict(r) for r in rows]


@app.post("/api/categories")
def create_category(request: Request, payload: dict = Body(...)):
    require_admin(request)
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "分类名不能为空")
    with db.conn() as c:
        c.execute("""INSERT INTO categories(name,dir,kind,sort) VALUES(?,?,?,?)
                     ON CONFLICT(name) DO UPDATE SET dir=excluded.dir, kind=excluded.kind""",
                  (name, (payload.get("dir") or "").strip(), payload.get("kind") or "module",
                   int(payload.get("sort") or 0)))
    return {"ok": True}


@app.put("/api/categories/{name}")
def update_category(request: Request, name: str, payload: dict = Body(...)):
    require_admin(request)
    new = (payload.get("name") or "").strip()
    with db.conn() as c:
        row = c.execute("SELECT * FROM categories WHERE name=?", (name,)).fetchone()
        if not row:
            raise HTTPException(404)
        c.execute("UPDATE categories SET dir=?, kind=? WHERE name=?",
                  (payload.get("dir", row["dir"]), payload.get("kind", row["kind"]), name))
        if new and new != name:
            c.execute("UPDATE categories SET name=? WHERE name=?", (new, name))
            c.execute("UPDATE plugins SET grp=? WHERE grp=?", (new, name))
    return {"ok": True}


@app.delete("/api/categories/{name}")
def delete_category(request: Request, name: str):
    require_admin(request)
    with db.conn() as c:
        n = c.execute("SELECT COUNT(*) n FROM plugins WHERE grp=?", (name,)).fetchone()["n"]
        if n:
            raise HTTPException(400, f"这个分类下还有 {n} 个条目，先删掉或移走")
        c.execute("DELETE FROM categories WHERE name=?", (name,))
    return {"ok": True}


# ---------- 从仓库目录导入 ----------
def _gh_list(path):
    url = GH_API + urllib.parse.quote(path) + "?ref=" + GH_BRANCH
    req = urllib.request.Request(url, headers={
        "User-Agent": "egern-hub/1.0", "Accept": "application/vnd.github+json"})
    return json.loads(urllib.request.urlopen(req, timeout=25).read())


def _walk_repo(path, depth=0, skip=()):
    if depth > 3:
        return
    for item in _gh_list(path):
        if item["type"] == "dir":
            if "/images" in "/" + item["path"] or item["name"].startswith("."):
                continue
            if any(sk in "/" + item["path"] + "/" for sk in skip):
                continue
            yield from _walk_repo(item["path"], depth + 1, skip)
        elif item["type"] == "file" and item["name"].lower().endswith(CONFIG_EXT):
            yield item["path"]


@app.post("/api/categories/{name}/scan")
async def scan_category(request: Request, name: str):
    require_admin(request)
    with db.conn() as c:
        cat = c.execute("SELECT * FROM categories WHERE name=?", (name,)).fetchone()
    if not cat:
        raise HTTPException(404, "分类不存在")
    if not cat["dir"]:
        raise HTTPException(400, "这个分类还没绑定仓库目录")

    def work():
        skip = ("/rules/", "/iconset/", "/node_modules/") if cat["kind"] == "module" else ()
        files = list(_walk_repo(cat["dir"].strip("/"), 0, skip))
        added, skipped, failed = 0, 0, []
        with db.conn() as c:
            for f in files:
                url = GH_RAW + urllib.parse.quote(f)
                if c.execute("SELECT 1 FROM plugins WHERE module_url=?", (url,)).fetchone():
                    skipped += 1
                    continue
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "egern-hub/1.0"})
                    text = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
                except Exception as e:
                    failed.append(f"{f}: {e}")
                    continue
                meta = parse_meta(text)
                nm = meta.get("name") or f.rsplit("/", 1)[-1].rsplit(".", 1)[0]
                desc = meta.get("desc") or meta.get("description") or ""
                c.execute("""INSERT INTO plugins(name,description,author,author_url,repo_url,
                             module_url,grp,tags,norm_key,kind,is_self)
                             VALUES(?,?,?,?,?,?,?,'',?,?,1)""",
                          (nm, desc, meta.get("author", ""), "", "", url, name,
                           db.norm_key(nm), cat["kind"]))
                added += 1
        return {"added": added, "skipped": skipped, "failed": failed[:5], "scanned": len(files)}

    return await asyncio.to_thread(work)


@app.get("/api/export")
def export_all(request: Request):
    require_admin(request)
    with db.conn() as c:
        rows = [row_to_dict(r) for r in c.execute("SELECT * FROM plugins")]
    return JSONResponse(rows)


@app.post("/api/import")
async def import_all(request: Request, rows: list = Body(...)):
    require_admin(request)
    n = 0
    with db.conn() as c:
        for r in rows:
            if not r.get("url"):
                continue
            c.execute("""INSERT INTO plugins
              (name,description,author,author_url,repo_url,module_url,grp,tags,is_self)
              VALUES (?,?,?,?,?,?,?,?,1) ON CONFLICT(module_url) DO NOTHING""",
                      (r.get("name", ""), r.get("desc", ""), r.get("author", ""),
                       r.get("author_url", ""), r.get("repo_url", ""), r["url"],
                       r.get("group", "自建"), r.get("tags", "")))
            n += 1
    return {"imported": n}


os.makedirs(CUSTOM_DIR, exist_ok=True)
app.mount("/custom", StaticFiles(directory=CUSTOM_DIR), name="custom")
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
