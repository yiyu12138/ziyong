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

## Surge 模块仓库

保存 Loon 模块链接，经 Script-Hub 转成 Surge 格式后一键导入。Surge 的模块不写进配置文件，卸载重装要一个个补，这个脚本就是干这个的。

| 名称 | 链接 |
| --- | --- |
| Surge 模块仓库 | https://raw.githubusercontent.com/yiyu12138/ziyong/main/surge-modules/surge-modules.scripting |

用法：先把 Script-Hub 模块装进 Surge（否则转换不生效），再把 Loon 插件链接粘进来，点「导入」走 `surge:///install-module`。

## 用户脚本

| 名称 | 链接 |
| --- | --- |
| KISS Translator（Scripting 适配版） | https://raw.githubusercontent.com/yiyu12138/ziyong/main/kiss-translator.user.js |

`kiss-translator-core.js` 是上面脚本自动拉取的核心文件，不用单独安装。
