const state = { group: '全部', tag: '', q: '', list: [], meta: null, editing: null, sel: {}, sort: 'az', onlyFav: false };
const $ = s => document.querySelector(s);
const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GH = '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('on'), 2200);
}

async function api(path, opt = {}) {
  opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
  const tk = localStorage.getItem('egern_token');
  if (tk) opt.headers['x-auth-token'] = tk;
  let r = await fetch(path, opt);
  if (r.status === 401) {
    const v = prompt('输入管理口令');
    if (v) { localStorage.setItem('egern_token', v); return api(path, opt); }
    throw new Error('未授权');
  }
  if (!r.ok) {
    let detail = 'HTTP ' + r.status;
    try { detail = (await r.json()).detail || detail; } catch (e) {}
    throw new Error(detail);
  }
  return r.json();
}

function egernLink(v) {
  return 'egern:/modules/new?name=' + encodeURIComponent(v.name) + '&url=' + encodeURIComponent(v.url);
}

function variantOf(g) {
  const i = state.sel[g.key] || 0;
  return g.variants[Math.min(i, g.variants.length - 1)];
}

function cardHtml(g) {
  const v = variantOf(g);
  const vers = g.variants.length > 1
    ? `<div class="vers">${g.variants.map((x, i) =>
        `<button class="ver${i === (state.sel[g.key] || 0) ? ' on' : ''}" data-v="${i}">${esc(x.group)}</button>`).join('')}</div>`
    : '';
  const iconUrl = /^https?:\/\//.test(v.icon || '') ? v.icon : '';
  const icon = iconUrl
    ? `<img class="app-icon" src="${esc(iconUrl)}" loading="lazy" onerror="this.replaceWith(document.createTextNode(''))">`
    : `<span class="app-icon ph">${esc(v.name.slice(0, 1))}</span>`;
  return `<article class="card${v.installed ? ' done' : ''}" data-key="${esc(g.key)}">
    <div class="hd">
      ${icon}
      <h2 data-act="view" data-id="${v.id}">${esc(v.name)}</h2>
      ${g.unread ? '<span class="dot" title="已更新"></span>' : ''}
      <button class="star${v.favorite ? ' on' : ''}" data-act="fav" data-id="${v.id}">${v.favorite ? '★' : '☆'}</button>
    </div>
    ${vers}
    <p class="desc">${esc(v.desc)}</p>
    <div class="ft">
      ${v.is_self ? '<button class="more-btn" data-act="edit" data-id="' + v.id + '" title="编辑">⋯</button>' : ''}
      ${(v.kind === 'rule' || v.kind === 'sub')
        ? `<button class="go" data-act="copy" data-id="${v.id}" data-url="${esc(v.url)}">复制链接</button>`
        : `<a class="go" href="${egernLink(v)}" data-act="use" data-id="${v.id}">${v.installed ? '已导入' : '导入'}</a>`}
    </div>
  </article>`;
}

function enhanceDesc(root) {
  root.querySelectorAll('.desc').forEach(p => {
    if (p.scrollHeight <= p.clientHeight + 2) return;
    const b = document.createElement('button');
    b.className = 'fold'; b.textContent = '展开';
    b.addEventListener('click', e => {
      e.stopPropagation();
      const open = p.classList.toggle('open');
      b.textContent = open ? '收起' : '展开';
    });
    const ft = p.closest('.card').querySelector('.ft');
    if (ft) ft.insertAdjacentElement('afterbegin', b);
    else p.insertAdjacentElement('afterend', b);
  });
}

function renderList() {
  const el = $('#list');
  if (!state.list.length) {
    const empty = (!state.q && !state.tag && state.group === '全部' && !(state.meta && state.meta.total))
      ? '还没有插件，点右上角 ＋ 添加'
      : (state.onlyFav
        ? '还没有收藏，点卡片右上角的星标收藏一下'
        : (state.group !== '全部'
          ? '这个分类还没有条目，去设置里给分类绑个目录再点扫描'
          : '没找到，换个词试试'));
    el.innerHTML = `<div class="empty">${empty}</div>`;
    return;
  }
  el.innerHTML = sorted(state.list).map(cardHtml).join('');
  enhanceDesc(el);
}

function renderTabs() {
  const label = k => k === 'Official' ? '官方' : k;
  $('#tabs').innerHTML = (state.meta.groups || []).map(g =>
    `<button class="tab${g.key === state.group ? ' on' : ''}" data-g="${esc(g.key)}">${esc(label(g.key))}<span class="n">${g.count}</span></button>`
  ).join('');
}

