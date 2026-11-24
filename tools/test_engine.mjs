// node tools/test_engine.mjs
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../data.js');
let n = 0, bad = 0;
const near = (a, b, e = 1e-6) => a === b || Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
function eq(name, got, want){ n++; const ok = typeof want === 'number' && typeof got === 'number' ? near(got, want) : JSON.stringify(got) === JSON.stringify(want); if(!ok){ bad++; console.log('✗', name, '\n  得到', got, '\n  應為', want); } }
function ok(name, cond, extra){ n++; if(!cond){ bad++; console.log('✗', name, extra === undefined ? '' : extra); } }
const codes = (p, ps) => M.check(p, ps).map(i => i.code);

// 一份沒有問題的最小 OGSM
function good(){
  return M.sanitizePlan({id:'pgood', name:'測試', from:'2027-01-01', to:'2027-12-31', budget:100, o:'成為附近上班族最信任的早餐店',
    goals:[{id:'g1', t:'回購率', base:20, target:40, unit:'%', due:'2027-12-31'}],
    strats:[{id:'s1', t:'做一週三次的習慣卡', how:'', not:'不打折', links:{g1:22},
      kpis:[{id:'k1', t:'新發卡數', base:0, target:100, unit:'張', owner:'店長', lead:true}],
      acts:[{id:'a1', t:'印卡', owner:'店長', from:'2027-01-01', to:'2027-02-01', cost:100}]}]});
}
eq('最小 OGSM 沒有燈號', codes(good()), []);
eq('滿分', M.score([]).v, 100);

// ── 健檢：每條規則各觸發一次 ──
const T = [
  ['period', p => { p.from = ''; }], ['periodRev', p => { p.from = '2028-01-01'; }],
  ['oEmpty', p => { p.o = ' '; }], ['oShort', p => { p.o = '變更好'; }], ['oLong', p => { p.o = '很'.repeat(61); }],
  ['oNumber', p => { p.o = '讓營收成長 30% 的早餐店'; }], ['oSlogan', p => { p.o = '追求卓越的早餐店團隊'; }], ['oMany', p => { p.o = '好吃、便宜、快速、親切的早餐店'; }],
  ['gNone', p => { p.goals = []; }], ['gMany', p => { for(let i = 0; i < 5; i++) p.goals.push(M.newGoal({t:'x' + i})); }],
  ['gEmpty', p => { p.goals[0].t = ''; }], ['gDup', p => { p.goals.push(M.newGoal({t:'回 購率'})); }], ['gActivity', p => { p.goals[0].t = '舉辦活動'; }],
  ['gTarget', p => { p.goals[0].target = ''; }], ['gBase', p => { p.goals[0].base = ''; }], ['gUnit', p => { p.goals[0].unit = ''; }],
  ['gDue', p => { p.goals[0].due = ''; }], ['gDueOut', p => { p.goals[0].due = '2028-01-01'; }], ['gDir', p => { p.goals[0].dir = 'down'; }],
  ['gFlat', p => { p.goals[0].target = 20; }], ['gGuess', p => { p.goals[0].guess = true; }],
  ['sNone', p => { p.strats = []; }], ['sMany', p => { for(let i = 0; i < 5; i++) p.strats.push(M.newStrat({t:'y' + i})); }],
  ['sEmpty', p => { p.strats[0].t = ''; }], ['sDup', p => { p.strats.push(M.newStrat({t:'做一週三次的習慣卡！'})); }], ['sVague', p => { p.strats[0].t = '持續加強服務'; }],
  ['sNumber', p => { p.strats[0].t = '回購率達到 40'; }], ['sNot', p => { p.strats[0].not = ''; }], ['sNoLink', p => { p.strats[0].links = {}; }],
  ['mNone', p => { p.strats[0].kpis = []; }], ['mLag', p => { p.strats[0].kpis[0].lead = false; }], ['mEmpty', p => { p.strats[0].kpis[0].t = ''; }],
  ['mCopy', p => { p.strats[0].kpis[0].t = '回購率'; }], ['mTarget', p => { p.strats[0].kpis[0].target = ''; }], ['mUnit', p => { p.strats[0].kpis[0].unit = ''; }],
  ['mOwner', p => { p.strats[0].kpis[0].owner = ''; }], ['mDir', p => { p.strats[0].kpis[0].dir = 'down'; }], ['mGuess', p => { p.strats[0].kpis[0].guess = true; }],
  ['aNone', p => { p.strats[0].acts = []; }], ['aEmpty', p => { p.strats[0].acts[0].t = ''; }], ['aOwner', p => { p.strats[0].acts[0].owner = ''; }],
  ['aDue', p => { p.strats[0].acts[0].to = ''; }], ['aRev', p => { p.strats[0].acts[0].from = '2027-03-01'; }], ['aLate', p => { p.strats[0].acts[0].to = '2028-01-01'; }],
  ['cNone', p => { p.strats[0].links = {}; }], ['cShort', p => { p.strats[0].links.g1 = 15.9; }], ['cNear', p => { p.strats[0].links.g1 = 16; }],
  ['cUnest', p => { p.strats[0].links.g1 = ''; }], ['cOver', p => { p.strats[0].links.g1 = 31; }],
  ['budget', p => { p.budget = 99; }],
  ['ownerLoad', p => { for(let i = 0; i < 7; i++) p.strats[0].acts.push(M.newAct({t:'z' + i, owner:'店長', to:'2027-02-01'})); }]
];
for(const [c, f] of T){ const p = good(); f(p); ok('健檢抓到 ' + c, codes(p).includes(c), codes(p)); }
ok('缺口剛好補滿不報', !codes((() => { const p = good(); p.strats[0].links.g1 = 20; return p; })()).some(c => c[0] === 'c'));
ok('1.5 倍不算過度樂觀', !codes((() => { const p = good(); p.strats[0].links.g1 = 30; return p; })()).includes('cOver'));
ok('負責 8 項不報', !codes((() => { const p = good(); for(let i = 0; i < 6; i++) p.strats[0].acts.push(M.newAct({t:'z' + i, owner:'店長', to:'2027-02-01'})); return p; })()).includes('ownerLoad'));
ok('做完的行動不算負荷', !codes((() => { const p = good(); for(let i = 0; i < 9; i++) p.strats[0].acts.push(M.newAct({t:'z' + i, owner:'店長', to:'2027-02-01', st:'done'})); return p; })()).includes('ownerLoad'));
ok('紅燈排前面', (() => { const l = M.check(M.example('bad')[0]).map(i => i.lv); return l.lastIndexOf('bad') < l.indexOf('warn'); })());
ok('負責人叫 constructor 不出錯', Array.isArray((() => { const p = good(); p.strats[0].acts[0].owner = 'constructor'; p.goals[0].t = '__proto__'; p.strats[0].t = 'toString'; return M.check(p); })()));

