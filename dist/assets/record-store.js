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
 const cacheKey = key => key + ':database';
 const states = {};
 for (const [domain,key] of Object.entries(domains)) {
  let cached;
  try { cached = JSON.parse(get(cacheKey(key))); } catch {}
  states[domain] = {
   data: typeof cached?.data === 'string' ? cached.data : get(key),
   revision: Number.isSafeInteger(cached?.revision) ? cached.revision : 0,
   pending: !!cached?.pending || (!cached && !!get(key)),
   status: 'local',
   changed: 0,
   cacheAvailable: !!local,
  };
 }
 const store = (domain) => {
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
  getItem(key) { return domainsByKey[key] ? states[domainsByKey[key]].data : get(key); },
  setItem(key,data) {
   const domain = domainsByKey[key];
   const state = states[domain];
   if (!state) return false;
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
 async function request(options, retryWrite = options?.method === 'PUT') {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), options?.method === 'PUT' ? 6000 : 2200);
  try {
   const response = await fetch(endpoint,{...options,signal:abort.signal,cache:'no-store',credentials:'same-origin'});
   if (!response.ok) throw Object.assign(Error('Records API'),{status:response.status});
   return await response.json();
  } catch (error) {
   // The gateway accepts a replay of the same revision and snapshot.
   if (retryWrite && (abort.signal.aborted || error instanceof TypeError)) return request(options, false);
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
  const {collections} = await request();
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
    continue;
   }
   if (!state.pending) {
    if (state.revision !== remote.revision || !state.data) applyRemote(domain,remote);
    else setStatus(domain,'saved');
   } else if (state.status !== 'conflict') {
    setStatus(domain,'pending');
   }
  }
  return collections;
 }
 function schedule(delay=350) {
  if (!eligible || (!connected && !connectedBefore)) return;
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
      method:'PUT',headers:{'Content-Type':'application/json'},
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
  return `<span data-record-storage="${domain}">${statusHTML(domain)}</span>`;
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
 window.HydroRecords = {storage,start:sync,controls,label};
})();
