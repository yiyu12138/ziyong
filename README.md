# KISS Translator（Scripting 兼容版）

适用于 iOS Safari + Scripting 的 KISS Translator。

## 一键安装

安装下面这个 **Scripting 兼容加载版**：

[点击安装 KISS Translator](https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-v2.1.0.user.js)

如果没有自动进入 Scripting：

**Scripting → Safari 浏览器脚本 → 从 URL 安装**

## 安装 URL

GitHub 页面中的代码块会提供复制按钮：

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-v2.1.0.user.js
```

## 本次修复

之前的版本虽然能够被 Scripting 识别和匹配，但在真正执行时出现：

```
failed to parse browser userscript
Function statements must have a name.
```

原因是 Scripting 在执行 Safari 用户脚本时，会通过 AsyncFunction 解析整个大型压缩脚本。KISS Translator 本身包含大量压缩后的函数表达式和异步代码，在这个解析路径下触发了 Safari/WebKit 的语法解析问题。

现在改成：

**Scripting 用户脚本 → 加载器 → GM.xmlHttpRequest → 普通 Function 执行核心代码**

核心文件：

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-core-v2.1.0.js
```

这样可以避开 Scripting 对大型核心脚本使用 AsyncFunction 的解析路径。

## 文件说明

- `KISS-Translator-Scripting-v2.1.0.user.js`：Scripting 安装入口
- `KISS-Translator-Scripting-core-v2.1.0.js`：KISS Translator 核心代码

## HTTP 404

如果出现 HTTP 404，请使用上面的完整 Raw URL，不要使用 GitHub 网页地址。

正确安装地址：

```
https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-v2.1.0.user.js
```