// O 的數字判斷：年份、期限、名稱裡的數字不算
for(const t of ['三年內成為社區最愛的店', '2027 年讓長輩敢自己搭車', '成為第 1 個想到的店', '服務 B2B 客戶的好夥伴', '成長為更好的團隊', '一成不變的事交給機器']) ok('不算目標數字：' + t, !M.hasTargetNumber(t), t);
for(const t of ['成長 30%', '營收兩倍', '提高三成', '賺 500 萬', '達到十億']) ok('算目標數字：' + t, M.hasTargetNumber(t));

// 分數：同一種問題最多扣兩次
eq('同碼扣兩次', M.score([1, 2, 3, 4].map(() => ({lv:'bad', code:'x'}))).v, 84);
eq('黃燈扣 3', M.score([{lv:'warn', code:'a'}, {lv:'bad', code:'b'}]).v, 89);
eq('最低 0', M.score(Array.from({length:40}, (_, i) => ({lv:'bad', code:'c' + i}))).v, 0);

// ── 缺口 ──
let g = {id:'g1', base:9, target:4, dir:'down'};
eq('越低越好的缺口', M.coverage({strats:[{links:{g1:3}}]}, g), {gap:5, sum:3, ratio:.6, short:2, linked:1, unest:0, st:'short'});
eq('沒起點不算缺口', M.coverage({strats:[{links:{g1:3}}]}, {id:'g1', base:'', target:4, dir:'up'}).st, 'na');
eq('部分沒估但已夠', M.coverage({strats:[{links:{g1:5}}, {links:{g1:''}}]}, g).st, 'ok');
eq('浮點加總 0.2+0.25 補 0.4', M.coverage({strats:[{links:{g1:.2}}, {links:{g1:.2}}]}, {id:'g1', base:4.2, target:4.6, dir:'up'}).st, 'ok');

