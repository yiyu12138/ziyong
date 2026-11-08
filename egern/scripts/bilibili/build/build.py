#!/usr/bin/env python3
"""把 kokoryh / 可莉 的 Loon 脚本重新打包成 Egern ctx 脚本。

用法: python3 build.py   （读取同目录下的上游 js，输出 ../../out/*.js）
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)          # bili/
OUT = os.path.join(SRC, "out")

JOBS = [
    {
        "name": "bilibili-json.js",
        "upstream": "Bilibili_json_kokoryh.js",
        "url": "https://raw.githubusercontent.com/kokoryh/Sparkle/master/dist/bilibili.json.js",
        "kind": "response",
        "mode": "text",
    },
    {
        "name": "bilibili-proto-request.js",
        "upstream": "Bilibili_proto_request_kokoryh.js",
        "url": "https://raw.githubusercontent.com/kokoryh/Sparkle/master/dist/bilibili.protobuf.request.js",
        "kind": "request",
        "mode": "binary",
    },
    {
        "name": "bilibili-proto-response.js",
        "upstream": "Bilibili_proto_response_kokoryh.js",
        "url": "https://raw.githubusercontent.com/kokoryh/Sparkle/master/dist/bilibili.protobuf.response.js",
        "kind": "response",
        "mode": "binary",
    },
]


def patch(code: str) -> tuple[str, int]:
    """$utils.ungzip 是同步 API，Egern 的是异步的：把调用点改成 await。"""
    n = 0
    new, c = re.subn(r"t\[0\]\?be\(t\.subarray\(5\)\):t\.subarray\(5\)",
                     "t[0]?await __egGunzip(ctx,t.subarray(5)):t.subarray(5)", code)
    n += c
    code = new
    new, c = re.subn(r"t\[0\]\?W\(t\.subarray\(5\)\):t\.subarray\(5\)",
                     "t[0]?await __egGunzip(ctx,t.subarray(5)):t.subarray(5)", code)
    n += c
    code = new
    return code, n


def fetch(url: str, dst: str) -> None:
    """上游文件不在本地时按需下载（iSH 上 GitHub raw 通常可直连）。"""
    if os.path.exists(dst):
        return
    import urllib.request
    print(f"下载 {url}")
    with urllib.request.urlopen(url, timeout=60) as r:
        data = r.read()
    with open(dst, "wb") as f:
        f.write(data)


def main() -> int:
    head_tpl = open(os.path.join(HERE, "head.js"), encoding="utf-8").read()
    tail = open(os.path.join(HERE, "tail.js"), encoding="utf-8").read()
    os.makedirs(OUT, exist_ok=True)

    for job in JOBS:
        src_path = os.path.join(HERE, job["upstream"])
        fetch(job["url"], src_path)
        src = open(src_path, encoding="utf-8").read()
        body, patches = patch(src)
        if job["mode"] == "binary" and patches == 0:
            print(f"! {job['name']}: 没找到 ungzip 补丁点", file=sys.stderr)
        head = (head_tpl
                .replace("__KIND__", job["kind"])
                .replace("__MODE__", job["mode"])
                .replace("__UPSTREAM__", job["url"]))
        out = head + body + tail
        dst = os.path.join(OUT, job["name"])
        with open(dst, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"{job['name']}: {len(out)} bytes, ungzip patches={patches}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
