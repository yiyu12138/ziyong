# Egern 资源

本目录只剩两类东西：`*.yaml` 面板模块和 `rules/` 分流规则。完整链接清单见仓库根 [README.md](../README.md)。

| 路径 | 内容 |
| --- | --- |
| `china-mobile-hark-dash.yaml` | 中国移动面板：剩余话费 + 流量/语音半圆仪表 + 近 7 天流量柱状图 |
| `sub-traffic-hark-v2.yaml` | 订阅流量面板：最多 4 个机场的剩余流量、7 天用量、用完预测 |
| `rules/*.yaml` | 分流规则模块，导入后可用 `POLICY` 参数选策略组 |
| `iconset/` | 通用图标订阅，见 [iconset/README.md](iconset/README.md) |

## 面板说明

两个面板的脚本都在 Hark 上游仓库（`zhaohantao1360-hash/Hark`）里，本仓库只放模块壳与参数定义，改样式要改上游 js。

- 中国移动：先在「中国移动」App 用短信验证码登录一次，模块会自动捕获参数
- 订阅流量：在模块参数里填机场订阅链接，最多 4 个

## 规则说明

- `AI.yaml` / `LinuxDo.yaml` / `Telegram.yaml` / `UltraMobile.yaml`：由同名 Loon 规则的 `.lsr` 转换而来
- `Binance.yaml`：整理自 `rule.kelee.one/Loon/Binance.lsr`（2025-09-18 版），无 Loon 版本
- `Emby.yaml`：Emby 相关站点（`syemby.com` / `atrct.cn` / `taotu.ink`），纯 `domain_suffix`，子域一并匹配