// ── 進度（手算）──
const P = {from:'2027-01-01', to:'2027-12-31', logs:{}};
eq('全年第一個月 31/365', M.frac(P, '', '2027-01'), 31 / 365);
eq('期限前走完', M.frac(P, '2027-06-30', '2027-07'), 1);
eq('閏年二月底', M.monthEnd('2028-02'), '2028-02-29');
eq('跨年下個月', M.nextYm('2027-12'), '2028-01');
const lv = {id:'g1', base:20, target:40, dir:'up', acc:'level', due:''};
const at = (v, it, ym = '2027-06') => M.progress({...P, logs:{[ym]:{v:{g1:v}}}}, it, ym);
const e6 = 181 / 365; // 1～6 月共 181 天
eq('應達值', at(30, lv).exp, 20 + 20 * e6);
eq('正常', at(30, lv).st, 'ok'); eq('超前', at(31, lv).st, 'ahead'); eq('稍落後', at(27.5, lv).st, 'warn'); eq('落後', at(25, lv).st, 'bad'); eq('達標', at(40, lv).st, 'done'); eq('倒退', at(10, lv).st, 'bad');
const dn = {id:'g1', base:9, target:4, dir:'down', acc:'level', due:''};
eq('越低越好：進度比例', at(6.5, dn).f, .5); eq('越低越好：正常', at(6.5, dn).st, 'ok'); eq('越低越好：達標', at(3, dn).st, 'done'); eq('越低越好：變更糟', at(11, dn).st, 'bad');
const keep = {id:'g1', base:90, target:90, dir:'up', acc:'level', due:''};
eq('維持型達標', at(91, keep).st, 'done'); eq('維持型沒到', at(89, keep).st, 'bad');
eq('起點空白沒有燈', at(30, {...lv, base:''}).st, 'na'); eq('目標空白沒有燈', at(30, {...lv, target:''}).st, 'na');
// 累計型：1～3 月 100、0、50，目標 1200
const sm = {id:'g1', base:800, target:1200, dir:'up', acc:'sum', due:''};
let r = M.progress({...P, logs:{'2027-01':{v:{g1:100}}, '2027-02':{v:{g1:0}}, '2027-03':{v:{g1:200}}}}, sm, '2027-03');
eq('累計加總', r.actual, 300); eq('累計應達 1200×90/365', r.exp, 1200 * 90 / 365); eq('累計正常', r.st, 'ok'); eq('沒有缺月', r.missing, 0);
r = M.progress({...P, logs:{'2027-01':{v:{g1:100}}, '2027-03':{v:{g1:200}}}}, sm, '2027-05');
eq('缺一個月', r.missing, 1); eq('資料到三月', r.ym, '2027-03');
const cap = {id:'g1', base:24, target:12, dir:'down', acc:'sum', due:''};
eq('累計上限：沒超過', at(5, cap).st, 'ok'); eq('累計上限：略超', at(6.3, cap).st, 'warn'); eq('累計上限：超過', at(9, cap).st, 'bad');
eq('累計目標 0 沒有燈', at(5, {...cap, target:0}).st, 'na');
eq('期間外的月份不算', M.progress({...P, logs:{'2026-12':{v:{g1:30}}}}, lv, '2027-03').st, 'na');
eq('未來月份不偷看', M.progress({...P, logs:{'2027-09':{v:{g1:30}}}}, lv, '2027-03').st, 'na');
eq('沒有起始日', M.progress({from:'', to:'', logs:{'2027-01':{v:{g1:30}}}}, lv, '2027-03').st, 'na');
// 跨年期間
const X = {from:'2026-07-01', to:'2027-06-30', logs:{'2026-12':{v:{g1:30}}, '2027-01':{v:{g1:31}}}};
eq('跨年月份數', M.months(X).length, 12);
eq('跨年進度 184/365', M.frac(X, '', '2026-12'), 184 / 365);
eq('跨年取最新月', M.progress(X, lv, '2027-03').actual, 31);
eq('走勢點數', M.series(X, lv).filter(s => s.v != null).length, 2);

// ── 展開與斷鏈 ──
let up = good(), ch = M.cascade(up, 's1', '早班');
let ps = M.sanitize({plans:[up, ch]}).plans; up = ps[0]; ch = ps[1];
eq('S 變 O', ch.o, '做一週三次的習慣卡'); eq('M 變 G', [ch.goals[0].t, ch.goals[0].target, ch.goals[0].due], ['新發卡數', 100, '2027-12-31']);
eq('剛展開沒有斷鏈', M.cascadeIssues(up, ps).concat(M.cascadeIssues(ch, ps)), []);
up.strats[0].kpis[0].target = 150;
eq('上層改數字 → 下層提醒', M.cascadeIssues(ch, ps).map(i => i.code), ['srcChanged']);
eq('同步改一個', M.syncFromParent(ch, ps), 1); eq('同步後的數字', ch.goals[0].target, 150); eq('同步後沒有提醒', M.cascadeIssues(ch, ps), []);
up.strats[0].kpis.push(M.newKpi({t:'回流數', target:5}));
eq('上層多一個指標沒人接', M.cascadeIssues(up, ps).map(i => i.code), ['dropped']);
eq('補上缺少的目標', [M.syncFromParent(ch, ps), ch.goals.length], [1, 2]);
eq('兩個下層時別人接了就不重複補', (() => { const c2 = M.cascade(up, 's1', '晚班'); c2.goals = []; ps.push(c2); const k = M.syncFromParent(c2, ps); ps.pop(); return k; })(), 0);
up.strats[0].kpis.shift();
eq('上層指標刪掉', M.cascadeIssues(ch, ps).map(i => i.code), ['srcGone']);
ch.to = '2028-01-31'; ok('下層比上層晚結束', M.cascadeIssues(ch, ps).some(i => i.code === 'childLate'));
up.strats = []; eq('上層策略刪掉', M.cascadeIssues(ch, ps).map(i => i.code), ['parentGone']);
eq('沒有上層時同步回 0', M.syncFromParent(good(), []), 0);
eq('樹', M.tree(ps).map(x => [x.p.id, x.kids.length]), [['pgood', 1]]);
eq('互為上下層會拆開', M.sanitize({plans:[{id:'pa', parent:{plan:'pb', s:'s1'}}, {id:'pb', parent:{plan:'pa', s:'s1'}}]}).plans.filter(p => p.parent).length, 1);
eq('自己當上層會拆開', M.sanitize({plans:[{id:'pa', parent:{plan:'pa', s:'s1'}}]}).plans[0].parent, null);
eq('上層不存在', M.sanitize({plans:[{id:'pa', parent:{plan:'pz', s:'s1'}}]}).plans[0].parent, null);