const sortKey = s => (s || '').replace(/^[\s\u200d\ufe0f\p{Emoji}\p{S}\p{P}]+/u, '');

function sorted(list) {
  const cmp = (a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'zh-Hans-CN', { numeric: true });
  if (state.sort === 'az') return [...list].sort(cmp);
  if (state.sort === 'za') return [...list].sort((a, b) => cmp(b, a));
  return list;
}

async function loadMeta() {
  state.meta = await api('/api/bootstrap');
  const s = state.meta.sync_enabled
    ? (state.meta.last_sync ? `上次同步 ${state.meta.last_sync.slice(5, 16)}` : '尚未同步')
    : '手动维护';
  $('#sub').textContent = `${state.meta.total} 个插件 · ${s}` + (state.meta.unread ? ` · ${state.meta.unread} 个有更新` : '');
  $('#syncBtn').style.display = state.meta.sync_enabled ? '' : 'none';
  renderTabs();
}

async function loadList() {
  const p = new URLSearchParams({ group: state.group, tag: state.tag, q: state.q, only_fav: state.onlyFav ? 1 : 0 });
  state.list = await api('/api/plugins?' + p.toString());
  renderList();
}

async function refresh() { await loadMeta(); await loadList(); }

$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b) return;
  state.group = b.dataset.g; loadMeta().then(loadList).catch(err => toast(err.message));
});
let qt;
$('#q').addEventListener('input', e => {
  clearTimeout(qt);
  qt = setTimeout(() => { state.q = e.target.value.trim(); loadList().catch(err => toast(err.message)); }, 220);
});

$('#list').addEventListener('click', async e => {
  const card = e.target.closest('.card'); if (!card) return;
  const g = state.list.find(x => x.key === card.dataset.key);
  if (!g) return;

  const verBtn = e.target.closest('.ver');
  if (verBtn) {
    state.sel[g.key] = Number(verBtn.dataset.v);
    const tmp = document.createElement('div');
    tmp.innerHTML = cardHtml(g);
    const fresh = tmp.firstElementChild;
    card.replaceWith(fresh);
    enhanceDesc(fresh);
    return;
  }

  const act = e.target.closest('[data-act]');
  if (!act) return;
  const id = act.dataset.id;

  if (act.dataset.act === 'view') {
    e.preventDefault();
    try {
      const r = await api(`/api/plugins/${id}/content`);
      $('#viewTitle').textContent = r.name + (r.truncated ? `（前 120 行 / 共 ${r.total} 行）` : '');
      $('#viewBody').textContent = r.text;
      $('#mask4').classList.add('on');
      $('#viewSheet').classList.add('on');
    } catch (err) { toast(err.message); }
    return;
  }

  if (act.dataset.act === 'fav') {
    e.preventDefault();
    try {
      const r = await api(`/api/plugins/${id}/favorite`, { method: 'POST' });
      act.textContent = r.favorite ? '★' : '☆';
      act.classList.toggle('on', r.favorite);
      const v = g.variants.find(x => String(x.id) === id);
      if (v) v.favorite = r.favorite;
      g.favorite = g.variants.some(x => x.favorite);
      loadList().catch(() => {});
    } catch (err) { toast(err.message); }
    return;
  }
  if (act.dataset.act === 'copy') {
    const url = act.dataset.url;
    const ok = await copyText(url);
    toast(ok ? '链接已复制' : url);
    return;
  }
  if (act.dataset.act === 'edit') {
    e.preventDefault();
    openForm(g.variants.find(x => String(x.id) === id)); return;
  }
  if (act.dataset.act === 'use') {
    api(`/api/plugins/${id}/installed`, { method: 'POST' }).then(() => {
      act.textContent = '已导入';
      card.classList.add('done');
      const v = g.variants.find(x => String(x.id) === id);
      if (v) { v.installed = true; v.unread = false; }
      g.installed = g.variants.some(x => x.installed);
      const dot = card.querySelector('.dot'); if (dot) dot.remove();
    }).catch(() => {});
  }
});

$('#syncBtn').addEventListener('click', async () => {
  const btn = $('#syncBtn');
  btn.classList.add('spin');
  try {
    const r = await api('/api/sync', { method: 'POST' });
    toast(`同步完成：新增 ${r.added}，更新 ${r.updated}`);
    await refresh();
  } catch (e) { toast(e.message); }
  btn.classList.remove('spin');
});

