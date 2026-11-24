/* OGSM 策略規劃表：規則引擎（瀏覽器 window.OSP，node 可 require）
   純函式、不碰 DOM。改了這支檔案跑 node tools/test_engine.mjs
   健檢、缺口、進度全部由這裡的規則算；AI 只寫文字，數字一律標「推測」。 */
(function(root){
'use strict';

var LIM = {plans:40, goals:8, strats:8, kpis:6, acts:12, t:200, long:400, note:1000};
var FREQ = {week:'每週', month:'每月', quarter:'每季', year:'每年'};
var ST = {todo:'未開始', doing:'進行中', done:'已完成'};
var STATUS = {done:['已達標', '★'], ahead:['超前', '▲'], ok:['正常', '●'], warn:['稍落後', '◆'], bad:['落後', '▼'], na:['沒有資料', '－']};

/* ---------- 小工具 ---------- */
function has(o, k){ return Object.prototype.hasOwnProperty.call(o, k); }
function str(v, n){ return (typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n || LIM.t); }
function numOr(v){ if(v === '' || v == null || typeof v === 'boolean' || typeof v === 'object') return ''; if(typeof v === 'string' && !v.trim()) return ''; var n = Number(v); return isFinite(n) && Math.abs(n) <= 1e15 ? n : ''; }
function isDate(s){ if(typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }
function dateOr(v, d){ return isDate(v) ? v : d || ''; }
function dayNo(s){ return Math.round(Date.parse(s + 'T00:00:00Z') / 864e5); }
function isYm(s){ return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s); }
function monthEnd(ym){ return new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5), 0)).toISOString().slice(0, 10); }
function nextYm(ym){ var y = +ym.slice(0, 4), m = +ym.slice(5) + 1; if(m > 12){ m = 1; y++; } return ('000' + y).slice(-4) + '-' + ('0' + m).slice(-2); }
function uid(p){ return p + Math.random().toString(36).slice(2, 9) + Math.floor(Math.random() * 36).toString(36); }
function okId(v, p){ return typeof v === 'string' && new RegExp('^' + p + '[a-z0-9]{1,12}$').test(v); }
function norm(s){ return String(s || '').replace(/[\s、，。,.；;：:！!？?「」（）()・\-—%％]/g, '').toLowerCase(); }
function fmt(v){ if(v === '' || v == null || !isFinite(v)) return '—'; return (Math.round(v * 100) / 100).toLocaleString('en-US', {maximumFractionDigits:2}); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }

/* ---------- 資料整理 ---------- */
function newGoal(x){ return Object.assign({id:uid('g'), t:'', base:'', target:'', unit:'', dir:'up', acc:'level', guess:false, due:'', src:null}, x); }
function newKpi(x){ return Object.assign({id:uid('k'), t:'', base:'', target:'', unit:'', dir:'up', acc:'level', guess:false, freq:'month', owner:'', lead:true}, x); }
function newAct(x){ return Object.assign({id:uid('a'), t:'', owner:'', from:'', to:'', cost:'', st:'todo'}, x); }
function newStrat(x){ return Object.assign({id:uid('s'), t:'', how:'', not:'', links:{}, kpis:[], acts:[]}, x); }
function newPlan(x){ return Object.assign({id:uid('p'), name:'未命名的 OGSM', unit:'', from:'', to:'', budget:'', parent:null, o:'', goals:[], strats:[], logs:{}}, x); }
function blankPlan(year){ var p = newPlan({name:'我的 ' + year + ' OGSM', from:year + '-01-01', to:year + '-12-31'}); p.goals = [newGoal({due:p.to})]; p.strats = [newStrat({kpis:[newKpi()], acts:[newAct()]})]; return p; }