// ── 整理、複製、刪除 ──
for(const x of [null, 1, 'a', [], {plans:'x'}, {plans:[null, 1, []]}, {plans:[{goals:[{links:1}], strats:[{links:[1], kpis:{}, acts:'x'}], logs:[1]}]}, {cur:'constructor'}]) ok('怪輸入不出錯', Array.isArray(M.sanitize(x).plans), x);
eq('壞值整理', (() => { const p = M.sanitizePlan({from:'2027-02-30', to:'x', budget:-1, goals:[{base:'abc', target:'12', dir:'zz', due:'2027-13-01'}]}); return [p.from, p.to, p.budget, p.goals[0].base, p.goals[0].target, p.goals[0].dir, p.goals[0].due]; })(), ['', '', '', '', 12, 'up', '']);
eq('重複 id 會換新', new Set(M.sanitizePlan({goals:[{id:'g1'}, {id:'g1'}]}).goals.map(x => x.id)).size, 2);
eq('連到不存在的目標會拿掉', M.sanitizePlan({goals:[{id:'g1'}], strats:[{links:{g1:5, g9:1, __proto__:2}}]}).strats[0].links, {g1:5});
eq('負貢獻變空白', M.sanitizePlan({goals:[{id:'g1'}], strats:[{links:{g1:-5}}]}).strats[0].links, {g1:''});
const src = M.example('cof')[0], cp = M.clone(src, '副本');
ok('複製換掉所有 id', !JSON.stringify(cp).includes('gcof1') && !JSON.stringify(cp).includes('kcof1x1'));
eq('複製後進度相同', M.progress(cp, cp.goals[0], '2026-10').actual, M.progress(src, src.goals[0], '2026-10').actual);
eq('複製後缺口相同', M.coverage(cp, cp.goals[0]), M.coverage(src, src.goals[0]));
M.removeGoal(cp, cp.goals[0].id); ok('刪目標連結一起拿掉', cp.strats.every(s => Object.keys(s.links).every(k => cp.goals.some(x => x.id === k))));

