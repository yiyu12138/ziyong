# 图标集订阅（Egern / Surge / Loon / QX 通用）

订阅地址：

```text
https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/iconset/icons.json
```

raw 被墙时用 jsDelivr（有缓存，更新后可能要等几分钟）：

```text
https://cdn.jsdelivr.net/gh/yiyu12138/ziyong@main/egern/iconset/icons.json
```

## 用法

Egern：设置 → 资源 → 图标集 → 添加订阅，填上面的地址。配置里策略组/节点的 `icon` 直接写图标名即可，例如 `icon: ChatGPT`。

Surge / Loon / Quantumult X 同样能吃这个 JSON。

## 文件结构

```text
iconset/
├── icons.json          # 生成的订阅文件，别手改
├── images/             # 原始图片（png / jpg / webp）
└── build_iconset.py    # 扫 images/ 生成 icons.json
```

## 命名规则

- 文件名（去扩展名）= 图标名，如 `ChatGPT.png`
- 用 `~` 分隔可加别名，共享同一张图：`ChatGPT~OpenAI.png` → 同时提供 `ChatGPT` 和 `OpenAI` 两个名字
- 以 `.` 或 `_` 开头的文件会被忽略

## 更新流程

1. 把图片丢进 `images/`
2. `python3 build_iconset.py`
3. 提交并推送 `icons.json` 和图片

生成的图片 URL 会自动带 `?v=<md5前8位>`，换图后版本参数变化，客户端才会真正刷新缓存。
