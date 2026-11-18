// ==UserScript==
// @name          KISS Translator
// @namespace     https://github.com/fishjar/kiss-translator
// @version       2.1.0-scripting.1
// @description   A simple bilingual translation extension & Greasemonkey script (一个简约的双语对照翻译扩展 & 油猴脚本)
// @author        Gabe<yugang2002@gmail.com>
// @homepageURL   https://github.com/fishjar/kiss-translator
// @license       GPL-3.0
// @match         *://*/*
// @icon          https://kiss-translator.rayjar.com/images/logo192.png
// @downloadURL   https://raw.githubusercontent.com/yiyu12138/ziyong/main/kiss-translator.user.js
// @updateURL     https://raw.githubusercontent.com/yiyu12138/ziyong/main/kiss-translator.user.js
// @grant         GM.xmlHttpRequest
// @grant         GM_xmlhttpRequest
// @grant         GM.registerMenuCommand
// @grant         GM_registerMenuCommand
// @grant         GM.unregisterMenuCommand
// @grant         GM_unregisterMenuCommand
// @grant         GM.setValue
// @grant         GM_setValue
// @grant         GM.getValue
// @grant         GM_getValue
// @grant         GM.deleteValue
// @grant         GM_deleteValue
// @grant         GM.addValueChangeListener
// @grant         GM_addValueChangeListener
// @grant         GM.removeValueChangeListener
// @grant         GM_removeValueChangeListener
// @grant         GM.info
// @grant         GM_info
// @inject-into   content
// @connect       *
// @run-at        document-start
// ==/UserScript==