// ── 目標樹：大 G → 次目標 g ──
function treePlan(roll = 'sum'){
  return M.sanitizePlan({id:'ptree', from:'2027-01-01', to:'2027-12-31', o:'成為附近上班族最信任的早餐店', goals:[
    {id:'gb', t:'門市', base:100, target:180, unit:'萬元', up:'ga', acc:'sum', due:'2027-12-31'},
    {id:'ga', t:'營收', base:150, target:300, unit:'萬元', roll, acc:'sum', due:'2027-12-31'},
    {id:'gc', t:'外送', base:50, target:120, unit:'萬元', up:'ga', roll:'sum', acc:'sum', due:'2027-12-31'},
    {id:'gd', t:'午餐外送', base:20, target:60, unit:'萬元', up:'gc', acc:'sum', due:'2027-12-31'},
    {id:'ge', t:'晚餐外送', base:30, target:60, unit:'萬元', up:'gc', acc:'sum', due:'2027-12-31'},
    {id:'gz', t:'滿意度', base:4, target:4.5, unit:'分', due:'2027-12-31'}],
    strats:[{id:'s1', t:'甲', links:{gb:80, gz:.5}}, {id:'s2', t:'乙', links:{gd:40, ge:30}}]});
}
let tp = treePlan();
eq('照樹的順序排', tp.goals.map(x => x.id), ['ga', 'gb', 'gc', 'gd', 'ge', 'gz']);
eq('編號', tp.goals.map(x => M.labels(tp)[x.id]), ['G1', 'g1.1', 'g1.2', 'g1.2.1', 'g1.2.2', 'G2']);
eq('層數', tp.goals.map(x => M.depthOf(tp, x)), [0, 1, 1, 2, 2, 0]);
eq('加總型缺口往上彙總（兩層）', [M.coverage(tp, tp.goals[0]).sum, M.coverage(tp, tp.goals[0]).gap, M.coverage(tp, tp.goals[0]).st], [150, 150, 'ok']);
eq('中層也彙總', M.coverage(tp, tp.goals[2]).sum, 70);
eq('次目標合計', [M.subSum(tp, tp.goals[0]).st, M.subSum(tp, tp.goals[0]).total], ['ok', 300]);
tp.goals[1].target = 150; eq('合計不足 10% 黃燈', [M.subSum(tp, tp.goals[0]).st, M.subSum(tp, tp.goals[0]).diff], ['warn', 30]); ok('健檢抓到合計不足', codes(tp).includes('gSubShort'));
tp.goals[1].target = 100; eq('合計不足超過 20% 紅燈', M.subSum(tp, tp.goals[0]).st, 'bad');
tp.goals[1].unit = '%'; eq('單位不同不能加', M.subSum(tp, tp.goals[0]).st, 'mix'); ok('健檢抓到不能加總', codes(tp).includes('gSubMix'));
tp.goals[1].unit = '萬元'; tp.goals[1].acc = 'level'; eq('數字類型不同不能加', M.subSum(tp, tp.goals[0]).st, 'mix');
tp = treePlan(); tp.goals[1].target = ''; eq('次目標沒填完', M.subSum(tp, tp.goals[0]).st, 'na');
{ const d = M.sanitizePlan({goals:[{id:'ga', t:'成本', base:100, target:80, dir:'down', roll:'sum', unit:'萬'}, {id:'gb', t:'a', target:50, dir:'down', up:'ga', unit:'萬'}, {id:'gc', t:'b', target:40, dir:'down', up:'ga', unit:'萬'}]}); eq('越低越好：合計超過', [M.subSum(d, d.goals[0]).st, M.subSum(d, d.goals[0]).diff], ['warn', 10]); d.goals[1].target = 30; eq('越低越好：合計沒超過', M.subSum(d, d.goals[0]).st, 'ok'); }
tp = treePlan('drive'); eq('帶動型：次目標都補得滿', M.coverage(tp, tp.goals[0]).st, 'via'); eq('帶動型不看合計', M.subSum(tp, tp.goals[0]), null);
tp.strats[0].links = {gz:.5}; eq('帶動型：有次目標沒人支援', M.coverage(tp, tp.goals[0]).st, 'viaBad');
tp.strats = []; eq('帶動型：全都沒人支援', M.coverage(tp, tp.goals[0]).st, 'none');
tp = treePlan(); tp.strats.forEach(x => { x.links = {}; }); eq('沒人支援只標在葉子與沒有次目標的 G', M.check(tp).filter(i => i.code === 'cNone').map(i => i.at), ['g1.1', 'g1.2.1', 'g1.2.2', 'G2']);
tp = treePlan(); M.removeGoal(tp, 'ge'); ok('只剩一個次目標', codes(tp).includes('gSubOne'));
tp = treePlan(); for(let i = 0; i < 4; i++) tp.goals.push(M.newGoal({t:'t' + i, up:'ga'})); M.orderGoals(tp); ok('次目標太多', codes(tp).includes('gSubMany'));
tp = treePlan(); tp.goals[3].due = '2028-01-01'; ok('次目標期限晚於上面', codes(tp).includes('gSubLate'));
tp = treePlan(); eq('刪大 G 連同次目標與連結', [M.removeGoal(tp, 'ga'), tp.goals.map(x => x.id), tp.strats.map(x => Object.keys(x.links))], [5, ['gz'], [['gz'], []]]);
tp = treePlan(); eq('移動只在同一層', [M.moveGoal(tp, 'gc', -1), tp.goals.map(x => x.id)], [true, ['ga', 'gc', 'gd', 'ge', 'gb', 'gz']]); eq('到頂不能再移', M.moveGoal(tp, 'gc', -1), false);
tp = treePlan(); eq('大 G 移動連整棵樹', [M.moveGoal(tp, 'gz', -1), tp.goals.map(x => x.id)], [true, ['gz', 'ga', 'gb', 'gc', 'gd', 'ge']]);
tp = treePlan(); eq('改掛上層', [M.setUp(tp, 'gz', 'gb'), M.labels(tp).gz], [true, 'g1.1.1']);
tp = treePlan(); eq('不能掛到自己的次目標、不能超過三層', [M.setUp(tp, 'ga', 'gb'), M.setUp(tp, 'gz', 'gd'), M.setUp(tp, 'gc', 'gz'), M.setUp(tp, 'gc', 'gb')], [false, false, true, false]);
eq('拉回成大 G', [M.setUp(tp, 'gc', ''), M.depthOf(tp, M.goalById(tp, 'gd'))], [true, 1]);
ok('互為上下層後一定有大 G', M.kids(M.sanitizePlan({goals:[{id:'ga', up:'gb'}, {id:'gb', up:'ga'}]}), '').length === 1);
eq('自己當上層、上層不存在', M.sanitizePlan({goals:[{id:'ga', up:'ga'}, {id:'gb', up:'gq'}, {id:'gc', up:'__proto__'}]}).goals.map(x => x.up), ['', '', '']);
ok('超過三層拉回來', (() => { const p = M.sanitizePlan({goals:['a', 'b', 'c', 'd', 'e', 'f'].map((k, i, l) => ({id:'g' + k, up:i ? 'g' + l[i - 1] : ''}))}); return p.goals.length === 6 && p.goals.every(x => M.depthOf(p, x) <= 2) && JSON.stringify(M.sanitizePlan(p)) === JSON.stringify(p); })());
{ const c = M.clone(treePlan()); eq('複製後樹還在', c.goals.map(x => M.labels(c)[x.id]), ['G1', 'g1.1', 'g1.2', 'g1.2.1', 'g1.2.2', 'G2']); ok('複製換新 id', !/"g[a-ez]"/.test(JSON.stringify(c))); eq('複製後彙總相同', M.coverage(c, c.goals[0]).sum, 150); }
tp = treePlan(); tp.logs = {'2027-01':{v:{gb:10, gd:2, ge:3}, note:''}, '2027-02':{v:{gb:12, gd:4}, note:''}, '2027-03':{v:{ga:50, gb:1, gd:1, ge:1}, note:''}};
eq('大目標自動加總次目標', [M.valueAt(tp, 'ga', '2027-01'), M.valueAt(tp, 'gc', '2027-01'), M.ownAt(tp, 'ga', '2027-01')], [15, 5, null]);
eq('次目標缺一個就不加總', M.valueAt(tp, 'ga', '2027-02'), null);
eq('自己有填就用自己的', M.valueAt(tp, 'ga', '2027-03'), 50);
eq('累計值用加總後的月份', [M.progress(tp, tp.goals[0], '2027-03').actual, M.progress(tp, tp.goals[0], '2027-03').missing], [65, 1]);
tp.goals[0].roll = 'drive'; eq('帶動型不自動加總', M.valueAt(tp, 'ga', '2027-01'), null);
tp = treePlan();
ok('文字版有縮排與關係', M.toText(tp).includes('\n　g1.1 門市') && M.toText(tp).includes('\n　　g1.2.1') && M.toText(tp).includes('次目標加起來等於它'));
ok('CSV 次目標標上層', /g 次目標,g1\.2\.1,[^\r]*,g1\.2,/.test(M.toCsv(tp)));
ok('CSV、Word 分開衡量指標與行動計畫', M.toCsv(M.example('cof')[0]).includes('M 衡量指標 Dashboard,MD1.1') && M.toCsv(M.example('cof')[0]).includes('M 行動計畫 Action Plans,MP1.1') && M.toDoc(tp).includes('M 行動計畫 Action Plans'));
eq('健檢分開 MD 與 MP', [...new Set(M.check(M.example('bad')[0]).filter(i => /^M/.test(i.dim)).map(i => i.dim))].sort(), ['MD', 'MP']);
{ const a = M.cleanAi({o:'x', goals:[{t:'', subs:[{t:'孤兒'}]}, {t:'營收', target:10, roll:'sum', subs:[{t:'門市', target:6}, {t:''}, {t:'外送<b>', target:4}]}], strats:[{t:'甲', links:['g2.1', 'G2.3', 'g2.2', 'G1', 'g1.1']}]}, {});
  eq('AI 次目標', a.goals.map(x => [x.t, x.up === a.goals[0].id, x.guess]), [['營收', false, true], ['門市', true, true], ['外送', true, true]]);
  eq('AI 連結對到次目標', Object.keys(a.strats[0].links), [a.goals[1].id, a.goals[2].id]); eq('AI 次目標整理後不變', M.sanitizePlan(a), a); }
