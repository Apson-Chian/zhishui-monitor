/* Browser cache with versioned SQLite sync through the same-origin gateway. */
(() => {
 'use strict';
 const domains = {
  ledger: 'zhishui-inspection-ledger-v1',
  pollution: 'zhishui-pollution-events-v1',
  experience: 'zhishui-water-journey-v3',
 };
 const domainsByKey = Object.fromEntries(Object.entries(domains).map(([domain,key]) => [key,domain]));
 // Browser storage is shared by all paths on the public host.
 const scope = location.pathname.startsWith('/zhishui-liquid/') ? 'zhishui-liquid:' : '';
 let local;
 try { local = window.localStorage; } catch {}
 const get = key => { try { return local?.getItem(scope + key) || null; } catch { return null; } };
 let workspace = null, username = null;
 const cacheKey = key => key + ':database:' + workspace;
 const states = {};
 for (const [domain,key] of Object.entries(domains)) {
  states[domain] = {data:null,revision:0,pending:false,status:'local',changed:0,cacheAvailable:!!local};
 }
 const store = (domain) => {
  if (!workspace) return false;
  const {data,revision,pending} = states[domain];
  try {
   if (!local) throw Error('Storage unavailable');
   local.setItem(scope + cacheKey(domains[domain]),JSON.stringify({data,revision,pending}));
  } catch {
   states[domain].cacheAvailable = false;
   return false;
  }
  states[domain].cacheAvailable = true;
  return true;
 };
 const publish = (domain,restore=false) => {
  document.dispatchEvent(new CustomEvent('hydro-records', {detail:{domain,restore}}));
 };
 const setStatus = (domain,status) => {
  if (states[domain].status === status) return;
  states[domain].status = status;
  publish(domain);
 };
 const storage = {
  getItem(key) { return domainsByKey[key] ? states[domainsByKey[key]].data : null; },
  setItem(key,data) {
   const domain = domainsByKey[key];
   const state = states[domain];
   if (!state || !workspace) return false;
   if (state.data === data) return state.cacheAvailable;
   state.data = data;
   state.changed++;
   state.pending = true;
   const cached = store(domain);
   if (state.status !== 'conflict') setStatus(domain, connected ? 'pending' : canRetry ? 'offline' : 'local');
   schedule();
   return cached;
  },
 };

 const endpoint = new URL('api/records', document.baseURI);
 let connected = false, canRetry = false, busy = false, timer;
 let connectedBefore = Object.values(states).some(state => state.revision > 0);
 const eligible = location.protocol === 'https:' || ['127.0.0.1','localhost'].includes(location.hostname);
 async function request(options, url=endpoint, retryWrite = options?.method === 'PUT') {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), options?.method === 'PUT' ? 6000 : 2200);
  try {
   const response = await fetch(url,{...options,signal:abort.signal,cache:'no-store',credentials:'same-origin'});
   if (!response.ok) { const body = await response.json().catch(()=>({})); throw Object.assign(Error(body.error || '记录库连接失败'),{status:response.status}); }
   const result = await response.json();
   if (workspace && result.workspace && workspace !== result.workspace) {location.reload();throw Error('用户已切换，请刷新页面。');}
   return result;
  } catch (error) {
   // The gateway accepts a replay of the same revision and snapshot.
   if (retryWrite && (abort.signal.aborted || error instanceof TypeError)) return request(options, url, false);
   throw error;
  } finally { clearTimeout(timeout); }
 }
 function applyRemote(domain, remote) {
  const state = states[domain];
  state.data = remote ? JSON.stringify(remote.snapshot) : null;
  state.revision = remote?.revision || 0;
  state.pending = false;
  state.status = remote ? 'saved' : 'local';
  store(domain);
  publish(domain,true);
 }
 async function pull() {
  const response = await request();
  const {collections} = response;
  if (!response.workspace) throw Error('Missing workspace');
  if (workspace && workspace !== response.workspace) { location.reload(); throw Error('用户已切换'); }
  if (!workspace) {
   workspace = response.workspace; username = response.username;
   for (const [domain,key] of Object.entries(domains)) {
    let cached; try { cached = JSON.parse(get(cacheKey(key))); } catch {}
    if (cached && typeof cached.data === 'string') Object.assign(states[domain],{data:cached.data,revision:cached.revision||0,pending:!!cached.pending});
   }
  }
  if (!collections || typeof collections !== 'object') throw Error('Invalid record collection');
  connected = connectedBefore = true;
  for (const [domain,state] of Object.entries(states)) {
   const remote = collections[domain];
   if (!remote) {
    if (state.status === 'conflict') continue;
    if (state.revision) {
     state.revision = 0;
     state.pending = !!state.data;
     store(domain);
    }
    if (state.pending) setStatus(domain,'pending');
    publish(domain,true);
    continue;
   }
   if (!state.pending) {
    if (state.revision !== remote.revision || !state.data) applyRemote(domain,remote);
    else {setStatus(domain,'saved');publish(domain,true);}
   } else if (state.status !== 'conflict') {
    setStatus(domain,'pending');
   }
  }
  return collections;
 }
 function schedule(delay=350) {
  if (!eligible || !workspace || (!connected && !connectedBefore)) return;
  clearTimeout(timer);
  timer = setTimeout(sync,delay);
 }
 async function sync() {
  if (!eligible || busy) return;
  clearTimeout(timer);
  busy = true;
  try {
   if (!connected) await pull();
   for (const [domain,state] of Object.entries(states)) {
    if (!state.pending || state.status === 'conflict') continue;
    const {data, revision, changed} = state;
    try {
     const saved = await request({
      method:'PUT',headers:{'Content-Type':'application/json','X-Workspace-ID':workspace},
      body:JSON.stringify({domain,revision,snapshot:JSON.parse(data)}),
     });
     if (!Number.isSafeInteger(saved.revision) || saved.revision <= revision) throw Error('Invalid revision');
     state.revision = saved.revision;
     state.pending = state.changed !== changed;
     store(domain);
     setStatus(domain,state.pending?'pending':'saved');
    } catch (error) {
     if (error.status === 409) setStatus(domain,'conflict');
     else if (error.status === 400) setStatus(domain,'invalid');
     else if (error.status === 401) { connected = false; throw error; }
     else throw error;
    }
   }
   if (Object.values(states).some(state => state.pending && state.status === 'pending')) schedule();
  } catch (error) {
   connected = false;
   canRetry = error.status !== 404;
   for (const [domain,state] of Object.entries(states)) {
    if (error.status === 401) { state.data=null; publish(domain,true); }
    if (state.status !== 'conflict') setStatus(domain,state.pending?'offline':'local');
   }
  } finally { busy = false; }
 }
 async function useRemote(domain) {
  if (!eligible || !states[domain] || busy) return false;
  busy = true;
  try {
   const changed = states[domain].changed;
   const {collections} = await request();
   if (!collections || !collections[domain] || states[domain].changed !== changed) return false;
   applyRemote(domain,collections[domain]);
   return true;
  } catch { return false; }
  finally { busy = false; }
 }
 function label(domain) {
  const state = states[domain];
  switch (state.status) {
   case 'saved': return '已保存到记录库';
   case 'pending': return '正在同步到记录库';
   case 'conflict': return '记录库已有较新版本，当前改动已保留';
   case 'invalid': return '当前记录未通过同步校验，可导出保存';
   default:
    if (!state.cacheAvailable) return '当前记录保留在本次会话，可导出保存';
    return canRetry && state.pending ? '已保存到浏览器，待重新连接' : '保存在此浏览器';
  }
 }
 function controls(domain) {
  return `<button type="button" class="btn" data-record-account>用户与数据</button> <span data-record-storage="${domain}">${statusHTML(domain)}</span>`;
 }
 function statusHTML(domain) {
  const status = states[domain].status;
  const action = status === 'conflict'
   ? ` <button type="button" class="btn" data-record-reload="${domain}">读取服务器记录</button>`
   : status === 'offline' && canRetry
    ? ' <button type="button" class="btn" data-record-retry>重新同步</button>' : '';
  return `<span role="status">${label(domain)}</span>${action}`;
 }
 document.addEventListener('hydro-records', ({detail:{domain}}) => {
  document.querySelectorAll(`[data-record-storage="${domain}"]`).forEach(node => {
   node.innerHTML = statusHTML(domain);
  });
 });
 document.addEventListener('click', async event => {
  const action = event.target.closest('[data-record-reload],[data-record-retry]');
  if (!action) return;
  if (action.hasAttribute('data-record-retry')) return sync();
  if (!window.confirm('读取服务器版会替换这组尚未同步的本机改动。需要保留时请先导出。确定读取？')) return;
  if (!await useRemote(action.dataset.recordReload)) window.alert('暂时无法读取服务器记录，请稍后重试。');
 });
 window.addEventListener('online',sync);

 const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('zhishui-account') : null;
 if(channel) channel.onmessage = () => location.reload();
 const backup = () => ({format:'zhishui-backup',version:1,exportedAt:new Date().toISOString(),
  boundary:'教学模拟与图像观察，不含图片和账号凭据。',
  collections:Object.fromEntries(Object.entries(states).map(([domain,state])=>[domain,state.data?JSON.parse(state.data):null]))});
 const downloadBackup = () => {
  if(!workspace) return window.alert('请先连接记录库，确认当前用户后再导出。');
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup(),null,2)],{type:'application/json;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='智水备份-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 async function importFile(file) {
  if (!workspace || !connected) throw Error('请先连接记录库再导入。');
  if (!file || file.size > 700*1024) throw Error('请选择小于 700 KB 的智水备份 JSON。');
  const value=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
  if(value.format!=='zhishui-backup'||value.version!==1||!value.collections||Object.keys(value.collections).sort().join(',')!=='experience,ledger,pollution') throw Error('此文件不是完整的智水备份。请使用“备份全部数据”生成的 JSON。');
  for(const domain of ['ledger','pollution']) {
   const snapshot=value.collections[domain];
   if(snapshot!==null && (snapshot.version!==1||!Array.isArray(snapshot.records))) throw Error('备份结构无效。');
  }
  const counts=['ledger','pollution'].map(domain=>value.collections[domain]?.records.length||0);
  if(!window.confirm(`即将恢复 ${counts[0]} 条台账、${counts[1]} 条污染事件和水文体验。完整校验通过后会替换当前用户的数据。建议先备份。继续？`)) return;
  if(busy) throw Error('正在同步，请稍后再导入。');
  busy=true;clearTimeout(timer);
  try {
   const response=await request({method:'POST',headers:{'Content-Type':'application/json','X-Workspace-ID':workspace},
    body:JSON.stringify({backup:value,revisions:Object.fromEntries(Object.entries(states).map(([d,s])=>[d,s.revision]))})},new URL('api/records/import',document.baseURI));
   for(const domain of Object.keys(states)) applyRemote(domain,response.collections[domain]);
   window.alert('全部数据已恢复。');
  } finally {busy=false; schedule();}
 }
 function accountPanel() {
  const dialog=document.createElement('dialog');dialog.className='records-dialog';
  dialog.innerHTML=`<form method="dialog"><button class="btn" aria-label="关闭" style="float:right">关闭</button></form><h2>用户与数据</h2><p class="account-name"></p><p>登录后按账号保存数据；访客数据保留在当前浏览器。需要迁移时先备份，再登录并导入。</p><form class="account-form"><label>用户名<input name="username" autocomplete="username" pattern="[A-Za-z0-9_-]{3,32}" required placeholder="3–32 位字母、数字或 _ -"></label><label>密码<input name="password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required placeholder="至少 10 个字符"></label><div class="record-actions"><button class="btn" name="action" value="login">登录</button><button class="btn" name="action" value="register">注册并登录</button></div></form><div class="record-actions"><button class="btn" data-account-logout>退出账号 / 新建访客空间</button><button class="btn" data-backup>备份全部数据</button><label class="btn">导入备份<input type="file" accept=".json,application/json" data-import hidden></label></div><p role="status" class="account-message"></p>`;
  dialog.querySelector('.account-name').textContent=username?'当前账号：'+username:workspace?'当前为独立访客空间':'尚未连接记录库';
  document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove());
  const message=dialog.querySelector('.account-message');
  dialog.querySelector('.account-form').onsubmit=async event=>{
   event.preventDefault();const form=event.currentTarget;const action=event.submitter.value;
   const data=new FormData(form);const buttons=[...dialog.querySelectorAll('button,input')];buttons.forEach(b=>b.disabled=true);
   try {await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:data.get('username'),password:data.get('password')})},new URL('api/auth/'+action,document.baseURI));channel?.postMessage('changed');location.reload();}
   catch(error){message.textContent=error.message;buttons.forEach(b=>b.disabled=false);}
  };
  dialog.querySelector('[data-account-logout]').onclick=async()=>{
   if(!confirm('退出后切换到新的访客空间。请先备份尚未同步的数据。继续？'))return;
   try {await request({method:'POST'},new URL('api/auth/logout',document.baseURI));channel?.postMessage('changed');location.reload();}catch(error){message.textContent=error.message;}
  };
  dialog.querySelector('[data-backup]').onclick=downloadBackup;
  dialog.querySelector('[data-import]').onchange=async event=>{try{await importFile(event.target.files[0]);}catch(error){message.textContent=error.message;}finally{event.target.value='';}};
 }
 document.addEventListener('click',event=>{if(event.target.closest('[data-record-account]')) accountPanel();});
 const mount=()=>{const button=document.createElement('button');button.type='button';button.className='btn record-account-entry';button.dataset.recordAccount='';button.textContent='用户与数据';document.querySelector('footer')?.prepend(button);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 window.HydroRecords = {storage,start:sync,controls,label,backup,importFile};
})();
