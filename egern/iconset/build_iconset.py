#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描 images/ 生成 icons.json（Surge / QX / Loon / Egern 通用图标订阅格式）

用法：
    python3 build_iconset.py            # 生成 icons.json
    python3 build_iconset.py --check    # 只校验不写文件

命名规则：
    ChatGPT.png              -> 名称 ChatGPT
    ChatGPT~OpenAI~GPT.png   -> 名称 ChatGPT，外加别名 OpenAI、GPT（三条指向同一图）
    _ 开头或 . 开头的文件忽略

URL 带 ?v=<图片 md5 前 8 位>，换图后客户端才会刷新缓存。
"""
import hashlib
import json
import os
import sys
from urllib.parse import quote

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "images")
OUT = os.path.join(HERE, "icons.json")
RAW_BASE = "https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/iconset/images"
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def main():
    if not os.path.isdir(IMAGES):
        sys.exit("缺少 images/ 目录")
    files = sorted(
        f for f in os.listdir(IMAGES)
        if os.path.splitext(f)[1].lower() in EXTS and not f.startswith((".", "_"))
    )
    icons, seen = [], {}
    for f in files:
        path = os.path.join(IMAGES, f)
        with open(path, "rb") as fh:
            ver = hashlib.md5(fh.read()).hexdigest()[:8]
        url = "%s/%s?v=%s" % (RAW_BASE, quote(f), ver)
        names = [n.strip() for n in os.path.splitext(f)[0].split("~") if n.strip()]
        for n in names:
            if n in seen:
                print("跳过重复名称：%s（%s 与 %s）" % (n, seen[n], f), file=sys.stderr)
                continue
            seen[n] = f
            icons.append({"name": n, "url": url})

    data = {
        "name": "ziyong icons",
        "description": "自用图标集：%d 张图 / %d 个名称" % (len(files), len(icons)),
        "icons": icons,
    }
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        print(text[:500])
        return
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(text)
    print("已生成 %s：%d 张图，%d 个图标名" % (OUT, len(files), len(icons)))


if __name__ == "__main__":
    main()
