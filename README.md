# ziyong

自用订阅与脚本合集。链接全部指向 `main` 分支，可长期引用。

| 分类 | 内容 |
| --- | --- |
| [Egern 面板](#egern-面板) | 中国移动、订阅流量（Hark 仪表盘版） |
| [Egern 分流规则](#egern-分流规则) | AI / Binance / LinuxDo / Telegram / UltraMobile |
| [图标集](#图标集) | 通用图标订阅（Egern / Surge / Loon / QX） |
| [Scripting 小组件](#scripting-小组件) | 订阅流量、网速、GitHub 翻译 |
| [用户脚本](#用户脚本) | KISS Translator |

## Egern 面板

Egern → 模块 → 添加模块 → 粘贴链接。

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

## 图标集

| 名称 | 链接 |
| --- | --- |
| 图标集订阅（GitHub） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/iconset/icons.json |
| 图标集订阅（jsDelivr 备用） | https://cdn.jsdelivr.net/gh/yiyu12138/ziyong@main/egern/iconset/icons.json |

用法与命名规则见 [egern/iconset/README.md](egern/iconset/README.md)。

## Scripting 小组件

iOS Scripting App 的 `.scripting` 安装包。

| 名称 | 链接 |
| --- | --- |
| 订阅流量 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/dingyue/dingyue-1.3.scripting |
| 网速 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/netspeed/netspeed-1.4.scripting |
| GitHub 翻译 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/github-translate/github-translate-1.2.scripting |

不带版本号的同名包（`dingyue.scripting` 等）始终与最新版一致，可当固定链接用。

## 用户脚本

| 名称 | 链接 |
| --- | --- |
| KISS Translator（Scripting 适配版） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/kiss-translator.user.js |

`kiss-translator-core.js` 是上面脚本自动拉取的核心文件，不用单独安装。
