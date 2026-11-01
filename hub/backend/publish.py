import json
import os
import urllib.error
import urllib.request

GH_REPO = os.environ.get("SOURCE_REPO", "yiyu12138/ziyong")
GH_BRANCH = os.environ.get("SOURCE_BRANCH", "main")
TOKEN = os.environ.get("GH_TOKEN", "")


class GitHubError(RuntimeError):
    pass


def _api(path, method="GET", body=None):
    if not TOKEN:
        raise GitHubError("没有配置 GH_TOKEN，无法发布")
    url = "https://api.github.com" + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/vnd.github+json",
        "User-Agent": "egern-hub",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:300]
        raise GitHubError(f"GitHub {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise GitHubError(f"连不上 GitHub：{e.reason}")


def publish(files, message="publish from admin"):
    """files: {path: content 或 None}，None 表示删除。一次 commit 提交全部。"""
    ref = _api(f"/repos/{GH_REPO}/git/ref/heads/{GH_BRANCH}")
    head = ref["object"]["sha"]
    commit = _api(f"/repos/{GH_REPO}/git/commits/{head}")
    base_tree = commit["tree"]["sha"]

    tree = []
    for path, content in files.items():
        if content is None:
            tree.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
        else:
            blob = _api(f"/repos/{GH_REPO}/git/blobs", "POST",
                        {"content": content, "encoding": "utf-8"})
            tree.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})

    if not tree:
        return None

    new_tree = _api(f"/repos/{GH_REPO}/git/trees", "POST",
                    {"base_tree": base_tree, "tree": tree})
    new_commit = _api(f"/repos/{GH_REPO}/git/commits", "POST",
                      {"message": message, "tree": new_tree["sha"], "parents": [head]})
    _api(f"/repos/{GH_REPO}/git/refs/heads/{GH_BRANCH}", "PATCH",
         {"sha": new_commit["sha"], "force": False})
    return new_commit["sha"]
