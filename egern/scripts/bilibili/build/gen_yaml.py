#!/usr/bin/env python3
"""把 module.tpl.yaml 里的 jq 占位符替换成内联块，输出最终模块文件。"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
OUT = os.path.join(SRC, "out")


def block(path, indent=8):
    text = open(path, encoding="utf-8").read().strip("\n")
    pad = " " * indent
    return "\n".join(pad + line.rstrip() if line.strip() else "" for line in text.split("\n"))


def main():
    tpl = open(os.path.join(HERE, "module.tpl.yaml"), encoding="utf-8").read()
    tpl = tpl.replace("__TAB_JQ__", block(os.path.join(SRC, "tab_Bilibili_remove_ads.jq")))
    tpl = tpl.replace("__MINE_JQ__", block(os.path.join(SRC, "mine_Bilibili_remove_ads.jq")))
    if "__TAB_JQ__" in tpl or "__MINE_JQ__" in tpl:
        print("占位符没替换干净", file=sys.stderr)
        return 1
    dst = os.path.join(OUT, "bilibili-remove-ads.yaml")
    with open(dst, "w", encoding="utf-8") as f:
        f.write(tpl)
    print(f"{dst}: {len(tpl)} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