ok('小餐館、業務範例有次目標', M.example('rst')[0].goals.some(x => x.up) && M.example('slp')[0].goals.filter(x => x.up).length === 3);
// 亂數目標樹 1500 組：順序、層數、彙總都合法
for(let i = 0; i < 1500; i++){
  const nG = 1 + Math.floor(Math.random() * 12), idl = Array.from({length:nG}, (_, k) => 'g' + k), rp = a => a[Math.floor(Math.random() * a.length)];
  const p = M.sanitizePlan({from:'2027-01-01', to:'2027-12-31', goals:idl.map(id => ({id, t:id, base:rp(['', 0, 5]), target:rp(['', 9, 3]), unit:rp(['', '%', '人']), up:rp(['', ...idl, 'gx']), roll:rp(['sum', 'drive']), acc:rp(['sum', 'level']), dir:rp(['up', 'down'])})), strats:[{id:'s1', links:{g0:1, g2:'', g3:2}}], logs:{'2027-02':{v:{g0:1, g1:2, g3:4}}}});
  let err = '';
  try{
    if(p.goals.length !== nG || new Set(p.goals.map(x => x.id)).size !== nG) err = '數量';
    if(p.goals.some(x => M.depthOf(p, x) > 2)) err = '層數';
    if(p.goals.some((x, k) => x.up && p.goals.findIndex(y => y.id === x.up) > k)) err = '順序';
    if(JSON.stringify(M.sanitizePlan(p)) !== JSON.stringify(p)) err = '整理兩次不同';
    if(/NaN|undefined|Infinity/.test(JSON.stringify(M.check(p)) + M.toText(p) + M.toCsv(p))) err = 'NaN';
    p.goals.forEach(x => { const c = M.coverage(p, x), q = M.progress(p, x, '2027-03'); if(!isFinite(c.sum) || !M.STATUS[q.st]) err = '彙總'; M.upOptions(p, x.id).forEach(o => { const z = JSON.parse(JSON.stringify(p)); if(!M.setUp(z, x.id, o.id) || z.goals.length !== nG || z.goals.some(y => M.depthOf(z, y) > 2)) err = '改掛'; }); });
  }catch(e){ err = e.stack; }
  ok('亂數樹 #' + i, !err, err);
}

