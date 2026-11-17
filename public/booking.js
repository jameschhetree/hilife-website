const $=s=>document.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>'$'+(n/100).toFixed(2);let config,chosen,hours=1,date='',start='',step=1,amount=0;
const time=d=>new Date(d).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}),day=d=>new Date(d).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'long',day:'numeric',year:'numeric'});
async function api(action,data){const r=await fetch('/api/studio?action='+action,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||'Unable to complete this request');return j}
function error(t){$('#error').textContent=t}
const atlantaDate = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
let engineerId = '';
let slotRequest = 0;
const utcLabel = (key, options) => new Date(key+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',...options});
function renderTimeStep() {
  const now = Date.now(), dayMs = 86400000;
  const min = atlantaDate.format(now + config.noticeHours*3600000);
  const max = atlantaDate.format(now + config.horizonDays*dayMs);
  if (!date || date < min || date > max) date = min;
  let month = date.slice(0,7);
  const fixed = chosen.min === chosen.max;
  $('#booking').innerHTML = `<h2>Choose a session time</h2>
    <p class="subtitle">${esc(chosen.name)} · Atlanta time${fixed?' · '+hours+' hours':''}</p>
    <section class="month-picker" aria-label="Booking calendar">
      <div class="month-head"><h3 id="month" aria-live="polite"></h3><div><button id="prev-month" aria-label="Previous month">‹</button><button id="next-month" aria-label="Next month">›</button></div></div>
      <div class="month-grid" id="days"></div>
    </section>
    <div class="time-menus">${chosen.requiresEngineer?`<label>Session engineer<select id="engineer"><option value="">Select an engineer</option>${config.engineers.map(u=>`<option value="${esc(u.id)}" ${engineerId===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></label>`:''}${fixed?'':`<label>Duration<select id="hours">${Array.from({length:chosen.max-chosen.min+1},(_,i)=>chosen.min+i).map(h=>`<option value="${h}" ${h===hours?'selected':''}>${h} hours</option>`).join('')}</select></label>`}
    <label>Available start times<select id="times" disabled></select></label></div>
    <p id="time-status" role="status"></p>
    <div class="actions"><button class="secondary" id="back">Back</button><button class="primary" id="next" disabled>Continue</button></div>`;
  function paintMonth() {
    const first = new Date(month+'-01T12:00:00Z');
    const end = new Date(first);
    end.setUTCMonth(end.getUTCMonth()+1,0);
    $('#month').textContent = utcLabel(month+'-01',{month:'long',year:'numeric'});
    $('#prev-month').disabled = month <= min.slice(0,7);
    $('#next-month').disabled = month >= max.slice(0,7);
    const cells = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(w=>`<span>${w}</span>`);
    for(let i=0;i<first.getUTCDay();i++) cells.push('<i></i>');
    for(let d=1;d<=end.getUTCDate();d++){
      const key=month+'-'+String(d).padStart(2,'0');
      cells.push(`<button data-day="${key}" aria-label="${utcLabel(key,{dateStyle:'full'})}" aria-pressed="${key===date}" ${key<min||key>max?'disabled':''}>${d}</button>`);
    }
    $('#days').innerHTML=cells.join('');
  }
  function moveMonth(offset){
    const first=new Date(month+'-01T12:00:00Z');
    first.setUTCMonth(first.getUTCMonth()+offset);
    month=first.toISOString().slice(0,7);
    date=month===min.slice(0,7)?min:month+'-01';
    paintMonth();loadSlots();
  }
  $('#prev-month').onclick=()=>moveMonth(-1);
  $('#next-month').onclick=()=>moveMonth(1);
  $('#days').onclick=e=>{
    const key=e.target.dataset.day;
    if(!key)return;
    date=key;paintMonth();$('#days [aria-pressed="true"]').focus({preventScroll:true});loadSlots();
  };
  if(chosen.requiresEngineer)$('#engineer').onchange=e=>{engineerId=e.target.value;loadSlots()};
  if(!fixed)$('#hours').onchange=e=>{hours=Number(e.target.value);loadSlots()};
  $('#times').onchange=e=>{start=e.target.value;$('#next').disabled=!start};
  $('#back').onclick=()=>{step=1;render()};
  $('#next').onclick=()=>{if(start){step=3;render()}};
  paintMonth();loadSlots();
}
async function loadSlots() {
  const request=++slotRequest, menu=$('#times'), status=$('#time-status');
  start=''; $('#next').disabled=true; menu.disabled=true; error('');
  menu.replaceChildren(new Option('Checking times…',''));
  status.textContent='';
  if(chosen.requiresEngineer&&!engineerId){menu.replaceChildren(new Option('Choose an engineer first',''));if(!config.engineers.length)status.textContent='No studio engineers are available for this service.';return}
  try {
    const result=await api(`slots&service=${chosen.id}&hours=${hours}&date=${date}&engineerId=${encodeURIComponent(engineerId)}`);
    if(request!==slotRequest||!menu.isConnected)return;
    amount=result.amount;
    menu.replaceChildren(new Option(result.slots.length?'Select a time':'No available times',''));
    for(const stamp of result.slots)menu.add(new Option(time(stamp),stamp));
    menu.disabled=!result.slots.length;
    if(!result.slots.length)status.textContent='Choose another day for this session.';
  } catch(err) {
    if(request!==slotRequest||!menu.isConnected)return;
    menu.replaceChildren(new Option('Times unavailable',''));error(err.message);
    status.textContent='Select a day to try again.';
  }
}
function render(){error('');document.querySelectorAll('.steps span').forEach((e,i)=>e.classList.toggle('active',i+1===step));if(step===1){$('#booking').innerHTML=`<h2>Choose your session.</h2><p class="subtitle">Real space. Professional sound. Time for your next idea.</p>${config.services.map(s=>`<button class="service ${chosen?.id===s.id?'selected':''}" data-id="${s.id}"><span class="service-head"><h3>${esc(s.name)}</h3><strong>${s.fixed!==undefined?money(s.fixed):money(s.hourly)+'/hr'}</strong></span><small>${esc(s.description||(s.fixed!==undefined?s.min+' hours · fixed package':s.afterFour?'First 4 hours '+money(s.hourly)+'/hr · additional hours '+money(s.afterFour)+'/hr':s.min+'–'+s.max+' hours'))}</small></button>`).join('')}${!config.enabled||!config.checkoutReady?'<p class="notice">Online checkout is being connected. Explore the rates here, or call HiLife to arrange a session.</p><a class="secondary" href="tel:+14702237797">Call (470) 223-7797</a>':'<div class="actions"><span></span><button class="primary" id="next" '+(!chosen?'disabled':'')+'>Choose a time →</button></div>'}`;document.querySelectorAll('[data-id]').forEach(e=>e.onclick=()=>{chosen=config.services.find(s=>s.id===e.dataset.id);hours=chosen.min;engineerId='';render()});if($('#next'))$('#next').onclick=()=>{step=2;render()}}else if(step===2){renderTimeStep()}else{amount=chosen.fixed??(chosen.afterFour?Math.min(hours,4)*chosen.hourly+Math.max(0,hours-4)*chosen.afterFour:hours*chosen.hourly);$('#booking').innerHTML=`<h2>Make it official.</h2><p class="subtitle">Your session is confirmed after full payment.</p><div class="summary"><h3>${esc(chosen.name)}</h3><p>${day(start)} · ${time(start)} · ${hours} hours</p><p>555 Whitehall St SW · Atlanta</p><div class="total"><span>Total due today</span><strong>${money(amount)}</strong></div>${chosen.afterFour&&hours>4?`<p>4 hours × ${money(chosen.hourly)} + ${hours-4} hours × ${money(chosen.afterFour)}</p>`:''}</div><form id="details" class="form-grid"><label>Name<input name="clientName" autocomplete="name" required maxlength="100"></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label class="full">Phone<input name="phone" type="tel" autocomplete="tel" required maxlength="40"></label><label class="full">About your session<textarea name="notes" rows="2" maxlength="2000" placeholder="Tell us what you’re working on…"></textarea></label><label class="terms full"><input name="terms" type="checkbox" required><span>I agree to full payment up front and HiLife’s final-payment terms. Rescheduling and refunds require contacting the studio. I’ve read the <a href="/rates.html" target="_blank">rates and booking terms</a> and <a href="/privacy.html" target="_blank">privacy notice</a>.</span></label><div class="actions full"><button type="button" class="secondary" id="back">Back</button><button class="primary" type="submit">Pay ${money(amount)} with PayPal →</button></div></form><p class="subtitle" style="margin-top:18px;font-size:11px">You’ll complete payment securely on PayPal. A time selection alone is not a confirmed booking.</p>`;$('#back').onclick=()=>{step=2;render()};$('#details').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('[type=submit]');btn.disabled=true;error('');try{const input=Object.fromEntries(new FormData(e.target)),r=await api('checkout',{...input,serviceId:chosen.id,engineerId,hours,start,expectedAmount:amount,acceptTerms:input.terms==='on'});sessionStorage.setItem('hilife-checkout:'+r.bookingId,r.checkoutKey);location.href=r.url}catch(err){error(err.message);btn.disabled=false}}}}
async function init(){const q=new URLSearchParams(location.search),bookingId=q.get('booking');if(q.has('reservation')){const id=q.get('reservation'),key=q.get('key'),r=await api('reservation&id='+encodeURIComponent(id)+'&key='+encodeURIComponent(key));$('#booking').innerHTML=`<h2>Your studio session.</h2><p class="subtitle">Prepared for ${esc(r.clientName)}</p><div class="summary"><h3>${esc(r.serviceName)}</h3><p>${day(r.start)} · ${time(r.start)} · ${r.hours} hours</p><div class="total"><span>Total due</span><strong>${money(r.amount)}</strong></div></div>${r.status==='pending'&&r.checkoutReady?'<form id="reserved-pay"><label class="terms"><input name="terms" type="checkbox" required><span>I agree to full payment up front and HiLife’s final-payment terms. Contact the studio for session changes. <a href="/rates.html">Booking terms</a>.</span></label><div class="actions"><button class="primary">Pay in full with PayPal →</button></div></form>':`<p class="notice">${r.paymentStatus==='paid'?'Payment is already recorded for this session.':!r.checkoutReady?'PayPal is not connected yet. Contact HiLife to arrange payment.':'This session is not currently awaiting payment. Contact HiLife for help.'}</p><a href="tel:+14702237797">Call the studio</a>`}`;if($('#reserved-pay'))$('#reserved-pay').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{const x=await api('reservation-checkout',{id,key,acceptTerms:true});sessionStorage.setItem('hilife-checkout:'+x.bookingId,x.checkoutKey);location.href=x.url}catch(err){error(err.message);btn.disabled=false}};return;}if(bookingId){const key=sessionStorage.getItem('hilife-checkout:'+bookingId);$('#booking').innerHTML='<h2>Verifying your payment.</h2><p class="subtitle">Please keep this page open while we confirm your session with PayPal.</p>';try{if(!key)throw new Error('Open this checkout in the browser where you started it, or contact HiLife with your PayPal receipt.');const r=await api('capture',{bookingId,checkoutKey:key});$('#booking').innerHTML=r.status==='confirmed'?`<div class="confirmation"><div class="seal">✓</div><h2>You’re booked.</h2><p>Full payment verified. Your HiLife session is confirmed.</p><p>Booking reference<br><strong>${esc(r.bookingId.slice(0,8))}</strong></p><p>Keep your PayPal receipt. Contact the studio for any session changes.</p><a class="primary" href="/">Back to HiLife</a></div>`:`<div class="confirmation"><h2>Payment received.</h2><p>Your session needs owner review before confirmation. Please contact HiLife with reference ${esc(r.bookingId.slice(0,8))}.</p><a class="primary" href="tel:+14702237797">Call HiLife</a></div>`}catch(err){error(err.message);$('#booking').innerHTML='<h2>Let’s check your session.</h2><p class="subtitle">Your booking has not been confirmed on this page. If PayPal shows a charge, do not pay again—contact the studio so it can reconcile the payment.</p><a class="secondary" href="tel:+14702237797">Call HiLife</a>'}return}config=await api('config');render();if(q.has('cancelled'))error('Checkout cancelled. No session has been confirmed. An unpaid time hold expires automatically.')}
init().catch(e=>{error(e.message);$('#booking').innerHTML='<h2>Book with the studio.</h2><p class="subtitle">Online scheduling is temporarily unavailable.</p><a class="primary" href="tel:+14702237797">Call (470) 223-7797</a>'});
