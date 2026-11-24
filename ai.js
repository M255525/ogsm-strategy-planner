/* OGSM 策略規劃表：AI 助手（BYOK：使用者自己的金鑰，只存在這台瀏覽器，直接傳給選的 AI 服務）
   7 家呼叫與 geminiModelFix 照抄 政府補助認證產生器/shop-opening-checklist/ai.js（工作區正本），改那邊時這裡也要跟著改。
   沒有金鑰也能用：每個 AI 功能都要有「📋 複製提示詞」。AI 只做解說與文字，數字與判斷一律由 data.js 的規則決定。 */
(function(){
'use strict';
var PFX = 'osp.';
function lsJson(k, d){ try{ var v = JSON.parse(localStorage.getItem(PFX + k)); return v == null ? d : v; }catch(e){ return d; } }
function lsSet(k, v){ try{ localStorage.setItem(PFX + k, v); }catch(e){} }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }

// Google 下架舊模型後，舊設定自動換成現行模型（2026-11 體檢）
function geminiModelFix(m){ var r = {'gemini-2.5-flash':'gemini-3.6-flash', 'gemini-2.5-flash-lite':'gemini-3.5-flash-lite', 'gemini-2.5-pro':'gemini-3.8-flash', 'gemini-2.0-flash':'gemini-3.6-flash', 'gemini-2.0-flash-001':'gemini-3.6-flash', 'gemini-2.0-flash-lite':'gemini-3.1-flash-lite', 'gemini-1.5-flash':'gemini-3.6-flash', 'gemini-1.5-pro':'gemini-3.1-pro-preview', 'gemini-3-pro':'gemini-3.1-pro-preview', 'gemini-3-pro-preview':'gemini-3.1-pro-preview', 'gemini-3.5-pro':'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview':'gemini-3.1-flash-lite'}; m = String(m || '').trim().replace(/^models\//, ''); return r[m] || m; }
var PROVIDERS = {
  gemini: {label:'Gemini（Google AI Studio）', vision:true, models:[['gemini-3.5-flash', 'Gemini 3.5 Flash（均衡，推薦）'], ['gemini-3.1-pro-preview', 'Gemini 3.1 Pro 預覽版（最強）'], ['gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite（快速省錢）']]},
  openai: {label:'OpenAI', vision:true, url:'https://api.openai.com/v1/chat/completions', models:[['gpt-5-mini', 'GPT-5 mini（均衡，推薦）'], ['gpt-5', 'GPT-5（最強）'], ['gpt-4o-mini', 'GPT-4o mini（快速省錢）']]},
  claude: {label:'Claude（Anthropic）', vision:true, models:[['claude-sonnet-5-5', 'Claude Sonnet 5.5（均衡，推薦）'], ['claude-opus-5-5', 'Claude Opus 5.5（最強）'], ['claude-haiku-5-5', 'Claude Haiku 5.5（快速省錢）']]},
  openrouter: {label:'OpenRouter', vision:true, url:'https://openrouter.ai/api/v1/chat/completions', models:[['openai/gpt-4o-mini', 'OpenAI GPT-4o mini（推薦）'], ['google/gemini-2.5-flash', 'Google Gemini 2.5 Flash'], ['anthropic/claude-sonnet-4.5', 'Anthropic Claude Sonnet 4.5']]},
  xai: {label:'xAI Grok', vision:true, url:'https://api.x.ai/v1/chat/completions', models:[['grok-4', 'Grok 4'], ['grok-3-mini', 'Grok 3 mini（不支援看圖）']]},
  deepseek: {label:'DeepSeek（只支援文字）', vision:false, url:'https://api.deepseek.com/chat/completions', models:[['deepseek-chat', 'DeepSeek Chat（推薦）'], ['deepseek-reasoner', 'DeepSeek Reasoner（推理）']]},
  custom: {label:'自訂（OpenAI 相容端點，例如 Ollama、LM Studio）', vision:true, models:[]}
};
function cfg(){ var c = lsJson('ai', {}); if(!PROVIDERS[c.provider]) c.provider = 'gemini'; return c; }
function aiModel(c){ c = c || cfg(); return (c.modelCustom || '').trim() || c.model || ((PROVIDERS[c.provider].models[0]) || [''])[0]; }
function customUrl(base){ base = (base || '').trim().replace(/\/+$/, ''); return /\/chat\/completions$/.test(base) ? base : base + '/chat/completions'; }
function ready(){ var c = cfg(); return c.provider === 'custom' ? !!(c.base || '').trim() && !!aiModel(c) : !!c.key; }
function status(){ var c = cfg(); return ready() ? PROVIDERS[c.provider].label.replace(/（.*/, '') + '・' + aiModel(c) : '未設定'; }

async function callLLM(prompt, images, wantJson, onStatus){
  var c = cfg(), provider = c.provider, model = aiModel(c), key = c.key, url, headers, body, extract;
  images = PROVIDERS[provider].vision === false ? [] : (images || []);
  if(provider === 'claude'){
    url = 'https://api.anthropic.com/v1/messages';
    headers = {'content-type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true'};
    var content = images.map(function(im){ return {type:'image', source:{type:'base64', media_type:im.mime, data:im.b64}}; });
    content.push({type:'text', text:prompt});
    body = {model:model, max_tokens:4000, messages:[{role:'user', content:content}]};
    extract = function(d){ return (d.content || []).filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join(''); };
  } else if(provider !== 'gemini'){
    url = provider === 'custom' ? customUrl(c.base) : PROVIDERS[provider].url;
    headers = {'content-type':'application/json'};
    if(key) headers.authorization = 'Bearer ' + key;
    var msg = images.length ? [{type:'text', text:prompt}].concat(images.map(function(im){ return {type:'image_url', image_url:{url:im.dataUrl}}; })) : prompt;
    body = {model:model, messages:[{role:'user', content:msg}]};
    extract = function(d){ return d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content; };
  } else {
    url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(geminiModelFix(model)) + ':generateContent';
    headers = {'content-type':'application/json', 'x-goog-api-key':key};
    var parts = images.map(function(im){ return {inline_data:{mime_type:im.mime, data:im.b64}}; });
    parts.push({text:prompt});
    body = {contents:[{parts:parts}]};
    if(wantJson) body.generationConfig = {responseMimeType:'application/json'};
    extract = function(d){ var ps = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []; return ps.map(function(p){ return p.text || ''; }).join(''); };
  }
  for(var attempt = 1; attempt <= 3; attempt++){
    var resp = await fetch(url, {method:'POST', headers:headers, body:JSON.stringify(body), signal:AbortSignal.timeout(150000)});
    var raw = await resp.text();
    if(resp.ok){ var t = extract(JSON.parse(raw)); if(!t) throw new Error('回應中沒有文字內容'); return t; }
    var em = raw.slice(0, 200);
    try{ var e = JSON.parse(raw); em = (e.error && e.error.message) || e.message || em; }catch(x){}
    if({429:1, 500:1, 503:1, 529:1}[resp.status] && attempt < 3){ if(onStatus) onStatus('服務忙碌（' + resp.status + '），' + attempt * 6 + ' 秒後重試…'); await new Promise(function(r){ setTimeout(r, attempt * 6000); }); continue; }
    throw new Error('HTTP ' + resp.status + '：' + em);
  }
}
function parseJson(txt){ var s = txt.indexOf('{'), e = txt.lastIndexOf('}'); if(s < 0 || e < s) throw new Error('AI 回傳的不是 JSON'); return JSON.parse(txt.slice(s, e + 1)); }

/* ---------- ⚙ 常用設定裡的「🤖 AI 設定」 ---------- */
function settingsHTML(){
  var c = cfg(), P = PROVIDERS[c.provider];
  return '<p class="small">用你自己的 AI 金鑰（BYOK）。金鑰<b>只存在這台瀏覽器</b>，按 AI 按鈕時直接傳給你選的 AI 服務，不會經過本站。沒有金鑰也可以按「📋 複製提示詞」貼到任何 AI。</p>' +
    '<label class="fld">AI 服務<select id="aiProv">' + Object.keys(PROVIDERS).map(function(k){ return '<option value="' + k + '"' + (k === c.provider ? ' selected' : '') + '>' + esc(PROVIDERS[k].label) + '</option>'; }).join('') + '</select></label>' +
    (c.provider === 'custom' ? '<label class="fld">端點網址<input type="url" id="aiBase" value="' + esc(c.base || '') + '" placeholder="http://localhost:11434/v1"></label>' : '') +
    '<label class="fld">模型' + (P.models.length ? '<select id="aiModel">' + P.models.map(function(m){ return '<option value="' + m[0] + '"' + (m[0] === c.model ? ' selected' : '') + '>' + esc(m[1]) + '</option>'; }).join('') + '</select>' : '') +
      '<input type="text" id="aiModelCustom" value="' + esc(c.modelCustom || '') + '" placeholder="' + (P.models.length ? '或自己輸入模型名稱（選填）' : '模型名稱') + '"></label>' +
    '<label class="fld">API 金鑰' + (c.provider === 'custom' ? '（選填）' : '') + '<input type="password" id="aiKey" autocomplete="off" value="' + esc(c.key || '') + '"></label>' +
    '<div class="vstack"><button class="btn" data-ai-test="1">測試連線</button><button class="btn alt" data-ai-clear="1">清除金鑰</button></div><p class="small" id="aiTestMsg">' + esc(status()) + '</p>';
}
function save(patch){ var c = cfg(); Object.keys(patch).forEach(function(k){ c[k] = patch[k]; }); lsSet('ai', JSON.stringify(c)); }
// 設定區塊在彈窗裡，每次打開都要重新綁定
function bind(rerender){
  var $ = function(id){ return document.getElementById(id); };
  if(!$('aiProv')) return;
  $('aiProv').addEventListener('change', function(){ save({provider:this.value, model:'', modelCustom:''}); rerender(); });
  if($('aiModel')) $('aiModel').addEventListener('change', function(){ save({model:this.value}); });
  ['aiModelCustom', 'aiKey', 'aiBase'].forEach(function(id){ if($(id)) $(id).addEventListener('input', function(){ var p = {}; p[{aiModelCustom:'modelCustom', aiKey:'key', aiBase:'base'}[id]] = this.value.trim(); save(p); $('aiTestMsg').textContent = status(); }); });
}
document.addEventListener('click', async function(ev){
  var t = ev.target.closest('[data-ai-test],[data-ai-clear]'); if(!t) return;
  var m = document.getElementById('aiTestMsg');
  if(t.dataset.aiClear){ save({key:''}); var k = document.getElementById('aiKey'); if(k) k.value = ''; m.textContent = '已清除金鑰'; return; }
  if(!ready()){ m.textContent = '請先填金鑰'; return; }
  m.textContent = '測試中…';
  try{ var r = await callLLM('請只回答「OK」兩個字。'); m.textContent = '✅ 連線成功：' + r.slice(0, 20); }catch(e){ m.textContent = '❌ ' + e.message; }
});

window.TOOL_AI = {PROVIDERS:PROVIDERS, geminiModelFix:geminiModelFix, cfg:cfg, ready:ready, status:status, callLLM:callLLM, parseJson:parseJson, settingsHTML:settingsHTML, bind:bind};
})();