// ── 範例 ──
for(const e of M.EXAMPLES){
  const list = e.make();
  for(const p of list){
    eq(e.id + ' 範例整理後不變', M.sanitizePlan(p), p);
    if(e.cat !== 'drill') eq(e.id + ' 範例沒有燈號', codes(p, list), []);
  }
  ok(e.id + ' 標示虛構', list[0].unit.includes('虛構'));
}
eq('範例 id 不重複', new Set(M.EXAMPLES.map(e => e.id)).size, M.EXAMPLES.length);
eq('每個分類都有範例、範例都有分類', [...new Set(M.EXAMPLES.map(e => e.cat))].sort(), M.EX_CATS.map(c => c[0]).sort());
ok('練習缺口：不足、沒人支援、沒估、太樂觀、只有落後都有', ['cShort', 'cNone', 'cUnest', 'cOver', 'mLag'].every(c => codes(M.example('bd2')[0]).includes(c)), codes(M.example('bd2')[0]));
{ const h = M.example('hrd')[0]; eq('人資範例：累計離職 22 人、應達 24×304/365', [M.progress(h, h.goals[2], '2026-10').actual, M.fmt(M.progress(h, h.goals[2], '2026-10').exp)], [22, M.fmt(24 * 304 / 365)]); }
{ const l = M.example('slp'); eq('業務範例有下一層', [l.length, l[1].parent.plan, l[1].goals.length], [2, l[0].id, 2]); }
ok('有問題的初稿至少 20 條', M.check(M.example('bad')[0]).length >= 20);
eq('不存在的範例', M.example('zzz'), null);

// ── 匯出 ──
const evil = good(); evil.name = '<img src=x onerror=1>'; evil.goals[0].t = '=HYPERLINK("a")'; evil.strats[0].t = '他說"好",換行\n第二行'; evil.strats[0].kpis[0].owner = '@SUM(1)';
const csv = M.toCsv(evil);
ok('CSV 有 BOM', csv.charCodeAt(0) === 0xFEFF);
ok('CSV 擋公式', csv.includes('"\'=HYPERLINK(""a"")"') && csv.includes("'@SUM(1)") && !/(^|,)[=@]/m.test(csv));
ok('CSV 引號與換行', csv.includes('"他說""好"",換行\n第二行"'));
ok('CSV 負數不加引號', M.csvCell(-5) === '-5');
ok('Word 跳脫', !M.toDoc(evil).includes('<img') && M.toDoc(evil).includes('&lt;img'));
ok('文字版有支援', M.toText(good()).includes('→ 支援 G1'));
eq('分享不含紀錄與上層', (() => { const p = M.sharePlan(Object.assign(M.example('cof')[0], {parent:{plan:'px', s:'s1'}})); return [p.logs, p.parent]; })(), [{}, null]);