function openForm(it) {
  state.editing = it || null;
  $('#sheetTitle').textContent = it ? '编辑插件' : '添加插件';
  $('#f-name').value = it ? it.name : '';
  $('#f-desc').value = it ? it.desc : '';
  $('#f-url').value = it ? it.url : '';
  $('#f-author').value = it ? it.author : '';
  $('#f-author_url').value = it ? it.author_url : '';
  $('#f-repo_url').value = it ? it.repo_url : '';
  $('#probeHint').textContent = '读取后自动填名称、说明、作者、仓库';
  if (!categories.length) loadCategories().then(() => { renderGroupOptions(); }).catch(() => {});
  renderGroupOptions();
  $('#f-group').value = it ? (it.group || '') : (categories[0] ? categories[0].name : '');
  $('#delBtn').style.display = it ? 'block' : 'none';
  $('#mask').classList.add('on');
  $('#sheet').classList.add('on');
  $('#bar').classList.add('on');
}

function renderTagPick_unused() {
  const cur = '';
  const set = ['去广告', '工具', '订阅', ...state.formTags];
  const uniq = [...new Set(set.filter(Boolean))];
  $('#tagPick').innerHTML = uniq.map(t =>
    `<button class="tag${cur === t ? ' on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('');
}

function closeForm() {
  $('#mask').classList.remove('on');
  $('#sheet').classList.remove('on');
  $('#bar').classList.remove('on');
  state.editing = null;
}

$('#addBtn').addEventListener('click', () => openForm(null));
$('#closeBtn').addEventListener('click', closeForm);
$('#mask').addEventListener('click', closeForm);



$('#probeBtn').addEventListener('click', async () => {
  const url = $('#f-url').value.trim();
  if (!url) { toast('先填模块地址'); return; }
  $('#probeHint').textContent = '读取中…';
  try {
    const m = await api('/api/fetch-meta', { method: 'POST', body: JSON.stringify({ url }) });
    if (m.name) $('#f-name').value = m.name;
    if (m.desc) $('#f-desc').value = m.desc;
    if (m.author) $('#f-author').value = m.author;
    if (m.author_url) $('#f-author_url').value = m.author_url;
    if (m.repo_url) $('#f-repo_url').value = m.repo_url;
    $('#probeHint').textContent = '已识别' + (m.has_script ? '（含脚本）' : '');
  } catch (e) {
    $('#probeHint').textContent = '读取失败：' + e.message;
  }
});

$('#saveBtn').addEventListener('click', async () => {
  const body = {
    name: $('#f-name').value.trim(),
    desc: $('#f-desc').value.trim(),
    url: $('#f-url').value.trim(),
    author: $('#f-author').value.trim(),
    author_url: $('#f-author_url').value.trim(),
    repo_url: $('#f-repo_url').value.trim(),
    group: $('#f-group').value.trim() || '自用',
    tags: '',
  };
  if (!body.name || !body.url) { toast('名称和模块地址必填'); return; }
  try {
    if (state.editing) await api('/api/plugins/' + state.editing.id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/plugins', { method: 'POST', body: JSON.stringify(body) });
    closeForm(); toast('已保存'); await refresh();
  } catch (e) { toast(e.message); }
});

$('#delBtn').addEventListener('click', async () => {
  if (!state.editing) return;
  if (!confirm('删除「' + state.editing.name + '」？')) return;
  try {
    await api('/api/plugins/' + state.editing.id, { method: 'DELETE' });
    closeForm(); toast('已删除'); await refresh();
  } catch (e) { toast(e.message); }
});

loadCategories().then(renderGroupOptions).catch(() => {});
refresh().catch(e => { $('#sub').textContent = '加载失败：' + e.message; });

// ---- 设置：分类管理 ----
let categories = [];

async function loadCategories() {
  categories = await api('/api/categories');
  return categories;
}

function renderCats() {
  $('#catList').innerHTML = categories.map(c => `
    <div class="cat" data-name="${esc(c.name)}">
      <div class="cr">
        <div style="min-width:0">
          <div class="cn">${esc(c.name)}</div>
          <div class="cd">${c.dir ? esc(c.dir) : '未绑定目录'} · ${c.n} 个</div>
        </div>
        <div class="cb">
          <button class="mini" data-act="edit">编辑</button>
          <button class="mini go2" data-act="scan">扫描</button>
        </div>
      </div>
      <div class="edit">
        <input class="e-name" value="${esc(c.name)}" placeholder="分类名">
        <input class="e-dir" value="${esc(c.dir || '')}" placeholder="仓库目录，如 egern/ 或 rules/">
        <select class="e-kind">
          <option value="module"${c.kind === 'module' ? ' selected' : ''}>Egern 模块</option>
          <option value="rule"${c.kind === 'rule' ? ' selected' : ''}>规则集</option>
          <option value="sub"${c.kind === 'sub' ? ' selected' : ''}>订阅 / 其他</option>
        </select>
        <div style="display:flex;gap:8px">
          <button class="mini go2" data-act="save" style="flex:1">保存</button>
          <button class="mini" data-act="del" style="color:#d1403a;border-color:#ffd9d6">删除</button>
        </div>
      </div>
    </div>`).join('') || '<div class="arg-note">还没有分类，点下面新增一个</div>';
}

$('#catList').addEventListener('click', async e => {
  const btn = e.target.closest('[data-act]');
  const box = e.target.closest('.cat');
  if (!btn || !box) return;
  const name = box.dataset.name;
  const act = btn.dataset.act;
  if (act === 'edit') { box.classList.toggle('editing'); return; }
  if (act === 'scan') {
    btn.textContent = '…';
    try {
      const r = await api(`/api/categories/${encodeURIComponent(name)}/scan`, { method: 'POST' });
      toast(`扫描 ${r.scanned} 个文件，新增 ${r.added} 个`);
      await refresh(); await loadCategories(); renderCats(); renderGroupOptions();
    } catch (err) { toast(err.message); }
    btn.textContent = '扫描';
    return;
  }
  if (act === 'save') {
    const body = {
      name: box.querySelector('.e-name').value.trim(),
      dir: box.querySelector('.e-dir').value.trim(),
      kind: box.querySelector('.e-kind').value,
    };
    if (!body.name) { toast('分类名不能空'); return; }
    try {
      await api('/api/categories/' + encodeURIComponent(name), { method: 'PUT', body: JSON.stringify(body) });
      toast('已保存');
      await loadCategories(); renderCats(); renderGroupOptions(); await refresh();
    } catch (err) { toast(err.message); }
    return;
  }
  if (act === 'del') {
    if (!confirm(`删除分类「${name}」？`)) return;
    try {
      await api('/api/categories/' + encodeURIComponent(name), { method: 'DELETE' });
      await loadCategories(); renderCats(); renderGroupOptions(); await refresh();
    } catch (err) { toast(err.message); }
  }
});

$('#catAdd').addEventListener('click', async () => {
  const name = prompt('新分类名称，比如 Egern 插件 / 分流规则 / 某某订阅');
  if (!name) return;
  try {
    await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: name.trim(), dir: '', kind: 'module' }) });
    await loadCategories(); renderCats(); renderGroupOptions();
  } catch (e) { toast(e.message); }
});

function renderGroupOptions() {
  const sel = $('#f-group');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = categories.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
  if (cur && categories.some(c => c.name === cur)) sel.value = cur;
}

$('#favBtn').addEventListener('click', () => {
  state.onlyFav = !state.onlyFav;
  $('#favBtn').classList.toggle('on', state.onlyFav);
  loadList().catch(e => toast(e.message));
});

$('#setBtn').addEventListener('click', async () => {
  try { await loadCategories(); } catch (e) { toast(e.message); }
  renderCats(); renderGroupOptions();
  $('#mask3').classList.add('on');
  $('#setSheet').classList.add('on');
});
$('#setClose').addEventListener('click', () => {
  $('#mask3').classList.remove('on');
  $('#setSheet').classList.remove('on');
});
$('#mask3').addEventListener('click', () => {
  $('#mask3').classList.remove('on');
  $('#setSheet').classList.remove('on');
});

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove();
  return ok;
}

// ---- 导出 / 导入 ----
document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    const rows = await api('/api/export');
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '自用清单-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast(`已导出 ${rows.length} 条`);
  } catch (e) { toast(e.message); }
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const rows = JSON.parse(await f.text());
    const r = await api('/api/import', { method: 'POST', body: JSON.stringify(rows) });
    toast(`导入完成，新收录 ${r.imported} 条`);
    await refresh();
  } catch (err) { toast('导入失败：' + err.message); }
  e.target.value = '';
});

$('#viewClose').addEventListener('click', () => {
  $('#mask4').classList.remove('on');
  $('#viewSheet').classList.remove('on');
});
$('#mask4').addEventListener('click', () => {
  $('#mask4').classList.remove('on');
  $('#viewSheet').classList.remove('on');
});
