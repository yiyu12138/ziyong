# hub — Egern 插件导航站

自建的插件清单页，前端点一下就能把模块导进 Egern。**不是订阅内容**，是本仓库 `egern/` 那批东西的管理门面。

- 形态：FastAPI + SQLite 单容器，前端原生 HTML/JS（`web/`），无构建步骤
- 功能：分类 + 拼音搜索 + 收藏 + 一键导入（`egern:/modules/new?name=…&url=…`）、后台增删改、发布回写 GitHub
- 数据：SQLite 存在 `./data`（已在 .gitignore，不进仓库）

## 部署

```bash
docker compose up -d --build
```

默认 8788 端口。环境变量：

| 变量 | 说明 |
| --- | --- |
| `ADMIN_TOKEN` | 后台口令，留空则不启用鉴权（建议反代保护） |
| `GH_TOKEN` | 发布时写 GitHub 用 |
| `SOURCE_REPO` / `SOURCE_BRANCH` | 扫描的源仓库，默认 `yiyu12138/ziyong@main` |
| `HTTP_PROXY` / `HTTPS_PROXY` | 扫 GitHub 需要，默认指向宿主 mihomo `172.17.0.1:7890` |

## 目录

```text
hub/
├── backend/     # app.py 路由、db.py 存储、publish.py 发布、backup.py 备份
├── web/         # index.html 前台、admin.html 后台、sw.js 离线缓存
├── Dockerfile
└── docker-compose.yml
```
