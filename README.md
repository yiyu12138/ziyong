# ziyong

自用订阅与脚本合集。链接全部指向 `main` 分支，可长期引用。

| 分类 | 内容 |
| --- | --- |
| [图标集](#图标集) | 通用图标订阅（Egern / Surge / Loon / QX） |
| [Scripting 小组件](#scripting-小组件) | ziyong（Magpie / WorkBuddy / 机场订阅 / IP 检测） |
| [用户脚本](#用户脚本) | KISS Translator |

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
| ziyong（WorkBuddy / Magpie / IP 检测） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/dashboard-kit/ziyong.scripting |

不带版本号的 `ziyong.scripting` 始终指向最新版，可当固定链接用。

## TG 广告正则生成器

填入多条同模板的广告推文，提取共同特征词，直接生成可用于 Surge / Loon 过滤的正则。

| 名称 | 链接 |
| --- | --- |
| TG 广告正则生成器 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/tg-regex/tg-regex.scripting |

基于 [iamwaa](https://github.com/iamwaa/Scripting) 的版本优化：两字词不再漏、关键词限长 12 字、共享前缀合并、用户名去重、宽松模式分隔符收紧。

## 用户脚本

| 名称 | 链接 |
| --- | --- |
| KISS Translator（Scripting 适配版） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/kiss-translator.user.js |

`kiss-translator-core.js` 是上面脚本自动拉取的核心文件，不用单独安装。
