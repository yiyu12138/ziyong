# ziyong

自用订阅与脚本合集。所有链接直接指向 `main` 分支，可长期引用。

- [Egern 模块](#egern-模块)
- [Egern 面板 / 小组件](#egern-面板--小组件)
- [Egern 分流规则](#egern-分流规则)
- [Loon / Clash 规则](#loon--clash-规则)
- [图标集](#图标集)
- [Scripting 小组件](#scripting-小组件)
- [用户脚本](#用户脚本)
- [其他](#其他)

## Egern 模块

Egern → 模块 → 添加模块 → 粘贴链接。

| 名称 | 链接 |
| --- | --- |
| 可莉广告过滤器（Egern 原生版） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/keli-ads-egern.yaml |
| 广告平台拦截器 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/block-advertisers.yaml |
| HTTPDNS 拦截器 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/block-httpdns.yaml |
| 红果短剧・红果漫剧去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/hongguo-adblock.yaml |
| 番茄小说去广告・素材拦截 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/fanqie-novel.yaml |
| 淘宝去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/taobao-adblock.yaml |
| 京东去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/jd-adblock.yaml |
| 拼多多去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/pinduoduo-adblock.yaml |
| 闲鱼去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/xianyu-adblock.yaml |
| 高德地图去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/amap-adblock.yaml |
| 哔哩哔哩去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/bilibili-adblock.yaml |
| 菜鸟去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/cainiao-adblock.yaml |
| 小象超市去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/maicai-adblock.yaml |
| 小黑盒去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/xiaoheihe-adblock.yaml |
| 最美壁纸去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/iwall-adblock.yaml |
| 网易邮箱大师去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/mailmaster-adblock.yaml |
| QQ音乐去广告 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/qqmusic-adblock.yaml |
| Google 搜索重定向 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/google-cn-redirect.yaml |
| Telegram 链接直达 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/telegram-redirect.yaml |
| NodeSeek 每日签到 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/nodeseek/NodeSeek.sgmodule |

模块说明见 [egern/README.md](egern/README.md)。`egern/scripts/` 与 `egern/deepseek/` 里的 js 是模块内部脚本，不用单独安装。

## Egern 面板 / 小组件

| 名称 | 链接 |
| --- | --- |
| 中国移动（Hark 仪表盘版） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/china-mobile-hark-dash.yaml |
| 订阅流量监控（Hark 仪表盘版） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/sub-traffic-hark-v2.yaml |

## Egern 分流规则

导入后可在模块设置里用参数选择策略组。

| 名称 | 链接 |
| --- | --- |
| AI 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/AI.yaml |
| Binance 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/Binance.yaml |
| LinuxDo 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/LinuxDo.yaml |
| Telegram 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/Telegram.yaml |
| UltraMobile 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/UltraMobile.yaml |

## Loon / Clash 规则

`.lsr` 给 Loon，`.yaml` 是 Clash classical 格式，内容一致。

| 名称 | Loon | Clash |
| --- | --- | --- |
| AI 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/AI.lsr | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/AI.yaml |
| LinuxDo 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/LinuxDo.lsr | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/LinuxDo.yaml |
| Telegram 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/Telegram.lsr | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/Telegram.yaml |
| UltraMobile 规则 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/UltraMobile.lsr | https://raw.githubusercontent.com/yiyu12138/ziyong/main/loon/UltraMobile.yaml |

Binance 规则只在 `egern/rules/` 下，没有 Loon 版本。

## 图标集

Egern / Surge / Loon / QX 通用的图标订阅（`icons.json`）。

| 名称 | 链接 |
| --- | --- |
| 图标集订阅（GitHub） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/iconset/icons.json |
| 图标集订阅（jsDelivr 备用） | https://cdn.jsdelivr.net/gh/yiyu12138/ziyong@main/egern/iconset/icons.json |

用法见 [egern/iconset/README.md](egern/iconset/README.md)。

## Scripting 小组件

iOS 上 Scripting App 的 `.scripting` 安装包。

| 名称 | 链接 |
| --- | --- |
| 订阅流量 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/dingyue/dingyue-1.3.scripting |
| 网速 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/netspeed/netspeed-1.4.scripting |
| GitHub 翻译 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/github-translate/github-translate-1.2.scripting |

## 用户脚本

| 名称 | 链接 |
| --- | --- |
| KISS Translator（Scripting 适配版） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/kiss-translator.user.js |

`kiss-translator-core.js` 是上面脚本自动拉取的核心文件，不用单独安装。

## 其他

| 名称 | 说明 |
| --- | --- |
| [hub](hub/) | 自建插件导航站源码（FastAPI + SQLite + Docker），不是订阅内容 |
| [egern/scripts](egern/scripts/) | Egern 模块引用的改写脚本 |
| [egern/deepseek](egern/deepseek/) | DeepSeek 余额面板脚本（对应模块已移除，代码留档） |

---

- 移植与转写说明见 [egern/README.md](egern/README.md)
- 更新图标集：`python3 egern/iconset/build_iconset.py`
