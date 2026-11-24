/* OGSM 策略規劃表：畫面
   規則全在 data.js（window.OSP）。輸入只存檔＋局部更新，不整頁重畫，焦點才不會跑掉；增刪移動才重畫。 */
(function(){
'use strict';
var D = window.OSP, PFX = 'osp.';
function lsGet(k){ try{ return localStorage.getItem(PFX + k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(PFX + k, v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(PFX + k); }catch(e){} }
function lsJson(k, d){ try{ var v = JSON.parse(lsGet(k)); return v == null ? d : v; }catch(e){ return d; } }
function $(id){ return document.getElementById(id); }
function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
var esc = D.esc, fmt = D.fmt;
function today(){ var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

var COUNTER = 'https://visitor-badge.laobi.icu/badge?page_id=m255525.ogsmstrategyplanner';
var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
var TABS = [['fill', '① 填寫'], ['page', '② 一頁 OGSM'], ['check', '③ 邏輯健檢'], ['track', '④ 展開與追蹤'], ['about', '⑤ 說明']];
var V = {tab:lsGet('tab') || 'fill', filter:'all', ym:'', share:null, undo:[], fold:{}};
if(!TABS.some(function(t){ return t[0] === V.tab; })) V.tab = 'fill';

/* ---------- 資料 ---------- */
function defaults(){ var l = D.example('cof'); return D.sanitize({plans:l, cur:l[0].id}); }
function load(){ var s = D.sanitize(lsJson('state', null)); return s.plans.length ? s : defaults(); }
var S = load(), saveWarned = false;
function save(){ if(!lsSet('state', JSON.stringify(S)) && !saveWarned){ saveWarned = true; toast('這台瀏覽器存不進資料，請先下載備份檔'); } }
function cur(){ return V.share || D.planById(S.plans, S.cur) || S.plans[0]; }
function issues(){ return D.check(cur(), V.share ? null : S.plans); }
// 增刪移動前先記一份，可以復原 20 步
function keep(json){ V.undo.push(json || JSON.stringify(S)); if(V.undo.length > 20) V.undo.shift(); V.pre = null; var b = document.querySelector('[data-act="undo"]'); if(b) b.disabled = false; }
function change(fn, msg){ keep(); fn(cur()); save(); render(); if(msg) toast(msg); }
function find(kind, id){
  var p = cur(), r = null;
  if(kind === 'p') return p;
  if(kind === 'g') return p.goals.filter(function(x){ return x.id === id; })[0];
  p.strats.forEach(function(s){
    if(kind === 's' && s.id === id) r = s;
    if(kind === 'k') s.kpis.forEach(function(x){ if(x.id === id) r = x; });
    if(kind === 'a') s.acts.forEach(function(x){ if(x.id === id) r = x; });
  });
  return r;
}
function listOf(kind, id){
  var p = cur(), r = null;
  if(kind === 'g') return p.goals; if(kind === 's') return p.strats;
  p.strats.forEach(function(s){ var l = kind === 'k' ? s.kpis : s.acts; if(l.some(function(x){ return x.id === id; })) r = l; });
  return r;
}

/* ---------- 外框 ---------- */
function render(){
  var sh = V.share, f = document.activeElement, fp = f && f.dataset && f.dataset.p, y = window.scrollY;
  var h = '<div class="bar"><h1><span class="seal" aria-hidden="true">' + roseSvg(38) + '</span>OGSM 策略規劃表<small>目的、目標、策略、衡量，一頁接起來</small></h1>' +
    '<a class="ibtn noprint" href="manual.html">📖 操作手冊</a><button class="ibtn" data-act="print">🖨 列印</button><button class="ibtn" data-act="settings" aria-label="常用設定">⚙</button></div>' +
    '<p class="warn-line">健檢分數與進度燈號是自訂的經驗法則，只供討論參考；範例全為虛構。<button data-act="warn">⚠ 使用警語</button></p>';
  if(sh) h += '<div class="card sharebar"><b>🔗 這是別人分享的 OGSM，只能看。</b><div class="btns"><button class="btn" data-act="shareSave">存成我的一份</button><button class="btn alt" data-act="shareExit">回到我的 OGSM</button></div></div>';
  else h += planBar() + '<nav class="tabs" role="tablist">' + TABS.map(function(t){ return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (V.tab === t[0]) + '">' + t[1] + (t[0] === 'check' ? ' <span class="badge" id="scoreBadge"></span>' : '') + '</button>'; }).join('') + '</nav>';
  var tab = sh ? 'page' : V.tab;
  h += TABS.map(function(t){ return '<section class="panel" data-p-tab="' + t[0] + '" id="panel-' + t[0] + '"' + (tab === t[0] ? '' : ' hidden') + '></section>'; }).join('');
  h += '<footer class="foot">👤 創作者 Mark Tsai（蔡豐全）・<a href="manual.html">📖 操作手冊</a>・<a href="#" data-act="warn">⚠ 使用警語</a>' + (standalone ? '' : '・<a href="#" data-act="install">📲 加入主畫面</a>') +
    '<br><img src="' + COUNTER + '" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle;margin-top:.4rem"></footer>';
  $('app').innerHTML = h;
  renderPanel(tab); light();
  if(fp){ var e2 = document.querySelector('[data-p="' + fp + '"]'); if(e2) e2.focus({preventScroll:true}); }
  window.scrollTo(0, y);
}
var PANELS = {fill:fillHTML, page:pageHTML, check:checkHTML, track:trackHTML, about:aboutHTML};
function renderPanel(t){ $('panel-' + t).innerHTML = PANELS[t](); setPrint(t); }
function setPrint(t){
  var pr = t === 'fill' ? 'page' : t; document.body.dataset.print = pr;
  $('pageStyle').textContent = '@media print{@page{size:A4 ' + (pr === 'page' ? 'landscape' : 'portrait') + ';margin:10mm}}';
}
// 打字時只更新這些：分數、缺口、選單名稱
function light(){
  var sc = $('scoreBadge');
  if(sc){ var l = issues(), b = l.filter(function(i){ return i.lv === 'bad'; }).length; sc.textContent = l.length ? (b ? '🔴' + b + ' ' : '') + (l.length - b ? '🟡' + (l.length - b) : '') : '✓'; }
  var p = cur();
  p.goals.forEach(function(g){ qa('[data-cov="' + g.id + '"]').forEach(function(e){ e.innerHTML = covChip(p, g); }); });
  var o = document.querySelector('#planSel option[value="' + p.id + '"]'); if(o) o.textContent = optName(p);
  var bs = $('budgetSum'); if(bs) bs.textContent = budgetText(p);
}
function optName(p){ return (p.parent ? '└ ' : '') + p.name; }
function planBar(){
  var opts = []; (function walk(ns){ ns.forEach(function(n){ opts.push('<option value="' + n.p.id + '"' + (n.p.id === S.cur ? ' selected' : '') + '>' + esc((n.depth > 1 ? '　'.repeat(n.depth - 1) : '') + optName(n.p)) + '</option>'); walk(n.kids); }); })(D.tree(S.plans));
  return '<div class="planbar noprint"><label class="sr" for="planSel">目前這一份</label><select id="planSel">' + opts.join('') + '</select>' +
    '<button class="ibtn" data-act="newPlan">➕ 新增</button><button class="ibtn" data-act="copyPlan">⧉ 複製一份</button><button class="ibtn" data-act="share">🔗 分享</button><button class="ibtn" data-act="delPlan">🗑 刪除</button><button class="ibtn" data-act="undo"' + (V.undo.length ? '' : ' disabled') + '>↩ 復原</button></div>';
}

/* ---------- 欄位 ---------- */
function inp(kind, id, f, v, label, o){
  o = o || {}; var dp = kind + '|' + id + '|' + f, a = ' data-p="' + dp + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '');
  var c = o.area ? '<textarea rows="' + o.area + '" maxlength="' + (o.max || 400) + '"' + a + '>' + esc(v) + '</textarea>' :
    o.sel ? '<select' + a + '>' + o.sel.map(function(x){ return '<option value="' + x[0] + '"' + (String(v) === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' :
    o.type === 'number' ? '<input type="number" step="any" inputmode="decimal"' + a + ' value="' + esc(v) + '">' :
    '<input type="' + (o.type || 'text') + '"' + (o.type === 'date' ? ' max="9999-12-31"' : ' maxlength="' + (o.max || 200) + '"') + a + ' value="' + esc(v) + '">';
  return '<label class="fld' + (o.cls ? ' ' + o.cls : '') + '"><span>' + label + '</span>' + c + '</label>';
}
var DIR = [['up', '越高越好'], ['down', '越低越好']], ACC = [['level', '水準值'], ['sum', '累計值']];
function tools(kind, id, i, n, rw){
  return '<span class="tools">' + (rw ? '<button class="mini" data-act="rewrite" data-kind="' + kind + '" data-id="' + id + '" title="請 AI 改寫">✨ 改寫</button>' : '') +
    '<button class="mini" data-act="move" data-kind="' + kind + '" data-id="' + id + '" data-d="-1" aria-label="往上移"' + (i ? '' : ' disabled') + '>↑</button><button class="mini" data-act="move" data-kind="' + kind + '" data-id="' + id + '" data-d="1" aria-label="往下移"' + (i < n - 1 ? '' : ' disabled') + '>↓</button>' +
    '<button class="mini del" data-act="del" data-kind="' + kind + '" data-id="' + id + '" aria-label="刪除">🗑</button></span>';
}
function guessChip(x, kind){ return x.guess ? '<span class="chip warn" data-guess="' + x.id + '">◆ AI 推測，請確認 <button class="lnk" data-act="confirmNum" data-kind="' + kind + '" data-id="' + x.id + '">確認數字</button></span>' : ''; }
function covChip(p, g){
  var c = D.coverage(p, g), u = g.unit ? ' ' + esc(g.unit) : '';
  var m = {none:['bad', '▼ 沒有策略支援'], short:['bad', '▼ 還差 ' + fmt(c.short) + u + '（補了 ' + Math.round((c.ratio || 0) * 100) + '%）'], near:['warn', '◆ 略少 ' + fmt(c.short) + u], unest:['warn', '◆ ' + c.unest + ' 條策略沒估貢獻'], over:['warn', '◆ 預估是缺口的 ' + Math.round((c.ratio || 0) * 100) + '%'], ok:['ok', '● 缺口 ' + fmt(c.gap) + u + ' 補得滿（' + Math.round((c.ratio || 0) * 100) + '%）'], na:['na', '－ 填起點與目標才算得出缺口']}[c.st];
  return '<span class="chip ' + m[0] + '">' + m[1] + '</span>';
}
function budgetText(p){ var c = D.costOf(p); return '行動預算合計 ' + fmt(c) + ' 元' + (p.budget === '' ? '' : '／上限 ' + fmt(p.budget) + ' 元' + (c > p.budget ? '　▼ 超過 ' + fmt(c - p.budget) : '')); }
function tip(bad, good){ return '<details class="tip"><summary>好和不好的差別</summary><p><b>✗</b> ' + bad + '</p><p><b>✓</b> ' + good + '</p></details>'; }

// 手機上預設只展開第一條策略
function folded(s, i){ return D.has(V.fold, s.id) ? V.fold[s.id] : innerWidth <= 600 && i > 0; }
/* ---------- ① 填寫 ---------- */
function fillHTML(){
  var p = cur(), L = D.labels(p), par = p.parent && D.planById(S.plans, p.parent.plan), h = '';
  if(par){ var ps = par.strats.filter(function(x){ return x.id === p.parent.s; })[0]; h += '<div class="card linkbar">⚓ 這一份承接 <b>' + esc(par.name) + '</b>' + (ps ? ' 的 <b>' + D.labels(par)[ps.id] + ' ' + esc(ps.t) + '</b>' : '（上層策略已刪除）') + ' <button class="mini" data-act="open" data-id="' + par.id + '">打開上層</button></div>'; }
  h += '<div class="card"><h3>航程設定</h3><div class="row">' + inp('p', '', 'name', p.name, '這一份的名稱', {max:60}) + inp('p', '', 'unit', p.unit, '公司或部門', {max:60}) + inp('p', '', 'from', p.from, '開始日', {type:'date'}) + inp('p', '', 'to', p.to, '結束日', {type:'date'}) + inp('p', '', 'budget', p.budget, '預算上限（元，選填）', {type:'number'}) + '</div></div>';
  h += '<details class="card aibox"><summary>🤖 不知道怎麼開始？用一段話請 AI 起草</summary><p class="small">寫產業、現況、想改變什麼、有多少人和錢。AI 給的數字都會標「推測」，要你確認；不會蓋掉現在這一份。</p><textarea id="aiBg" rows="3" maxlength="1500" placeholder="例如：社區咖啡店，開三年，早上 7～9 點客人少，員工 4 人，明年想把早餐做起來">' + esc(V.bg || '') + '</textarea><div class="btns"><button class="btn" data-act="aiDraft">✨ 起草一份</button></div></details>';
  // O
  h += '<div class="card lv lv-o" data-anchor="o"><h3><span class="big">O</span>最終目的<small>Objective：一句話講清楚要去哪裡，不放數字</small></h3>' + inp('p', '', 'o', p.o, '我們要', {area:2, max:400, ph:'成為〔誰〕心中〔什麼〕的〔什麼〕'}) +
    '<div class="btns sm"><button class="mini" data-act="rewrite" data-kind="o" data-id="">✨ 改寫</button></div>' + tip('追求卓越、成為第一品牌、營收成長 30%', '成為社區居民每天早上第一個想到的咖啡店') + '</div>';
  // G
  h += '<div class="card lv lv-g" data-anchor="g"><h3><span class="big">G</span>具體目標<small>Goals：哪些數字變了，就代表 O 做到了？2～4 個最好。數字類型：「水準值」看月底是多少（例如回訪率）；「累計值」把每個月加起來（例如全年營收）</small></h3>';
  p.goals.forEach(function(g, i){
    h += '<div class="item" data-anchor="' + g.id + '"><div class="ihead"><b class="no">' + L[g.id] + '</b><span data-cov="' + g.id + '"></span>' + guessChip(g, 'g') + (g.src ? '<span class="chip na">⚓ 來自上層</span>' : '') + tools('g', g.id, i, p.goals.length, true) + '</div><div class="grid">' +
      inp('g', g.id, 't', g.t, '指標名稱', {cls:'w2', ph:'例如 熟客回訪率'}) + inp('g', g.id, 'base', g.base, '現在', {type:'number'}) + inp('g', g.id, 'target', g.target, '目標', {type:'number'}) + inp('g', g.id, 'unit', g.unit, '單位', {max:20, ph:'%'}) +
      inp('g', g.id, 'due', g.due, '期限', {type:'date'}) + inp('g', g.id, 'dir', g.dir, '方向', {sel:DIR}) + inp('g', g.id, 'acc', g.acc, '數字類型', {sel:ACC}) + '</div></div>';
  });
  h += '<div class="btns">' + (p.goals.length < D.LIM.goals ? '<button class="btn alt" data-act="addGoal" data-goto="|addGoal">＋ 加一個目標</button>' : '') + '</div>' + tip('辦 12 場活動（做完不代表有效果）', '熟客回訪率 32% → 45%，12/31 前') + '</div>';
  // S＋M
  h += '<div class="card lv lv-s" data-anchor="s"><h3><span class="big">S</span>策略 ＋ <span class="big m">M</span>衡量<small>Strategies：靠什麼做法補上缺口，以及為此不做什麼。Measures：怎麼知道有效、誰做到哪天</small></h3><p class="small" id="budgetSum">' + budgetText(p) + '</p>';
  p.strats.forEach(function(s, i){
    h += '<article class="strat" data-anchor="' + s.id + '"><div class="ihead"><b class="no">' + L[s.id] + '</b>' + (folded(s, i) ? '<b class="ft">' + (esc(s.t) || '（未填）') + '</b><span class="small">指標 ' + s.kpis.length + '・行動 ' + s.acts.length + '</span>' : '') + '<button class="mini" data-act="fold" data-id="' + s.id + '" aria-expanded="' + !folded(s, i) + '">' + (folded(s, i) ? '▸ 展開' : '▾ 收合') + '</button>' + tools('s', s.id, i, p.strats.length, true) + '</div>' +
      (folded(s, i) ? '<div hidden>' : '<div>') + inp('s', s.id, 't', s.t, '策略（一句話的做法）', {ph:'例如 把早餐做成十分鐘外帶套餐'}) +
      '<div class="row">' + inp('s', s.id, 'how', s.how, '具體做法', {area:2, ph:'對誰、用什麼方法、資源放哪'}) + inp('s', s.id, 'not', s.not, '為了這條，我們不做什麼', {area:2, ph:'例如 不做現點現做的早午餐'}) + '</div>';
    h += '<fieldset class="links" data-goto="' + s.id + '|links"><legend>這條策略支援哪些目標？預估能補多少缺口？</legend>' + (p.goals.length ? p.goals.map(function(g){
      var on = D.has(s.links, g.id);
      return '<div class="lk"><label><input type="checkbox" data-link="' + s.id + '|' + g.id + '"' + (on ? ' checked' : '') + '> <b>' + L[g.id] + '</b> ' + esc(g.t || '（未命名）') + '</label>' +
        (on ? '<label class="fld inl"><span class="sr">' + L[s.id] + ' 對 ' + L[g.id] + ' 的預估貢獻</span><input type="number" min="0" step="any" inputmode="decimal" placeholder="預估" data-contrib="' + s.id + '|' + g.id + '" value="' + esc(s.links[g.id]) + '"> <span data-unit="' + g.id + '">' + esc(g.unit) + '</span></label>' : '') + '</div>';
    }).join('') : '<p class="small">先在上面加目標。</p>') + '</fieldset>';
    h += '<h4>M 衡量指標</h4>' + s.kpis.map(function(k, j){
      return '<div class="item sub" data-anchor="' + k.id + '"><div class="ihead"><b class="no m">' + L[k.id] + '</b>' + guessChip(k, 'k') + tools('k', k.id, j, s.kpis.length, true) + '</div><div class="grid">' +
        inp('k', k.id, 't', k.t, '指標', {cls:'w2', ph:'例如 每日外帶預訂數'}) + inp('k', k.id, 'base', k.base, '現在', {type:'number'}) + inp('k', k.id, 'target', k.target, '目標', {type:'number'}) + inp('k', k.id, 'unit', k.unit, '單位', {max:20}) + inp('k', k.id, 'owner', k.owner, '負責人', {max:30}) +
        inp('k', k.id, 'freq', k.freq, '多久看一次', {sel:Object.keys(D.FREQ).map(function(x){ return [x, D.FREQ[x]]; })}) + inp('k', k.id, 'lead', k.lead ? '1' : '0', '類型', {sel:[['1', '領先（過程）'], ['0', '落後（結果）']]}) + inp('k', k.id, 'dir', k.dir, '方向', {sel:DIR}) + inp('k', k.id, 'acc', k.acc, '數字類型', {sel:ACC}) + '</div></div>';
    }).join('') + (s.kpis.length < D.LIM.kpis ? '<button class="mini add" data-act="addKpi" data-id="' + s.id + '" data-goto="' + s.id + '|addKpi">＋ 加指標</button>' : '');
    h += '<h4>M 行動</h4>' + s.acts.map(function(a, j){
      return '<div class="item sub" data-anchor="' + a.id + '"><div class="ihead"><b class="no a">' + L[a.id] + '</b>' + tools('a', a.id, j, s.acts.length, true) + '</div><div class="grid">' + inp('a', a.id, 't', a.t, '要做的事', {cls:'w2'}) + inp('a', a.id, 'owner', a.owner, '負責人', {max:30}) + inp('a', a.id, 'from', a.from, '開始', {type:'date'}) + inp('a', a.id, 'to', a.to, '完成', {type:'date'}) + inp('a', a.id, 'cost', a.cost, '預算（元）', {type:'number'}) + inp('a', a.id, 'st', a.st, '狀態', {sel:Object.keys(D.ST).map(function(x){ return [x, D.ST[x]]; })}) + '</div></div>';
    }).join('') + (s.acts.length < D.LIM.acts ? '<button class="mini add" data-act="addAct" data-id="' + s.id + '" data-goto="' + s.id + '|addAct">＋ 加行動</button>' : '') + '</div></article>';
  });
  h += '<div class="btns">' + (p.strats.length < D.LIM.strats ? '<button class="btn alt" data-act="addStrat" data-goto="|addStrat">＋ 加一條策略</button>' : '') + '</div>' + tip('持續優化服務品質', '把早餐做成十分鐘外帶套餐；不做現點現做的早午餐盤') + '</div>';
  return h + '<div class="btns end"><button class="btn" data-tab="check">下一步：看邏輯健檢 →</button></div>';
}

/* ---------- 海圖 ---------- */
function roseSvg(sz){ var r = ''; for(var i = 0; i < 8; i++) r += '<path d="M0 0L' + (i % 2 ? '4 -4L0 -27L-4 -4' : '6 -6L0 -44L-6 -6') + 'Z" transform="rotate(' + i * 45 + ')" fill="' + (i === 0 ? 'var(--route)' : i % 2 ? 'var(--brass)' : 'var(--sea)') + '"/>'; return '<svg viewBox="-50 -50 100 100" width="' + sz + '" height="' + sz + '" aria-hidden="true"><circle r="47" fill="var(--sheet)" stroke="var(--sea)" stroke-width="2.5"/><circle r="32" fill="none" stroke="var(--brass)" stroke-width="1.2"/>' + r + '<circle r="4" fill="var(--sheet)"/></svg>'; }
function wrap(t, n, max){ var w = 0, l = '', out = [], cs = Array.from(t || '（未填）'); cs.forEach(function(c){ var k = /[\x00-\xff]/.test(c) ? .55 : 1; if(w + k > n){ out.push(l); l = ''; w = 0; } l += c; w += k; }); if(l) out.push(l); if(out.length > max){ out = out.slice(0, max); out[max - 1] = Array.from(out[max - 1]).slice(0, -1).join('') + '…'; } return out; }
function txt(lines, x, y, lh, cls, anchor){ return '<text class="' + cls + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + lines.map(function(l, i){ return '<tspan x="' + x + '" dy="' + (i ? lh : 0) + '">' + esc(l) + '</tspan>'; }).join('') + '</text>'; }
function mapSvg(p){
  var L = D.labels(p), nS = p.strats.length, nG = p.goals.length, n = Math.max(nS, nG, 2), H = Math.max(330, n * 84 + 70), W = 1080, e = '', b = '';
  function ys(c){ var r = [], gap = (H - 50) / Math.max(c, 1); for(var i = 0; i < c; i++) r.push(25 + gap * (i + .5)); return r; }
  var sy = ys(nS), gy = ys(nG), SX = 180, SW = 295, GX = 610, GW = 235, cy = H / 2, bh = 66;
  p.strats.forEach(function(s, i){ e += '<path class="ed h" data-e="' + s.id + '" d="M96 ' + cy + 'C140 ' + cy + ' 140 ' + sy[i] + ' ' + SX + ' ' + sy[i] + '"/>'; });
  p.strats.forEach(function(s, i){ p.goals.forEach(function(g, j){
    if(!D.has(s.links, g.id)) return;
    var c = D.coverage(p, g), v = s.links[g.id], w = v === '' || !c.gap || c.gap <= 0 ? 1.6 : Math.min(8, Math.max(1.6, 8 * v / c.gap));
    e += '<path class="ed r' + (v === '' ? ' dash' : '') + '" data-e="' + s.id + ' ' + g.id + '" style="stroke-width:' + w.toFixed(1) + 'px" d="M' + (SX + SW) + ' ' + sy[i] + 'C' + (GX - 70) + ' ' + sy[i] + ' ' + (GX - 70) + ' ' + gy[j] + ' ' + GX + ' ' + gy[j] + '"><title>' + L[s.id] + ' → ' + L[g.id] + (v === '' ? '（沒估貢獻）' : '：預估 ' + fmt(v) + ' ' + esc(g.unit) + (c.gap > 0 ? '，占缺口 ' + Math.round(v / c.gap * 100) + '%' : '')) + '</title></path>';
  }); });
  p.goals.forEach(function(g, j){ e += '<path class="ed h" data-e="' + g.id + '" d="M' + (GX + GW) + ' ' + gy[j] + 'C' + (GX + GW + 55) + ' ' + gy[j] + ' ' + (GX + GW + 45) + ' ' + (cy - 46) + ' 936 ' + (cy - 46) + '"/>'; });
  p.strats.forEach(function(s, i){ var y = sy[i]; b += '<g class="nd" data-n="' + s.id + '" data-act="goto" data-id="' + s.id + '" data-field="t" tabindex="0" role="button" aria-label="' + esc(L[s.id] + ' ' + s.t) + '"><path class="hull" d="M' + (SX + 10) + ' ' + (y - bh / 2) + 'H' + (SX + SW - 26) + 'L' + (SX + SW) + ' ' + y + 'L' + (SX + SW - 26) + ' ' + (y + bh / 2) + 'H' + (SX + 10) + 'Q' + SX + ' ' + y + ' ' + (SX + 10) + ' ' + (y - bh / 2) + 'Z"/>' + '<text class="nl" x="' + (SX + 18) + '" y="' + (y + 6) + '">' + L[s.id] + '</text>' + txt(wrap(s.t, 14, 2), SX + 54, y - (wrap(s.t, 14, 2).length > 1 ? 12 : 3), 18, 'nt') + '<text class="ns" x="' + (SX + 54) + '" y="' + (y + 25) + '">指標 ' + s.kpis.length + '・行動 ' + s.acts.filter(function(a){ return a.st === 'done'; }).length + '／' + s.acts.length + ' 完成</text></g>'; });
  p.goals.forEach(function(g, j){ var y = gy[j], c = D.coverage(p, g), k = {ok:'ok', over:'warn', near:'warn', unest:'warn', short:'bad', none:'bad', na:'na'}[c.st], ic = {ok:'●', warn:'◆', bad:'▼', na:'－'}[k];
    b += '<g class="nd" data-n="' + g.id + '" data-act="goto" data-id="' + g.id + '" data-field="t" tabindex="0" role="button" aria-label="' + esc(L[g.id] + ' ' + g.t) + '"><rect class="buoy" x="' + GX + '" y="' + (y - bh / 2) + '" width="' + GW + '" height="' + bh + '" rx="33"/><text class="nl g" x="' + (GX + 18) + '" y="' + (y + 6) + '">' + L[g.id] + '</text>' + txt(wrap(g.t, 10, 1), GX + 58, y - 5, 18, 'nt') + '<text class="ns" x="' + (GX + 58) + '" y="' + (y + 16) + '">' + esc((g.base === '' ? '' : fmt(g.base) + ' → ') + fmt(g.target) + ' ' + g.unit) + '</text><text class="st-' + k + '" x="' + (GX + GW - 26) + '" y="' + (y + 6) + '" text-anchor="middle">' + ic + '</text></g>'; });
  var grid = ''; for(var x = 60; x < W; x += 120) grid += '<path class="gl" d="M' + x + ' 0V' + H + '"/>'; for(var yy = 60; yy < H; yy += 90) grid += '<path class="gl" d="M0 ' + yy + 'H' + W + '"/>';
  var depth = [0, 1, 2].map(function(i){ return '<path class="dp" d="M0 ' + (H * (.62 + i * .13)) + 'C200 ' + (H * (.5 + i * .16)) + ' 420 ' + (H * (.86 + i * .08)) + ' 640 ' + (H * (.74 + i * .1)) + 'S960 ' + (H * (.9 + i * .05)) + ' ' + W + ' ' + (H * (.72 + i * .12)) + '"/>'; }).join('');
  var star = '<g class="nd" data-n="o" data-act="goto" data-id="" data-field="o" tabindex="0" role="button" aria-label="O 最終目的"><path class="star" transform="translate(985 ' + (cy - 46) + ')" d="M0 -42L7 -8L42 0L7 8L0 42L-7 8L-42 0L-7 -8Z"/><text class="nl o" x="985" y="' + (cy - 40) + '" text-anchor="middle">O</text>' + txt(wrap(p.o, 11, 4), 985, cy + 18, 19, 'nt', 'middle') + '</g>';
  var harbor = '<g><path class="anchor" transform="translate(58 ' + (cy - 12) + ')" d="M0 -20a6 6 0 1 0 .1 0M0 -8V22M-12 0H12M-20 8Q-18 24 0 24Q18 24 20 8"/><text class="nt" x="58" y="' + (cy + 36) + '" text-anchor="middle">現在</text></g>';
  return '<div class="mapwrap"><svg class="map" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="OGSM 航線圖：策略支援目標的關係">' + grid + depth + e + harbor + b + star + '</svg></div><p class="small legend"><span><svg width="34" height="10" aria-hidden="true"><path d="M0 5H34" stroke="var(--route)" stroke-width="5"/></svg> 航線越粗，預估補的缺口越多</span><span><svg width="34" height="10" aria-hidden="true"><path d="M0 5H34" stroke="var(--route)" stroke-width="2" stroke-dasharray="5 4"/></svg> 還沒估貢獻</span><span>● 補得滿　◆ 要留意　▼ 不夠或沒人支援</span></p>';
}

/* ---------- ② 一頁 OGSM ---------- */
function pageHTML(){
  var p = cur(), L = D.labels(p), h = '';
  h += '<div class="btns noprint"><button class="btn" data-act="print">🖨 列印／存 PDF（A4 橫式）</button><button class="btn alt" data-act="copyTxt">📋 複製文字</button><button class="btn alt" data-act="doc">Word</button><button class="btn alt" data-act="csv">CSV</button></div>';
  h += '<div class="card noprint mapcard"><h3>航線圖</h3>' + mapSvg(p) + '</div>';
  h += '<div class="sheet"><header><h2>' + esc(p.name) + '</h2><span>' + esc(p.unit) + (p.from || p.to ? '　' + esc(p.from) + '～' + esc(p.to) : '') + '</span></header>';
  h += '<div class="so"><b class="big">O</b><div><small>最終目的</small><p>' + (esc(p.o) || '（未填）') + '</p></div></div>';
  h += '<div class="sg"><b class="big">G</b><div class="gs">' + (p.goals.length ? p.goals.map(function(g){ return '<div class="gc"><b>' + L[g.id] + ' ' + (esc(g.t) || '（未命名）') + '</b><span class="num">' + (g.base === '' ? '' : fmt(g.base) + ' → ') + '<strong>' + fmt(g.target) + '</strong> ' + esc(g.unit) + '</span><small>' + (g.due ? esc(g.due) + ' 前' : '沒有期限') + (g.dir === 'down' ? '・越低越好' : '') + (g.guess ? '・AI 推測未確認' : '') + '</small></div>'; }).join('') : '<p>（未填）</p>') + '</div></div>';
  h += '<div class="tw"><table class="st"><thead><tr><th><b class="big">S</b> 策略</th><th><b class="big">M</b> 衡量指標</th><th><b class="big">M</b> 行動</th></tr></thead><tbody>' + p.strats.map(function(s){
    var lk = D.linkText(p, s, L);
    return '<tr><td><b>' + L[s.id] + ' ' + (esc(s.t) || '（未填）') + '</b>' + (s.how ? '<p>' + esc(s.how) + '</p>' : '') + (s.not ? '<p class="not">✕ ' + esc(s.not) + '</p>' : '') + '<small>支援 ' + (lk || '—') + '</small></td><td>' + (s.kpis.map(function(k){ return '<div class="li"><b>' + L[k.id] + '</b> ' + esc(k.t || '（未命名）') + ' <span class="num">' + (k.base === '' ? '' : fmt(k.base) + '→') + fmt(k.target) + ' ' + esc(k.unit) + '</span><small>' + D.FREQ[k.freq] + '・' + esc(k.owner || '未指定') + '・' + (k.lead ? '領先' : '落後') + (k.guess ? '・AI 推測未確認' : '') + '</small></div>'; }).join('') || '—') + '</td><td>' + (s.acts.map(function(a){ return '<div class="li"><b>' + L[a.id] + '</b> ' + esc(a.t || '（未填）') + '<small>' + esc(a.owner || '未指定') + (a.to ? '・' + a.to : '') + '・' + D.ST[a.st] + (a.cost === '' ? '' : '・' + fmt(a.cost) + ' 元') + '</small></div>'; }).join('') || '—') + '</td></tr>';
  }).join('') + '</tbody></table></div></div>';
  if(p.goals.length && p.strats.length){
    h += '<div class="card matrix"><h3>誰撐哪個目標</h3><p class="small">格子裡是每條策略預估能補的量；加起來要蓋過缺口。</p><div class="tw"><table class="mx"><thead><tr><th>目標</th><th>缺口</th>' + p.strats.map(function(s){ return '<th title="' + esc(s.t) + '">' + L[s.id] + '</th>'; }).join('') + '<th>合計</th><th>判斷</th></tr></thead><tbody>' + p.goals.map(function(g){
      var c = D.coverage(p, g); return '<tr><th>' + L[g.id] + ' ' + esc(g.t) + (g.unit ? '（' + esc(g.unit) + '）' : '') + '</th><td class="num">' + fmt(c.gap) + '</td>' + p.strats.map(function(s){ return D.has(s.links, g.id) ? '<td class="num on">' + (s.links[g.id] === '' ? '未估' : fmt(s.links[g.id])) + '</td>' : '<td class="num off">·</td>'; }).join('') + '<td class="num"><b>' + fmt(c.sum) + '</b></td><td>' + covChip(p, g) + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }
  return h;
}

/* ---------- ③ 邏輯健檢 ---------- */
function checkHTML(){
  var l = issues(), sc = D.score(l), bad = l.filter(function(i){ return i.lv === 'bad'; }), warn = l.filter(function(i){ return i.lv !== 'bad'; });
  if(V.filter === 'bad' && !bad.length || V.filter === 'warn' && !warn.length) V.filter = 'all';
  var show = V.filter === 'bad' ? bad : V.filter === 'warn' ? warn : l;
  var h = '<div class="card scorecard"><div class="gauge">' + gaugeSvg(sc.v) + '</div><div><h3>' + sc.verdict + '</h3><p>🔴 一定要補 <b>' + bad.length + '</b>　🟡 建議再看 <b>' + warn.length + '</b></p><p class="small">分數是自訂的經驗法則：紅燈扣 8、黃燈扣 3，同一種問題最多扣兩次。高分代表寫得完整、接得起來，不代表策略會成功。</p><div class="btns noprint"><button class="btn" data-act="aiAdvice">✨ 請 AI 給修改建議</button></div></div></div>';
  h += '<div class="dims">' + ['基本', 'O', 'G', 'S', 'M', '對齊', '展開'].map(function(d){ var x = l.filter(function(i){ return i.dim === d; }), b = x.some(function(i){ return i.lv === 'bad'; }); return '<span class="chip ' + (b ? 'bad' : x.length ? 'warn' : 'ok') + '">' + (b ? '▼' : x.length ? '◆' : '●') + ' ' + d + (x.length ? ' ' + x.length : '') + '</span>'; }).join('') + '</div>';
  if(!l.length) return h + '<div class="card"><p>● 規則檢查沒有發現問題。接下來拿一頁 OGSM 和夥伴討論：每個人讀完，能不能說出自己該做什麼？</p></div>';
  h += '<div class="btns sm noprint">' + [['all', '全部 ' + l.length], ['bad', '🔴 ' + bad.length], ['warn', '🟡 ' + warn.length]].map(function(f){ return '<button class="mini' + (V.filter === f[0] ? ' on' : '') + '" data-filter="' + f[0] + '" aria-pressed="' + (V.filter === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>';
  return h + show.map(function(i){ return '<div class="iss ' + i.lv + '"><span class="dot" aria-hidden="true">' + (i.lv === 'bad' ? '▼' : '◆') + '</span><div><b><span class="sr">' + (i.lv === 'bad' ? '紅燈' : '黃燈') + '</span>' + esc(i.t) + '</b><p>' + esc(i.why) + '</p><p class="fix">→ ' + esc(i.fix) + '</p></div><button class="mini noprint" data-act="goto" data-id="' + i.id + '" data-field="' + i.field + '">看這格</button></div>'; }).join('');
}
function gaugeSvg(v){ var a = Math.PI * (1 - v / 100), x = 60 + 46 * Math.cos(a), y = 62 - 46 * Math.sin(a), tk = ''; for(var i = 0; i <= 10; i++){ var t = Math.PI * (1 - i / 10); tk += '<path d="M' + (60 + 50 * Math.cos(t)).toFixed(1) + ' ' + (62 - 50 * Math.sin(t)).toFixed(1) + 'L' + (60 + 56 * Math.cos(t)).toFixed(1) + ' ' + (62 - 56 * Math.sin(t)).toFixed(1) + '" stroke="var(--sea)" stroke-width="' + (i % 5 ? 1 : 2.2) + '"/>'; } return '<svg viewBox="0 0 120 92" width="150" role="img" aria-label="健檢分數 ' + v + '"><path d="M4 62A56 56 0 0 1 116 62" fill="none" stroke="var(--brass)" stroke-width="3"/>' + tk + '<path d="M60 62L' + x.toFixed(1) + ' ' + y.toFixed(1) + '" stroke="var(--route)" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="62" r="5" fill="var(--brass)"/><text x="60" y="89" text-anchor="middle" font-size="22" font-weight="900" fill="var(--ink)">' + v + '</text></svg>'; }

/* ---------- ④ 展開與追蹤 ---------- */
function pickYm(p){
  var ms = D.months(p); if(!ms.length) return '';
  if(ms.indexOf(V.ym) >= 0) return V.ym;
  var log = Object.keys(p.logs).sort().filter(function(m){ return ms.indexOf(m) >= 0 && Object.keys(p.logs[m].v).length; }), now = today().slice(0, 7);
  return log.length ? log[log.length - 1] : ms.indexOf(now) >= 0 ? now : ms[0];
}
function items(p){ return p.goals.concat(D.kpisOf(p)); }
function trackHTML(){
  var p = cur(), L = D.labels(p), ym = V.ym = pickYm(p), h = '<h2 class="only-print">' + esc(p.name) + '・月檢討 ' + ym + '</h2>';
  // 追蹤
  h += '<div class="card"><h3>航海日誌：每月追蹤</h3>';
  if(!ym) h += '<p>先到「① 填寫」設定開始日與結束日。</p>';
  else{
    h += '<div class="logbar noprint"><label class="fld inl"><span>月份</span><select id="ymSel">' + D.months(p).map(function(m){ var has = D.has(p.logs, m) && Object.keys(p.logs[m].v).length; return '<option value="' + m + '"' + (m === ym ? ' selected' : '') + '>' + m + (has ? ' ✓' : '') + '</option>'; }).join('') + '</select></label></div><div class="dims" id="sumChips">' + sumChips(p, ym) + '</div>';
    h += '<p class="small">「水準值」填那個月底的數字；「累計值」只填當月發生的量，工具會加總。應達值是從起點到目標走直線的位置（累計值從 0 起算）。</p><div class="tw"><table class="tr"><thead><tr><th>項目</th><th>起點→目標</th><th>' + ym + ' 填入</th><th>目前</th><th>應達</th><th>完成</th><th>狀態</th><th>走勢</th></tr></thead><tbody>' + items(p).map(function(x){ return '<tr data-tr="' + x.id + '"><th><b>' + L[x.id] + '</b> ' + esc(x.t || '（未命名）') + '<small>' + (x.acc === 'sum' ? '累計值' : '水準值') + (x.dir === 'down' ? '・越低越好' : '') + (x.owner ? '・' + esc(x.owner) : '') + '</small></th><td class="num">' + fmt(x.base) + '→' + fmt(x.target) + ' ' + esc(x.unit) + '</td><td><input class="vin" type="number" step="any" inputmode="decimal" data-val="' + x.id + '" aria-label="' + esc(L[x.id] + ' ' + x.t + ' ' + ym) + '" value="' + esc(D.valueAt(p, x.id, ym) == null ? '' : D.valueAt(p, x.id, ym)) + '"></td>' + trCells(p, x, ym) + '</tr>'; }).join('') + '</tbody></table></div>';
    var note = D.has(p.logs, ym) ? p.logs[ym].note : '';
    h += '<label class="fld noprint"><span>' + ym + ' 檢討紀錄：發生什麼事、下個月要調整什麼</span><textarea id="noteBox" rows="3" maxlength="1000">' + esc(note) + '</textarea></label><div class="only-print notep"><b>檢討紀錄</b><p id="notePrint">' + esc(note || '（未填）') + '</p></div><div class="btns noprint"><button class="btn" data-act="aiReview">✨ 請 AI 寫月檢討摘要</button><button class="btn alt" data-act="print">🖨 列印月檢討</button></div>';
  }
  h += '</div>';
  // 行動
  var acts = D.actsOf(p), od = D.overdue(p, today()), as = D.actStats(p);
  h += '<div class="card"><h3>行動清單</h3><p>完成 <b>' + as.done + '</b>／' + as.n + '　進行中 ' + as.doing + '　未開始 ' + as.todo + (od.length ? '　<span class="chip bad">▼ 逾期 ' + od.length + '</span>' : '') + '</p>';
  if(acts.length) h += '<div class="tw"><table class="ac"><thead><tr><th>行動</th><th>負責人</th><th>完成日</th><th>狀態</th></tr></thead><tbody>' + acts.map(function(x){ var late = od.some(function(o){ return o.a === x.a; }); return '<tr' + (late ? ' class="late"' : '') + '><th><b>' + x.no + '</b> ' + esc(x.a.t || '（未填）') + '</th><td>' + esc(x.a.owner || '未指定') + '</td><td class="num">' + (x.a.to || '—') + (late ? ' <span class="chip bad">▼ 逾期</span>' : '') + '</td><td><select data-p="a|' + x.a.id + '|st" data-redraw="1" aria-label="' + esc(x.no) + ' 狀態">' + Object.keys(D.ST).map(function(k){ return '<option value="' + k + '"' + (x.a.st === k ? ' selected' : '') + '>' + D.ST[k] + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table></div>';
  h += '</div>';
  // 展開
  h += '<div class="card noprint"><h3>艦隊：往下展開</h3><p class="small">上層的一條策略（S）交給一個部門，就變成那個部門的目的（O）；上層的衡量指標（M）變成部門的目標（G）。</p><ul class="tree">' + (function walk(ns){ return ns.map(function(n){ var l = D.check(n.p, S.plans), ci = D.cascadeIssues(n.p, S.plans), s = D.score(l).v; return '<li><div class="node' + (n.p.id === S.cur ? ' me' : '') + '"><b>' + esc(n.p.name) + '</b><span class="small">健檢 ' + s + (ci.length ? '　<span class="chip warn">◆ 沒接上 ' + ci.length + '</span>' : '') + '</span>' + (n.p.id === S.cur ? '<span class="chip ok">● 目前這份</span>' : '<button class="mini" data-act="open" data-id="' + n.p.id + '">打開</button>') + '</div>' + (n.kids.length ? '<ul>' + walk(n.kids) + '</ul>' : '') + '</li>'; }).join(''); })(D.tree(S.plans)) + '</ul>';
  var ci = D.cascadeIssues(p, S.plans);
  if(ci.length) h += ci.map(function(i){ return '<div class="iss warn"><span class="dot" aria-hidden="true">◆</span><div><b>' + esc(i.t) + '</b><p>' + esc(i.why) + '</p></div></div>'; }).join('');
  if(p.parent) h += '<div class="btns"><button class="btn alt" data-act="sync">⚓ 跟上層同步</button><button class="btn alt" data-act="unlink">解除和上層的連結</button></div>';
  if(p.strats.length) h += '<div class="row casc"><label class="fld"><span>要展開的策略</span><select id="cSel">' + p.strats.map(function(s){ return '<option value="' + s.id + '">' + L[s.id] + ' ' + esc(s.t.slice(0, 30) || '（未填）') + (D.childrenOf(S.plans, p.id, s.id).length ? '（已展開 ' + D.childrenOf(S.plans, p.id, s.id).length + '）' : '') + '</option>'; }).join('') + '</select></label><label class="fld"><span>交給哪個部門或誰</span><input id="cUnit" maxlength="30" placeholder="例如 早班小組"></label><div class="fld"><span>&nbsp;</span><button class="btn" data-act="cascade">展開成下一層 OGSM</button></div></div>';
  return h + '</div>';
}
function sumChips(p, ym){ var c = D.summary(p, ym), k = {done:'ok', ahead:'ok', ok:'ok', warn:'warn', bad:'bad', na:'na'}; return Object.keys(D.STATUS).filter(function(s){ return c[s]; }).map(function(s){ return '<span class="chip ' + k[s] + '">' + D.STATUS[s][1] + ' ' + D.STATUS[s][0] + ' ' + c[s] + '</span>'; }).join(''); }
function trCells(p, x, ym){
  var r = D.progress(p, x, ym), k = {done:'ok', ahead:'ok', ok:'ok', warn:'warn', bad:'bad', na:'na'}[r.st], st = D.STATUS[r.st];
  var pct = r.f == null ? '—' : Math.round(r.f * 100) + '%';
  return '<td class="num c-d">' + fmt(r.actual) + (r.ym && r.ym !== ym ? '<small>資料到 ' + r.ym + '</small>' : '') + (r.missing ? '<small>缺 ' + r.missing + ' 個月</small>' : '') + '</td><td class="num c-d">' + fmt(r.exp) + '</td><td class="c-d">' + (r.f == null ? '—' : '<span class="meter" title="完成 ' + pct + '，時間過了 ' + Math.round(r.e * 100) + '%"><i class="' + k + '" style="width:' + Math.max(0, Math.min(100, r.f * 100)).toFixed(0) + '%"></i><u style="left:' + (r.e * 100).toFixed(0) + '%"></u></span><span class="num">' + pct + '</span>') + '</td><td class="c-d"><span class="chip ' + k + '">' + st[1] + ' ' + st[0] + '</span></td><td class="c-d">' + spark(p, x) + '</td>';
}
// 走勢：實線＝實際，細灰線＝應達；滑過看每月數字
function spark(p, x){
  var s = D.series(p, x), v = []; s.forEach(function(d){ if(d.actual != null) v.push(d.actual); if(d.exp != null) v.push(d.exp); });
  var pts = s.filter(function(d){ return d.actual != null; }); if(!pts.length || s.length < 2) return '—';
  var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), W = 150, H = 42, pad = 6; if(hi === lo){ hi += 1; lo -= 1; }
  function X(i){ return pad + (W - pad * 2) * i / (s.length - 1); } function Y(n){ return H - pad - (H - pad * 2) * (n - lo) / (hi - lo); }
  function path(k){ var o = '', on = false; s.forEach(function(d, i){ if(d[k] == null){ return; } o += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(d[k]).toFixed(1); on = true; }); return o; }
  var li = s.indexOf(pts[pts.length - 1]), bw = (W - pad * 2) / (s.length - 1);
  return '<svg class="spark" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="走勢"><path d="' + path('exp') + '" class="sx"/><path d="' + path('actual') + '" class="sa"/><circle cx="' + X(li) + '" cy="' + Y(pts[pts.length - 1].actual) + '" r="4" class="sd"/>' + s.map(function(d, i){ return '<rect class="hit" x="' + (X(i) - bw / 2).toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + H + '" data-tip="' + d.ym + (d.actual == null ? ' 沒有資料' : ' 實際 ' + fmt(d.actual)) + (d.exp == null ? '' : '，應達 ' + fmt(d.exp)) + '"/>'; }).join('') + '</svg>';
}

/* ---------- ⑤ 說明 ---------- */
function aboutHTML(){
  return '<div class="card"><h3>OGSM 是什麼</h3><p>把一份策略壓在一頁紙上的寫法，四層由大到小接起來：</p><div class="tw"><table class="ab"><tbody>' +
    [['O', '最終目的 Objective', '要去哪裡', '一句話，講方向，不放數字', '北極星'], ['G', '具體目標 Goals', '怎麼算到了', '2～4 個數字，有起點、目標、期限', '航點'], ['S', '策略 Strategies', '走哪條路', '3～5 條做法，講清楚不做什麼', '航線'], ['M', '衡量 Measures', '有沒有偏航', '指標＋行動，有負責人與日期', '儀表']].map(function(r){ return '<tr><th><b class="big">' + r[0] + '</b></th><td><b>' + r[1] + '</b><br>' + r[2] + '</td><td>' + r[3] + '</td><td class="small">海圖上的' + r[4] + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
    '<div class="card"><h3>和 KPI、OKR 差在哪</h3><ul><li><b>KPI</b> 是一個一個的數字。OGSM 說明這些數字為了什麼、靠什麼做法達成，KPI 通常放在 M。</li><li><b>OKR</b> 多半一季一次，重點是聚焦與挑戰；OGSM 多半一年一次，多了「策略選擇」和「往下展開」。兩者可以並用：年度用 OGSM，季度用 OKR 推進其中一條策略。</li></ul></div>' +
    '<div class="card"><h3>最常見的五個問題</h3><ol><li>O 寫成口號，換一家公司也說得通。</li><li>G 寫成行動（辦幾場活動），做完了也不知道有沒有效。</li><li>S 沒有取捨，什麼都「加強」。</li><li>S 加起來根本補不滿 G 的缺口，卻沒有人算過。</li><li>M 全是月底才知道的結果，沒有過程中看得到的指標。</li></ol><p class="small">以上是這個工具作者整理的觀察，不是標準答案。詳細步驟看 <a href="manual.html">📖 操作手冊</a>。</p></div>';
}

/* ---------- 彈窗、警語、設定 ---------- */
function openModal(h){ $('modalBox').innerHTML = h; $('modal').classList.add('show'); $('modalBox').scrollTop = 0; var f = $('modalBox').querySelector('button,a,input,textarea,select'); if(f) f.focus(); }
function closeModal(){ $('modal').classList.remove('show'); AI.run++; }
var toastT;
function toast(m, act){ var o = document.querySelector('.toast'); if(o) o.remove(); var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; if(act){ var b = document.createElement('button'); b.dataset.act = act; b.textContent = '復原'; t.appendChild(b); } document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function(){ t.remove(); }, act ? 6000 : 3000); }
// 使用警語：頁面上看得到（warn-line、頁尾、⚙），首次造訪自動跳出一次
var WARN_HTML = '<h2>⚠ 使用警語</h2><ul>' +
  '<li>健檢的燈號與分數、缺口判斷（80%／100%／150%）、進度燈號（應達值走直線）都是<b>自訂的經驗法則</b>，只供討論參考。高分不代表策略會成功。</li>' +
  '<li>「預估貢獻」是你自己填的估計，工具只負責加總。</li>' +
  '<li>AI 產生的文字與數字可能有錯，數字都標「推測」，請確認後再用；不要把機密資料交給 AI 服務。</li>' +
  '<li>範例公司、人物與數字全為虛構。</li>' +
  '<li>資料只存在這台裝置的瀏覽器，不會上傳；換裝置前請先在 ⚙ 下載備份檔。</li>' +
  '<li>分享連結把整份內容（含負責人姓名、預算）放在網址裡，拿到連結的人都看得到；不含每月追蹤紀錄。</li></ul>';
function showWarn(){ openModal(WARN_HTML + '<div class="vstack"><button class="btn" data-act="close">我知道了</button></div>'); }
function sec(id, title, val, body){ return '<details class="set-sec" data-sec="' + id + '"><summary><span class="sst">' + title + '</span><span class="ssv">' + esc(val) + '</span></summary><div class="set-body">' + body + '</div></details>'; }
function openSettings(){
  var xl = lsGet('fsize') === 'xl';
  openModal('<div class="bar"><h2 style="flex:1 1 0">⚙ 常用設定</h2><button class="ibtn" data-act="foldall">全部展開／收合</button></div>' +
    sec('data', '資料', S.plans.length + ' 份，只存在這台裝置', '<p class="small">換電腦或手機前先下載備份檔，再到新裝置還原。</p><div class="vstack"><button class="btn" data-act="backup">下載備份檔</button><button class="btn alt" data-act="restore">從備份檔還原</button><button class="btn red" data-act="wipe">清除全部資料</button></div><input type="file" id="restoreFile" accept=".json,application/json" hidden>') +
    sec('ai', '🤖 AI 設定', window.TOOL_AI ? TOOL_AI.status() : '', window.TOOL_AI ? TOOL_AI.settingsHTML() : '') +
    sec('view', '顯示', xl ? '大字' : '標準字', '<div class="vstack"><button class="btn' + (xl ? ' alt' : '') + '" data-fontsize="m">標準字</button><button class="btn' + (xl ? '' : ' alt') + '" data-fontsize="xl">大字</button></div>') +
    sec('about', '關於本工具', '', '<p>👤 創作者 Mark Tsai（蔡豐全）<br><a href="manual.html#creator">創作者資料與聯絡方式</a></p><div class="vstack"><a class="btn alt" href="manual.html">📖 操作手冊</a><button class="btn alt" data-act="warn">⚠ 使用警語</button>' +
      (standalone ? '' : '<button class="btn alt" data-act="install">📲 加入主畫面</button>') + '</div><p class="small" style="margin-top:.5rem">訪客數 <img src="' + COUNTER + '" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle"></p>') +
    '<div class="vstack"><button class="btn" data-act="close">關閉</button></div>');
  var open = lsJson('fold', []);
  qa('.set-sec').forEach(function(d){ d.open = open.indexOf(d.dataset.sec) >= 0; d.addEventListener('toggle', saveFold); });
  $('restoreFile').addEventListener('change', restoreFile);
  if(window.TOOL_AI) TOOL_AI.bind(function(){ openSettings(); var d = document.querySelector('.set-sec[data-sec="ai"]'); if(d) d.open = true; });
}
function saveFold(){ var o = []; qa('.set-sec').forEach(function(d){ if(d.open) o.push(d.dataset.sec); }); lsSet('fold', JSON.stringify(o)); }
function applyView(){ document.documentElement.dataset.fsize = lsGet('fsize') === 'xl' ? 'xl' : 'm'; }

/* ---------- 檔案、分享 ---------- */
function safeName(s){ return s.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 50); }
function download(name, text, type){ var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function restoreFile(ev){
  var f = ev.target.files[0]; if(!f) return;
  var rd = new FileReader();
  rd.onload = function(){
    try{ var j = JSON.parse(rd.result); if(j.app !== 'ogsm-strategy-planner' || !j.state) throw 0; var s = D.sanitize(j.state); if(!s.plans.length) throw 0; keep(); S = s; save(); closeModal(); render(); toast('已還原備份', 'undo'); }
    catch(e){ toast('這不是 OGSM 策略規劃表的備份檔'); }
  };
  rd.readAsText(f);
}
function b64(u8){ var s = ''; for(var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64(s){ s = atob(s.replace(/-/g, '+').replace(/_/g, '/')); var u = new Uint8Array(s.length); for(var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
async function pack(o){
  var u = new TextEncoder().encode(JSON.stringify(o));
  if(!window.CompressionStream) return 'j.' + b64(u);
  return 'z.' + b64(new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()));
}
async function unpack(s){
  if(s.length > 200000) throw new Error('太長');
  var u = unb64(s.slice(2));
  if(s.slice(0, 2) === 'z.'){
    var rd = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(), parts = [], n = 0;
    for(;;){ var r = await rd.read(); if(r.done) break; n += r.value.length; if(n > 600000){ rd.cancel(); throw new Error('太大'); } parts.push(r.value); }
    u = new Uint8Array(await new Blob(parts).arrayBuffer());
  } else if(s.slice(0, 2) !== 'j.') throw new Error('格式不對');
  return JSON.parse(new TextDecoder().decode(u));
}
async function readHash(){
  var m = /^#s=([A-Za-z0-9._-]+)$/.exec(location.hash);
  if(!m){ if(V.share){ V.share = null; render(); } return; }
  try{ var p = D.sharePlan(await unpack(m[1])); if(!p.o && !p.goals.length && !p.strats.length) throw 0; V.share = p; render(); window.scrollTo(0, 0); }
  catch(e){ clearHash(); toast('這個分享連結打不開，可能沒有複製完整'); }
}
function clearHash(){ V.share = null; history.replaceState(null, '', location.pathname + location.search); }
function copyText(text, msg){
  function fb(){ var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); toast(msg); }catch(e){ toast('複製失敗，請手動選取'); } ta.remove(); }
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){ toast(msg); }, fb); else fb();
}

/* ---------- AI：同一套流程（有金鑰直接問，沒金鑰複製提示詞再貼回） ---------- */
var AI = {prompt:'', done:null, json:false, run:0, text:''};
function aiFlow(title, intro, prompt, json, done){
  AI = {prompt:prompt, done:done, json:json, run:AI.run + 1, text:''};
  var rd = window.TOOL_AI && TOOL_AI.ready();
  openModal('<h2>' + title + '</h2><p class="small">' + intro + '</p><div class="btns">' + (rd ? '<button class="btn" data-act="aiRun">✨ 用 ' + esc(TOOL_AI.status()) + '</button>' : '') + '<button class="btn alt" data-act="aiCopy">📋 複製提示詞</button><button class="btn alt" data-act="close">關閉</button></div>' +
    (rd ? '' : '<p class="small" id="aiHint">還沒有設定 AI 金鑰：按「📋 複製提示詞」貼到任何 AI，再把回覆貼到下面；或到 ⚙ 常用設定 →「🤖 AI 設定」填金鑰。</p>') +
    '<label class="fld"><span>貼回 AI 的回覆</span><textarea id="aiPaste" rows="3"></textarea></label><div class="btns sm"><button class="mini" data-act="aiRead">讀取回覆</button></div><div id="aiOut" class="aiout" aria-live="polite"></div>');
}
function aiGot(t){
  var out = $('aiOut'); if(!out) return;
  if(!AI.json){ AI.text = t.trim(); AI.done(AI.text, out); return; }
  var j = null; try{ j = TOOL_AI.parseJson(t); }catch(e){}
  if(!j){ out.textContent = '讀不懂這段回覆。請確認 AI 回的是 JSON（大括號開頭），再貼一次。'; return; }
  AI.done(j, out);
}
function showText(t, out, extra){ out.innerHTML = '<div class="aitext"></div><div class="btns sm"><button class="mini" data-act="aiCopyOut">📋 複製</button>' + (extra || '') + '</div>'; out.firstChild.textContent = t; }

/* ---------- 跳到某一格 ---------- */
function gotoField(id, field){
  if(V.share) return;
  cur().strats.forEach(function(s){ if(s.id === id || s.kpis.concat(s.acts).some(function(x){ return x.id === id; }) || (!id && field === 'owner')) V.fold[s.id] = false; });
  V.tab = 'fill'; lsSet('tab', 'fill'); render();
  var p = document.getElementById('panel-fill'), e = null;
  if(field === 'cover') e = p.querySelector('[data-anchor="' + id + '"]');
  if(!e) qa('[data-p]', p).some(function(x){ var a = x.dataset.p.split('|'); if(a[1] === id && a[2] === field){ e = x; return true; } });
  if(!e) e = p.querySelector('[data-goto="' + id + '|' + field + '"]') || (id && p.querySelector('[data-anchor="' + id + '"]')) || p.querySelector('[data-anchor="s"]');
  if(!e) return;
  e.scrollIntoView({block:'center'}); e.classList.add('flash'); setTimeout(function(){ e.classList.remove('flash'); }, 2400);
  var f = e.matches('input,textarea,select,button') ? e : e.querySelector('input,textarea,select'); if(f) f.focus({preventScroll:true});
}

/* ---------- 事件 ---------- */
function doPrint(){ if(V.tab === 'fill' && !V.share) renderPanel('page'); setPrint(V.share ? 'page' : V.tab); window.print(); }
var ACT = {
  settings:openSettings, close:closeModal, warn:showWarn, print:doPrint,
  foldall:function(){ var d = qa('.set-sec'), any = d.some(function(x){ return !x.open; }); d.forEach(function(x){ x.open = any; }); saveFold(); },
  undo:function(){ if(!V.undo.length) return; S = D.sanitize(JSON.parse(V.undo.pop())); save(); render(); toast('已復原'); },
  // 計畫
  newPlan:function(){
    openModal('<h2>新增一份 OGSM</h2><div class="vstack"><button class="btn" data-act="newBlank">空白的一份</button></div><h3 class="exh">或從 ' + D.EXAMPLES.length + ' 份虛構範例開始</h3>' + D.EX_CATS.map(function(c){
      return '<h4 class="exc">' + c[1] + '</h4><div class="exg">' + D.EXAMPLES.filter(function(e){ return e.cat === c[0]; }).map(function(e){ return '<button class="exb" data-act="newEx" data-id="' + e.id + '"><b>' + esc(e.n) + '</b><small>' + esc(e.make()[0].o) + '</small></button>'; }).join('') + '</div>';
    }).join('') + '<div class="vstack"><button class="btn alt" data-act="close">取消</button></div>');
  },
  newBlank:function(){ var d = new Date(); addPlans([D.blankPlan(d.getFullYear() + (d.getMonth() >= 9 ? 1 : 0))], '已新增空白的一份'); },
  newEx:function(ds){
    var l = D.example(ds.id), map = {}, out = l.map(function(p){ var c = D.clone(p); map[p.id] = {c:c, p:p}; return c; });
    // 範例的上下層關係跟著換成新 id
    l.forEach(function(p, i){ if(!p.parent || !map[p.parent.plan]) return; var up = map[p.parent.plan], si = up.p.strats.map(function(s){ return s.id; }).indexOf(p.parent.s); if(si < 0) return; out[i].parent = {plan:up.c.id, s:up.c.strats[si].id}; p.goals.forEach(function(g, gi){ if(!g.src) return; var ki = up.p.strats[si].kpis.map(function(k){ return k.id; }).indexOf(g.src.k); if(ki >= 0) out[i].goals[gi].src = {k:up.c.strats[si].kpis[ki].id, snap:g.src.snap}; }); });
    addPlans(out, '已載入範例');
  },
  copyPlan:function(){ addPlans([D.clone(cur(), (cur().name + '（副本）').slice(0, 60))], '已複製一份'); },
  delPlan:function(){ var p = cur(), n = D.childrenOf(S.plans, p.id).length; openModal('<h2>刪除「' + esc(p.name) + '」？</h2><p>' + (n ? '它有 ' + n + ' 份下一層，會變成獨立的 OGSM。' : '') + '刪除後可以按「↩ 復原」。</p><div class="vstack"><button class="btn red" data-act="delPlanYes">確定刪除</button><button class="btn alt" data-act="close">取消</button></div>'); },
  delPlanYes:function(){ keep(); var id = S.cur; S = D.sanitize({plans:S.plans.filter(function(p){ return p.id !== id; }), cur:''}); if(!S.plans.length){ var y = new Date().getFullYear(), b = D.blankPlan(y); S = D.sanitize({plans:[b]}); } save(); closeModal(); render(); toast('已刪除', 'undo'); },
  open:function(ds){ if(D.planById(S.plans, ds.id)){ S.cur = ds.id; V.ym = ''; save(); render(); window.scrollTo(0, 0); } },
  share:async function(){
    var url; try{ url = location.href.split('#')[0] + '#s=' + await pack(D.sharePlan(cur())); }catch(e){ toast('這台瀏覽器做不出分享連結'); return; }
    openModal('<h2>🔗 分享這一份</h2><p>拿到連結的人都看得到全部內容，<b>包含負責人姓名與預算</b>；不含每月追蹤紀錄。對方只能看，可以存成自己的一份。</p><textarea id="shareUrl" class="wide" rows="4" readonly>' + esc(url) + '</textarea><div class="btns"><button class="btn" data-act="shareCopy">複製連結</button><button class="btn alt" data-act="close">關閉</button></div><p class="small">連結 ' + url.length + ' 個字元' + (url.length > 4000 ? '，有些通訊軟體會截斷，建議改用列印 PDF 或備份檔' : '') + '。</p>');
  },
  shareCopy:function(){ copyText($('shareUrl').value, '已複製連結'); },
  shareSave:function(){ var p = D.clone(V.share); clearHash(); addPlans([p], '已存成你的一份'); },
  shareExit:function(){ clearHash(); render(); },
  // 增刪移動
  addGoal:function(){ var g = D.newGoal({due:cur().to}); change(function(p){ p.goals.push(g); }); focusP('g|' + g.id + '|t'); },
  addStrat:function(){ var s = D.newStrat({kpis:[D.newKpi()], acts:[D.newAct()]}); V.fold[s.id] = false; change(function(p){ p.strats.push(s); }); focusP('s|' + s.id + '|t'); },
  addKpi:function(ds){ var k = D.newKpi(); change(function(){ find('s', ds.id).kpis.push(k); }); focusP('k|' + k.id + '|t'); },
  addAct:function(ds){ var a = D.newAct(); change(function(){ find('s', ds.id).acts.push(a); }); focusP('a|' + a.id + '|t'); },
  move:function(ds){ var l = listOf(ds.kind, ds.id), i = l.map(function(x){ return x.id; }).indexOf(ds.id), j = i + Number(ds.d); if(j < 0 || j >= l.length) return; change(function(){ var t = l[i]; l[i] = l[j]; l[j] = t; }); var b = document.querySelector('[data-act="move"][data-id="' + ds.id + '"][data-d="' + ds.d + '"]'); if(b && !b.disabled) b.focus({preventScroll:true}); },
  del:function(ds){ change(function(p){ if(ds.kind === 'g') D.removeGoal(p, ds.id); else{ var l = listOf(ds.kind, ds.id), i = l.map(function(x){ return x.id; }).indexOf(ds.id); l.splice(i, 1); } }); toast('已刪除', 'undo'); },
  confirmNum:function(ds){ var x = find(ds.kind, ds.id); if(x){ x.guess = false; save(); qa('[data-guess="' + ds.id + '"]').forEach(function(e){ e.remove(); }); light(); } },
  fold:function(ds, el){ V.fold[ds.id] = el.getAttribute('aria-expanded') === 'true'; render(); var b = document.querySelector('[data-act="fold"][data-id="' + ds.id + '"]'); if(b) b.focus({preventScroll:true}); },
  goto:function(ds){ gotoField(ds.id, ds.field); },
  // 展開
  cascade:function(){
    if(S.plans.length >= D.LIM.plans){ toast('最多 ' + D.LIM.plans + ' 份'); return; }
    var c = D.cascade(cur(), $('cSel').value, $('cUnit').value.trim()); if(!c) return;
    keep(); S.plans.push(c); S.cur = c.id; V.tab = 'fill'; V.ym = ''; lsSet('tab', 'fill'); S = D.sanitize(S); save(); render(); window.scrollTo(0, 0); toast('已展開，接著寫這一層自己的策略', 'undo');
  },
  sync:function(){ keep(); var n = D.syncFromParent(cur(), S.plans); save(); render(); toast(n ? '已更新 ' + n + ' 個目標' : '已經和上層一致'); },
  unlink:function(){ change(function(p){ p.parent = null; p.goals.forEach(function(g){ g.src = null; }); }, '已解除連結'); },
  // 匯出
  copyTxt:function(){ copyText(D.toText(cur()), '已複製文字版'); },
  csv:function(){ download(safeName(cur().name) + '.csv', D.toCsv(cur()), 'text/csv;charset=utf-8'); },
  doc:function(){ download(safeName(cur().name) + '.doc', '\ufeff' + D.toDoc(cur()), 'application/msword'); },
  // AI
  aiDraft:function(){
    var p = cur(), bg = $('aiBg').value.trim(); V.bg = bg; if(bg.length < 6){ toast('先寫一段背景，AI 才有依據'); $('aiBg').focus(); return; }
    aiFlow('✨ 請 AI 起草', '會存成新的一份，不會蓋掉現在這份。AI 給的數字都標「推測」。', D.draftPrompt(bg, p.from, p.to), true, function(j, out){
      var d = D.cleanAi(j, {name:'AI 草稿 ' + today(), from:p.from, to:p.to}); if(!d){ out.textContent = '回覆裡沒有可以用的內容，請再試一次。'; return; }
      AI.draft = d; out.innerHTML = '<div class="aitext"></div><div class="btns"><button class="btn" data-act="aiSaveDraft">存成新的一份</button></div>'; out.firstChild.textContent = D.toText(d);
    });
  },
  aiSaveDraft:function(){ if(AI.draft){ var d = AI.draft; addPlans([d], '已存成新的一份，請確認標「推測」的數字'); } },
  rewrite:function(ds){
    var k = ds.kind, x = k === 'o' ? cur() : find(k, ds.id), f = k === 'o' ? 'o' : 't', t = x[f].trim(); if(!t){ toast('這格還是空的，先寫個大概'); return; }
    aiFlow('✨ 改寫', '給三個更清楚的版本，選一句換上；不會改數字。<br>現在：「' + esc(t) + '」', D.rewritePrompt(k, t, cur()), true, function(j, out){
      var o = D.cleanOptions(j); if(!o.length){ out.textContent = '回覆裡沒有可以用的句子，請再試一次。'; return; }
      AI.pick = {k:k, id:ds.id, f:f, o:o}; out.innerHTML = '<div class="vstack">' + o.map(function(s, i){ return '<button class="btn alt left" data-act="aiPick" data-i="' + i + '">' + esc(s) + '</button>'; }).join('') + '</div>';
    });
  },
  aiPick:function(ds){ var a = AI.pick; if(!a) return; closeModal(); change(function(){ var x = a.k === 'o' ? cur() : find(a.k, a.id); if(x) x[a.f] = D.str(a.o[ds.i]); }); toast('已換上', 'undo'); },
  aiAdvice:function(){ aiFlow('✨ 修改建議', '燈號由規則判斷，AI 只說明怎麼改。', D.advicePrompt(cur(), issues()), false, function(t, out){ showText(t, out); }); },
  aiReview:function(){ var ym = V.ym; aiFlow('✨ 月檢討摘要', ym + ' 的數字由規則算好，AI 只整理文字。', D.reviewPrompt(cur(), ym), false, function(t, out){ showText(t, out, '<button class="mini" data-act="aiToNote">加到檢討紀錄</button>'); }); },
  aiToNote:function(){ var p = cur(), l = logOf(p, V.ym); l.note = D.str((l.note ? l.note + '\n' : '') + AI.text, D.LIM.note); save(); closeModal(); render(); toast('已加到檢討紀錄'); },
  aiCopy:function(){ copyText(AI.prompt, '已複製提示詞，可以貼到任何 AI'); },
  aiCopyOut:function(){ copyText(AI.text, '已複製'); },
  aiRead:function(){ var t = $('aiPaste').value.trim(); if(!t){ toast('先把 AI 的回覆貼上來'); return; } aiGot(t); },
  aiRun:function(){ var run = AI.run, out = $('aiOut'); out.textContent = 'AI 思考中…'; TOOL_AI.callLLM(AI.prompt, null, AI.json, function(m){ if(run === AI.run) out.textContent = m; }).then(function(t){ if(run === AI.run) aiGot(t); }, function(e){ if(run === AI.run) out.textContent = '❌ ' + e.message; }); },
  // 資料
  backup:function(){ download('OGSM備份-' + today() + '.json', JSON.stringify({app:'ogsm-strategy-planner', v:1, saved:new Date().toISOString(), state:S}, null, 1), 'application/json'); },
  restore:function(){ $('restoreFile').click(); },
  wipe:function(){ openModal('<h2>清除全部資料？</h2><p>這台裝置上的 ' + S.plans.length + ' 份 OGSM 與追蹤紀錄都會刪掉，回到範例，無法復原。建議先下載備份檔。</p><div class="vstack"><button class="btn red" data-act="wipeYes">確定清除</button><button class="btn alt" data-act="close">取消</button></div>'); },
  wipeYes:function(){ lsDel('state'); S = defaults(); V.undo = []; V.ym = ''; closeModal(); render(); toast('已清除'); },
  install:function(){
    var m = ios ? '請按 Safari 下方的「分享」圖示，選「加入主畫面」。' : '請按瀏覽器網址列右側的安裝圖示，或右上角選單的「安裝應用程式／加到主畫面」。';
    if(window._dp){ window._dp.prompt(); window._dp.userChoice.then(function(){ window._dp = null; }); }
    else openModal('<h2>📲 加入主畫面</h2><p>' + m + '</p><div class="vstack"><button class="btn" data-act="close">知道了</button></div>');
  }
};
function addPlans(l, msg){
  if(S.plans.length + l.length > D.LIM.plans){ closeModal(); toast('最多 ' + D.LIM.plans + ' 份，請先刪掉用不到的'); return; }
  keep(); l.forEach(function(p){ S.plans.push(p); }); S.cur = l[0].id; S = D.sanitize(S); V.tab = 'fill'; V.ym = ''; lsSet('tab', 'fill'); save(); closeModal(); render(); window.scrollTo(0, 0); toast(msg);
}
function focusP(dp){ var e = document.querySelector('[data-p="' + dp + '"]'); if(e){ e.focus(); e.scrollIntoView({block:'center'}); } }
function logOf(p, ym){ if(!D.has(p.logs, ym)) p.logs[ym] = {v:{}, note:''}; return p.logs[ym]; }
document.addEventListener('click', function(ev){
  var el = ev.target.closest('[data-act],[data-tab],[data-fontsize],[data-filter]');
  if(!el){ if(ev.target.id === 'modal') closeModal(); return; }
  var ds = el.dataset;
  if(ds.act){ if(el.tagName === 'A') ev.preventDefault(); if(D.has(ACT, ds.act)) ACT[ds.act](ds, el); return; }
  if(ds.tab){ V.tab = ds.tab; lsSet('tab', V.tab); render(); window.scrollTo(0, 0); var tb = document.querySelector('.tabs [data-tab="' + V.tab + '"]'); if(tb) tb.focus({preventScroll:true}); return; }
  if(ds.filter){ V.filter = ds.filter; renderPanel('check'); return; }
  if(ds.fontsize){ lsSet('fsize', ds.fontsize); applyView(); openSettings(); return; }
});
function setField(t){
  var a = t.dataset.p.split('|'), x = find(a[0], a[1]), f = a[2], v = t.value; if(!x) return;
  if(t.type === 'number'){ v = D.numOr(v); if((f === 'cost' || f === 'budget') && v !== '' && v < 0) v = ''; }
  else if(t.type === 'date') v = D.isDate(v) ? v : '';
  else if(f === 'lead') v = v === '1';
  if((f === 'base' || f === 'target') && x.guess){ x.guess = false; qa('[data-guess="' + x.id + '"]').forEach(function(e){ e.remove(); }); }
  x[f] = f === 'name' ? v || '未命名的 OGSM' : v;
  save(); light();
}
document.addEventListener('input', function(ev){
  var t = ev.target, ds = t.dataset, p = cur(), a, s;
  if(ds.p && t.tagName !== 'SELECT'){ setField(t); return; }
  if(ds.contrib){ a = ds.contrib.split('|'); s = find('s', a[0]); var c = D.numOr(t.value); if(s && D.has(s.links, a[1])){ s.links[a[1]] = c === '' || c < 0 ? '' : c; save(); light(); } return; }
  if(ds.val){ var l = logOf(p, V.ym), n = D.numOr(t.value); if(n === '') delete l.v[ds.val]; else l.v[ds.val] = n; if(!Object.keys(l.v).length && !l.note) delete p.logs[V.ym]; save(); trackRow(ds.val); return; }
  if(t.id === 'noteBox'){ logOf(p, V.ym).note = t.value; save(); $('notePrint').textContent = t.value || '（未填）'; return; }
  if(t.id === 'aiBg') V.bg = t.value;
});
function trackRow(id){
  var p = cur(), x = items(p).filter(function(i){ return i.id === id; })[0], tr = document.querySelector('tr[data-tr="' + id + '"]'); if(!x || !tr) return;
  qa('.c-d', tr).forEach(function(e){ e.remove(); }); tr.insertAdjacentHTML('beforeend', trCells(p, x, V.ym)); $('sumChips').innerHTML = sumChips(p, V.ym);
}
// 打字也能復原：進欄位時先記一份，離開時真的有改才留下
function isField(t){ var d = t.dataset || {}; return !V.share && (d.p || d.contrib || d.val || t.id === 'noteBox'); }
document.addEventListener('focusin', function(ev){ if(isField(ev.target)) V.pre = JSON.stringify(S); });
document.addEventListener('change', function(ev){
  var t = ev.target, ds = t.dataset;
  if(isField(t) && t.tagName !== 'SELECT' && V.pre && V.pre !== JSON.stringify(S)){ keep(V.pre); V.pre = JSON.stringify(S); }
  if(t.id === 'planSel'){ ACT.open({id:t.value}); return; }
  if(t.id === 'ymSel'){ V.ym = t.value; renderPanel('track'); $('ymSel').focus(); return; }
  if(ds.p && t.tagName === 'SELECT'){ keep(); setField(t); if(ds.redraw) render(); return; }
  if(ds.link){ var a = ds.link.split('|'), s = find('s', a[0]); if(!s) return; keep(); if(t.checked) s.links[a[1]] = ''; else delete s.links[a[1]]; save(); render(); var e = document.querySelector(t.checked ? '[data-contrib="' + ds.link + '"]' : '[data-link="' + ds.link + '"]'); if(e) e.focus({preventScroll:true}); return; }
  // 指標名稱、單位改了，策略裡的勾選清單要跟著換字（離開欄位才換，不搶焦點）
  if(ds.p && /^g\|.*\|(t|unit)$/.test(ds.p)){ var g = find('g', ds.p.split('|')[1]); if(g) qa('[data-link$="|' + g.id + '"]').forEach(function(c){ var lb = c.parentNode; while(lb.childNodes.length > 3) lb.removeChild(lb.lastChild); lb.appendChild(document.createTextNode(' ' + (g.t || '（未命名）'))); }); if(g) qa('[data-unit="' + g.id + '"]').forEach(function(e){ e.textContent = g.unit; }); }
});
// 航線圖：滑過或聚焦一個節點，只亮它的航線
function hi(ev, on){
  var n = ev.target.closest && ev.target.closest('.nd'), m = document.querySelector('.map'); if(!m) return;
  if(!n || !on){ m.classList.remove('dim'); qa('.lit', m).forEach(function(e){ e.classList.remove('lit'); }); return; }
  m.classList.add('dim'); qa('.lit', m).forEach(function(e){ e.classList.remove('lit'); }); n.classList.add('lit');
  var id = n.dataset.n; qa('.ed', m).forEach(function(e){ if(id === 'o' || e.dataset.e.split(' ').indexOf(id) >= 0){ e.classList.add('lit'); e.dataset.e.split(' ').forEach(function(k){ var x = m.querySelector('.nd[data-n="' + k + '"]'); if(x) x.classList.add('lit'); }); } });
}
document.addEventListener('mouseover', function(ev){ if(ev.target.closest && ev.target.closest('.map')) hi(ev, true); var t = ev.target.closest && ev.target.closest('[data-tip]'), b = $('tipBox'); if(t){ b.textContent = t.dataset.tip; b.hidden = false; var r = t.getBoundingClientRect(); b.style.left = Math.max(8, Math.min(innerWidth - b.offsetWidth - 8, r.left + r.width / 2 - b.offsetWidth / 2)) + 'px'; b.style.top = Math.max(8, r.top - b.offsetHeight - 6) + 'px'; } else b.hidden = true; });
document.addEventListener('mouseout', function(ev){ if(ev.target.closest && ev.target.closest('.map')) hi(ev, false); });
document.addEventListener('focusin', function(ev){ if(ev.target.classList && ev.target.classList.contains('nd')) hi(ev, true); });
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && $('modal').classList.contains('show')) closeModal();
  if((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('nd')){ e.preventDefault(); ACT.goto(e.target.dataset); }
});
window.addEventListener('beforeprint', function(){ if(V.tab === 'fill' && !V.share) renderPanel('page'); setPrint(V.share ? 'page' : V.tab); });
window.addEventListener('hashchange', readHash);
// 另一個分頁改了資料就跟著更新，避免互相蓋掉
window.addEventListener('storage', function(e){ if(e.key === PFX + 'state' && e.newValue){ S = load(); if(!V.share){ render(); toast('另一個分頁改了資料，已更新'); } } });

/* ---------- 跑馬燈（工作區共用公告，不可關） ---------- */
function initMarquee(){
  var URL_ = "https://script.google.com/macros/s/AKfycbwKX0DNNbY8y4nf90BFTHtxgfqJcHHcZasRrgycl4QAe52_hkjMWSkYk4xOsqU-JPCROw/exec";
  var REFRESH = 20 * 60 * 1000, bar = $('marqueeBar'), track = $('marqueeTrack'), lastKey = null;
  function appendText(c, text){ var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, li = 0, m; while((m = re.exec(text))){ if(m.index > li) c.appendChild(document.createTextNode(text.slice(li, m.index))); var a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.color = 'inherit'; a.style.textDecoration = 'underline'; c.appendChild(a); li = re.lastIndex; } if(li < text.length) c.appendChild(document.createTextNode(text.slice(li))); }
  function renderM(items){
    if(!items || !items.length) return;
    var k = JSON.stringify(items); if(k === lastKey) return; lastKey = k; track.innerHTML = '';
    var fr = document.createDocumentFragment();
    function pass(){ items.forEach(function(it, i){ if(i > 0) fr.appendChild(document.createTextNode('　★　')); appendText(fr, String(it)); }); }
    pass(); fr.appendChild(document.createTextNode('　★　')); pass(); track.appendChild(fr);
    bar.classList.add('show'); document.body.classList.add('has-marquee');
    track.style.animationDuration = Math.max(track.scrollWidth / 2 / 60, 12) + 's';
  }
  function fetchM(){ fetch(URL_, {method:'POST', body:JSON.stringify({serial:''})}).then(function(r){ return r.json(); }).then(function(d){ if(d && Array.isArray(d.marquee) && d.marquee.length){ lsSet('marquee', JSON.stringify(d.marquee)); renderM(d.marquee); } }).catch(function(){}); }
  renderM(lsJson('marquee', [])); fetchM(); setInterval(fetchM, REFRESH);
}

/* ---------- 啟動 ---------- */
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); window._dp = e; });
if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(function(){});
(function(){ if(!window.TOOL_WATERMARK) return; var w = document.createElement('div'); w.id = 'pdfWatermark'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = '<img alt="" src="' + window.TOOL_WATERMARK + '">'; document.body.appendChild(w); })();
applyView(); render(); initMarquee(); readHash();
if(!lsGet('warnSeen')){ lsSet('warnSeen', '1'); showWarn(); }
// 測試掛鉤
window._tool = {render:render, cur:cur, issues:issues, get S(){ return S; }, get V(){ return V; }};
})();
