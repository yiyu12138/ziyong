// ==UserScript==
// @name         KISS Translator（Scripting兼容加载版）
// @namespace    https://github.com/fishjar/kiss-translator
// @version      2.1.0-scripting.2
// @description  KISS Translator 的 Scripting Safari 兼容加载器
// @match        *://*/*
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @grant        GM.info
// @grant        GM_info
// @connect      raw.githubusercontent.com
// @run-at       document-start
// @inject-into  content
// ==/UserScript==

(function () {
  "use strict";

  const CORE_URL =
    "https://raw.githubusercontent.com/yiyu12138/ziyong/main/KISS-Translator-Scripting-core-v2.1.0.js";

  const request = (url) => {
    const fn =
      (globalThis.GM && globalThis.GM.xmlHttpRequest) ||
      globalThis.GM_xmlhttpRequest;

    if (typeof fn !== "function") {
      throw new Error("KISS Translator: GM.xmlHttpRequest unavailable");
    }

    return new Promise((resolve, reject) => {
      fn({
        method: "GET",
        url,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response.responseText);
          } else {
            reject(new Error("HTTP " + response.status));
          }
        },
        onerror: () => reject(new Error("Network error")),
        ontimeout: () => reject(new Error("Request timeout"))
      });
    });
  };

  request(CORE_URL)
    .then((code) => {
      // Scripting 会用 AsyncFunction 解析普通用户脚本。
      // 核心代码改为通过普通 Function 解析，避开该解析路径。
      new Function(code)();
    })
    .catch((error) => {
      console.error("[KISS Translator Loader]", error);
    });
})();
