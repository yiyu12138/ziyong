/*
 * Egern 原生适配层 —— 由 build.py 自动生成，请勿手改
 * 上游脚本: __UPSTREAM__
 * 脚本类型: __KIND__ / __MODE__
 *
 * 做法：把 Loon 风格的 $request / $response / $done / $httpClient / $persistentStore
 * 等全局伪造在函数作用域里，原 bundle 代码原样内联，只把 $utils.ungzip 改成异步等待。
 */
export default async function (ctx) {
  const __egS = await __egInit(ctx, "__KIND__", "__MODE__");
  if (!__egS) return;
  const $request = __egS.request;
  const $response = __egS.response;
  const $done = __egS.done;
  const $argument = __egS.argument;
  const $persistentStore = __egS.store;
  const $notification = __egS.notify;
  const $httpClient = __egS.http;
  const $loon = __egS.loon;
  const $environment = __egS.environment;
  const $utils = __egS.utils;
  try {
/* ===================== BEGIN UPSTREAM ===================== */