// ── AI ──
ok('草稿提示詞要 JSON', M.draftPrompt('開早餐店').includes('只回傳 JSON'));
ok('改寫不准動數字', M.rewritePrompt('s', 'x', good()).includes('不可以改動或新增任何數字'));
ok('建議提示詞帶健檢結果', M.advicePrompt(good(), [{lv:'bad', t:'沒有 O', why:'x'}]).includes('紅燈：沒有 O'));
ok('月檢討帶應達值', M.reviewPrompt(M.example('cof')[0], '2026-10').includes('應達 249.86'));
const ai = M.cleanAi({o:'<b>成為</b>最好的<script>alert(1)</script>店', goals:[{t:'', target:1}, {t:'回購率', base:'20%', target:'1,200', unit:'%', dir:'down'}, {t:'無數字'}, 'x'], strats:[{t:'做卡<img src=x onerror=1>', links:['G2', 2, 'G1', 'G9', null], kpis:[{t:'發卡', base:{}, target:'NaN'}], acts:[{t:'印卡', to:'2027-99-01'}]}, {t:''}]}, {from:'2027-01-01', to:'2027-12-31'});
ok('AI 草稿去標籤', !/[<>]/.test(JSON.stringify(ai)), JSON.stringify(ai));
eq('AI 數字整理', [ai.goals[0].base, ai.goals[0].target, ai.goals[0].guess, ai.goals[1].guess], [20, 1200, true, false]);
eq('AI 連結對到原編號', Object.keys(ai.strats[0].links), [ai.goals[0].id]);
eq('AI 壞日期與壞數字', [ai.strats[0].acts[0].to, ai.strats[0].kpis[0].base, ai.strats[0].kpis[0].target, ai.strats.length], ['', '', '', 1]);
ok('AI 推測會被健檢提醒', codes(ai).includes('gGuess'));
eq('AI 草稿整理後不變', M.sanitizePlan(ai), ai);
for(const x of [null, 1, [], {}, {o:1}, {goals:'x'}]) ok('AI 怪回覆不出錯', M.cleanAi(x) === null || M.cleanAi(x).id, x);
eq('改寫選項去重去標籤', M.cleanOptions({options:['a', ' a ', '<i>b</i>', '', 3, null]}), ['a', 'b', '3']);

// ── 亂數 2000 組：不當掉、不出 NaN ──
const R = Math.random, pick = a => a[Math.floor(R() * a.length)];
const anyNum = () => pick(['', 0, -5, 3.3, 100, 1e9, 'abc', null, undefined, NaN, Infinity, '7']);
const anyDate = () => pick(['', '2027-01-01', '2026-06-30', '2028-02-29', '2027-02-30', 'x', null]);
const anyT = () => pick(['', '回購率', '持續加強', '=1+1', '<b>x</b>', '50%', 'constructor', '很'.repeat(300), null, 5]);
for(let i = 0; i < 2000; i++){
  const ids = ['g1', 'g2', 'g3'], ms = id => ({id, t:anyT(), base:anyNum(), target:anyNum(), unit:anyT(), dir:pick(['up', 'down', 'x']), acc:pick(['level', 'sum', '']), due:anyDate(), owner:anyT(), lead:R() < .5, guess:R() < .2});
  const raw = {id:'p1', from:anyDate(), to:anyDate(), budget:anyNum(), o:anyT(), goals:ids.slice(0, Math.floor(R() * 4)).map(ms),
    strats:Array.from({length:Math.floor(R() * 4)}, (_, j) => ({id:'s' + j, t:anyT(), how:anyT(), not:anyT(), links:{g1:anyNum(), g3:anyNum()}, kpis:[ms('k' + j)], acts:[{id:'a' + j, t:anyT(), owner:anyT(), from:anyDate(), to:anyDate(), cost:anyNum(), st:pick(['done', 'x'])}]})),
    logs:{'2027-01':{v:{g1:anyNum(), k0:anyNum()}}, '2026-12':{v:{g1:anyNum()}, note:anyT()}, 'bad':{}}};
  let err = '';
  try{
    const p = M.sanitizePlan(raw), all = [p];
    if(JSON.stringify(M.sanitizePlan(p)) !== JSON.stringify(p)) err = '整理兩次結果不同';
    const iss = M.check(p, all), sc = M.score(iss);
    if(!(sc.v >= 0 && sc.v <= 100)) err = '分數 ' + sc.v;
    if(iss.some(x => /NaN|undefined|Infinity/.test(x.t + x.why))) err = '訊息有 NaN ' + JSON.stringify(iss.find(x => /NaN|undefined|Infinity/.test(x.t + x.why)));
    for(const it of p.goals.concat(M.kpisOf(p))){ const q = M.progress(p, it, '2027-03'); for(const k of ['actual', 'f', 'e', 'exp']) if(q[k] !== null && !isFinite(q[k])) err = k + '=' + q[k]; if(!M.STATUS[q.st]) err = 'st ' + q.st; M.series(p, it); }
    if(p.strats[0]){ const c = M.cascade(p, p.strats[0].id, 'x'); if(JSON.stringify(M.sanitizePlan(c)) !== JSON.stringify(c)) err = '展開整理後不同'; M.check(c, [p, c]); }
    if(/NaN|undefined/.test(M.toText(p) + M.toCsv(p) + M.toDoc(p))) err = '匯出有 NaN';
    M.overdue(p, '2027-05-05'); M.summary(p, '2027-03'); M.clone(p);
  }catch(e){ err = e.stack; }
  ok('亂數 #' + i, !err, err);
}

console.log((bad ? '✗ ' : '✓ ') + (n - bad) + '/' + n + ' 通過');
process.exit(bad ? 1 : 0);
