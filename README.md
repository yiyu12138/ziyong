# KISS Translator（Scripting 兼容版）

适用于 iOS Safari + Scripting 的 KISS Translator 用户脚本。

## 一键安装

点击下面的链接，尝试直接在 Safari 中打开脚本：

[KISS Translator 一键安装](https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-v2.1.0.user.js)

如果没有自动进入 Scripting：

**Scripting → Safari 浏览器脚本 → 从 URL 安装**

## 安装 URL

下面的代码块在 GitHub 页面会自带「复制」按钮，可以直接复制：

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-v2.1.0.user.js
```

## 说明

这是针对 **Scripting Safari 浏览器脚本** 修改的兼容版本。

- 支持 Scripting 的 GM API
- 使用 `document-start` 注入
- 保留 KISS Translator 原有翻译功能
- 支持原脚本中的翻译服务配置
- 脚本地址固定在本仓库根目录，避免之前的路径 404

## HTTP 404

如果 Scripting 导入时出现 HTTP 404，请确认使用上面的完整 Raw URL，不要使用 GitHub 网页地址。

正确地址：

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-v2.1.0.user.js
```