(function () {
  "use strict";

  var EVENT = "kiss-scripting-bridge";
  var CORE = "https://raw.githubusercontent.com/yiyu12138/ziyong/main/kiss-translator-core.js";
  var PAGE_CODE = [
    "(function(){",
    "if(window.__kissBridge)return;",
    "window.__kissBridge=1;",
    "window.APP_INFO={name:'KISS Translator',version:'2.1.0',eventName:'" + EVENT + "'};",
    "var req=document.createElement('script');",
    "req.id='kiss-bridge-req';",
    "req.type='application/json';",
    "var res=document.createElement('script');",
    "res.id='kiss-bridge-res';",
    "res.type='application/json';",
    "document.documentElement.appendChild(req);",
    "document.documentElement.appendChild(res);",
    "window.addEventListener('" + EVENT + "',function(e){",
    "var item=document.createElement('span');",
    "item.textContent=JSON.stringify(e.detail||{});",
    "req.appendChild(item);",
    "});",
    "new MutationObserver(function(){",
    "Array.prototype.slice.call(res.children).forEach(function(item){",
    "var msg; try{msg=JSON.parse(item.textContent);}catch(err){msg=null;}",
    "item.remove();",
    "if(msg&&msg.pong) window.dispatchEvent(new CustomEvent(msg.pong,{detail:msg.detail}));",
    "});",
    "}).observe(res,{childList:true});",
    "document.documentElement.setAttribute('data-kiss-ready','1');",
    "})();"
  ].join("");

  function gm(method, legacy) {
    var obj = typeof GM !== "undefined" ? GM : globalThis.GM;
    if (obj && typeof obj[method] === "function") return obj[method].bind(obj);
    var old = globalThis[legacy];
    if (typeof old === "function") return old;
    throw new Error("GM API is not available: " + method);
  }

  function exposeGm() {
    var names = ["GM", "GM_info", "GM_xmlhttpRequest", "GM_setValue", "GM_getValue", "GM_deleteValue", "GM_addValueChangeListener", "GM_removeValueChangeListener", "GM_registerMenuCommand", "GM_unregisterMenuCommand"];
    names.forEach(function (name) {
      try {
        if (typeof globalThis[name] === "undefined" && typeof window[name] !== "undefined") globalThis[name] = window[name];
      } catch (e) {}
    });
    try {
      if (typeof GM !== "undefined") globalThis.GM = GM;
    } catch (e) {}
    try {
      if (typeof GM_info !== "undefined") globalThis.GM_info = GM_info;
    } catch (e) {}
    try {
      if (typeof GM_xmlhttpRequest !== "undefined") globalThis.GM_xmlhttpRequest = GM_xmlhttpRequest;
    } catch (e) {}
    try {
      if (typeof GM_getValue !== "undefined") globalThis.GM_getValue = GM_getValue;
    } catch (e) {}
    try {
      if (typeof GM_setValue !== "undefined") globalThis.GM_setValue = GM_setValue;
    } catch (e) {}
    try {
      if (typeof GM_deleteValue !== "undefined") globalThis.GM_deleteValue = GM_deleteValue;
    } catch (e) {}
    try {
      if (typeof GM_addValueChangeListener !== "undefined") globalThis.GM_addValueChangeListener = GM_addValueChangeListener;
    } catch (e) {}
    try {
      if (typeof GM_removeValueChangeListener !== "undefined") globalThis.GM_removeValueChangeListener = GM_removeValueChangeListener;
    } catch (e) {}
  }

  function injectPage() {
    var root = document.documentElement;
    if (!root || root.getAttribute("data-kiss-ready") === "1") return;
    if (!document.getElementById("kiss-translator-options-injector")) {
      var marker = document.createElement("script");
      marker.id = "kiss-translator-options-injector";
      marker.type = "text/javascript";
      root.appendChild(marker);
    }
    var boot = document.getElementById("kiss-page-boot");
    if (!boot) {
      boot = document.createElement("script");
      boot.id = "kiss-page-boot";
      boot.textContent = PAGE_CODE;
      root.appendChild(boot);
    }
    try {
      root.setAttribute("onreset", "eval(document.getElementById('kiss-page-boot').textContent)");
      root.dispatchEvent(new Event("reset"));
    } catch (e) {}
    root.removeAttribute("onreset");
  }

  var replies = [];
  function flush() {
    var node = document.getElementById("kiss-bridge-res");
    if (!node || !replies.length) return;
    var batch = replies.splice(0, replies.length);
    batch.forEach(function (msg) {
      var item = document.createElement("span");
      item.textContent = JSON.stringify(msg);
      node.appendChild(item);
    });
  }
  function reply(pong, detail) {
    replies.push({ pong: pong, detail: detail });
    flush();
  }

  function normalize(res) {
    res = res || {};
    var response = res.response != null ? res.response : res.responseText;
    return {
      status: res.status,
      statusText: res.statusText || "",
      responseHeaders: res.responseHeaders || "",
      response: response,
      finalUrl: res.finalUrl || res.responseURL || ""
    };
  }

  var xhrHandles = new Map();
  var listeners = new Map();
  var xhrEvents = ["onloadstart", "onprogress", "onreadystatechange", "onload", "onerror", "onabort", "ontimeout"];

  async function handle(detail) {
    var action = detail && detail.action;
    var args = (detail && detail.args) || {};
    var pong = detail && detail.pong;
    if (!action || !pong) return;
    try {
      if (action === "xmlHttpRequest" && Object.prototype.hasOwnProperty.call(args, "input")) {
        var fetched = await fetch(args.input, args.init);
        var text = await fetched.text();
        reply(pong, { data: text });
        return;
      }
      if (action === "xmlHttpRequest") {
        var details = Object.assign({}, args.details || {});
        xhrEvents.forEach(function (name) {
          details[name] = function (res) {
            reply(pong, { callback: name, data: normalize(res) });
          };
        });
        xhrHandles.set(pong, gm("xmlHttpRequest", "GM_xmlhttpRequest")(details));
        return;
      }
      if (action === "xmlHttpRequestAbort") {
        var handle = xhrHandles.get(args.requestId);
        if (handle && handle.abort) handle.abort();
        xhrHandles.delete(args.requestId);
        return;
      }
      if (action === "setValue") {
        await gm("setValue", "GM_setValue")(args.key, args.val);
        reply(pong, { data: args.val });
        return;
      }
      if (action === "getValue") {
        var value = await gm("getValue", "GM_getValue")(args.key);
        reply(pong, { data: value == null ? null : value });
        return;
      }
      if (action === "deleteValue") {
        await gm("deleteValue", "GM_deleteValue")(args.key);
        reply(pong, { data: "ok" });
        return;
      }
      if (action === "addValueChangeListener") {
        if (listeners.has(args.listenerId)) throw new Error("GM storage listener already exists");
        var id = gm("addValueChangeListener", "GM_addValueChangeListener")(args.key, function () {
          reply(args.listenerId, { change: Array.prototype.slice.call(arguments) });
        });
        listeners.set(args.listenerId, id);
        reply(pong, { data: args.listenerId });
        return;
      }
      if (action === "removeValueChangeListener") {
        var saved = listeners.get(args.listenerId);
        if (saved != null) await gm("removeValueChangeListener", "GM_removeValueChangeListener")(saved);
        listeners.delete(args.listenerId);
        reply(pong, { data: "ok" });
        return;
      }
      if (action === "info") {
        var info = (typeof GM !== "undefined" && GM.info) || globalThis.GM_info || globalThis.GM && globalThis.GM.info;
        reply(pong, { data: info });
        return;
      }
      throw new Error("message action is unavailable: " + action);
    } catch (err) {
      reply(pong, { error: (err && err.message) || String(err) });
    }
  }

  function drain() {
    var node = document.getElementById("kiss-bridge-req");
    if (!node) return;
    Array.prototype.slice.call(node.children).forEach(function (item) {
      var detail = null;
      try { detail = JSON.parse(item.textContent); } catch (e) {}
      item.remove();
      if (detail) handle(detail);
    });
  }

  function watch() {
    injectPage();
    var node = document.getElementById("kiss-bridge-req");
    if (node && !node.__kissWatch) {
      node.__kissWatch = true;
      new MutationObserver(drain).observe(node, { childList: true });
    }
    drain();
    flush();
  }

  watch();
  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    watch();
    if (document.documentElement && document.documentElement.getAttribute("data-kiss-ready") === "1" && tries > 2) clearInterval(timer);
    if (tries > 40) clearInterval(timer);
  }, 200);

  function runCore(code) {
    exposeGm();
    new Function(code)();
  }

  gm("xmlHttpRequest", "GM_xmlhttpRequest")({
    method: "GET",
    url: CORE,
    onload: function (res) {
      if (res.status >= 200 && res.status < 300) {
        var code = res.responseText || res.response;
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", function () { runCore(code); }, { once: true });
        } else {
          runCore(code);
        }
      } else {
        console.error("[KISS Translator] core HTTP " + res.status);
      }
    },
    onerror: function () { console.error("[KISS Translator] core network error"); },
    ontimeout: function () { console.error("[KISS Translator] core timeout"); }
  });
})();
