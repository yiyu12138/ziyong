# Egern 资源

本目录是 `*.yaml` 模块、`rules/` 分流规则和 `scripts/` 改写脚本。完整链接清单见仓库根 [README.md](../README.md)。

| 路径 | 内容 |
| --- | --- |
| `bilibili-remove-ads.yaml` | 哔哩哔哩去广告：Loon 插件 `Bilibili_remove_ads.lpx` 转写的 Egern 原生版（6 条规则 / 11 条 jq / 5 条 mock / 4 个脚本） |
| `china-mobile-hark-dash.yaml` | 中国移动面板：剩余话费 + 流量/语音半圆仪表 + 近 7 天流量柱状图 |
| `sub-traffic-hark-v2.yaml` | 订阅流量面板：最多 4 个机场的剩余流量、7 天用量、用完预测 |
| `rules/*.yaml` | 分流规则模块，导入后可用 `POLICY` 参数选策略组 |
| `scripts/bilibili/` | B 站模块用的 4 个脚本和生成器，见该目录 [README](scripts/bilibili/README.md) |
| `iconset/` | 通用图标订阅，见 [iconset/README.md](iconset/README.md) |

## 面板说明

两个面板的脚本都在 Hark 上游仓库（`zhaohantao1360-hash/Hark`）里，本仓库只放模块壳与参数定义，改样式要改上游 js。

- 中国移动：先在「中国移动」App 用短信验证码登录一次，模块会自动捕获参数
- 订阅流量：在模块参数里填机场订阅链接，最多 4 个

## 规则说明

- `AI.yaml` / `LinuxDo.yaml` / `Telegram.yaml` / `UltraMobile.yaml`：由同名 Loon 规则的 `.lsr` 转换而来
- `Binance.yaml`：整理自 `rule.kelee.one/Loon/Binance.lsr`（2025-09-18 版），无 Loon 版本
