# 哔哩哔哩去广告（Egern 原生版）

上游：可莉（kelee.one）的 Loon 插件 [`Bilibili_remove_ads.lpx`](https://kelee.one/Tool/Loon/Lpx/Bilibili_remove_ads.lpx)（2026-10-02 版）。
脚本作者 kokoryh（[kokoryh/Sparkle](https://github.com/kokoryh/Sparkle)）。

模块文件：[`egern/bilibili-remove-ads.yaml`](../../bilibili-remove-ads.yaml)

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/egern/bilibili-remove-ads.yaml
```

## 适配结论

| 原插件成分 | Egern 支持情况 | 处理方式 |
| --- | --- | --- |
| `[Rule]` 6 条（含 AND/OR 嵌套） | 原生支持 | `rules:` 里的 `and` / `or` 原样对应 |
| `[Rewrite]` jq 改写 11 条 | 原生支持 | `response_jq`，一个 URL 一条 |
| `response.json.jq_file` 2 个外链 | 不支持外链 jq | 已把 `tab_*.jq` / `mine_*.jq` 内联进 yaml |
| `response.body.mock(...)` 3 条 | 等价 `map_locals` | 文本 mock 用 `map_locals`，base64 的 gRPC mock 用小脚本 |
| `request ... reject_dict(200)` 2 条 | 等价 `map_locals` | 返回 `{}` + 200 |
| `response.header.add("grpc-status","0")` | 原生支持 | `header_rewrites.add` |
| `[Script]` 4 条（3 个 100KB 级的 Loon 脚本） | 只认 `export default async function(ctx)` | 写了兼容层，见下 |
| `[MitM]` 5 个域名 | 原生支持 | `mitm.hostnames.includes` |

结论：**原插件不能直接给 Egern 用**（Loon 的 `${url} ~= /re/` 改写语法、jq_file、`$done/$request/$response` 脚本全局，Egern 都没有），转写后功能对齐。

## 脚本兼容层怎么做的

Egern 脚本是 `export default async function (ctx)`，只有 `ctx.*`，没有 Loon/Surge 那套
`$request / $response / $done / $httpClient / $persistentStore / $notification / $argument`。
三个上游 bundle（19KB / 63KB / 97KB，esbuild 产物）不重写，做法是：

1. 在函数作用域里把上面那些 `$xxx` 用 `const` 伪造出来（`$done` 用 Promise 收集返回值）。
2. 上游代码**原样内联**在同一函数里，靠词法作用域直接吃到这些变量。
3. `$utils.ungzip` 在 Loon 是同步的、Egern 是异步的，只把 3 处调用点改成 `await __egGunzip(...)`（gRPC 帧压缩标记为 1 时才走）。
4. `$loon` 故意定义为字符串，让 bundle 走它自己的 Loon 分支（`if (typeof $loon !== "undefined")`）。
5. 返回值：把 `$done({...})` 的 payload 映射回 Egern 的 `{status, headers, body}`，`bodyBytes → body`（bundle 改 body 用的是 `response.bodyBytes` 这个访问器）。

`$argument` 用对象传入 5 个参数，和 Loon 的 `{${displayUpList}, ${purifyComment}, ...}` 展开等价。
Loon 的 `enable=${sponsorBlock}` / `enable=${optimizeRequest}` 没有对应字段，改成在兼容层入口按 URL + env 判断是否跳过（DM 弹幕接口看 sponsorBlock，View/评论接口看 optimizeRequest）。

## 参数

模块设置页有 5 个开关（`env_schema`），默认值与 Loon 版一致：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `displayUpList` | show | 动态页「最常访问」显示方式：show / hide / auto |
| `purifyComment` | true | 移除评论区置顶广告 |
| `optimizeRequest` | true | 修复评论区加载异常 |
| `sponsorBlock` | false | 空降助手（第三方 bsbsb.top 数据） |
| `logLevel` | off | off / error / warn / info / debug |

另有 `compat_arguments.SPONSOR_POLICY`：`bsbsb.top` 走什么策略。
Loon 原版是 `PROXY`，Egern 不保证存在同名策略组，所以默认 `DIRECT`；开了空降助手却拉不到数据时，改成你自己的代理策略组名。

## 需要注意

- 必须开 HTTPS 解密并信任证书，gRPC 接口（`grpc.biliapi.net`）还要能解 HTTP/2。
- Egern 的脚本 `max_size` 默认 1MB，这里 4 个脚本都放宽到 8MB（推荐流响应体可能很大）。
- 脚本 `env` 同时写在 `scriptings[].env`（兜底默认值）和 `env_schema`（设置页 UI）里；Egern 模块级 env 优先级最高，所以设置页改的值会生效。
- gRPC 精简脚本按 URL 后缀返回原始 proto 字节，等价于 Loon 的 `response.body.mock(..., binary)`。

## 重新生成

`build/` 里是生成器，改完模板重跑即可：

```sh
cd egern/scripts/bilibili/build
python3 build.py        # 上游 js → ../*.js（会重新打 ungzip 补丁）
python3 gen_yaml.py     # module.tpl.yaml + 2 个 jq → ../../bilibili-remove-ads.yaml
node test.mjs ..        # 用假 ctx 冒烟测试
```

上游 js 更新后：把新的 `bilibili.json.js` / `bilibili.protobuf.request.js` / `bilibili.protobuf.response.js`
放进 `build/`（`build.py` 会去 kokoryh/Sparkle 的 dist 目录拉），再跑一遍。
上游脚本一旦重写框架（换掉 `$done` 那套），兼容层要重新看。
