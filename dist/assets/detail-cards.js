/* Auxiliary content lives in native modal cards, preserving its controls and event owners. */
(() => {
 'use strict';
 let active=null,observer=null,serial=0;
 const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12H19M13 6L19 12L13 18"/></svg>';
 function finish(entry){
  if(entry.finished)return;entry.finished=true;if(active===entry)active=null;
  document.documentElement.style.overflow=entry.htmlOverflow;document.body.style.overflow=entry.bodyOverflow;
  document.documentElement.removeAttribute('data-detail-card-open');
  if(entry.trigger.isConnected)entry.trigger.focus({preventScroll:true});
 }
 function close(){if(!active)return;const entry=active;entry.dialog.close();finish(entry)}
 function information(slot,label){
  if(slot.dataset.cardTitle)return {title:slot.dataset.cardTitle,hint:slot.dataset.cardHint||''};
  if(slot.classList.contains('station-profile'))return {title:(slot.closest('.monitor-selection-panel')?.querySelector('#map-detail h2')?.textContent||'地点')+' · 地点资料',hint:'了解地点背景和教学阈值；资料来源可在卡片内查看。'};
  if(slot.classList.contains('layer-menu'))return {title:'地图显示设置',hint:'这里只改变地图上显示的内容，不修改读数或事件记录。'};
  if(slot.classList.contains('pollution-advanced'))return {title:'更多扩散计算参数',hint:'调整会立即重算并回到0分。关闭卡片后，播放时间轴查看新结果。'};
  if(slot.classList.contains('pollution-model-details'))return {title:'扩散模型与质量平衡',hint:'查看当前参数的计算方法、质量去向和数据来源。',wide:true};
  if(slot.classList.contains('sandbox-advanced'))return {title:'降雨与调闸规则',hint:'这些规则说明模拟如何响应，帮助理解右侧曲线。'};
  if(slot.closest('.ledger-entry'))return {title:'事件详情',hint:slot.closest('.ledger-entry').querySelector('h3')?.textContent||''};
  if(slot.classList.contains('image-credit'))return {title:'图片来源与许可',hint:'照片为历史实景，拍摄时间和署名见下方。'};
  if(slot.classList.contains('lab-model'))return {title:'径流实验的计算方法',hint:'了解三种地面、排水能力和暂存水量的关系。'};
  if(slot.classList.contains('inspection-save'))return {title:'保存照片观察',hint:'选择演示关联地点，再点击保存。保存的是观察文字，不是现场监测结论。'};
  return {title:label,hint:''};
 }
 function enhance(root){
  if(!root||typeof HTMLDialogElement==='undefined'||!HTMLDialogElement.prototype.showModal)return;
  const candidates=root.matches?.('details')?[root,...root.querySelectorAll('details')]:[...root.querySelectorAll('details')];
  for(const details of candidates){
   if(!details.isConnected||details.closest('dialog'))continue;
   const summary=details.querySelector(':scope > summary');if(!summary)continue;
   const slot=document.createElement('div');
   for(const attribute of [...details.attributes])if(attribute.name!=='open')slot.setAttribute(attribute.name,attribute.value);
   slot.classList.add('detail-card-slot');
   const label=summary.textContent.trim(),trigger=document.createElement('button'),text=document.createElement('span');
   trigger.type='button';trigger.className='detail-card-trigger';text.className='detail-card-trigger-label';text.append(...summary.childNodes);trigger.append(text);trigger.insertAdjacentHTML('beforeend',arrow);
   const dialog=document.createElement('dialog'),id='detail-card-'+(++serial);dialog.id=id;dialog.className='detail-card-dialog';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',id);
   const header=document.createElement('header');header.className='detail-card-header';
   const titleBox=document.createElement('div'),title=document.createElement('h2'),hint=document.createElement('p');title.id=id+'-title';title.className='detail-card-title';title.tabIndex=-1;hint.className='detail-card-hint';titleBox.append(title,hint);
   const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='detail-card-close';closeButton.setAttribute('aria-label','关闭卡片');closeButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18"/></svg>';header.append(titleBox,closeButton);
   const body=document.createElement('div');body.className='detail-card-body';for(const node of [...details.childNodes])if(node!==summary)body.append(node);
   const footer=document.createElement('footer');footer.className='detail-card-footer';const done=document.createElement('button');done.type='button';done.className='btn detail-card-done';done.textContent=slot.classList.contains('pollution-advanced')?'完成设置':'关闭卡片';footer.append(done);dialog.append(header,body,footer);dialog.setAttribute('aria-labelledby',title.id);slot.append(trigger,dialog);details.replaceWith(slot);
   const entry={dialog,trigger,finished:true};
   trigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close();const info=information(slot,label);title.textContent=info.title;hint.textContent=info.hint;hint.hidden=!info.hint;dialog.classList.toggle('detail-card-wide',!!info.wide);entry.htmlOverflow=document.documentElement.style.overflow;entry.bodyOverflow=document.body.style.overflow;entry.finished=false;active=entry;document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';document.documentElement.setAttribute('data-detail-card-open','');dialog.showModal();body.scrollTop=0;title.focus({preventScroll:true});trigger.dispatchEvent(new CustomEvent('detailcardopen',{bubbles:true}))});
   for(const button of [closeButton,done])button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();dialog.close();finish(entry)});
   dialog.addEventListener('close',()=>{if(!dialog.open)finish(entry)});
   dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();finish(entry)});
   let backdropPressed=false;
   const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
   dialog.addEventListener('pointerdown',e=>{backdropPressed=e.target===dialog&&outside(e)});
   dialog.addEventListener('click',e=>{if(backdropPressed&&e.target===dialog&&outside(e)){dialog.close();finish(entry)}backdropPressed=false});
  }
 }
 function start(root){
  observer?.disconnect();if(!root)return;enhance(root);
  observer=new MutationObserver(records=>{if(active&&!active.dialog.isConnected)finish(active);for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&!node.closest('dialog')&&(node.matches('details')||node.querySelector('details')))enhance(node)});
  observer.observe(root,{childList:true,subtree:true});
 }
 window.HydroDetailCards={start,enhance,close};
})();