function arr(v, n){ return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object' && !Array.isArray(x); }).slice(0, n) : []; }
function pickId(v, p, used){ var id = okId(v, p) && !has(used, v) ? v : uid(p); used[id] = 1; return id; }
function sanMeasure(x){ return {t:str(x.t), base:numOr(x.base), target:numOr(x.target), unit:str(x.unit, 20), dir:x.dir === 'down' ? 'down' : 'up', acc:x.acc === 'sum' ? 'sum' : 'level', guess:x.guess === true}; }
function sanitizePlan(x){
  x = x && typeof x === 'object' ? x : {};
  var used = {};
  var p = {id:okId(x.id, 'p') ? x.id : uid('p'), name:str(x.name, 60) || '未命名的 OGSM', unit:str(x.unit, 60), from:dateOr(x.from), to:dateOr(x.to), budget:numOr(x.budget), parent:null, o:str(x.o, LIM.long), goals:[], strats:[], logs:{}};
  if(x.parent && okId(x.parent.plan, 'p') && okId(x.parent.s, 's')) p.parent = {plan:x.parent.plan, s:x.parent.s};
  if(p.budget !== '' && p.budget < 0) p.budget = '';
  p.goals = arr(x.goals, LIM.goals).map(function(g){
    var r = Object.assign({id:pickId(g.id, 'g', used)}, sanMeasure(g), {due:dateOr(g.due), src:null});
    if(g.src && okId(g.src.k, 'k')) r.src = {k:g.src.k, snap:str(g.src.snap, 500)};
    return r;
  });
  var gids = {}; p.goals.forEach(function(g){ gids[g.id] = 1; });
  p.strats = arr(x.strats, LIM.strats).map(function(s){
    var r = {id:pickId(s.id, 's', used), t:str(s.t), how:str(s.how, LIM.long), not:str(s.not, LIM.long), links:{}, kpis:[], acts:[]};
    if(s.links && typeof s.links === 'object') Object.keys(s.links).forEach(function(k){ if(has(gids, k)){ var v = numOr(s.links[k]); r.links[k] = v === '' || v < 0 ? '' : v; } });
    r.kpis = arr(s.kpis, LIM.kpis).map(function(k){ return Object.assign({id:pickId(k.id, 'k', used)}, sanMeasure(k), {freq:has(FREQ, k.freq) ? k.freq : 'month', owner:str(k.owner, 30), lead:k.lead !== false}); });
    r.acts = arr(s.acts, LIM.acts).map(function(a){ var c = numOr(a.cost); return {id:pickId(a.id, 'a', used), t:str(a.t), owner:str(a.owner, 30), from:dateOr(a.from), to:dateOr(a.to), cost:c === '' || c < 0 ? '' : c, st:has(ST, a.st) ? a.st : 'todo'}; });
    return r;
  });
  if(x.logs && typeof x.logs === 'object') Object.keys(x.logs).filter(isYm).sort().slice(-120).forEach(function(ym){
    var l = x.logs[ym]; if(!l || typeof l !== 'object') return;
    var v = {}; if(l.v && typeof l.v === 'object') Object.keys(l.v).forEach(function(k){ if(/^[gk][a-z0-9]{1,12}$/.test(k)){ var n = numOr(l.v[k]); if(n !== '') v[k] = n; } });
    var note = str(l.note, LIM.note);
    if(Object.keys(v).length || note) p.logs[ym] = {v:v, note:note};
  });
  return p;
}
// 整份狀態：計畫 id 不重複、上層必須存在、不可互為上下層
function sanitize(x){
  x = x && typeof x === 'object' ? x : {};
  var ids = {}, plans = arr(x.plans, LIM.plans).map(sanitizePlan).filter(function(p){ if(has(ids, p.id)) return false; ids[p.id] = p; return true; });
  plans.forEach(function(p){
    var seen = {}, q = p; seen[p.id] = 1;
    while(q && q.parent){ if(!has(ids, q.parent.plan) || has(seen, q.parent.plan)){ q.parent = null; break; } seen[q.parent.plan] = 1; q = ids[q.parent.plan]; }
  });
  return {plans:plans, cur:typeof x.cur === 'string' && has(ids, x.cur) ? x.cur : plans.length ? plans[0].id : ''};
}
// 複製成新的一份：所有 id 換新，內部的對應與月紀錄跟著換
function clone(plan, name){
  var map = {}, p = sanitizePlan(JSON.parse(JSON.stringify(plan)));
  p.id = uid('p'); p.parent = null; if(name) p.name = str(name, 60);
  p.goals.forEach(function(g){ var n = uid('g'); map[g.id] = n; g.id = n; g.src = null; });
  p.strats.forEach(function(s){
    s.id = uid('s'); var l = {}; Object.keys(s.links).forEach(function(k){ l[map[k]] = s.links[k]; }); s.links = l;
    s.kpis.forEach(function(k){ var n = uid('k'); map[k.id] = n; k.id = n; }); s.acts.forEach(function(a){ a.id = uid('a'); });
  });
  Object.keys(p.logs).forEach(function(ym){ var v = {}; Object.keys(p.logs[ym].v).forEach(function(k){ if(has(map, k)) v[map[k]] = p.logs[ym].v[k]; }); p.logs[ym].v = v; });
  return p;
}
function removeGoal(plan, id){ plan.goals = plan.goals.filter(function(g){ return g.id !== id; }); plan.strats.forEach(function(s){ delete s.links[id]; }); }
function planById(plans, id){ for(var i = 0; i < plans.length; i++) if(plans[i].id === id) return plans[i]; return null; }
function kpisOf(plan){ return plan.strats.reduce(function(a, s){ return a.concat(s.kpis); }, []); }
function actsOf(plan){ return plan.strats.reduce(function(a, s, i){ return a.concat(s.acts.map(function(x, j){ return {a:x, s:s, no:'A' + (i + 1) + '.' + (j + 1)}; })); }, []); }
function labels(plan){
  var r = {}; plan.goals.forEach(function(g, i){ r[g.id] = 'G' + (i + 1); });
  plan.strats.forEach(function(s, i){ r[s.id] = 'S' + (i + 1); s.kpis.forEach(function(k, j){ r[k.id] = 'M' + (i + 1) + '.' + (j + 1); }); s.acts.forEach(function(a, j){ r[a.id] = 'A' + (i + 1) + '.' + (j + 1); }); });
  return r;
}

/* ---------- 缺口：各策略的預估貢獻加起來夠不夠 ---------- */
function coverage(plan, g){
  var linked = plan.strats.filter(function(s){ return has(s.links, g.id); });
  var est = linked.filter(function(s){ return s.links[g.id] !== ''; });
  var sum = est.reduce(function(a, s){ return a + s.links[g.id]; }, 0);
  var gap = g.base === '' || g.target === '' ? null : g.dir === 'down' ? g.base - g.target : g.target - g.base;
  if(gap != null) gap = Math.round(gap * 1e9) / 1e9;
  var st, ratio = gap != null && gap > 0 ? sum / gap : null;
  if(!linked.length) st = 'none';
  else if(gap == null || gap <= 0) st = 'na';
  else if(est.length < linked.length && ratio < 1 - 1e-9) st = 'unest';
  else st = ratio < .8 - 1e-9 ? 'short' : ratio < 1 - 1e-9 ? 'near' : ratio > 1.5 + 1e-9 ? 'over' : 'ok';
  return {gap:gap, sum:sum, ratio:ratio, short:gap == null ? null : Math.max(0, gap - sum), linked:linked.length, unest:linked.length - est.length, st:st};
}

/* ---------- 邏輯健檢（自訂經驗法則，僅供參考） ---------- */
var SLOGAN = ['卓越', '一流', '第一品牌', '領導品牌', '永續經營', '顧客至上', '全方位', '追求完美', '再創高峰', '更上一層樓', '邁向巔峰', '最棒', '無與倫比'];
var VAGUE = ['加強', '持續', '努力', '提升', '強化', '優化', '推動', '落實', '積極', '深化', '改善', '精進'];
var ACTIVITY = ['舉辦', '辦理', '推出', '執行', '導入', '建立', '製作', '發布'];
function findWord(t, list){ for(var i = 0; i < list.length; i++) if(t.indexOf(list[i]) >= 0) return list[i]; return ''; }
function hasTargetNumber(t){
  var s = String(t).replace(/(?:20\d{2}|1\d{2})\s*年(?:度|底)?/g, '').replace(/[\d一二三四五六七八九十]+\s*(?:年|個月|天|分鐘|小時)(?:內|後)?/g, '').replace(/第\s*\d+/g, '').replace(/[A-Za-z]+[-.]?\d+[A-Za-z\d]*|\d+[A-Za-z]+/g, '');
  return /\d|[%％]/.test(s) || /[一二三四五六七八九十兩]+倍|[一二三四五六七八九]+成(?!不|為|長|立|功|就|本|果|員|熟|交|效|品|分|形|套)|[一二三四五六七八九十百]+億/.test(s);
}
function check(plan, plans){
  var R = [], L = labels(plan);
  function add(lv, dim, code, id, field, t, why, fix){ R.push({lv:lv, dim:dim, code:code, id:id, field:field, t:t, why:why, fix:fix, at:id ? L[id] || '' : dim === 'O' ? 'O' : ''}); }
  var end = plan.to, start = plan.from, o = plan.o.trim();
  // 期間
  if(!start || !end) add('warn', '基本', 'period', '', !start ? 'from' : 'to', '還沒設定規劃期間', '沒有起訖日，就算不出每個月該走到哪裡。', '填上開始日與結束日，一般是一年。');
  else if(start > end) add('bad', '基本', 'periodRev', '', 'to', '結束日早於開始日', '期間顛倒，進度會算錯。', '檢查起訖日。');
  // O
  if(!o) add('bad', 'O', 'oEmpty', '', 'o', '還沒寫 O（最終目的）', '沒有 O，後面的目標與策略沒有方向。', '用一句話寫：要成為誰心中的什麼，或要帶來什麼改變。');
  else{
    if(o.length < 8) add('warn', 'O', 'oShort', '', 'o', 'O 太短，看不出方向', '只有 ' + o.length + ' 個字，別人讀了可能各自解讀。', '補上對象與想帶來的改變。');
    if(o.length > 60) add('warn', 'O', 'oLong', '', 'o', 'O 太長，記不起來', '共 ' + o.length + ' 個字，同仁很難背得出來。', '縮到 60 字內，做法移到 S。');
    if(hasTargetNumber(o)) add('warn', 'O', 'oNumber', '', 'o', 'O 裡有數字', 'O 講方向與意義，數字放在 G 才能單獨追蹤。', '把數字移到 G，O 只留方向。');
    var sl = findWord(o, SLOGAN); if(sl) add('warn', 'O', 'oSlogan', '', 'o', 'O 有口號字眼「' + sl + '」', '換成任何一家公司都說得通的句子，沒有指引作用。', '改寫成只有你們會說的話：服務誰、和別人差在哪。');
    if((o.match(/、|；|;|並且|以及|同時/g) || []).length >= 3) add('warn', 'O', 'oMany', '', 'o', 'O 塞了好幾件事', '一句話裡有太多並列項目，重點會散掉。', '只留最重要的一件，其餘放到 G 或 S。');
  }
  // G
  if(!plan.goals.length) add('bad', 'G', 'gNone', '', 'addGoal', '還沒有任何 G（量化目標）', '沒有數字，就不知道 O 算不算達成。', '先寫 2～4 個最能代表 O 的數字。');
  if(plan.goals.length > 5) add('warn', 'G', 'gMany', '', 'addGoal', 'G 有 ' + plan.goals.length + ' 個，偏多', '目標太多等於沒有重點。', '留 3～5 個，其餘改成策略底下的指標。');
  var gseen = {};
  plan.goals.forEach(function(g){
    if(!g.t.trim()) add('bad', 'G', 'gEmpty', g.id, 't', L[g.id] + ' 沒有名稱', '看不出要量什麼。', '寫指標名稱，例如「回購率」「年營收」。');
    else{
      var k = '#' + norm(g.t); if(has(gseen, k)) add('warn', 'G', 'gDup', g.id, 't', L[g.id] + ' 和 ' + gseen[k] + ' 重複', '同一個數字列兩次。', '合併成一個。'); else gseen[k] = L[g.id];
      var ac = findWord(g.t, ACTIVITY); if(ac) add('warn', 'G', 'gActivity', g.id, 't', L[g.id] + ' 像行動，不像結果', '有「' + ac + '」，做完不代表有效果。', '改成做完之後要看到的數字，行動放到 M 的行動清單。');
    }
    if(g.target === '') add('bad', 'G', 'gTarget', g.id, 'target', L[g.id] + ' 沒有目標值', '沒有數字就沒辦法判斷達標。', '填目標值。');
    if(g.base === '') add('warn', 'G', 'gBase', g.id, 'base', L[g.id] + ' 沒有起點', '不知道現在在哪，就不知道要走多遠。', '填目前的數字；真的沒有就先花兩週量出來。');
    if(!g.unit) add('warn', 'G', 'gUnit', g.id, 'unit', L[g.id] + ' 沒有單位', '「30」是 30% 還是 30 萬？', '填單位，例如 %、萬元、人。');
    if(!g.due) add('bad', 'G', 'gDue', g.id, 'due', L[g.id] + ' 沒有期限', '沒有期限的目標會一直往後延。', '填要達成的日期。');
    else if((end && g.due > end) || (start && g.due < start)) add('warn', 'G', 'gDueOut', g.id, 'due', L[g.id] + ' 的期限不在規劃期間內', '期限 ' + g.due + ' 超出 ' + (start || '?') + '～' + (end || '?') + '。', '調整期限，或把它拆成這個期間內的里程碑。');
    if(g.base !== '' && g.target !== ''){
      if((g.dir === 'up' && g.target < g.base) || (g.dir === 'down' && g.target > g.base)) add('bad', 'G', 'gDir', g.id, 'dir', L[g.id] + ' 方向相反', '設定' + (g.dir === 'up' ? '越高越好，目標卻比起點低' : '越低越好，目標卻比起點高') + '。', '檢查起點、目標或方向。');
      else if(g.target === g.base) add('warn', 'G', 'gFlat', g.id, 'target', L[g.id] + ' 起點等於目標', '這是「維持」，不是往前走。', '確定要維持就保留；不是的話調整目標值。');
    }
    if(g.guess) add('warn', 'G', 'gGuess', g.id, 'target', L[g.id] + ' 的數字是 AI 推測的', '還沒有人確認過。', '改成真實數字，或按「確認數字」。');
  });
  // S
  if(!plan.strats.length) add('bad', 'S', 'sNone', '', 'addStrat', '還沒有任何 S（策略）', '有目標沒有做法。', '想 3～5 條能拉近缺口的主要做法。');
  if(plan.strats.length > 5) add('warn', 'S', 'sMany', '', 'addStrat', 'S 有 ' + plan.strats.length + ' 條，偏多', '資源分散，每條都做不深。', '挑最有影響的 3～5 條，其餘先放下。');
  var sseen = {};
  plan.strats.forEach(function(s){
    if(!s.t.trim()) add('bad', 'S', 'sEmpty', s.id, 't', L[s.id] + ' 沒有內容', '空白的策略。', '寫做法，或刪掉這條。');
    else{
      var k = '#' + norm(s.t); if(has(sseen, k)) add('warn', 'S', 'sDup', s.id, 't', L[s.id] + ' 和 ' + sseen[k] + ' 重複', '同一條策略列兩次。', '合併。'); else sseen[k] = L[s.id];
      var vg = findWord(s.t, VAGUE); if(vg && s.how.trim().length < 10) add('warn', 'S', 'sVague', s.id, 'how', L[s.id] + ' 用了空泛的「' + vg + '」', '看不出要做什麼選擇、和現在差在哪。', '在「具體做法」補上：對誰、用什麼方法、資源放哪。');
      if(/[%％]|(?:達到|成長|增加到|降到|超過)\s*\d/.test(s.t)) add('warn', 'S', 'sNumber', s.id, 't', L[s.id] + ' 裡有目標數字', '策略講「怎麼做」，目標數字應該在 G 或 M。', '把數字移到指標，策略改寫成做法。');
    }
    if(!s.not.trim()) add('warn', 'S', 'sNot', s.id, 'not', L[s.id] + ' 沒寫「不做什麼」', '沒有取捨就不算策略。', '寫一件為了這條策略而放掉的事。');
    if(plan.goals.length && !Object.keys(s.links).length) add('bad', '對齊', 'sNoLink', s.id, 'links', L[s.id] + ' 沒有支援任何目標', '做了也不知道對哪個數字有幫助。', '勾選它支援的 G；如果都沒有，考慮拿掉。');
    // M
    if(!s.kpis.length) add('bad', 'M', 'mNone', s.id, 'addKpi', L[s.id] + ' 沒有衡量指標', '不知道這條策略有沒有效。', '至少加一個指標。');
    else if(s.kpis.every(function(x){ return !x.lead; })) add('warn', 'M', 'mLag', s.kpis[0].id, 'lead', L[s.id] + ' 只有落後指標', '等結果出來才知道，來不及調整。', '加一個過程中就看得到的領先指標，例如每週聯絡數。');
    s.kpis.forEach(function(m){
      var n = L[m.id];
      if(!m.t.trim()) add('bad', 'M', 'mEmpty', m.id, 't', n + ' 沒有名稱', '看不出要量什麼。', '寫指標名稱，或刪掉。');
      else plan.goals.forEach(function(g){ if(g.t.trim() && norm(g.t) === norm(m.t)) add('warn', 'M', 'mCopy', m.id, 't', n + ' 和 ' + L[g.id] + ' 一模一樣', '指標照抄目標，量不出這條策略本身有沒有效。', '改量這條策略直接影響的中間數字。'); });
      if(m.target === '') add('bad', 'M', 'mTarget', m.id, 'target', n + ' 沒有目標值', '沒有數字就沒有紅綠燈。', '填目標值。');
      if(!m.unit) add('warn', 'M', 'mUnit', m.id, 'unit', n + ' 沒有單位', '數字沒有單位會誤讀。', '填單位。');
      if(!m.owner.trim()) add('warn', 'M', 'mOwner', m.id, 'owner', n + ' 沒有負責人', '大家負責等於沒人負責。', '填一個人的名字或職稱。');
      if(m.base !== '' && m.target !== '' && ((m.dir === 'up' && m.target < m.base) || (m.dir === 'down' && m.target > m.base))) add('bad', 'M', 'mDir', m.id, 'dir', n + ' 方向相反', '目標值和「越高／越低越好」對不上。', '檢查起點、目標或方向。');
      if(m.guess) add('warn', 'M', 'mGuess', m.id, 'target', n + ' 的數字是 AI 推測的', '還沒有人確認過。', '改成真實數字，或按「確認數字」。');
    });
    if(!s.acts.length) add('warn', 'M', 'aNone', s.id, 'addAct', L[s.id] + ' 沒有行動', '策略沒有落到「誰在什麼時候做什麼」。', '加 1～5 個行動。');
    s.acts.forEach(function(a){
      var n = L[a.id];
      if(!a.t.trim()) add('warn', 'M', 'aEmpty', a.id, 't', n + ' 沒有內容', '空白的行動。', '寫內容，或刪掉。');
      if(!a.owner.trim()) add('warn', 'M', 'aOwner', a.id, 'owner', n + ' 沒有負責人', '沒有人會主動去做。', '填一個人的名字或職稱。');
      if(!a.to) add('warn', 'M', 'aDue', a.id, 'to', n + ' 沒有完成日', '沒有日期就沒辦法追。', '填完成日。');
      if(a.from && a.to && a.from > a.to) add('bad', 'M', 'aRev', a.id, 'to', n + ' 完成日早於開始日', '日期顛倒。', '檢查日期。');
      if(a.to && end && a.to > end) add('warn', 'M', 'aLate', a.id, 'to', n + ' 在規劃期間結束後才完成', '來不及影響這一期的目標。', '提前，或移到下一期。');
    });
  });
  // 對齊：缺口
  plan.goals.forEach(function(g){
    if(!plan.strats.length) return;
    var c = coverage(plan, g), u = g.unit ? ' ' + g.unit : '';
    if(c.st === 'none') add('bad', '對齊', 'cNone', g.id, 'cover', L[g.id] + ' 沒有任何策略支援', '寫了目標卻沒有做法，多半達不到。', '找一條策略勾選這個目標，或新增一條。');
    else if(c.st === 'short') add('bad', '對齊', 'cShort', g.id, 'cover', L[g.id] + ' 的策略加起來還差 ' + fmt(c.short) + u, '缺口 ' + fmt(c.gap) + u + '，各策略預估貢獻只有 ' + fmt(c.sum) + u + '（' + Math.round(c.ratio * 100) + '%）。', '加一條策略、加大現有策略，或調低目標。');
    else if(c.st === 'near') add('warn', '對齊', 'cNear', g.id, 'cover', L[g.id] + ' 的策略加起來略少 ' + fmt(c.short) + u, '缺口 ' + fmt(c.gap) + u + '，預估貢獻 ' + fmt(c.sum) + u + '（' + Math.round(c.ratio * 100) + '%），沒有緩衝。', '多留一點餘裕，通常抓 110～120%。');
    else if(c.st === 'unest') add('warn', '對齊', 'cUnest', g.id, 'cover', L[g.id] + ' 有 ' + c.unest + ' 條策略沒估貢獻', '不知道全部做完夠不夠。', '在策略裡填預估貢獻，粗估也可以。');
    else if(c.st === 'over') add('warn', '對齊', 'cOver', g.id, 'cover', L[g.id] + ' 的預估貢獻是缺口的 ' + Math.round(c.ratio * 100) + '%', '可能估得太樂觀，或目標太保守。', '重新檢查每條策略的預估，或把目標調高。');
  });
  // 負責人與預算
  var own = {};
  kpisOf(plan).forEach(function(m){ var n = m.owner.trim(); if(n) own['#' + n] = (own['#' + n] || 0) + 1; });
  actsOf(plan).forEach(function(x){ var n = x.a.owner.trim(); if(n && x.a.st !== 'done') own['#' + n] = (own['#' + n] || 0) + 1; });
  Object.keys(own).forEach(function(k){ if(own[k] > 8) add('warn', 'M', 'ownerLoad', '', 'owner', k.slice(1) + ' 一個人負責 ' + own[k] + ' 項', '指標加未完成的行動超過 8 項，容易卡住。', '分一些給別人，或先做重要的。'); });
  var cost = costOf(plan);
  if(plan.budget !== '' && cost > plan.budget) add('bad', 'M', 'budget', '', 'budget', '行動預算超過上限 ' + fmt(cost - plan.budget) + ' 元', '行動加總 ' + fmt(cost) + ' 元，上限 ' + fmt(plan.budget) + ' 元。', '砍掉或縮小貢獻最低的行動。');
  // 上下層
  if(plans) cascadeIssues(plan, plans).forEach(function(x){ add('warn', '展開', x.code, x.id, x.field, x.t, x.why, x.fix); });
  return R.filter(function(i){ return i.lv === 'bad'; }).concat(R.filter(function(i){ return i.lv !== 'bad'; }));
}
function costOf(plan){ return actsOf(plan).reduce(function(a, x){ return a + (x.a.cost === '' ? 0 : x.a.cost); }, 0); }
// 分數：紅燈 −8、黃燈 −3，同一種問題最多扣兩次；自訂經驗法則
function score(issues){
  var n = {}, v = 100;
  issues.forEach(function(i){ n[i.code] = (n[i.code] || 0) + 1; if(n[i.code] <= 2) v -= i.lv === 'bad' ? 8 : 3; });
  v = Math.max(0, v);
  var bad = issues.some(function(i){ return i.lv === 'bad'; });
  return {v:v, verdict:bad ? (v >= 60 ? '方向有了，先把紅燈補起來' : '還在草稿階段，從紅燈開始補') : v >= 85 ? '邏輯接得起來，可以拿去討論' : '沒有紅燈了，黃燈再看一輪'};
}

/* ---------- 往下展開 ---------- */
function snap(k){ return [k.t, k.base, k.target, k.unit, k.dir, k.acc].join('|'); }
function fromKpi(k, due){ return newGoal({t:k.t, base:k.base, target:k.target, unit:k.unit, dir:k.dir, acc:k.acc, due:due, guess:k.guess, src:{k:k.id, snap:snap(k)}}); }
// 上層一條策略 → 下層一份 OGSM：S 變 O、M 變 G
function cascade(plan, sid, unit){
  var s = plan.strats.filter(function(x){ return x.id === sid; })[0]; if(!s) return null;
  var p = newPlan({name:str((unit || '下一層') + '・' + (s.t || '策略').slice(0, 24), 60), unit:str(unit, 60), from:plan.from, to:plan.to, parent:{plan:plan.id, s:s.id}, o:str(s.t, 120)});
  p.goals = s.kpis.slice(0, LIM.goals).map(function(k){ return fromKpi(k, plan.to); });
  p.strats = [newStrat({kpis:[newKpi()], acts:[newAct()]})];
  return p;
}
function childrenOf(plans, id, sid){ return plans.filter(function(p){ return p.parent && p.parent.plan === id && (!sid || p.parent.s === sid); }); }
function cascadeIssues(plan, plans){
  var R = [], L = labels(plan);
  function add(code, id, field, t, why, fix){ R.push({code:code, id:id, field:field, t:t, why:why, fix:fix}); }
  // 當上層看：有展開的策略，每個指標下面有沒有人接
  plan.strats.forEach(function(s){
    var ch = childrenOf(plans, plan.id, s.id); if(!ch.length) return;
    s.kpis.forEach(function(k){
      if(!ch.some(function(c){ return c.goals.some(function(g){ return g.src && g.src.k === k.id; }); })) add('dropped', k.id, 't', L[k.id] + ' 下層沒有人接', L[s.id] + ' 已經展開，但沒有任何下層把這個指標當目標。', '到下層那一份，在「展開與追蹤」按「跟上層同步」。');
    });
  });
  // 當下層看：上層改了沒跟上
  if(plan.parent){
    var par = planById(plans, plan.parent.plan), ps = par && par.strats.filter(function(x){ return x.id === plan.parent.s; })[0];
    if(par && !ps) add('parentGone', '', 'name', '上層的策略已經刪掉', '這份 OGSM 原本承接「' + par.name + '」的一條策略，現在找不到了。', '和上層確認是否還要做，或在「展開與追蹤」解除連結。');
    if(ps){
      plan.goals.forEach(function(g){
        if(!g.src) return;
        var k = ps.kpis.filter(function(x){ return x.id === g.src.k; })[0];
        if(!k) add('srcGone', g.id, 't', L[g.id] + ' 對應的上層指標已經刪掉', '上層不再追這個數字。', '和上層確認，或改成自己的目標。');
        else if(snap(k) !== g.src.snap) add('srcChanged', g.id, 'target', L[g.id] + ' 的上層指標改過了', '上層現在是：' + k.t + ' ' + fmt(k.base) + '→' + fmt(k.target) + ' ' + k.unit + '。', '到「展開與追蹤」按「跟上層同步」。');
      });
      if(par.to && plan.to && plan.to > par.to) add('childLate', '', 'to', '結束日晚於上層', '上層 ' + par.to + ' 就結束了。', '調整期間。');
    }
  }
  return R;
}
// 下層跟上：更新改過的、補上缺少的；回傳改了幾個
function syncFromParent(plan, plans){
  var par = plan.parent && planById(plans, plan.parent.plan), s = par && par.strats.filter(function(x){ return x.id === plan.parent.s; })[0], n = 0;
  if(!s) return 0;
  s.kpis.forEach(function(k){
    var g = plan.goals.filter(function(x){ return x.src && x.src.k === k.id; })[0];
    if(g){ if(g.src.snap !== snap(k)){ Object.assign(g, {t:k.t, base:k.base, target:k.target, unit:k.unit, dir:k.dir, acc:k.acc, guess:k.guess}); g.src.snap = snap(k); n++; } return; }
    var sib = childrenOf(plans, par.id, s.id).some(function(c){ return c.id !== plan.id && c.goals.some(function(x){ return x.src && x.src.k === k.id; }); });
    if(!sib && plan.goals.length < LIM.goals){ plan.goals.push(fromKpi(k, plan.to)); n++; }
  });
  return n;
}
function tree(plans){
  function node(p, d){ return {p:p, depth:d, kids:d > 20 ? [] : childrenOf(plans, p.id).map(function(c){ return node(c, d + 1); })}; }
  return plans.filter(function(p){ return !p.parent; }).map(function(p){ return node(p, 0); });
}

/* ---------- 每月追蹤 ---------- */
function months(plan){
  if(!plan.from || !plan.to || plan.from > plan.to) return [];
  var r = [], ym = plan.from.slice(0, 7), end = plan.to.slice(0, 7);
  while(ym <= end && r.length < 60){ r.push(ym); ym = nextYm(ym); }
  return r;
}
// 到某月底為止，期間走了多少比例（線性）
function frac(plan, due, ym){
  var e = due || plan.to; if(!plan.from || !e || e < plan.from) return null;
  var a = dayNo(plan.from), b = dayNo(e), d = dayNo(monthEnd(ym));
  return Math.min(1, Math.max(0, (d - a + 1) / (b - a + 1)));
}
function valueAt(plan, id, ym){ var l = has(plan.logs, ym) ? plan.logs[ym] : null; return l && has(l.v, id) ? l.v[id] : null; }
function expAt(plan, it, ym){ var e = frac(plan, it.due, ym); if(e == null || it.target === '') return null; if(it.acc === 'sum') return it.target * e; return it.base === '' ? null : it.base + (it.target - it.base) * e; }
function progress(plan, it, ym){
  var r = {actual:null, f:null, e:null, exp:null, st:'na', ym:'', missing:0}, m0 = plan.from ? plan.from.slice(0, 7) : '';
  var ms = Object.keys(plan.logs).filter(function(m){ return m <= ym && m >= m0 && valueAt(plan, it.id, m) != null; }).sort();
  if(!ms.length) return r;
  r.ym = ms[ms.length - 1];
  if(it.acc === 'sum'){
    r.actual = ms.reduce(function(a, m){ return a + valueAt(plan, it.id, m); }, 0);
    if(m0){ var c = 0, m = m0; while(m <= r.ym && c < 600){ c++; m = nextYm(m); } r.missing = Math.max(0, c - ms.length); }
  } else r.actual = valueAt(plan, it.id, r.ym);
  r.e = frac(plan, it.due, r.ym);
  if(it.target === '' || r.e == null) return r;
  if(it.acc === 'sum'){
    if(it.target <= 0) return r;
    r.f = r.actual / it.target; r.exp = it.target * r.e;
    if(it.dir === 'down'){ // 累計、越低越好（例如費用或客訴上限）：看有沒有超過進度
      r.st = r.actual <= r.exp + 1e-9 ? 'ok' : r.actual <= r.exp * 1.1 + 1e-9 ? 'warn' : 'bad'; return r;
    }
  } else {
    if(it.base === '') return r;
    var span = it.target - it.base;
    if(span === 0){ var hit = it.dir === 'down' ? r.actual <= it.target : r.actual >= it.target; r.exp = it.target; r.f = hit ? 1 : 0; r.st = hit ? 'done' : 'bad'; return r; }
    r.f = (r.actual - it.base) / span; r.exp = it.base + span * r.e;
  }
  if(r.f >= 1 - 1e-9) r.st = 'done';
  else if(r.e <= 0) r.st = r.f < 0 ? 'warn' : 'ok';
  else { var q = r.f / r.e; r.st = q >= 1.05 - 1e-9 ? 'ahead' : q >= .9 - 1e-9 ? 'ok' : q >= .7 - 1e-9 ? 'warn' : 'bad'; }
  return r;
}
function series(plan, it){ return months(plan).map(function(m){ var v = valueAt(plan, it.id, m), p = v == null ? null : progress(plan, it, m); return {ym:m, v:v, actual:p ? p.actual : null, exp:expAt(plan, it, m), st:p ? p.st : 'na'}; }); }
function summary(plan, ym){
  var c = {done:0, ahead:0, ok:0, warn:0, bad:0, na:0};
  plan.goals.concat(kpisOf(plan)).forEach(function(x){ c[progress(plan, x, ym).st]++; });
  return c;
}
function overdue(plan, today){ return actsOf(plan).filter(function(x){ return x.a.st !== 'done' && x.a.to && x.a.to < today; }).sort(function(a, b){ return a.a.to < b.a.to ? -1 : a.a.to > b.a.to ? 1 : 0; }); }
function actStats(plan){ var r = {todo:0, doing:0, done:0, n:0}; actsOf(plan).forEach(function(x){ r[x.a.st]++; r.n++; }); return r; }

/* ---------- 匯出 ---------- */
function linkText(plan, s, L, withNum){ return plan.goals.filter(function(g){ return has(s.links, g.id); }).map(function(g){ return L[g.id] + (withNum && s.links[g.id] !== '' ? '(' + s.links[g.id] + ')' : ''); }).join('、'); }
function measureText(x){ return (x.t || '（未命名）') + '：' + (x.base === '' ? '' : fmt(x.base) + ' → ') + fmt(x.target) + (x.unit ? ' ' + x.unit : '') + (x.dir === 'down' ? '（越低越好）' : ''); }
function toText(plan){
  var L = labels(plan), r = ['【' + plan.name + '】' + (plan.unit ? plan.unit : '') + (plan.from ? '　' + plan.from + '～' + plan.to : ''), '', 'O 最終目的', plan.o || '（未填）', '', 'G 具體目標'];
  plan.goals.forEach(function(g){ r.push(L[g.id] + ' ' + measureText(g) + (g.due ? '，' + g.due + ' 前' : '') + (g.guess ? '（AI 推測，未確認）' : '')); });
  plan.strats.forEach(function(s){
    var lk = linkText(plan, s, L);
    r.push('', L[s.id] + ' ' + (s.t || '（未填）') + (lk ? '　→ 支援 ' + lk : ''));
    if(s.how) r.push('　做法：' + s.how); if(s.not) r.push('　不做：' + s.not);
    s.kpis.forEach(function(k){ r.push('　' + L[k.id] + ' ' + measureText(k) + '，' + FREQ[k.freq] + '，' + (k.owner || '未指定') + '，' + (k.lead ? '領先' : '落後') + '指標' + (k.guess ? '（AI 推測，未確認）' : '')); });
    s.acts.forEach(function(a){ r.push('　' + L[a.id] + ' ' + (a.t || '（未填）') + '（' + (a.owner || '未指定') + (a.to ? '，' + a.to + ' 前' : '') + '，' + ST[a.st] + '）'); });
  });
  return r.join('\n');
}
function csvCell(v){ if(typeof v === 'number') return String(v); v = String(v == null ? '' : v); if(/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function toCsv(plan){
  var L = labels(plan), rows = [['層級', '編號', '內容', '起點', '目標', '單位', '方向', '期限／頻率', '負責人', '支援', '備註', '預算', '狀態']];
  rows.push(['O', 'O', plan.o, '', '', '', '', plan.to, '', '', plan.unit, plan.budget, '']);
  plan.goals.forEach(function(g){ rows.push(['G', L[g.id], g.t, g.base, g.target, g.unit, g.dir === 'down' ? '越低越好' : '越高越好', g.due, '', 'O', g.guess ? 'AI 推測未確認' : '', '', '']); });
  plan.strats.forEach(function(s){
    rows.push(['S', L[s.id], s.t, '', '', '', '', '', '', linkText(plan, s, L, true), (s.how ? '做法：' + s.how : '') + (s.not ? '　不做：' + s.not : ''), '', '']);
    s.kpis.forEach(function(k){ rows.push(['M 指標', L[k.id], k.t, k.base, k.target, k.unit, k.dir === 'down' ? '越低越好' : '越高越好', FREQ[k.freq], k.owner, L[s.id], (k.lead ? '領先指標' : '落後指標') + (k.guess ? '・AI 推測未確認' : ''), '', '']); });
    s.acts.forEach(function(a){ rows.push(['M 行動', L[a.id], a.t, '', '', '', '', a.to, a.owner, L[s.id], a.from ? a.from + ' 開始' : '', a.cost, ST[a.st]]); });
  });
  return '\ufeff' + rows.map(function(r){ return r.map(csvCell).join(','); }).join('\r\n');
}
function toDoc(plan){
  var L = labels(plan), td = '<td style="border:1px solid #555;padding:5pt;vertical-align:top">';
  var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + esc(plan.name) + '</title><style>@page S{size:29.7cm 21cm;mso-page-orientation:landscape;margin:1.5cm}div.S{page:S}body{font-family:"Microsoft JhengHei",sans-serif;font-size:10.5pt}table{border-collapse:collapse;width:100%}h1{font-size:18pt}th{border:1px solid #555;padding:5pt;background:#16324F;color:#fff;text-align:left}</style></head><body><div class="S">';
  h += '<h1>' + esc(plan.name) + '</h1><p>' + esc(plan.unit) + '　' + esc(plan.from) + '～' + esc(plan.to) + '</p><table><tr><th>O 最終目的</th></tr><tr>' + td + esc(plan.o) + '</td></tr></table><br><table><tr><th>G 具體目標</th><th>起點</th><th>目標</th><th>單位</th><th>期限</th></tr>';
  plan.goals.forEach(function(g){ h += '<tr>' + td + L[g.id] + ' ' + esc(g.t) + (g.guess ? '（AI 推測，未確認）' : '') + '</td>' + td + fmt(g.base) + '</td>' + td + fmt(g.target) + '</td>' + td + esc(g.unit) + '</td>' + td + esc(g.due) + '</td></tr>'; });
  h += '</table><br><table><tr><th>S 策略</th><th>M 衡量指標</th><th>M 行動</th></tr>';
  plan.strats.forEach(function(s){
    h += '<tr>' + td + '<b>' + L[s.id] + ' ' + esc(s.t) + '</b>' + (s.how ? '<br>做法：' + esc(s.how) : '') + (s.not ? '<br>不做：' + esc(s.not) : '') + '<br>支援：' + (linkText(plan, s, L) || '—') + '</td>' + td +
      s.kpis.map(function(k){ return L[k.id] + ' ' + esc(measureText(k)) + '<br>' + FREQ[k.freq] + '・' + esc(k.owner || '未指定') + (k.guess ? '・AI 推測，未確認' : ''); }).join('<br>') + '</td>' + td +
      s.acts.map(function(a){ return L[a.id] + ' ' + esc(a.t) + '<br>' + esc(a.owner || '未指定') + (a.to ? '・' + a.to : '') + '・' + ST[a.st]; }).join('<br>') + '</td></tr>';
  });
  return h + '</table></div></body></html>';
}
// 分享用：不含每月紀錄與上下層
function sharePlan(plan){ var p = sanitizePlan(JSON.parse(JSON.stringify(plan))); p.logs = {}; p.parent = null; p.goals.forEach(function(g){ g.src = null; }); return p; }

/* ---------- AI 提示詞與回覆整理 ---------- */
var RULES = '規則：\n- 繁體中文（台灣用語），句子短、具體。\n- O 是一句質化的方向，不放數字、不喊口號。\n- G 是 2～4 個可量化的結果，不是行動。\n- S 是 3～4 條做法，要有取捨，寫出「不做什麼」。\n- M 的指標量這條策略直接影響的數字，每條策略至少一個領先指標；行動寫得出誰做、什麼時候完成。\n- 不要編造公司名、人名、得獎或客戶名單。負責人只寫職稱。\n';
var DRAFT_SHAPE = '{"o":"","goals":[{"t":"指標名稱","base":0,"target":0,"unit":"","dir":"up 或 down"}],"strats":[{"t":"","how":"","not":"","links":["G1"],"kpis":[{"t":"","base":0,"target":0,"unit":"","dir":"up","lead":true,"owner":"職稱"}],"acts":[{"t":"","owner":"職稱","to":"YYYY-MM-DD"}]}]}';
function draftPrompt(bg, from, to){ return '請依下面的背景，幫我擬一份 OGSM 草稿。\n\n背景：' + (bg || '（未填）') + '\n期間：' + (from || '?') + '～' + (to || '?') + '\n\n' + RULES + '- 背景沒給的數字可以推測，使用者會再確認；真的猜不出來就留空字串。\n\n只回傳 JSON，格式：\n' + DRAFT_SHAPE; }
var KIND = {o:'O（最終目的）', g:'G（量化目標的名稱）', s:'S（策略）', k:'M（衡量指標的名稱）', a:'M（行動）'};
function rewritePrompt(kind, text, plan){ return '下面是我 OGSM 的其中一格，請改寫成 3 個更清楚的版本。\n\n要改的是 ' + (KIND[kind] || KIND.o) + '：「' + text + '」\n\n整份 OGSM：\n' + toText(plan) + '\n\n' + RULES + '- 不可以改動或新增任何數字。\n\n只回傳 JSON：{"options":["","",""]}'; }
function advicePrompt(plan, issues){ return '這是我的 OGSM，和工具規則檢查出來的問題。請針對前 5 個最重要的問題，各用兩三句話說明為什麼要改、怎麼改比較好，並給一個改寫範例。不要改動已填的數字，不確定的地方標示【請查證】。\n\n' + toText(plan) + '\n\n檢查結果：\n' + (issues.length ? issues.slice(0, 15).map(function(i){ return (i.lv === 'bad' ? '紅燈' : '黃燈') + '：' + i.t + '（' + i.why + '）'; }).join('\n') : '沒有紅黃燈'); }
function reviewPrompt(plan, ym){
  var L = labels(plan), l = has(plan.logs, ym) ? plan.logs[ym] : null;
  return '請把下面的月檢討資料整理成 200 字內的摘要：先講整體，再講落後的項目與可能要討論的問題，最後列 3 個下個月要決定的事。不要更改任何數字，也不要編造原因；資料沒寫的原因請寫成問題。\n\n' + plan.name + '　' + ym + '\n' +
    plan.goals.concat(kpisOf(plan)).map(function(x){ var p = progress(plan, x, ym); return L[x.id] + ' ' + x.t + '：' + (p.actual == null ? '沒有資料' : '實際 ' + fmt(p.actual) + '（資料到 ' + p.ym + '），應達 ' + fmt(p.exp) + '，目標 ' + fmt(x.target) + ' ' + x.unit + '，' + STATUS[p.st][0]); }).join('\n') + '\n\n檢討紀錄：' + (l && l.note ? l.note : '（未填）');
}
function plain(v, n){ return str(v, 2000).replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || LIM.t); }
function aiNum(v){ if(typeof v === 'string') v = v.replace(/[,，\s%％]/g, ''); return numOr(v); }
// AI 草稿 → 一份新的計畫；所有數字標 guess
function cleanAi(j, o){
  if(!j || typeof j !== 'object' || Array.isArray(j)) return null;
  o = o || {};
  var p = newPlan({name:str(o.name, 60) || 'AI 草稿', from:dateOr(o.from), to:dateOr(o.to), o:plain(j.o, 120)});
  function ms(x){ var b = aiNum(x.base), t = aiNum(x.target); return {t:plain(x.t, 60), base:b, target:t, unit:plain(x.unit, 20), dir:x.dir === 'down' ? 'down' : 'up', guess:b !== '' || t !== ''}; }
  // 連結用 AI 原本的編號，過濾掉沒名稱的目標後仍要對得上
  var raw = arr(j.goals, 5).map(function(g){ var r = newGoal(Object.assign(ms(g), {due:p.to})); return r.t ? r : null; });
  p.goals = raw.filter(Boolean);
  p.strats = arr(j.strats, 5).map(function(s){
    var r = newStrat({t:plain(s.t, 80), how:plain(s.how, 200), not:plain(s.not, 120)});
    (Array.isArray(s.links) ? s.links : []).forEach(function(l){ var m = /^G?\s*(\d+)$/i.exec(String(l).trim()), g = m && raw[m[1] - 1]; if(g) r.links[g.id] = ''; });
    r.kpis = arr(s.kpis, 4).map(function(k){ return newKpi(Object.assign(ms(k), {lead:k.lead !== false, owner:plain(k.owner, 20)})); }).filter(function(k){ return k.t; });
    r.acts = arr(s.acts, 6).map(function(a){ return newAct({t:plain(a.t, 80), owner:plain(a.owner, 20), to:dateOr(a.to)}); }).filter(function(a){ return a.t; });
    return r;
  }).filter(function(s){ return s.t; });
  return p.o || p.goals.length || p.strats.length ? p : null;
}
function cleanOptions(j){ var seen = {}; return (j && Array.isArray(j.options) ? j.options : []).map(function(x){ return plain(x, 160); }).filter(function(x){ if(!x || has(seen, '#' + x)) return false; seen['#' + x] = 1; return true; }).slice(0, 5); }

/* ---------- 虛構範例 ---------- */
function ex(id, name, d){
  var gi = d.g.map(function(x, i){ return newGoal({id:'g' + id + (i + 1), t:x[0], base:x[1], target:x[2], unit:x[3], due:x[4] || d.to, dir:x[5] || 'up', acc:x[6] || 'level'}); });
  var st = d.s.map(function(s, i){
    var links = {}; Object.keys(s.l).forEach(function(n){ links[gi[n - 1].id] = s.l[n]; });
    return newStrat({id:'s' + id + (i + 1), t:s.t, how:s.how || '', not:s.not || '', links:links,
      kpis:(s.k || []).map(function(k, j){ return newKpi({id:'k' + id + (i + 1) + 'x' + (j + 1), t:k[0], base:k[1], target:k[2], unit:k[3], freq:k[4] || 'month', owner:k[5] || '', lead:k[6] !== 0, dir:k[7] || 'up', acc:k[8] || 'level'}); }),
      acts:(s.a || []).map(function(a, j){ return newAct({id:'a' + id + (i + 1) + 'x' + (j + 1), t:a[0], owner:a[1] || '', from:a[2] || '', to:a[3] || '', cost:a[4] === undefined ? '' : a[4], st:a[5] || 'todo'}); })});
  });
  return newPlan({id:'p' + id, name:name, unit:d.unit, from:d.from, to:d.to, budget:d.budget === undefined ? '' : d.budget, o:d.o, goals:gi, strats:st});
}
function coffee(){
  var p = ex('cof', '河岸咖啡 2026 OGSM', {unit:'河岸咖啡（虛構）', from:'2026-01-01', to:'2026-12-31', budget:300000,
    o:'成為社區居民每天早上第一個想到的咖啡店',
    g:[['早餐時段營收', 180, 300, '萬元', '', 'up', 'sum'], ['熟客回訪率', 32, 45, '%'], ['評論平均星等', 4.2, 4.6, '分']],
    s:[{t:'把早餐做成十分鐘外帶套餐', how:'6 款固定組合、線上預訂、7 點前備好，櫃檯只做取餐', not:'不做現點現做的早午餐盤', l:{1:90, 3:.2},
        k:[['每日外帶預訂數', 8, 40, '份', 'week', '店長'], ['取餐等候時間', 9, 4, '分鐘', 'week', '早班組長', 1, 'down']],
        a:[['設計 6 款外帶套餐與包裝', '店長', '2026-01-05', '2026-02-15', 45000, 'done'], ['開通線上預訂', '店長', '2026-02-01', '2026-03-10', 30000, 'done'], ['附近辦公大樓試吃', '早班組長', '2026-04-01', '2026-10-31', 40000, 'doing']]},
       {t:'用會員點數養成一週三次的習慣', how:'集點改成「同一週來三次送一杯」，用簡訊提醒第二次', not:'不打全面折扣', l:{1:40, 2:14},
        k:[['新加入會員', 0, 600, '人', 'month', '行銷', 1, 'up', 'sum'], ['一週三次以上的會員', 45, 150, '人', 'month', '行銷']],
        a:[['重做會員點數規則', '行銷', '2026-01-10', '2026-02-28', 20000, 'done'], ['每月一次會員日', '行銷', '2026-03-01', '2026-12-20', 60000, 'doing']]},
       {t:'把熟客故事變成評論與照片', how:'每天請兩位熟客留評論，挑一則做成店內卡片', not:'不買評論、不找業配', l:{3:.25},
        k:[['每月新增評論', 6, 25, '則', 'month', '外場']],
        a:[['設計評論小卡與 QR', '外場', '2026-01-15', '2026-02-10', 8000, 'done'], ['每季整理評論改善清單', '店長', '2026-03-01', '2026-11-15', 0, 'doing']]}]});
  var rows = {gcof1:[18, 19, 22, 24, 25, 25, 26, 25, 27, 28], gcof2:[32, 33, 34, 34, 35, 36, 36, 37, 38, 39], gcof3:[4.2, 4.2, 4.3, 4.3, 4.4, 4.4, 4.5, 4.5, 4.5, 4.6], kcof1x1:[8, 12, 17, 21, 24, 26, 28, 30, 33, 35], kcof1x2:[9, 8, 8, 7, 6.5, 6, 6, 5.5, 5, 5], kcof2x1:[20, 35, 60, 55, 50, 45, 40, 38, 42, 45], kcof2x2:[45, 50, 58, 64, 70, 76, 80, 84, 88, 92], kcof3x1:[6, 9, 14, 16, 18, 20, 20, 21, 22, 23]};
  for(var m = 1; m <= 10; m++){ var ym = '2026-' + ('0' + m).slice(-2), v = {}; Object.keys(rows).forEach(function(k){ v[k] = rows[k][m - 1]; }); p.logs[ym] = {v:v, note:m === 10 ? '一週三次的會員成長變慢，簡訊提醒開信率下降，11 月討論改用 LINE。' : ''}; }
  var c = cascade(p, 'scof1', '早班小組');
  c.id = 'pcofb'; c.name = '早班小組・十分鐘外帶套餐';
  c.goals.forEach(function(g, i){ g.id = 'gcofb' + (i + 1); });
  c.o = '讓趕上班的人不必等，也吃得到剛做好的早餐';
  c.strats = [newStrat({id:'scofb1', t:'前一晚備料、早上只組裝', how:'麵包與餡料前一晚分裝，早班只加熱與裝袋', not:'早班不做飲料客製', links:{gcofb1:20, gcofb2:4}, kpis:[newKpi({id:'kcofb1x1', t:'準時備好料的天數', base:8, target:24, unit:'天', freq:'month', owner:'早班組長'})], acts:[newAct({id:'acofb1x1', t:'寫備料檢查表', owner:'早班組長', from:'2026-02-01', to:'2026-02-28', st:'done'})]}),
    newStrat({id:'scofb2', t:'辦公大樓定點取餐', how:'兩棟大樓一樓固定時間取餐，線上付款', not:'不外送到樓層', links:{gcofb1:15, gcofb2:1.5}, kpis:[newKpi({id:'kcofb2x1', t:'合作大樓數', base:0, target:3, unit:'棟', freq:'month', owner:'早班組長'})], acts:[newAct({id:'acofb2x1', t:'拜訪管委會', owner:'早班組長', from:'2026-04-01', to:'2026-09-30', st:'doing'})]})];
  return [p, c];
}
var EX_CATS = [['shop', '開店與服務業'], ['brand', '品牌、製造與新創'], ['dept', '公司部門'], ['org', '辦訓、社區與個人'], ['drill', '練習健檢（故意寫錯）']];
var EXAMPLES = [
  {id:'cof', cat:'shop', n:'☕ 咖啡店（含每月追蹤與下一層）', make:coffee},
  {id:'ecm', cat:'brand', n:'📦 電商品牌', make:function(){ return [ex('ecm', '山嵐保養 2027 OGSM', {unit:'山嵐保養（虛構）', from:'2027-01-01', to:'2027-12-31', budget:1200000, o:'讓敏感肌的人一次就買對，不再試錯',
    g:[['官網營收', 1800, 2600, '萬元', '', 'up', 'sum'], ['退換貨率', 9, 4, '%', '', 'down'], ['半年內回購率', 22, 32, '%']],
    s:[{t:'用膚質問答取代商品列表', how:'首頁改成五題問答，直接給一組建議與理由', not:'不做全品項大促首頁', l:{1:450, 2:4}, k:[['完成問答的訪客比例', 0, 35, '%', 'week', '網站企劃'], ['問答後結帳率', 2.1, 4.5, '%', 'week', '網站企劃']], a:[['寫問答邏輯與文案', '產品經理', '2027-01-05', '2027-02-28', 120000], ['上線並測試兩個版本', '網站企劃', '2027-03-01', '2027-05-15', 180000]]},
       {t:'先試用、再買正裝', how:'七天試用組可抵正裝，第六天自動關心', not:'不送大量免費樣品', l:{1:250, 2:1.5, 3:6}, k:[['試用組轉正裝比例', 18, 35, '%', 'month', '會員經理']], a:[['設計試用組與抵用流程', '會員經理', '2027-01-15', '2027-03-31', 200000]]},
       {t:'把客服變成保養顧問', how:'客服依膚質紀錄主動追蹤，兩個月關心一次', not:'不追求最短通話時間', l:{1:180, 3:5}, k:[['主動關心完成率', 0, 80, '%', 'month', '客服主管'], ['顧問回購金額', 0, 180, '萬元', 'month', '客服主管', 0, 'up', 'sum']], a:[['建立膚質紀錄欄位', '客服主管', '2027-02-01', '2027-03-15', 60000], ['客服顧問訓練', '客服主管', '2027-03-15', '2027-06-30', 90000]]}]})]; }},
  {id:'trn', cat:'org', n:'🎓 辦訓單位', make:function(){ return [ex('trn', '晨光職訓中心 2027 OGSM', {unit:'晨光職訓中心（虛構）', from:'2027-01-01', to:'2027-12-31', budget:800000, o:'讓中小企業員工學完隔天就用得上',
    g:[['開班率', 68, 88, '%'], ['課後三個月應用率', 35, 60, '%'], ['企業包班收入', 120, 260, '萬元', '', 'up', 'sum']],
    s:[{t:'先訪企業再排課', how:'每季訪 15 家，把最常見的三個工作困擾變成課程', not:'不照去年課表複製', l:{1:14, 3:90}, k:[['每季企業訪談數', 4, 15, '家', 'quarter', '課程企劃']], a:[['設計訪談題綱', '課程企劃', '2027-01-04', '2027-01-29', 0], ['每季發表需求摘要', '課程企劃', '2027-03-01', '2027-12-10', 40000]]},
       {t:'每門課都交一份帶得走的成果', how:'最後兩小時做自己工作的作業，講師當場回饋', not:'不收只有講授的課', l:{2:18, 1:8}, k:[['學員交出成果比例', 40, 90, '%', 'month', '教務'], ['課後一個月追蹤回覆率', 15, 50, '%', 'month', '教務']], a:[['講師說明會', '教務', '2027-02-01', '2027-02-26', 30000], ['建立課後追蹤問卷', '教務', '2027-02-15', '2027-03-31', 20000]]},
       {t:'把成果案例變成包班提案', how:'每月整理一個學員案例，附給同產業企業', not:'不做大量電話行銷', l:{3:70, 2:9}, k:[['每月寄出提案數', 2, 10, '份', 'month', '業務']], a:[['案例授權同意書', '業務', '2027-01-20', '2027-02-20', 0], ['每月案例撰寫', '業務', '2027-03-01', '2027-12-15', 120000]]}]})]; }},
  {id:'mfg', cat:'brand', n:'🏭 製造業', make:function(){ return [ex('mfg', '立誠精密 2027 OGSM', {unit:'立誠精密（虛構）', from:'2027-01-01', to:'2027-12-31', budget:5000000, o:'成為客戶急單時最敢託付的零件夥伴',
    g:[['準時交貨率', 86, 96, '%'], ['不良率', 2.4, 1.2, '%', '', 'down'], ['急單營收占比', 8, 18, '%']],
    s:[{t:'保留兩成產能給急單', how:'排程固定留白，48 小時內回覆能不能接', not:'不接低毛利的長單填滿產能', l:{1:4, 3:9}, k:[['急單 48 小時回覆率', 50, 95, '%', 'week', '生管主管']], a:[['修改排程規則', '生管主管', '2027-01-11', '2027-02-26', 200000], ['試行三個月並檢討', '生管主管', '2027-03-01', '2027-05-31', 0]]},
       {t:'換線時間先拆解再買設備', how:'用影片拆解換線步驟，能外移的先外移', not:'上半年不買新機台', l:{1:5, 3:3}, k:[['平均換線時間', 95, 45, '分鐘', 'week', '製造課長', 1, 'down']], a:[['拍攝並拆解三條線', '製造課長', '2027-01-18', '2027-04-30', 150000]]},
       {t:'把檢驗往前移到每一站', how:'每站自檢、異常當站停，品保改做稽核', not:'不靠出貨前全檢', l:{1:3, 2:1.3}, k:[['站內攔截比例', 30, 75, '%', 'week', '品保主管'], ['客訴件數', 24, 8, '件', 'month', '品保主管', 0, 'down', 'sum']], a:[['各站檢驗標準書', '品保主管', '2027-02-01', '2027-05-31', 300000]]}]})]; }},
  {id:'spk', cat:'org', n:'🎤 個人講師', make:function(){ return [ex('spk', '我的講師事業 2027 OGSM', {unit:'個人講師（虛構）', from:'2027-01-01', to:'2027-12-31', budget:150000, o:'成為中小企業主管學 AI 時最想請的講師',
    g:[['企業內訓收入', 90, 160, '萬元', '', 'up', 'sum'], ['課後滿意度', 4.5, 4.8, '分'], ['主動邀課比例', 25, 50, '%']],
    s:[{t:'只做三個主題，做到最深', how:'行銷、人資、會計各一套可直接用的練習包', not:'不接和三個主題無關的課', l:{1:30, 2:.25}, k:[['練習包完成數', 0, 3, '套', 'month', '自己']], a:[['完成行銷練習包', '自己', '2027-01-05', '2027-02-28', 10000], ['完成人資與會計練習包', '自己', '2027-03-01', '2027-06-30', 20000]]},
       {t:'課後兩週回訪一次', how:'固定時段線上答問，收集應用案例', not:'不另外做付費社群', l:{2:.1, 3:15}, k:[['回訪出席率', 0, 40, '%', 'month', '自己']], a:[['寫回訪流程', '自己', '2027-02-01', '2027-03-10', 0]]},
       {t:'每週公開一個真實案例', how:'一則短文加一張圖，附可複製的步驟', not:'不追熱門話題', l:{1:45, 3:13}, k:[['每月公開案例', 1, 4, '則', 'month', '自己'], ['私訊詢課數', 2, 8, '則', 'month', '自己']], a:[['排好一季案例題目', '自己', '2027-01-04', '2027-01-20', 0]]}]})]; }},
  {id:'rst', cat:'shop', n:'🍜 小餐館', make:function(){ return [ex('rst', '巷口小館 2027 OGSM', {unit:'巷口小館（虛構）', from:'2027-01-01', to:'2027-12-31', budget:400000, o:'成為附近家庭平日晚餐最放心的廚房',
    g:[['平日晚餐營收', 320, 440, '萬元', '', 'up', 'sum'], ['食材報廢率', 8, 4, '%', '', 'down'], ['一個月內再訪率', 28, 38, '%']],
    s:[{t:'平日只賣五道當週菜', how:'每週一公布菜單，食材集中採購，出餐縮到八分鐘', not:'平日不提供四十道全菜單', l:{1:60, 2:3}, k:[['平日出餐時間', 18, 8, '分鐘', 'week', '主廚', 1, 'down'], ['當週菜點餐占比', 0, 70, '%', 'week', '外場組長']], a:[['排出十二週菜單輪替表', '主廚', '2027-01-05', '2027-02-12', 20000], ['試賣並調整份量', '主廚', '2027-02-15', '2027-04-30', 50000]]},
       {t:'做家庭份量的預訂餐盒', how:'下午三點前用表單預訂，五點半起門口取餐', not:'不上外送平台打折', l:{1:70, 3:4}, k:[['每週預訂份數', 0, 160, '份', 'week', '店長']], a:[['設計餐盒與預訂表單', '店長', '2027-02-01', '2027-03-15', 60000], ['附近三個社區試吃', '店長', '2027-03-20', '2027-06-30', 45000]]},
       {t:'剩料當天變成員工餐與小菜', how:'打烊前盤點，隔天備料扣掉剩量', not:'不為了好看多備料', l:{2:1.3, 3:7}, k:[['每日盤點完成率', 30, 95, '%', 'week', '二廚']], a:[['寫盤點表與備料公式', '二廚', '2027-01-10', '2027-02-10', 0]]}]})]; }},
  {id:'hom', cat:'shop', n:'🏡 民宿', make:function(){ return [ex('hom', '山腳民宿 2027 OGSM', {unit:'山腳民宿（虛構）', from:'2027-01-01', to:'2027-12-31', budget:500000, o:'讓帶小孩的家庭願意每年回來住一次',
    g:[['平日住房率', 34, 52, '%'], ['官網直接訂房占比', 18, 40, '%'], ['回頭客訂房數', 60, 130, '組', '', 'up', 'sum']],
    s:[{t:'平日改成親子兩天一夜行程', how:'固定三種行程：溪邊、農場、手作，含晚餐與備品', not:'平日不接大型團體', l:{1:14, 3:35}, k:[['平日行程預訂數', 4, 20, '組', 'month', '管家']], a:[['和農場與老師談合作', '老闆', '2027-01-06', '2027-03-15', 80000], ['拍攝行程照片與介紹', '管家', '2027-03-01', '2027-04-20', 60000]]},
       {t:'退房前約好下一次', how:'退房時給生日月優惠與優先選房，三個月後寄照片', not:'不發大量簡訊折扣', l:{2:9, 3:45}, k:[['退房時留下聯絡方式比例', 25, 80, '%', 'month', '櫃檯'], ['照片寄送完成率', 0, 95, '%', 'month', '管家']], a:[['製作回訪卡與流程', '櫃檯', '2027-01-15', '2027-02-28', 15000]]},
       {t:'官網給訂房平台沒有的房型組合', how:'官網獨家提供含行程與提早入住的組合', not:'不和平台比價格', l:{1:6, 2:15}, k:[['官網訂房頁轉換率', 1.2, 3, '%', 'month', '老闆']], a:[['改寫官網訂房流程', '老闆', '2027-02-01', '2027-05-15', 120000]]}]})]; }},
  {id:'sal', cat:'shop', n:'💇 美髮沙龍', make:function(){ return [ex('sal', '弧度髮廊 2027 OGSM', {unit:'弧度髮廊（虛構）', from:'2027-01-01', to:'2027-12-31', budget:300000, o:'成為自然捲的人不用再解釋就懂的髮廊',
    g:[['自然捲專屬服務營收', 90, 180, '萬元', '', 'up', 'sum'], ['指名回訪率', 48, 65, '%'], ['預約空檔率', 30, 18, '%', '', 'down']],
    s:[{t:'把自然捲做成專門科', how:'兩位設計師受訓，固定諮詢表與護理流程', not:'不接燙直為主的促銷客', l:{1:65, 2:9}, k:[['自然捲新客諮詢數', 12, 45, '人', 'month', '店長'], ['諮詢後成交比例', 40, 70, '%', 'month', '設計師組長']], a:[['完成兩位設計師訓練', '店長', '2027-01-10', '2027-04-30', 120000], ['寫諮詢表與護理卡', '設計師組長', '2027-02-01', '2027-03-20', 10000]]},
       {t:'剪完當天就約下一次', how:'依髮型週期給三個時段，七天前提醒', not:'不做隨到隨剪', l:{2:10, 3:8}, k:[['現場預約下次比例', 20, 60, '%', 'week', '櫃檯']], a:[['設定預約提醒', '櫃檯', '2027-01-15', '2027-02-15', 20000]]},
       {t:'每週一個真實前後對照', how:'客人同意後拍三張照，寫整理方法', not:'不用修圖過的模特兒照', l:{1:35, 3:6}, k:[['每月公開案例', 1, 4, '則', 'month', '設計師組長']], a:[['拍攝同意書與拍攝角落', '設計師組長', '2027-02-01', '2027-03-10', 30000]]}]})]; }},
  {id:'gym', cat:'shop', n:'🏋️ 健身工作室', make:function(){ return [ex('gym', '日常健身 2027 OGSM', {unit:'日常健身工作室（虛構）', from:'2027-01-01', to:'2027-12-31', budget:350000, o:'讓不喜歡健身房的人也願意固定動起來',
    g:[['會員續約率', 52, 70, '%'], ['每月活躍會員', 110, 170, '人'], ['教練離職人數', 4, 1, '人', '', 'down']],
    s:[{t:'前八週只求固定來', how:'每週兩次小班、同一位教練、缺席當天關心', not:'前八週不推高價課程', l:{1:11, 2:30}, k:[['新會員八週出席率', 45, 75, '%', 'week', '教練主管'], ['缺席當天聯絡率', 10, 90, '%', 'week', '櫃檯']], a:[['設計八週課表', '教練主管', '2027-01-05', '2027-02-20', 30000], ['教練說明與試跑', '教練主管', '2027-02-20', '2027-03-31', 20000]]},
       {t:'用小班同學留住人', how:'四到六人固定班，每月一次班級小聚', not:'不開大班追人數', l:{1:9, 2:35}, k:[['固定班平均人數', 2.5, 5, '人', 'month', '店長']], a:[['調整時段與分班', '店長', '2027-02-01', '2027-03-15', 0]]},
       {t:'讓教練有看得到的升級路', how:'三級制、每季面談、課綱共編', not:'不靠業績獎金當唯一誘因', l:{3:3.2}, k:[['每季面談完成率', 20, 100, '%', 'quarter', '店長']], a:[['寫教練分級辦法', '店長', '2027-01-15', '2027-03-31', 0]]}]})]; }},
  {id:'frm', cat:'brand', n:'🍊 小農品牌', make:function(){ return [ex('frm', '南坡果園 2027 OGSM', {unit:'南坡果園（虛構）', from:'2027-01-01', to:'2027-12-31', budget:450000, o:'讓吃過的人知道是哪片山種的，還想再買',
    g:[['直售營收占比', 25, 45, '%'], ['加工品營收', 40, 95, '萬元', '', 'up', 'sum'], ['次級果丟棄率', 22, 10, '%', '', 'down']],
    s:[{t:'把次級果做成果醬與果乾', how:'和合格工廠代工，小批量、標示採收日', not:'不自己蓋加工廠', l:{2:40, 3:9}, k:[['次級果加工比例', 10, 60, '%', 'month', '園主'], ['加工品試吃回購率', 12, 30, '%', 'month', '行銷']], a:[['找三家代工打樣', '園主', '2027-01-10', '2027-04-15', 120000], ['送檢與標示確認', '園主', '2027-04-15', '2027-06-15', 60000]]},
       {t:'預購整棵果樹的收成', how:'認養到採收每月寄照片，收成分兩批寄', not:'不在產季打價格戰', l:{1:13, 2:12}, k:[['認養果樹數', 15, 80, '棵', 'month', '行銷']], a:[['設計認養方案與照片流程', '行銷', '2027-02-01', '2027-04-30', 50000]]},
       {t:'每月一封果園信', how:'寫當月農事、價格為什麼這樣、怎麼挑', not:'不發只有折扣的訊息', l:{1:9, 2:10, 3:4}, k:[['果園信訂閱數', 300, 1500, '人', 'month', '行銷']], a:[['排好十二個月主題', '行銷', '2027-01-05', '2027-01-31', 0]]}]})]; }},
  {id:'saa', cat:'brand', n:'💻 軟體新創', make:function(){ return [ex('saa', '排好了 2027 OGSM', {unit:'排好了（虛構的排班軟體）', from:'2027-01-01', to:'2027-12-31', budget:3000000, o:'讓小店老闆不用再為排班熬夜',
    g:[['付費店家數', 120, 400, '家'], ['每月流失率', 6, 2.5, '%', '', 'down'], ['首次排班完成時間', 45, 10, '分鐘', '', 'down']],
    s:[{t:'先服務連鎖早餐與飲料店', how:'內建兩種業態的班別範本，匯入名單即可排', not:'不做餐飲以外的產業', l:{1:170, 3:22}, k:[['試用店家數', 30, 120, '家', 'month', '業務'], ['試用轉付費率', 12, 28, '%', 'month', '業務']], a:[['整理兩種業態範本', '產品經理', '2027-01-04', '2027-03-15', 300000], ['拜訪二十家店做測試', '業務', '2027-02-01', '2027-04-30', 120000]]},
       {t:'把第一次排班壓到十分鐘內', how:'開通時陪老闆排完一週，卡住的地方每週修', not:'上半年不加新模組', l:{2:2, 3:15}, k:[['陪跑完成率', 20, 90, '%', 'week', '客戶成功'], ['每週修掉的卡點', 1, 4, '個', 'week', '產品經理']], a:[['設計陪跑流程', '客戶成功', '2027-01-10', '2027-02-28', 80000]]},
       {t:'讓店家介紹店家', how:'介紹成功兩邊各延一個月，店長社團每月一題', not:'不投大量廣告', l:{1:130, 2:1.8}, k:[['每月介紹數', 2, 25, '家', 'month', '行銷']], a:[['建好介紹碼與社團', '行銷', '2027-02-15', '2027-04-15', 150000]]}]})]; }},
  {id:'slp', cat:'dept', n:'🤝 B2B 業務部（含下一層區域組）', make:function(){
    var p = ex('slp', '業務部 2027 OGSM', {unit:'晟達設備業務部（虛構）', from:'2027-01-01', to:'2027-12-31', budget:1500000, o:'成為中型工廠換設備時第一個打電話的人',
      g:[['年度接單金額', 8000, 10500, '萬元', '', 'up', 'sum'], ['老客戶加購率', 22, 35, '%'], ['平均成交天數', 96, 70, '天', '', 'down']],
      s:[{t:'專攻三個產業的汰換需求', how:'鎖定食品、塑膠、金屬加工，建立設備年限名單', not:'不追公開標案的低價案', l:{1:1500, 3:12}, k:[['汰換名單完成家數', 40, 300, '家', 'month', '業務經理'], ['每月有效拜訪', 35, 90, '次', 'month', '業務經理']], a:[['整理設備年限名單', '業務助理', '2027-01-04', '2027-03-31', 100000], ['三份產業案例資料', '業務經理', '2027-02-01', '2027-04-30', 150000]]},
         {t:'交機後第九十天回訪', how:'工程師和業務一起去，帶使用數據與改善建議', not:'不把回訪外包給客服', l:{1:900, 2:15}, k:[['第九十天回訪完成率', 25, 95, '%', 'month', '售服主管']], a:[['寫回訪檢查表', '售服主管', '2027-01-15', '2027-02-26', 0]]},
         {t:'報價三天內到客戶手上', how:'標準品用模組化報價，特殊品當天回覆時程', not:'不做沒有需求確認的客製報價', l:{1:350, 3:16}, k:[['三天內報價比例', 30, 85, '%', 'week', '業務助理']], a:[['整理報價模組', '業務助理', '2027-02-01', '2027-05-31', 200000]]}]});
    var c = cascade(p, 'sslp1', '南區業務組'); c.id = 'pslpb'; c.name = '南區業務組・三產業汰換'; c.o = '讓南區的工廠在設備故障之前就想到我們';
    c.goals.forEach(function(g, i){ g.id = 'gslpb' + (i + 1); });
    c.strats = [newStrat({id:'sslpb1', t:'跟著保養廠一起找名單', how:'和三家保養廠交換設備年限資訊，成交給服務單', not:'不買名單', links:{gslpb1:180, gslpb2:25}, kpis:[newKpi({id:'kslpb1x1', t:'保養廠提供的家數', base:0, target:150, unit:'家', freq:'month', owner:'南區組長'})], acts:[newAct({id:'aslpb1x1', t:'談三家保養廠合作', owner:'南區組長', from:'2027-01-10', to:'2027-03-31', cost:30000})]}),
      newStrat({id:'sslpb2', t:'每週固定兩天跑同一個工業區', how:'先約好再去，一天六家，當晚更新名單', not:'不臨時繞路拜訪', links:{gslpb1:110, gslpb2:35}, kpis:[newKpi({id:'kslpb2x1', t:'每週事前約好的拜訪', base:4, target:12, unit:'次', freq:'week', owner:'南區業務'})], acts:[newAct({id:'aslpb2x1', t:'排好全年工業區輪訪表', owner:'南區業務', from:'2027-01-05', to:'2027-01-31'})]})];
    return [p, c]; }},
  {id:'hrd', cat:'dept', n:'👥 人資部（含每月追蹤）', make:function(){
    var p = ex('hrd', '人資部 2026 OGSM', {unit:'禾新科技人資部（虛構）', from:'2026-01-01', to:'2026-12-31', budget:900000, o:'讓新人三個月後還想留下來',
      g:[['新人三個月留任率', 70, 88, '%'], ['職缺平均補滿天數', 62, 40, '天', '', 'down'], ['全年自願離職人數', 36, 24, '人', '', 'down', 'sum']],
      s:[{t:'把前九十天設計成一段旅程', how:'第一天、第一週、第一個月、第三個月各有主管要做的事', not:'不用一天講完所有制度', l:{1:13, 3:8}, k:[['主管完成四次面談比例', 20, 90, '%', 'month', '人資專員'], ['新人第三十天滿意度', 3.6, 4.4, '分', 'month', '人資專員']], a:[['寫四次面談指引', '人資專員', '2026-01-05', '2026-02-13', 20000, 'done'], ['主管工作坊三場', '人資主管', '2026-03-01', '2026-06-30', 150000, 'done'], ['第三季檢討並改版', '人資主管', '2026-10-01', '2026-11-30', 0, 'doing']]},
         {t:'先寫清楚要解決什麼問題再徵人', how:'每個職缺一頁任務說明，用人主管當面確認', not:'不接只有職稱的開缺單', l:{1:6, 2:14}, k:[['任務說明完成率', 15, 95, '%', 'month', '招募專員'], ['面試到錄取天數', 24, 14, '天', 'month', '招募專員', 1, 'down']], a:[['設計一頁任務說明', '招募專員', '2026-01-10', '2026-02-10', 0, 'done']]},
         {t:'同仁介紹同仁', how:'介紹後兩天內回覆進度，到職滿三個月雙方有獎', not:'不加開人力銀行廣告', l:{2:10, 3:5}, k:[['每月介紹人選', 3, 12, '人', 'month', '招募專員']], a:[['公布介紹辦法', '人資主管', '2026-02-01', '2026-03-05', 200000, 'done']]}]});
    var rows = {ghrd1:[70, 70, 72, 74, 76, 78, 79, 81, 83, 84], ghrd2:[62, 60, 59, 57, 54, 52, 50, 49, 47, 46], ghrd3:[4, 3, 3, 2, 2, 2, 1, 2, 2, 1], khrd1x1:[20, 35, 50, 62, 70, 74, 78, 82, 85, 86], khrd1x2:[3.6, 3.6, 3.8, 3.9, 4, 4.1, 4.1, 4.2, 4.3, 4.3], khrd2x1:[15, 40, 60, 72, 80, 85, 88, 90, 92, 93], khrd2x2:[24, 23, 22, 21, 20, 19, 18, 18, 17, 17], khrd3x1:[3, 3, 4, 5, 6, 6, 6, 7, 7, 7]};
    for(var m = 1; m <= 10; m++){ var ym = '2026-' + ('0' + m).slice(-2), v = {}; Object.keys(rows).forEach(function(k){ v[k] = rows[k][m - 1]; }); p.logs[ym] = {v:v, note:m === 10 ? '介紹人選停在七人左右，下個月訪談三位常介紹的同仁，了解卡在哪。' : ''}; }
    return [p]; }},
  {id:'npo', cat:'org', n:'🏘 社區協會', make:function(){ return [ex('npo', '溪口社區 2027 OGSM', {unit:'溪口社區發展協會（虛構）', from:'2027-01-01', to:'2027-12-31', budget:250000, o:'讓社區的長輩每週都有一個想出門的理由',
    g:[['每週固定出席長輩', 28, 60, '人'], ['穩定服務的志工', 9, 20, '人'], ['自籌經費占比', 12, 30, '%']],
    s:[{t:'一個據點改成三個鄰近的點', how:'借用廟埕、里辦公處、雜貨店，各排一天，走路十分鐘內', not:'不辦一次性的大型活動', l:{1:22, 2:4}, k:[['每週開放天數', 2, 5, '天', 'week', '總幹事'], ['第一次來的長輩', 2, 8, '人', 'month', '志工組長']], a:[['談好三個場地', '總幹事', '2027-01-05', '2027-02-28', 20000]]},
       {t:'讓志工先從一小時做起', how:'拆成陪走、拍照、備餐等一小時任務，自己選', not:'不要求全天值班', l:{1:12, 2:8}, k:[['每月登記任務數', 10, 50, '件', 'month', '志工組長']], a:[['整理一小時任務清單', '志工組長', '2027-01-15', '2027-02-20', 0]]},
       {t:'把長輩手藝變成小攤', how:'每月一次市集，醃菜、縫補、春聯，收入一半回協會', not:'不賣轉手批來的商品', l:{3:20}, k:[['每月參與手藝的長輩', 4, 18, '人', 'month', '總幹事']], a:[['排好全年市集日期', '總幹事', '2027-02-01', '2027-03-10', 40000]]}]})]; }},
  {id:'lif', cat:'org', n:'🌱 個人年度計畫', make:function(){ return [ex('lif', '我的 2027 年', {unit:'個人（虛構）', from:'2027-01-01', to:'2027-12-31', budget:60000, o:'把時間留給重要的人，也留給自己想學的事',
    g:[['每週準時下班天數', 1, 4, '天'], ['陪家人的整天', 10, 30, '天', '', 'up', 'sum'], ['完成的個人作品', 0, 6, '件', '', 'up', 'sum']],
    s:[{t:'把每天第一個小時留給最難的事', how:'九點前不開信箱，先做當天最重要的一件', not:'早上不排沒有議題的會', l:{1:2, 3:3}, k:[['守住第一小時的天數', 1, 4, '天', 'week', '自己']], a:[['和主管說明早上的安排', '自己', '2027-01-04', '2027-01-15', 0]]},
       {t:'先把家人日排進行事曆', how:'每季初一次排好，臨時工作改約其他天', not:'週末不接案', l:{1:1, 2:22}, k:[['已排定的家人日', 0, 8, '天', 'quarter', '自己']], a:[['第一季先排八天', '自己', '2027-01-01', '2027-01-10', 0]]},
       {t:'每兩個月交一件小作品', how:'選小題目、公開發表，請三個朋友看', not:'不同時學兩樣東西', l:{3:3.5}, k:[['每週動手時數', 1, 4, '小時', 'week', '自己']], a:[['列出六個小題目', '自己', '2027-01-05', '2027-01-31', 5000]]}]})]; }},
  {id:'bd2', cat:'drill', n:'🧮 看起來完整、其實補不滿（練習缺口）', make:function(){ return [ex('bd2', '文具品牌 2027 二稿', {unit:'禾紙文具（虛構）', from:'2027-01-01', to:'2027-12-31', budget:500000, o:'讓上班族願意為一本好筆記本多等三天',
    g:[['官網營收', 600, 1200, '萬元', '', 'up', 'sum'], ['回購率', 18, 30, '%'], ['退貨率', 5, 3, '%', '', 'down'], ['企業客製訂單', 6, 20, '筆', '', 'up', 'sum']],
    s:[{t:'推出月訂閱筆記本', how:'每月一個主題封面，可跳過不可打折', not:'不做單次大促', l:{1:200, 2:6}, k:[['訂閱人數', 0, 800, '人', 'month', '品牌經理']], a:[['設計三個月的封面', '設計師', '2027-01-05', '2027-03-15', 120000]]},
       {t:'找插畫家聯名', how:'一季一位，限量編號，附創作故事', not:'不找只有流量的名人', l:{1:180, 2:''}, k:[['聯名款銷量', 300, 1200, '本', 'quarter', '品牌經理', 0]], a:[['談好四位插畫家', '品牌經理', '2027-01-10', '2027-04-30', 200000]]},
       {t:'出貨前多一道檢查', how:'抽查改全檢，拍照留存', not:'不趕當日出貨', l:{3:6}, k:[['出貨全檢率', 20, 100, '%', 'week', '倉管']], a:[['寫檢查表', '倉管', '2027-01-05', '2027-01-31', 0]]}]})]; }},
  {id:'bad', cat:'drill', n:'🩺 有問題的初稿（練習健檢）', make:function(){ return [ex('bad', '社群行銷部 2027 初稿', {unit:'社群行銷部（虛構）', from:'2027-01-01', to:'2027-12-31', budget:200000, o:'追求卓越、成為第一品牌、服務全方位、粉絲成長 50%，永續經營',
    g:[['粉絲數', 12000, 30000, '人'], ['舉辦線上活動', '', 12, '場'], ['互動率', 3, 2, '%'], ['官網導流', 800, 2000, '次', '2028-03-31']],
    s:[{t:'持續優化貼文內容', l:{1:5000}, k:[['粉絲數', 12000, 30000, '人', 'month', '', 0]], a:[['每天發文', '', '', '']]},
       {t:'加強廣告投放', l:{1:6000}, k:[['廣告點擊', '', '', '次', 'month', '小編', 0]], a:[['投放全年廣告', '小編', '2027-01-01', '2028-02-28', 260000]]},
       {t:'經營短影音', how:'一週兩支，三十秒內講一個觀念', l:{}, k:[], a:[]}]})]; }}
];
function example(id){ for(var i = 0; i < EXAMPLES.length; i++) if(EXAMPLES[i].id === id) return EXAMPLES[i].make(); return null; }

var API = {LIM:LIM, FREQ:FREQ, ST:ST, STATUS:STATUS, KIND:KIND, EXAMPLES:EXAMPLES, EX_CATS:EX_CATS, example:example, has:has, fmt:fmt, esc:esc, norm:norm, isDate:isDate, isYm:isYm, monthEnd:monthEnd, nextYm:nextYm, numOr:numOr, str:str,
  newGoal:newGoal, newKpi:newKpi, newAct:newAct, newStrat:newStrat, newPlan:newPlan, blankPlan:blankPlan, sanitizePlan:sanitizePlan, sanitize:sanitize, clone:clone, removeGoal:removeGoal, planById:planById, kpisOf:kpisOf, actsOf:actsOf, labels:labels, linkText:linkText,
  coverage:coverage, hasTargetNumber:hasTargetNumber, check:check, score:score, costOf:costOf, snap:snap, cascade:cascade, childrenOf:childrenOf, cascadeIssues:cascadeIssues, syncFromParent:syncFromParent, tree:tree,
  months:months, frac:frac, valueAt:valueAt, progress:progress, expAt:expAt, series:series, summary:summary, overdue:overdue, actStats:actStats,
  measureText:measureText, toText:toText, csvCell:csvCell, toCsv:toCsv, toDoc:toDoc, sharePlan:sharePlan,
  draftPrompt:draftPrompt, rewritePrompt:rewritePrompt, advicePrompt:advicePrompt, reviewPrompt:reviewPrompt, cleanAi:cleanAi, cleanOptions:cleanOptions};
if(typeof module !== 'undefined' && module.exports) module.exports = API; else root.OSP = API;
})(this);
