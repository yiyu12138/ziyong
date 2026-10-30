# Egern 模块仓库说明

自用 Egern 模块与规则集。导入方式：Egern → 模块 → 添加模块 → 粘贴 Raw 链接。

---

## 1. 红果短剧・红果漫剧去广告

**Raw 链接**

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/hongguo-adblock.yaml
```

- 上游：[bluee1111/egern-hongguo-adblock](https://github.com/bluee1111/egern-hongguo-adblock)（MIT），本仓库做镜像以便长期引用
- 作用：拦截红果短剧（iOS `com.phoenix.readnew`）与红果漫剧（`com.kylin.readnew`）中的开屏、信息流、视频贴片广告与电商推广

**拦截范围**

| 类型 | 域名/接口 | 方式 |
|---|---|---|
| 穿山甲广告 SDK | `pangolin-sdk-toutiao.com` / `pangle.io` / `pglstatp` 族 | 域名 REJECT |
| 广告投放接口 | `ads*-normal.zijieapi.com` | 域名正则 REJECT |
| 视频贴片广告 | `v*-reading-ad.qznovelvod.com`（正片是 `reading-video`，不拦） | 域名正则 REJECT |
| 广告素材图 | `p*-ad-sign.byteimg.com`（漫剧封面是 `p*-novel*`，不拦） | 域名正则 REJECT |
| 电商推广 | `ecombdapi.com` 广告接口 | 域名正则 REJECT |
| 广告 SDK 返回 | `api/ad/union/sdk/get_ads` 等 | URL 改写返回空 JSON |

**注意事项**

- 域名级拦截不需要解密流量；返回空 JSON 的 3 条改写需要 MITM（请在 Egern 中安装并信任 CA 证书）
- 个别广告域名有证书固定，解密失败时域名 REJECT 仍然生效，不影响拦截结果
- 「看激励广告解锁下一集」是服务器端发奖，纯拦截无法伪造，需等待系统超时放行，属正常现象

## 2. 可莉广告过滤器（Egern 原生版）

**Raw 链接**

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/keli-ads-egern.yaml
```

- 来源：`kelee.one/Tool/Loon/Lpx/Remove_ads_by_keli.lpx`（Loon 格式），逐条 1:1 转写为 Egern 原生语法
- 作用：通用 App 去广告（小米/微信读书/快递100/拼多多/听书/随身天气等 40+ App 的启动页与信息流广告）

**转写对照表**

| Loon 原文 | Egern 原生实现 |
|---|---|
| `[Rule]` DOMAIN / DOMAIN-SUFFIX / IP-CIDR | `rules` 同名字段（policy `REJECT`） |
| `[Rule]` URL-REGEX + REJECT | `rules` 的 `url_regex` |
| `[Rule]` URL-REGEX + REJECT-DICT | `url_rewrites` → `http://reject-dict/` |
| `request ... reject(404)` | `url_rewrites` → `http://reject/` |
| `request ... reject(200)` | `url_rewrites` → `http://reject-200/` |
| `request ... reject_img(200)` | `url_rewrites` → `http://reject-img/` |
| `request ... reject_dict(200)` | `url_rewrites` → `http://reject-dict/` |
| `response.body.mock("json", X)` | `response_regex` 全文替换（`find: ^[\s\S]*$`） |
| `response.body.replace(/R/, S)` | `response_regex`（find=R, replace=S） |
| `response.json.jq("F")` | `response_jq`（filter=F） |

**规模与注意**

- 共 22 条 rules、81 条 url_rewrites、3 条 body_rewrites、63 个 MITM 主机名
- 使用前需在 Egern 中安装并信任 CA 证书（URL 改写依赖解密）
- AdGuard/机型差异导致某条规则误伤时，可在模块内对该条目加 `disabled: true` 单独关闭


## 分流规则（由 loon/*.lsr 转换）

每条规则都是独立模块，导入后可在模块设置里用 `POLICY` 选择策略组（默认 `Proxy`）。

- Telegram：https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/Telegram.yaml
- Linux.do：https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/LinuxDo.yaml
- Ultra Mobile：https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/UltraMobile.yaml
- Binance：https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/rules/Binance.yaml

## DeepSeek 余额面板

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/deepseek/DeepSeek-Balance.sgmodule
```

- 面板显示 DeepSeek 开放平台的账户余额：总余额、充值余额、赠金余额、刷新时间
- 安装后到模块「参数」里把 `APIKey` 换成平台 Key（`https://platform.deepseek.com/api_keys`）
- 数据来自 `GET https://api.deepseek.com/user/balance`，Key 只存在本机模块参数里，不进仓库
- 默认 600 秒刷新，点面板可手动刷新；`good` 绿色=正常，`alert` 黄色=无余额/不可用，`error` 红色=Key 无效或网络失败
- 结构沿用 Surge 的 `[Panel]` + `[Script] generic`，参数用 Egern 的 `{{{APIKey}}}` 占位符（Surge 原版写的是 `%api_key%`，在 Egern 里不会被替换）

## NodeSeek 每日签到

**Raw 链接**

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/nodeseek/NodeSeek.sgmodule
```

- 上游脚本：[Phowx/script](https://github.com/Phowx/script)（MIT，本仓库镜像 `egern/nodeseek/nodeseek.js`），模块按 Egern 参数占位符 `{{{ }}}` 转写
- 用法：导入模块后，先在 Egern 开启 MITM 并信任 CA，登录并打开一次 www.nodeseek.com 抓取 pjwt Cookie，之后每天 9:10 自动签到（`RANDOM=true` 随机鸡腿，可在模块参数里改 cron 与 RANDOM）

## 3. 番茄小说去广告

- 地址：https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/dragonread-adblock.yaml
- 移植自 kelee 的 Loon 插件 DragonRead_remove_ads.lpx（2025-05-13 版）
- 47 条 REJECT 规则：开屏/章末/听书广告域名、穿山甲 Pangle SDK、埋点上报（snssdk/pstatp/bytedance）
- 全部为网络层拦截，不需要 MITM，也不需要配置证书
- 注意：其中 bytescm.com（字节前端 CDN）一条在原版中标记为「误杀」，若影响正文加载，在该条 policy 旁加 disabled: true
