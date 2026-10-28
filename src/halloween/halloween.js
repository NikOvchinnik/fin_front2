/* eslint-disable */
/**
 * Хеловінські пасхалки для Financial Booking.
 * Самодостатній модуль: без залежностей від React; three.js підвантажується динамічно (import('three')).
 * Використання:  const destroy = initHalloween({ ...опції });  ...  destroy();
 * Усі елементи мають префікс .hw-*, стилі — у halloween.css.
 */

const DEFAULTS={
  // Період показу (місяць, день) включно. Поза ним модуль нічого не робить.
  from:[10,24], to:[11,2],
  force:false,                 // true — показувати завжди (або додати ?halloween=1 до URL)
  // CSS-селектори елементів СПІЛЬНОГО каркасу (однакові для всіх ролей), куди ховаються гарбузи.
  // Ключ = id схованки. Незнайдений селектор просто пропускається. null — вимкнути схованку.
  spots:{
    logo:'[data-hw-spot="logo"]',
    study:'[data-hw-spot="study"]',
    lang:'[data-hw-spot="lang"]',
    user:'[data-hw-spot="user"]',
    deco:'[data-hw-spot="deco"]'
  },
  hints:{
    logo:'Хтось визирає з-за логотипа',
    study:'Зазирни туди, де вчаться',
    lang:'Він знає дві мови',
    user:'Ховається за твоїм ім’ям',
    deco:'Серед паличок унизу сайдбару',
    spider:'Павук щось тримає. Спробуй його зловити',
    ghost:'Привид лишає сюрприз, якщо на нього клікнути'
  },
  toolsMount:'[data-hw-tools]',  // куди вставити блок «Хеловін» (перемикач + 2 кнопки); якщо не знайдено — плаваюча панель
  toolsPosition:'prepend',       // 'prepend' | 'append'
  sidebar:'[data-hw-sidebar]',   // сайдбар (щоб павук/очі не з'являлися над ним)
  logo:'[data-hw-spot="logo"]',  // елемент для капості «перевернутий логотип»
  appRoot:'#root',               // що трусити в капості «трусонув екран»
  spiderFirst:20000, spiderEvery:6*60000,   // перший павук через 20 с, далі ~раз на 6 хв
  ghostFirst:60000,  ghostEvery:9*60000,    // перший привид через 1 хв, далі ~раз на 9 хв
  storagePrefix:'hw26'
};

export function initHalloween(userOptions={}){
  const opt={...DEFAULTS,...userOptions,spots:{...DEFAULTS.spots,...(userOptions.spots||{})},hints:{...DEFAULTS.hints,...(userOptions.hints||{})}};
  if(typeof window==='undefined'||window.__hwHalloweenActive)return ()=>{};
  // показуємо лише в заданий період (або примусово через ?halloween=1 / opt.force)
  const forced=opt.force||/[?&]halloween=1\b/.test(location.search);
  if(!forced){const d=new Date(),n=(d.getMonth()+1)*100+d.getDate();if(n<opt.from[0]*100+opt.from[1]||n>opt.to[0]*100+opt.to[1])return ()=>{};}
  window.__hwHalloweenActive=true;
  const CFG={spiderFirst:opt.spiderFirst,spiderEvery:opt.spiderEvery,ghostFirst:opt.ghostFirst,ghostEvery:opt.ghostEvery};
  const SPOT_IDS=Object.keys(opt.spots).filter(k=>opt.spots[k]);
  const HINTS={};SPOT_IDS.forEach(k=>HINTS[k]=opt.hints[k]||'Пошукай уважніше…');HINTS.spider=opt.hints.spider;HINTS.ghost=opt.hints.ghost;
  HINTS.night=opt.hints.night||'Спробуй ввімкнути ліхтарик';
  CFG.total=SPOT_IDS.length+3;
  const KEY_FOUND=opt.storagePrefix+'-found',KEY_ON=opt.storagePrefix+'-on';
  // прибирання (для React unmount / StrictMode)
  let dead=false;const cleanups=[];
  const on=(t,ev,fn,o)=>{t.addEventListener(ev,fn,o);cleanups.push(()=>t.removeEventListener(ev,fn,o));};
  let THREE_NS=null;

  const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const root=document.documentElement;
  let found=new Set(store.get(KEY_FOUND,[]));
  let enabled=store.get(KEY_ON,true);
  let mx=innerWidth/2,my=innerHeight/2;

  const SVG={
    pumpkin:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 9.5c-.4-3 1-5.6 3.8-6.5" stroke="#4f7a28" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="10.5" cy="19.5" rx="7.5" ry="9" fill="#e06d12"/><ellipse cx="21.5" cy="19.5" rx="7.5" ry="9" fill="#e06d12"/><ellipse cx="16" cy="19.5" rx="7" ry="9.6" fill="#f68a26"/><path d="M10.5 17.2l2.4-3 2 3zM17.1 17.2l2-3 2.4 3z" fill="#4a2508"/><path d="M10.5 21.5c2.2 3.4 8.8 3.4 11 0l-2 .9-1.6-.9-1.9 1.1-1.9-1.1-1.6.9z" fill="#4a2508"/></svg>',
    spider:'<svg viewBox="0 0 40 40" aria-hidden="true"><g class="legs" stroke="#2b2238" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M15 19 8 13 4 15"/><path d="M15 22 6 21 3 24"/><path d="M15 24 8 29 6 34"/><path d="M16 26 12 33 12 38"/><path d="M25 19 32 13 36 15"/><path d="M25 22 34 21 37 24"/><path d="M25 24 32 29 34 34"/><path d="M24 26 28 33 28 38"/></g><ellipse cx="20" cy="25" rx="7" ry="8" fill="#2b2238"/><circle cx="20" cy="15" r="5" fill="#3d3152"/><circle cx="18" cy="14.5" r="1.7" fill="#fff"/><circle cx="22" cy="14.5" r="1.7" fill="#fff"/><circle cx="18.3" cy="14.9" r=".75" fill="#2b2238"/><circle cx="22.3" cy="14.9" r=".75" fill="#2b2238"/></svg>',
    ghost:'<svg viewBox="0 0 56 52" aria-hidden="true"><path d="M10 48V24a18 18 0 0 1 36 0v24l-4.5-4-4.5 4-4.5-4-4.5 4-4.5-4-4.5 4-4.5-4z" fill="#fbfaff" stroke="#cbc1ee" stroke-width="1.6" stroke-linejoin="round"/><circle class="blush" cx="18" cy="30" r="2.6" fill="#ffb3c7"/><circle class="blush" cx="38" cy="30" r="2.6" fill="#ffb3c7"/><circle cx="22" cy="23" r="3" fill="#2b2238"/><circle cx="34" cy="23" r="3" fill="#2b2238"/><ellipse cx="28" cy="32" rx="2.4" ry="3.2" fill="#2b2238"/><ellipse class="hand-l" cx="13" cy="33" rx="4.6" ry="3.6" fill="#fbfaff" stroke="#cbc1ee" stroke-width="1.6"/><ellipse class="hand-r" cx="43" cy="33" rx="4.6" ry="3.6" fill="#fbfaff" stroke="#cbc1ee" stroke-width="1.6"/></svg>',
    ghostSmall:'<svg viewBox="0 0 56 52" aria-hidden="true"><path d="M10 48V24a18 18 0 0 1 36 0v24l-4.5-4-4.5 4-4.5-4-4.5 4-4.5-4-4.5 4-4.5-4z" fill="#fbfaff"/><circle cx="22" cy="23" r="3.4" fill="#2b2238"/><circle cx="34" cy="23" r="3.4" fill="#2b2238"/><ellipse cx="28" cy="32" rx="2.6" ry="3.4" fill="#2b2238"/></svg>',
    bat:'<svg viewBox="0 0 40 20" aria-hidden="true"><path d="M20 6C18.5 3 16.5 3 15.5 5 12 2 6 1.5 0 4c4 1 6 4 6 7 3-2 6-1 8 2 2-2 4-1.5 6 2 2-3.5 4-4 6-2 2-3 5-4 8-2 0-3 2-6 6-7-6-2.5-12-2-15.5 1-1-2-3-2-4.5 1z" fill="#2b2238"/><circle cx="18.6" cy="7.6" r=".8" fill="#ffd23f"/><circle cx="21.4" cy="7.6" r=".8" fill="#ffd23f"/></svg>'
  };

  /* ---------- блок керування: перемикач, «Ласощі чи капость?», ліхтарик ---------- */
  const tools=document.createElement('div');tools.className='hw-tools';
  tools.innerHTML='<div class="hw-head"><span>Хеловін</span><label class="hw-switch"><input type="checkbox" id="hw-enabled" checked aria-label="Увімкнути хеловін"><span></span></label></div>'+
    '<div class="hw-actions"><button type="button" id="hw-trick" title="Ласощі чи капость?">'+SVG.pumpkin+'<span>Ласощі чи капость?</span></button>'+
    '<button type="button" id="hw-light" aria-pressed="false" title="Нічний режим" aria-label="Нічний режим">'+SVG.ghostSmall+'</button></div>';
  const mountTools=()=>{const m=opt.toolsMount&&document.querySelector(opt.toolsMount);
    if(m){tools.classList.remove('is-floating');if(tools.parentNode!==m)(opt.toolsPosition==='append'?m.appendChild(tools):m.insertBefore(tools,m.firstChild));}
    else if(!tools.isConnected){tools.classList.add('is-floating');document.body.appendChild(tools);}};
  mountTools();

  /* ---------- toast ---------- */
  const toastEl=document.createElement('div');toastEl.className='hw-toast';toastEl.setAttribute('role','status');document.body.appendChild(toastEl);
  let toastT;
  function toast(t){toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('show'),2800);}

  /* ---------- гарбузи ---------- */
  function pumpkinEl(id,cls){
    const b=document.createElement('button');b.type='button';b.className='hw-pumpkin '+cls;b.dataset.id=id;
    b.setAttribute('aria-label','Гарбуз');b.innerHTML=SVG.pumpkin;
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();collect(id,b);});
    return b;
  }
  function placeSpots(){
    if(!enabled)return;
    SPOT_IDS.forEach(id=>{
      const spot=document.querySelector(opt.spots[id]);if(!spot)return;
      if(found.has(id)||spot.querySelector(':scope > .hw-pumpkin'))return;
      if(getComputedStyle(spot).position==='static')spot.style.position='relative';
      spot.appendChild(pumpkinEl(id,'hw-spot-'+id));
    });
  }
  function dropPumpkin(id,x,y){
    if(found.has(id)||document.querySelector('.hw-dropped[data-id="'+id+'"]'))return;
    const b=pumpkinEl(id,'hw-dropped');
    b.style.left=(x-14)+'px';b.style.top=(y-14)+'px';document.body.appendChild(b);
    if(!reduce)b.animate([{transform:'translateY(-30px) scale(.4)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1}],{duration:650,easing:'cubic-bezier(.4,1.6,.5,1)'});
    setTimeout(()=>{if(b.isConnected){b.animate([{opacity:1},{opacity:0}],{duration:500}).onfinish=()=>b.remove();}},25000);
  }

  /* HUD-лічильник */
  const hud=document.createElement('div');hud.className='hw-hud';hud.hidden=true;
  hud.innerHTML='<div class="hw-hint" hidden></div><button type="button" class="hw-hud-btn" aria-label="Знайдені гарбузи">'+SVG.pumpkin+'<span class="hw-count"></span></button>';
  document.body.appendChild(hud);
  const hudBtn=hud.querySelector('.hw-hud-btn'),hint=hud.querySelector('.hw-hint'),countEl=hud.querySelector('.hw-count');
  function updateHud(){countEl.textContent=found.size+' / '+CFG.total;hud.hidden=found.size===0;}
  hudBtn.addEventListener('click',()=>{
    if(!hint.hidden){hint.hidden=true;return;}
    const left=Object.keys(HINTS).filter(k=>!found.has(k));
    if(left.length)hint.textContent='Підказка: '+HINTS[left[Math.floor(Math.random()*left.length)]];
    else{hint.innerHTML='Усі гарбузи знайдено. Ти справжній гарбузовий детектив!<button type="button" class="hw-again">Сховати гарбузи знову</button>';
      hint.querySelector('button').addEventListener('click',()=>{hint.hidden=true;api.reset();});}
    hint.hidden=false;clearTimeout(hint._t);hint._t=setTimeout(()=>hint.hidden=true,left.length?5000:9000);
  });

  function crumbs(x,y){
    for(let i=0;i<9;i++){const c=document.createElement('div');c.className='hw-crumb';c.style.left=x+'px';c.style.top=y+'px';
      c.style.background=['#e36a12','#f59a3c','#ffd27a','#b84a0a'][i%4];document.body.appendChild(c);
      const a=rnd(-2.6,-.5),d=rnd(30,70);
      c.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) rotate(${rnd(-200,200)}deg)`,opacity:1,offset:.5},{transform:`translate(${Math.cos(a)*d*1.3}px,${Math.sin(a)*d+60}px) rotate(${rnd(-300,300)}deg)`,opacity:0}],{duration:rnd(700,1000),easing:'ease-out'}).onfinish=()=>c.remove();}
  }
  function collect(id,el){
    if(found.has(id)){el.remove();return;}
    found.add(id);store.set(KEY_FOUND,[...found]);
    const r=el.getBoundingClientRect();el.remove();
    updateHud();
    const icon=hudBtn.firstElementChild,eating=!!(G3.pumpkin&&!reduce);
    let t=icon.getBoundingClientRect();
    if(eating){
      // рот збільшеного гарбуза: точка всередині з урахуванням масштабу 2.6 від низу
      const ox=t.left+t.width*.65,oy=t.top+t.height,px=t.left+t.width*.5,py=t.top+t.height*.62;
      t={left:ox+(px-ox)*2.6-r.width/2,top:oy+(py-oy)*2.6-r.height/2+14};
      icon.classList.add('is-eating');G3.pumpkin.eat();
      setTimeout(()=>{crumbs(ox+(px-ox)*2.6,oy+(py-oy)*2.6);},720);
      setTimeout(()=>icon.classList.remove('is-eating'),1800);
    }
    const fly=document.createElement('div');fly.className='hw-pumpkin';
    Object.assign(fly.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:115,pointerEvents:'none'});
    fly.innerHTML=SVG.pumpkin;document.body.appendChild(fly);
    const dx=t.left-r.left,dy=t.top-r.top;
    const anim=reduce?fly.animate([{opacity:1},{opacity:0}],{duration:300}):eating?fly.animate([
      {transform:'translate(0,0) scale(1)'},
      {transform:`translate(${dx*.45}px,${dy*.45-80}px) scale(1.8) rotate(-25deg)`,offset:.45},
      {transform:`translate(${dx}px,${dy}px) scale(1.3) rotate(15deg)`}
    ],{duration:450,easing:'cubic-bezier(.45,0,.6,1)'}):fly.animate([
      {transform:'translate(0,0) scale(1)'},
      {transform:`translate(${dx*.3}px,${dy*.3-90}px) scale(2.2) rotate(-20deg)`,offset:.35},
      {transform:`translate(${dx}px,${dy}px) scale(1) rotate(0)`}
    ],{duration:950,easing:'cubic-bezier(.5,0,.4,1)'});
    anim.onfinish=()=>{fly.remove();if(eating)return;if(G3.pumpkin){G3.pumpkin.bump();return;}if(!reduce)hudBtn.animate([{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:350});};
    const left=CFG.total-found.size;
    if(left===0)setTimeout(celebrate,1000);
    else toast(left===1?'Гарбуз знайдено! Лишився останній':'Гарбуз знайдено! Ще '+left);
  }

  function celebrate(){
    bats(14);burst('confetti',170);if(G3.pumpkin)G3.pumpkin.party();
    const m=document.createElement('div');m.className='hw-modal';
    m.innerHTML='<div class="hw-modal-card" role="dialog" aria-modal="true" aria-labelledby="hw-mt">'+SVG.pumpkin+'<h2 id="hw-mt">Гарбузовий детектив 2026</h2><p>Ти знайшов(-ла) усі 7 гарбузів. Похвалися колегам, тільки не кажи, де вони сховані.</p><button type="button">Забрати звання</button></div>';
    document.body.appendChild(m);
    const btn=m.querySelector('button');btn.focus();
    const close=()=>{m.remove();burst('candy',60);};
    btn.addEventListener('click',close);m.addEventListener('click',e=>{if(e.target===m)close();});
  }

  /* ---------- частинки: конфеті та цукерки ---------- */
  const fx={c:null,ctx:null,p:[],raf:0,last:0};
  function fxSize(){if(!fx.c)return;const d=devicePixelRatio||1;fx.c.width=innerWidth*d;fx.c.height=innerHeight*d;fx.ctx.setTransform(d,0,0,d,0,0);}
  function burst(kind,n){
    if(reduce)return;
    if(!fx.c){fx.c=document.createElement('canvas');fx.c.className='hw-fx';document.body.appendChild(fx.c);fx.ctx=fx.c.getContext('2d');fxSize();on(window,'resize',fxSize);}
    const cols=kind==='candy'?['#f68a26','#7b4fd6','#8fd14f','#ff5d8f']:['#f68a26','#7b4fd6','#8fd14f','#2b2238','#ffd23f'];
    for(let i=0;i<n;i++)fx.p.push({k:kind,x:rnd(0,innerWidth),y:rnd(-innerHeight*.7,-20),vx:rnd(-40,40),vy:rnd(140,300),r:rnd(0,6.28),vr:rnd(-5,5),s:kind==='candy'?rnd(7,11):rnd(5,9),c:cols[i%cols.length]});
    if(!fx.raf){fx.last=performance.now();fx.raf=requestAnimationFrame(fxLoop);}
  }
  function fxLoop(now){
    const dt=Math.min(.05,(now-fx.last)/1000);fx.last=now;const g=fx.ctx;
    g.clearRect(0,0,innerWidth,innerHeight);
    fx.p=fx.p.filter(p=>p.y<innerHeight+40);
    for(const p of fx.p){
      p.x+=p.vx*dt+Math.sin(p.y/40)*.6;p.y+=p.vy*dt;p.r+=p.vr*dt;
      g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;
      if(p.k==='candy'){
        g.beginPath();g.ellipse(0,0,p.s,p.s*.62,0,0,6.283);g.fill();
        g.beginPath();g.moveTo(-p.s+1,0);g.lineTo(-p.s*1.75,-p.s*.6);g.lineTo(-p.s*1.75,p.s*.6);g.closePath();g.fill();
        g.beginPath();g.moveTo(p.s-1,0);g.lineTo(p.s*1.75,-p.s*.6);g.lineTo(p.s*1.75,p.s*.6);g.closePath();g.fill();
        g.fillStyle='rgba(255,255,255,.55)';g.fillRect(-p.s*.25,-p.s*.62,p.s*.22,p.s*1.24);
      }else{g.fillRect(-p.s/2,-p.s*.22,p.s,p.s*.45);}
      g.restore();
    }
    if(fx.p.length)fx.raf=requestAnimationFrame(fxLoop);else{fx.raf=0;g.clearRect(0,0,innerWidth,innerHeight);}
  }

  /* ---------- кажани ---------- */
  function bats(n){
    if(reduce)return;
    for(let i=0;i<n;i++){
      const b=document.createElement('div');b.className='hw-bat';b.innerHTML=SVG.bat;document.body.appendChild(b);
      const s=rnd(.7,1.4),ltr=Math.random()<.6;
      const x0=ltr?-60:innerWidth+20,x1=ltr?innerWidth+60:-80;
      const y0=rnd(innerHeight*.45,innerHeight),y1=rnd(-120,-40),ym=rnd(innerHeight*.1,innerHeight*.6);
      b.animate([
        {transform:`translate(${x0}px,${y0}px) scale(${s})`},
        {transform:`translate(${(x0+x1)/2+rnd(-150,150)}px,${ym}px) scale(${s})`},
        {transform:`translate(${x1}px,${y1}px) scale(${s})`}
      ],{duration:rnd(2200,3800),delay:i*110,easing:'ease-in-out',fill:'both'}).onfinish=()=>b.remove();
    }
  }

  /* ---------- павук ---------- */
  let spider=null;
  function sideRight(){const s=opt.sidebar&&document.querySelector(opt.sidebar);if(!s)return 0;const r=s.getBoundingClientRect();return r.height>innerHeight*.8?r.right:0;}
  function spiderSay(s,t){s.say.textContent=t;s.say.hidden=false;clearTimeout(s.sayT);s.sayT=setTimeout(()=>s.say.hidden=true,1600);}
  function setDepth(s,h,ms){s.thread.style.transition='height '+ms+'ms cubic-bezier(.3,.7,.4,1)';s.thread.style.height=h+'px';}
  function spawnSpider(){
    if(!enabled||spider)return;
    const minX=sideRight()+50,x=rnd(minX,Math.max(minX+20,innerWidth-110));
    const el=document.createElement('div');el.className='hw-spider';el.style.left=x+'px';
    el.innerHTML='<div class="hw-thread"></div><button type="button" class="hw-spider-body" aria-label="Павук">'+SVG.spider+'</button><div class="hw-say" hidden></div>';
    document.body.appendChild(el);
    const s={el,thread:el.querySelector('.hw-thread'),body:el.querySelector('.hw-spider-body'),say:el.querySelector('.hw-say'),flee:0,state:'down'};
    spider=s;
    s.three=G3.state==='ready'&&!!G3.spider;
    if(s.three){
      el.classList.add('is-3d');s.body.innerHTML='';s.body.appendChild(G3.spider.canvas);
      let last=performance.now();
      const loop=now=>{
        if(!el.isConnected)return;
        const dt=Math.min(.05,(now-last)/1000);last=now;
        const r=s.body.getBoundingClientRect();
        G3.spider.update(s,dt,r.left+r.width/2,r.top+r.height/2);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{setDepth(s,rnd(150,340),reduce?0:2400);s.state='hang';}));
    s.leaveT=setTimeout(()=>leaveSpider(s),18000);
    s.body.addEventListener('click',()=>{
      if(s.state!=='hang')return;
      s.state='spin';clearTimeout(s.leaveT);
      const r=s.body.getBoundingClientRect();
      const done=()=>{
        if(!found.has('spider')){dropPumpkin('spider',r.left+r.width/2,r.bottom+40);spiderSay(s,'Ой, гарбуз упав!');}
        else spiderSay(s,'Хі-хі, лоскотно!');
        setTimeout(()=>leaveSpider(s),900);
      };
      if(s.three){G3.spider.spin();setTimeout(done,780);}
      else if(reduce)done();else s.body.animate([{transform:'rotate(0)'},{transform:'rotate(720deg)'}],{duration:700,easing:'ease-in-out'}).onfinish=done;
    });
  }
  function leaveSpider(s){
    if(!s||s.state==='leave')return;s.state='leave';clearTimeout(s.leaveT);
    setDepth(s,0,reduce?0:1300);
    setTimeout(()=>{s.el.remove();if(spider===s)spider=null;},reduce?50:1350);
  }
  function checkSpider(){
    const s=spider;if(!s||s.state!=='hang')return;
    const r=s.body.getBoundingClientRect();
    if(Math.hypot(mx-(r.left+r.width/2),my-(r.top+r.height/2))>80)return;
    if(s.flee<2){
      s.flee++;s.state='flee';setDepth(s,14,260);
      spiderSay(s,s.flee===1?'Ой!':'Не чіпай!');
      setTimeout(()=>{if(spider!==s||s.state!=='flee')return;setDepth(s,rnd(150,340),1500);s.state='hang';},1300);
    }else if(!s.tired){s.tired=true;spiderSay(s,'Все, втомився…');}
  }

  /* ---------- 3D-привид (WebGL, three.js підвантажується ліниво; якщо не вдалося — плаский SVG) ---------- */
  const G3={state:'idle'};
  function loadThree(){
    if(G3.state!=='idle')return;G3.state='loading';
    import('three').then(m=>{if(dead)return;THREE_NS=m;try{initG3();}catch(e){console.warn('[halloween] 3D вимкнено:',e);G3.state='failed';}})
      .catch(e=>{console.warn('[halloween] three.js не завантажився:',e);G3.state='failed';});
  }
  function initG3(){
    const T=THREE_NS,W=170,H=210;G3.renderers=[];
    const renderer=new T.WebGLRenderer({alpha:true,antialias:true});G3.renderers.push(renderer);
    renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setSize(W,H);renderer.setClearColor(0x000000,0);
    const scene=new T.Scene();
    const cam=new T.PerspectiveCamera(30,W/H,.1,50);cam.position.set(0,-.55,8.6);
    const sph=new T.SphereGeometry(1,24,16);
    const lerp=(a,b,k)=>a+(b-a)*k,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

    // профіль: невеликий купол + довге полотно, що розширюється донизу
    const HL=2.1,pts=[];
    for(let i=0;i<=36;i++){const a=i/36*Math.PI/2;pts.push(new T.Vector2(Math.max(.0001,Math.sin(a)*.8),Math.cos(a)*.85));}
    for(let i=1;i<=40;i++){const t=i/40;pts.push(new T.Vector2(.8+.32*Math.pow(t,1.4),-t*HL));}
    const bodyGeo=new T.LatheGeometry(pts,120);

    const vert=`
      uniform float uTime; uniform float uLean;
      varying vec3 vN; varying vec3 vV; varying float vT; varying float vA;
      void main(){
        vec3 p=position;
        float a=atan(p.z,p.x);
        float t=clamp(-p.y/${HL.toFixed(2)},0.,1.);
        p.y+=sin(a*5.+uTime*2.4)*.13*t*t+sin(a*9.-uTime*3.1)*.05*t*t;
        p.xz*=1.+.1*t*sin(uTime*1.8+a*3.)+.05*t*sin(uTime*3.3-a*7.);
        p.x+=-uLean*t*t*.8+sin(uTime*1.3+t*4.)*.09*t;
        p.z+=cos(uTime*1.1+t*3.)*.06*t;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        vV=normalize(-mv.xyz); vN=normalize(normalMatrix*normal); vT=t; vA=a;
        gl_Position=projectionMatrix*mv;
      }`;
    const frag=`
      uniform float uOpacity; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying float vT; varying float vA;
      void main(){
        float n=.5+.5*sin(vA*9.+uTime*1.4)*cos(vA*5.-uTime*.8);
        float n2=.5+.5*sin(vA*23.-uTime*2.2);
        float edge=.58+.3*n+.08*n2;
        if(vT>edge) discard;
        vec3 nn=normalize(vN); if(!gl_FrontFacing) nn=-nn;
        float fres=pow(1.-abs(dot(nn,normalize(vV))),1.8);
        vec3 L=normalize(vec3(-.4,.8,.6));
        float wrap=max((dot(nn,L)+.6)/1.6,0.);
        vec3 col=mix(vec3(.80,.84,.95),vec3(.97,.98,1.),wrap);
        col=mix(col,vec3(.42,.5,.82),fres*.75);
        col=mix(col,vec3(.72,.77,.93),vT*.6);
        if(!gl_FrontFacing) col*=.82;
        float alpha=mix(.5,.95,fres)*(1.-smoothstep(edge-.3,edge,vT))*(1.-vT*.35);
        gl_FragColor=vec4(col,alpha*uOpacity);
      }`;
    const bodyMat=new T.ShaderMaterial({uniforms:{uTime:{value:0},uLean:{value:0},uOpacity:{value:1}},vertexShader:vert,fragmentShader:frag,transparent:true,side:T.DoubleSide,depthWrite:false});

    const ghostG=new T.Group();scene.add(ghostG);
    ghostG.add(new T.Mesh(bodyGeo,bodyMat));

    // обличчя: порожні очниці з холодними відблисками і видовжений «рот»
    const voidM=new T.MeshBasicMaterial({color:0x0e0c1f,transparent:true,opacity:.9,depthWrite:false});
    const mouthM=new T.MeshBasicMaterial({color:0x0e0c1f,transparent:true,opacity:.6,depthWrite:false});
    const glintM=new T.MeshBasicMaterial({color:0x9fc4ff,transparent:true,opacity:.8,depthWrite:false});
    const disc=new T.CircleGeometry(1,32);
    const onFace=(m,x,y)=>{const z=Math.sqrt(Math.max(0,.64-x*x-(y*.8/.85)*(y*.8/.85)))+.012;m.position.set(x,y,z);m.lookAt(x*3,y*3,z*3);ghostG.add(m);return m;};
    const sockets=[-1,1].map(s=>{const e=onFace(new T.Mesh(disc,voidM),s*.24,.18);e.rotation.z-=s*.32;e.userData.s=s;return e;});
    const glints=[-1,1].map(s=>{const g=new T.Mesh(sph,glintM);g.scale.setScalar(.016);g.userData.b=new T.Vector3(s*.24,.18,.8);ghostG.add(g);return g;});
    const mouth=onFace(new T.Mesh(disc,mouthM),0,-.2);

    // димка, що тягнеться з-під краю
    const NP=60,pPos=new Float32Array(NP*3),pLife=new Float32Array(NP),pVel=[];
    for(let i=0;i<NP;i++){pLife[i]=Math.random();pVel.push(new T.Vector3());}
    const pGeo=new T.BufferGeometry();
    pGeo.setAttribute('position',new T.BufferAttribute(pPos,3));pGeo.setAttribute('aLife',new T.BufferAttribute(pLife,1));
    const pMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:1},uScale:{value:H*Math.min(2,devicePixelRatio||1)}},
      vertexShader:`attribute float aLife; uniform float uScale; varying float vL;
        void main(){vL=aLife; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=uScale*(.09+.13*(1.-aLife))/-mv.z*2.2; gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float uOpacity; varying float vL;
        void main(){float d=length(gl_PointCoord-.5); if(d>.5) discard; float f=1.-d*2.; float a=f*f*vL*.5*uOpacity; gl_FragColor=vec4(.88,.91,1.,a);}`});
    scene.add(new T.Points(pGeo,pMat));
    const respawn=(i,lean)=>{
      const a=Math.random()*6.283,r=.95+Math.random()*.2;
      pPos[i*3]=Math.cos(a)*r-lean*.7;pPos[i*3+1]=-HL*rnd(.6,.85);pPos[i*3+2]=Math.sin(a)*r*.6;
      pVel[i].set(rnd(-.15,.15)-lean*.6,rnd(-.35,-.1),rnd(-.1,.1));pLife[i]=1;
    };

    // холодне світіння позаду
    const gc=document.createElement('canvas');gc.width=gc.height=128;const gx=gc.getContext('2d');
    const grd=gx.createRadialGradient(64,64,0,64,64,64);grd.addColorStop(0,'rgba(150,170,240,.45)');grd.addColorStop(1,'rgba(150,170,240,0)');
    gx.fillStyle=grd;gx.fillRect(0,0,128,128);
    const halo=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(gc),depthWrite:false,transparent:true}));
    halo.scale.set(3.6,5,1);halo.position.set(0,-.6,-1.4);scene.add(halo);

    let time=0,shyK=0,flick=1,flickT=3,lean=0;
    G3.canvas=renderer.domElement;G3.w=W;G3.h=H;
    G3.update=(g,dt)=>{
      const k=1-Math.pow(.001,dt||.016);
      shyK=lerp(shyK,g.shy?1:0,Math.min(1,k*2));
      time+=dt;
      const cx=g.x+W/2,cy=g.y+H*.35;
      const dx=clamp((mx-cx)/260,-1,1),dy=clamp((my-cy)/320,-1,1);
      lean=lerp(lean,clamp((g.vx||0)/80,-1,1),k);
      // моторошне мерехтіння: зрідка гасне на мить
      flickT-=dt;
      if(flickT<0){flick=Math.random()<.5?.15:.45;if(flickT<-.09){flickT=Math.random()<.35?rnd(.05,.15):rnd(3,7);flick=1;}}
      const op=(1-shyK*.72)*flick;
      bodyMat.uniforms.uTime.value=time;bodyMat.uniforms.uLean.value=lean;bodyMat.uniforms.uOpacity.value=op;
      voidM.opacity=.9*op;mouthM.opacity=.6*op;glintM.opacity=.8*op*(1-shyK*.6);pMat.uniforms.uOpacity.value=op;
      ghostG.rotation.y=lerp(ghostG.rotation.y,g.shy?-dx*.5:dx*.35,k);
      ghostG.rotation.x=lerp(ghostG.rotation.x,dy*.2,k);
      ghostG.rotation.z=lerp(ghostG.rotation.z,-lean*.12,k);
      ghostG.position.y=Math.sin(time*1.3)*.06;
      // очниці: звужуються, коли привид ховається; рот «завиває» повільно
      sockets.forEach(e=>e.scale.set(.105,.21*(1-shyK*.75),1));
      mouth.scale.set(.07+.01*Math.sin(time*1.7),(.16+.04*Math.sin(time*1.7))*(1-shyK*.6),1);
      glints.forEach(gl=>gl.position.set(gl.userData.b.x+dx*.03,gl.userData.b.y-dy*.03+.02,gl.userData.b.z));
      for(let i=0;i<NP;i++){
        pLife[i]-=dt*.7;
        if(pLife[i]<=0){respawn(i,lean);continue;}
        pPos[i*3]+=pVel[i].x*dt;pPos[i*3+1]+=pVel[i].y*dt;pPos[i*3+2]+=pVel[i].z*dt;
      }
      pGeo.attributes.position.needsUpdate=true;pGeo.attributes.aLife.needsUpdate=true;
      halo.material.opacity=(.6+Math.sin(time*1.3)*.2)*op;
      renderer.render(scene,cam);
    };

    /* ----- 3D-павук: мультяшний, сіро-фіолетовий, з жовтими очима ----- */
    const SW=130,SH=130;
    const sr=new T.WebGLRenderer({alpha:true,antialias:true});G3.renderers.push(sr);
    sr.setPixelRatio(Math.min(2,devicePixelRatio||1));sr.setSize(SW,SH);sr.setClearColor(0x000000,0);
    const ss=new T.Scene(),sc=new T.PerspectiveCamera(30,1,.1,50);sc.position.set(0,.22,7.1);
    ss.add(new T.AmbientLight(0xffffff,.55));
    const key=new T.DirectionalLight(0xffffff,.8);key.position.set(-2,3,4);ss.add(key);
    const tone=new T.DataTexture(new Uint8Array([105,180,255]),3,1,T.LuminanceFormat);
    tone.minFilter=tone.magFilter=T.NearestFilter;tone.needsUpdate=true;
    const toon=c=>new T.MeshToonMaterial({color:c,gradientMap:tone});
    const bodyM=toon(0x625a6b),headM=toon(0x6b6375),craterM=toon(0x3f3947),legM=toon(0x5f5767);
    const flat=c=>new T.MeshBasicMaterial({color:c});
    const inkM=flat(0x17121b),whiteF=flat(0xffffff),yellowF=flat(0xe8d24a),noseM=toon(0xe0898f),fangM=toon(0xf2efe9);
    const outlineM=new T.MeshBasicMaterial({color:0x17121b,side:T.BackSide});
    const withOutline=(mesh,k)=>{const o=new T.Mesh(mesh.geometry,outlineM);o.scale.setScalar(k);mesh.add(o);return mesh;};
    const sp=new T.Group();ss.add(sp);
    const rig=new T.Group();rig.position.y=.15;sp.add(rig);

    // велике черевце з «кратерами»
    const ac=new T.Vector3(.08,.95,-.62),ar=new T.Vector3(.78,.76,.7);
    const abd=withOutline(new T.Mesh(sph,bodyM),1.035);abd.scale.copy(ar);abd.position.copy(ac);rig.add(abd);
    [[.1,.75,.65,.14],[-.55,.5,.66,.1],[.62,.35,.7,.12],[.35,.1,.93,.07],[-.25,.25,.93,.06],[.75,.62,.2,.16],[-.2,.95,.25,.09],[.5,.75,.45,.05]].forEach(([x,y,z,r])=>{
      const n=new T.Vector3(x,y,z).normalize();const m=new T.Mesh(sph,craterM);m.scale.set(r,r,.015);
      m.position.set(ac.x+n.x*ar.x,ac.y+n.y*ar.y,ac.z+n.z*ar.z);m.lookAt(m.position.clone().add(n));rig.add(m);
    });
    // голова
    const hc=new T.Vector3(0,-.18,.2),hrv=new T.Vector3(.52,.47,.45);
    const head=withOutline(new T.Mesh(sph,headM),1.045);head.scale.copy(hrv);head.position.copy(hc);rig.add(head);
    const onHead=(obj,x,y,o)=>{const z=hc.z+hrv.z*Math.sqrt(Math.max(0,1-((x-hc.x)/hrv.x)**2-((y-hc.y)/hrv.y)**2))+o;
      obj.position.set(x,y,z);const n=new T.Vector3((x-hc.x)/hrv.x**2,(y-hc.y)/hrv.y**2,(z-hc.z)/hrv.z**2).normalize();obj.lookAt(obj.position.clone().add(n));return obj;};
    // величезні очі: жовтий обідок, чорна зіниця, відблиск
    const bigEyes=[-1,1].map(s=>{
      const g=new T.Group();rig.add(g);onHead(g,s*.215,-.13,.03);
      const rimO=new T.Mesh(sph,inkM);rimO.scale.set(.245,.245,.06);g.add(rimO);
      const ring=new T.Mesh(sph,yellowF);ring.scale.set(.218,.218,.075);ring.position.z=.008;g.add(ring);
      const pg=new T.Group();g.add(pg);
      const pupil=new T.Mesh(sph,inkM);pupil.scale.set(.165,.165,.08);pupil.position.z=.02;pg.add(pupil);
      const h=new T.Mesh(sph,whiteF);h.scale.set(.055,.055,.02);h.position.set(-.05,.055,.1);g.add(h);
      return {g,pg,pupil};
    });
    // носик та ікла
    onHead(new T.Mesh(sph,noseM),0,-.44,.035).scale.set(.075,.05,.04);
    const fangG=new T.ConeGeometry(.035,.13,8);
    [-1,1].forEach(s=>{const f=withOutline(new T.Mesh(fangG,fangM),1.15);f.rotation.x=Math.PI;f.rotation.z=s*.12;f.position.set(s*.14,-.57,.5);rig.add(f);});

    // кутасті лапки з трьох сегментів, темні смужки на суглобах
    const SEG=[[.5,.055],[.55,.048],[.5,.038]];
    const legs=[];
    const segMesh=(parent,len,r,last)=>{
      const g=last?new T.CylinderGeometry(.004,r,len,8):new T.CylinderGeometry(r*.9,r,len,8);g.translate(0,len/2,0);
      const m=new T.Mesh(g,legM);parent.add(m);
      const bandG=new T.CylinderGeometry(r*1.08,r*1.08,.05,8);const b=new T.Mesh(bandG,inkM);b.position.y=len-.04;if(!last)parent.add(b);
    };
    [64,34,6,-24].forEach((deg,i)=>[-1,1].forEach(s=>{
      const hip=new T.Group();hip.position.set(s*.32,.0+(1.5-i)*.1,-.15);hip.rotation.x=(i-1.5)*-.38;rig.add(hip);
      const js=[];let par=hip;
      SEG.forEach(([len,r],n)=>{const j=new T.Group();if(n>0)j.position.y=SEG[n-1][0];par.add(j);segMesh(j,len,r,n===2);js.push(j);par=j;});
      const L={js,s,i,base:[-s*(Math.PI/2-deg*Math.PI/180),-s*1.0,-s*.35],tw:0,twT:rnd(1,4)};
      js.forEach((j,n)=>j.rotation.z=L.base[n]);legs.push(L);
    }));

    let st=0,stime=0,spinT=0,turn=0,sBlink=2.5,fleeK=0,tiredK=0;
    G3.spider={canvas:sr.domElement,w:SW,h:SH,
      spin(){spinT=.85;},
      update(s,dt,cx,cy){
        const flee=s.state==='flee',tired=!!s.tired;
        const slow=1-Math.pow(.02,dt),med=1-Math.pow(.0005,dt);
        fleeK=lerp(fleeK,flee?1:0,med);tiredK=lerp(tiredK,tired?1:0,slow);
        const speed=reduce?1.5:flee?22:tired?2.5:6;
        const amp=flee?.3:tired?.04:.1;
        st+=dt*speed;stime+=dt;
        for(const L of legs){
          L.twT-=dt;if(L.twT<0){L.tw=1;L.twT=rnd(1.5,5);}
          L.tw=Math.max(0,L.tw-dt*4);
          const ph=st+L.i*1.2+(L.s>0?0:Math.PI),tw=Math.sin(L.tw*Math.PI)*.28;
          L.js[0].rotation.z=L.base[0]+L.s*(Math.sin(ph)*amp+tw*.5)-L.s*.25*tiredK;
          L.js[1].rotation.z=L.base[1]+L.s*(Math.sin(ph+.9)*amp*1.2-tw)-L.s*.35*tiredK;
          L.js[2].rotation.z=L.base[2]+L.s*(Math.sin(ph+1.6)*amp)-L.s*.3*tiredK;
        }
        const dx=clamp((mx-cx)/240,-1,1),dy=clamp((my-cy)/240,-1,1);
        turn=lerp(turn,dx*.3+Math.sin(stime*.7)*.12,slow);
        if(spinT>0){
          spinT=Math.max(0,spinT-dt);const q=1-spinT/.85,e2=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;
          sp.rotation.y=turn+e2*Math.PI*4;
        }else sp.rotation.y=turn;
        sp.rotation.x=lerp(sp.rotation.x,dy*.15,slow);
        // зіниці бігають усередині жовтих обідків
        sBlink-=dt;let blink=1;if(sBlink<0){blink=.1;if(sBlink<-.12)sBlink=rnd(2,5);}
        const es=1+fleeK*.12,ey=Math.min(blink,1-tiredK*.5),ps=1-fleeK*.35;
        bigEyes.forEach(({g,pg,pupil})=>{
          g.scale.set(es,es*ey,es);
          pg.position.set(dx*.04,-dy*.04,0);
          pupil.scale.set(.165*ps,.165*ps,.08);
        });
        abd.scale.y=ar.y*(1+Math.sin(stime*2.6)*.025);
        sr.render(ss,sc);
      }
    };

    /* ----- 3D-гарбуз у лічильнику: моторошний ліхтар ----- */
    const PW=56,PH=56;
    const pr=new T.WebGLRenderer({alpha:true,antialias:true});G3.renderers.push(pr);
    pr.setPixelRatio(Math.min(2,devicePixelRatio||1));pr.setSize(PW*2.6,PH*2.6,false);pr.setClearColor(0x000000,0);
    const ps=new T.Scene(),pc=new T.PerspectiveCamera(30,1,.1,50);pc.position.set(0,.22,6.4);
    ps.add(new T.AmbientLight(0x8a7fa8,.5));
    const pk=new T.DirectionalLight(0xffe6c8,1.0);pk.position.set(-2,3,3);ps.add(pk);
    const prim=new T.DirectionalLight(0x9db4ff,1.3);prim.position.set(2.5,1,-3);ps.add(prim);
    const SX=1.08,SY=.8;
    const rib=az=>1-.11*Math.pow(Math.abs(Math.sin(az*4)),.55);
    const pg=new T.SphereGeometry(1,72,44);const pp=pg.attributes.position;
    const cols=[],cBase=new T.Color(0xc4520e),cGroove=new T.Color(0x4a1604),cTop=new T.Color(0x5a2a08);
    for(let i=0;i<pp.count;i++){
      let x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i);const az=Math.atan2(z,x),f=rib(az);
      // трохи нерівна, «стара» форма
      const lump=1+.03*Math.sin(az*3+y*4)+.02*Math.sin(az*7-y*6);
      x*=f*SX*lump;z*=f*SX*lump;y*=SY;const rr=Math.hypot(x,z);
      if(y>0)y-=.2*Math.max(0,1-rr/.5);if(y<0)y+=.1*Math.max(0,1-rr/.5);
      pp.setXYZ(i,x,y,z);
      const g=Math.pow(Math.abs(Math.cos(az*4)),6);
      const c=cBase.clone().lerp(cGroove,(1-Math.pow(Math.abs(Math.sin(az*4)),.5))*.75);
      c.lerp(cTop,Math.max(0,1-rr/.55)*.8);c.lerp(cGroove,Math.max(0,-y/SY-.5)*.6);
      cols.push(c.r,c.g,c.b);
    }
    pg.setAttribute('color',new T.Float32BufferAttribute(cols,3));
    pg.computeVertexNormals();
    const pumpkin=new T.Group();ps.add(pumpkin);
    pumpkin.add(new T.Mesh(pg,new T.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.05})));
    // кривий вузлуватий хвостик
    const stemC=new T.CatmullRomCurve3([new T.Vector3(0,.5,0),new T.Vector3(-.05,.72,.02),new T.Vector3(.06,.88,-.02),new T.Vector3(.02,1.02,.03),new T.Vector3(.16,1.1,0)]);
    pumpkin.add(new T.Mesh(new T.TubeGeometry(stemC,24,.085,7),new T.MeshStandardMaterial({color:0x3b3a1e,roughness:.85})));
    // тріщина збоку
    const crack=[[.62,.38],[.55,.22],[.6,.1],[.5,-.05],[.56,-.2]].map(([x,y])=>{const u=x/SX,v=y/SY;const z=Math.sqrt(Math.max(0,1-u*u-v*v))*SX*.93;return new T.Vector3(x+.25,y,z-.1);});
    // вирізане обличчя: темна «стінка» по краю, всередині жевріє світло
    const pSurf=(x,y,o)=>{const u=x/SX,v=Math.max(-.97,Math.min(.97,y/SY));let z=Math.sqrt(Math.max(0,1-u*u-v*v));return z*SX*rib(Math.atan2(z,u))+o;};
    const faceGlow=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,uniforms:{uI:{value:1}},
      vertexShader:`varying vec2 vP; void main(){vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform float uI; varying vec2 vP; void main(){ float d=length(vP-vec2(0.,.0)); vec3 hot=vec3(1.,.97,.7), warm=vec3(1.,.58,.1); vec3 c=mix(hot,warm,clamp(d*1.4,0.,1.))*(.45+.75*uI); gl_FragColor=vec4(c,1.);}`});
    const wallM=new T.MeshBasicMaterial({color:0x2a0c02,side:T.DoubleSide});
    const facePart=pts=>{
      const cx0=pts.reduce((a,p)=>a+p[0],0)/pts.length,cy0=pts.reduce((a,p)=>a+p[1],0)/pts.length;
      const mk=(sc,mat,o)=>{const g=new T.ShapeGeometry(new T.Shape(pts.map(([x,y])=>new T.Vector2(cx0+(x-cx0)*sc,cy0+(y-cy0)*sc))));
        const a=g.attributes.position;for(let i=0;i<a.count;i++)a.setZ(i,pSurf(a.getX(i),a.getY(i),o));const m=new T.Mesh(g,mat);pumpkin.add(m);return m;};
      mk(1.18,wallM,.03);mk(1,faceGlow,.05);
    };
    // злі скошені очі, ніс, зубастий рот
    facePart([[-.5,.28],[-.14,.1],[-.42,.02]]);
    facePart([[.5,.28],[.14,.1],[.42,.02]]);
    facePart([[-.06,-.02],[.06,-.02],[0,.1]]);
    const pBand=(x0,x1,fT,fB,mat,o)=>{const C=56,R=6,pos=[],idx=[];
      for(let i=0;i<=C;i++){const x=x0+(x1-x0)*i/C,t=fT(x),bt=fB(x);for(let j=0;j<=R;j++){const y=t+(bt-t)*j/R;pos.push(x,y,pSurf(x,y,o));}}
      for(let i=0;i<C;i++)for(let j=0;j<R;j++){const q=i*(R+1)+j,w=q+R+1;idx.push(q,w,q+1,w,w+1,q+1);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);
      const m=new T.Mesh(g,mat);pumpkin.add(m);return m;};
    const mw=.55,tri=(x,c,w)=>Math.max(0,1-Math.abs(x-c)/w);
    const mTop=x=>{const t=x/mw;return -.12-.06*(1-t*t)+.14*t*t-.11*(tri(x,-.25,.07)+tri(x,0,.07)+tri(x,.25,.07));};
    const mBot=x=>{const t=x/mw;return -.3-.2*(1-t*t)+.14*t*t+.09*(tri(x,-.13,.065)+tri(x,.13,.065));};
    // рот із рухомою нижньою щелепою: нижній край опускається по поверхні гарбуза
    let jaw=0,jawDrawn=-1;
    const mBotJ=x=>{const t=x/mw;return mBot(x)-jaw*.29*(1-.55*t*t);};
    const mWall=pBand(-mw-.04,mw+.04,x=>mTop(clamp(x,-mw,mw))+.035,x=>Math.min(mBotJ(clamp(x,-mw,mw))-.035,mTop(clamp(x,-mw,mw))+.035),wallM,.03);
    const mGlow=pBand(-mw,mw,mTop,x=>Math.min(mBotJ(x),mTop(x)),faceGlow,.05);
    const refill=(m,x0,x1,fT,fB,o)=>{const a=m.geometry.attributes.position,C=56,R=6;let q=0;
      for(let i=0;i<=C;i++){const x=x0+(x1-x0)*i/C,t=fT(x),bt=fB(x);for(let j=0;j<=R;j++){const y=t+(bt-t)*j/R;a.array[q++]=x;a.array[q++]=y;a.array[q++]=pSurf(x,y,o);}}
      a.needsUpdate=true;m.geometry.computeBoundingSphere();};
    const setJaw=v=>{jaw=v;if(Math.abs(jaw-jawDrawn)<.004)return;jawDrawn=jaw;
      refill(mWall,-mw-.04,mw+.04,x=>mTop(clamp(x,-mw,mw))+.035,x=>Math.min(mBotJ(clamp(x,-mw,mw))-.035,mTop(clamp(x,-mw,mw))+.035),.03);
      refill(mGlow,-mw,mw,mTop,x=>Math.min(mBotJ(x),mTop(x)),.05);};
    // «здобич»: маленький гарбуз, який залітає в рот
    const prey=new T.Group();prey.visible=false;pumpkin.add(prey);
    prey.add(new T.Mesh(pg,new T.MeshStandardMaterial({color:0xf08a24,roughness:.5})));
    const preyStem=new T.Mesh(new T.CylinderGeometry(.06,.09,.32,6),new T.MeshStandardMaterial({color:0x4f6a22,roughness:.8}));preyStem.position.y=.62;prey.add(preyStem);
    const MC=new T.Vector3(0,-.36,pSurf(0,-.36,0));
    // тепле світло, що «розливається» навколо обличчя
    const sgc=document.createElement('canvas');sgc.width=sgc.height=64;const sgx=sgc.getContext('2d');
    const sgr=sgx.createRadialGradient(32,32,0,32,32,32);sgr.addColorStop(0,'rgba(255,170,60,.55)');sgr.addColorStop(1,'rgba(255,120,20,0)');sgx.fillStyle=sgr;sgx.fillRect(0,0,64,64);
    const spill=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(sgc),transparent:true,depthWrite:false}));
    spill.scale.set(1.6,1.2,1);spill.position.set(0,-.02,1.05);pumpkin.add(spill);
    // димок з-під хвостика
    const NS=18,sPos=new Float32Array(NS*3),sLife=new Float32Array(NS);for(let i=0;i<NS;i++)sLife[i]=Math.random();
    const sGeo=new T.BufferGeometry();sGeo.setAttribute('position',new T.BufferAttribute(sPos,3));sGeo.setAttribute('aLife',new T.BufferAttribute(sLife,1));
    const sMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uS:{value:PH*Math.min(2,devicePixelRatio||1)}},
      vertexShader:`attribute float aLife; uniform float uS; varying float vL; void main(){vL=aLife; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=uS*(.12+.22*(1.-aLife))/-mv.z*2.; gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying float vL; void main(){float d=length(gl_PointCoord-.5); if(d>.5) discard; float f=1.-d*2.; gl_FragColor=vec4(.55,.55,.62,f*f*vL*.5);}`});
    ps.add(new T.Points(sGeo,sMat));
    const sSeed=[];for(let i=0;i<NS;i++)sSeed.push(Math.random()*6.28);

    let ptime=0,hop=0,spinP=0,wig=0,party=0,flk=1,flkT=2,wake=0,eatT=-1;
    G3.pumpkin={canvas:pr.domElement,
      bump(){hop=1;spinP=1;},
      eat(){eatT=0;},
      wiggle(){wig=1;},
      party(){party=3;},
      update(dt){
        ptime+=dt;
        // з'їдання: замах → ривок → клац → жує → ковтає
        let open=0,chew=0,lean=0,lunge=0,sq=[1,1];
        const eo=x=>1-Math.pow(1-x,3),ei=x=>x*x*x;
        if(eatT>=0){eatT+=dt;const t=eatT;
          if(t<.45){open=eo(t/.45);lean=-eo(t/.45);}
          else if(t<.62){const q=(t-.45)/.17;open=1;lean=-1+q*1.8;lunge=eo(q);
            prey.visible=true;prey.scale.setScalar(.3-.04*q);prey.position.copy(MC).add(new T.Vector3(0,.02,.6-.5*eo(q)));prey.rotation.set(q*.8,q*2.5,.3);}
          else if(t<.7){const q=(t-.62)/.08;open=1-ei(q);lunge=1;lean=.8;sq=[1+.12*q,1-.14*q];
            prey.scale.setScalar(Math.max(.001,.26*(1-q)));prey.position.z=MC.z+.1-.15*q;}
          else if(t<1.5){const q=(t-.7)/.8;prey.visible=false;chew=1;lunge=1-eo(Math.min(1,q*2));lean=.8*(1-q);
            const c=Math.abs(Math.sin(q*Math.PI*3));open=.32*c*(1-q*.4);sq=[1.08-.08*q+.04*c,.9+.1*q-.03*c];}
          else if(t<1.75){const q=(t-1.5)/.25;const g=Math.sin(q*Math.PI);sq=[1-.05*g,1+.1*g];}
          else{eatT=-1;prey.visible=false;}}
        setJaw(open);
        pumpkin.scale.x=lerp(pumpkin.scale.x,sq[0],1-Math.pow(1e-6,dt));pumpkin.scale.z=pumpkin.scale.x;
        pumpkin.scale.y=lerp(pumpkin.scale.y,sq[1],1-Math.pow(1e-6,dt));
        const r=pr.domElement.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
        const dist=Math.hypot(mx-cx,my-cy);
        const dx=clamp((mx-cx)/300,-1,1),dy=clamp((my-cy)/300,-1,1);
        const k=1-Math.pow(.001,dt);
        wake=lerp(wake,dist<160?1:0,k*.6);
        let ry=lerp(pumpkin.rotation.y%(Math.PI*2),dx*.3,k);
        if(spinP>0){spinP=Math.max(0,spinP-dt*1.4);ry=dx*.3+(1-spinP)*Math.PI*2;if(spinP===0)ry=dx*.3;}
        if(party>0){party=Math.max(0,party-dt);ry=ptime*9;}
        pumpkin.rotation.y=ry;
        pumpkin.rotation.x=eatT>=0?lerp(pumpkin.rotation.x,lean*.22,1-Math.pow(1e-5,dt)):lerp(pumpkin.rotation.x,dy*.2,k);
        pumpkin.position.z=lunge*.35;
        wig=Math.max(0,wig-dt*1.6);
        pumpkin.rotation.z=Math.sin(ptime*1.1)*.04+Math.sin(ptime*28)*.2*wig+(chew?Math.sin(eatT*14)*.05:0);
        if(eatT>=0)pumpkin.rotation.y=lerp(pumpkin.rotation.y,0,1-Math.pow(1e-4,dt));
        hop=Math.max(0,hop-dt*1.8);
        const h=Math.sin((1-hop)*Math.PI)*(hop>0?1:0);
        pumpkin.position.y=h*.35;
        // свічка всередині: нерівне мерехтіння, інколи майже гасне; прокидається, коли курсор поруч
        flkT-=dt;if(flkT<0){flk=Math.random()<.5?.35:.6;if(flkT<-.08)flkT=Math.random()<.3?rnd(.05,.12):rnd(1.5,4);}
        if(flkT>=0)flk=lerp(flk,1,k);
        const I=(.7+.12*Math.sin(ptime*11)+.08*Math.sin(ptime*27.3))*flk*(.85+wake*.3)+(hop>0||party>0||eatT>=0?.4:0);
        faceGlow.uniforms.uI.value=I;
        spill.material.opacity=clamp(I*.5,0,.8);
        for(let i=0;i<NS;i++){
          sLife[i]-=dt*.45;
          if(sLife[i]<=0){sLife[i]=1;sSeed[i]=Math.random()*6.28;}
          const t=1-sLife[i];
          sPos[i*3]=.12+Math.sin(sSeed[i]+t*3+ptime)*.12*t+t*.25;sPos[i*3+1]=1.1+t*1.1;sPos[i*3+2]=Math.cos(sSeed[i])*.08;
        }
        sGeo.attributes.position.needsUpdate=true;sGeo.attributes.aLife.needsUpdate=true;
        pr.render(ps,pc);
      }
    };
    const icon=hudBtn.querySelector('svg');
    const wrap=document.createElement('span');wrap.className='hw-hud-3d';wrap.appendChild(pr.domElement);icon.replaceWith(wrap);
    hudBtn.addEventListener('pointerenter',()=>G3.pumpkin.wiggle());
    let plast=performance.now();
    const ploop=now=>{if(dead)return;const dt=Math.min(.05,(now-plast)/1000);plast=now;if(!hud.hidden&&!document.hidden&&enabled)G3.pumpkin.update(dt);requestAnimationFrame(ploop);};
    requestAnimationFrame(ploop);
    G3.state='ready';
  }

  /* ---------- привид ---------- */
  let ghost=null;
  function spawnGhost(){
    if(!enabled||ghost)return;
    const three=G3.state==='ready';
    const el=document.createElement('button');el.type='button';el.className='hw-ghost'+(three?' is-3d':'');el.setAttribute('aria-label','Привид');
    if(three)el.appendChild(G3.canvas);else el.innerHTML=SVG.ghost;
    document.body.appendChild(el);
    const w=three?G3.w:58,h=three?G3.h:54;
    const ltr=Math.random()<.5;
    const g={el,three,w,h,dir:ltr?1:-1,x:ltr?-w-10:innerWidth+10,baseY:rnd(90,Math.max(120,innerHeight-h-200)),t:0,vx:0,shy:false,last:performance.now()};
    g.y=g.baseY;ghost=g;
    el.addEventListener('click',()=>poof(g));
    if(reduce){g.x=innerWidth-w-90;g.baseY=g.y=innerHeight-h-170;el.style.transform=`translate(${g.x}px,${g.y}px)`;if(three)G3.update(g,0);g.staticT=setTimeout(()=>removeGhost(g),12000);return;}
    g.raf=requestAnimationFrame(t=>ghostTick(g,t));
  }
  function ghostTick(g,now){
    if(ghost!==g)return;
    const dt=Math.min(.05,(now-g.last)/1000);g.last=now;g.t+=dt;
    const cx=g.x+g.w/2,cy=g.y+g.h/2,d=Math.hypot(mx-cx,my-cy),shy=d<(g.three?160:150);
    if(shy!==g.shy){g.shy=shy;g.el.classList.toggle('is-shy',shy);}
    let vx=55*g.dir,vy=0;
    if(shy){const ax=(cx-mx)/(d||1),ay=(cy-my)/(d||1);vx=25*g.dir+ax*75;vy=ay*75;}
    g.vx=vx;
    g.x+=vx*dt;g.baseY=Math.min(innerHeight-g.h-60,Math.max(30,g.baseY+vy*dt));
    g.y=g.baseY+Math.sin(g.t*1.7)*16;
    g.el.style.transform=`translate(${g.x}px,${g.y}px)`;
    if(g.three)G3.update(g,dt);
    if(g.x>innerWidth+g.w+30||g.x<-g.w-80){removeGhost(g);return;}
    g.raf=requestAnimationFrame(t=>ghostTick(g,t));
  }
  function removeGhost(g){if(!g)return;cancelAnimationFrame(g.raf);clearTimeout(g.staticT);g.el.remove();if(ghost===g)ghost=null;}
  function poof(g){
    const r=g.el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    removeGhost(g);
    if(!reduce)for(let i=0;i<12;i++){
      const m=document.createElement('div');m.className='hw-mist';m.style.left=(cx-9)+'px';m.style.top=(cy-9)+'px';document.body.appendChild(m);
      const a=i/12*6.283,dist=rnd(30,70);
      m.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*dist}px,${Math.sin(a)*dist}px) scale(${rnd(1.6,2.6)})`,opacity:0}],{duration:rnd(600,900),easing:'ease-out'}).onfinish=()=>m.remove();
    }
    const boo=document.createElement('div');boo.className='hw-boo';boo.textContent='бу!';boo.style.left=(cx-16)+'px';boo.style.top=(cy-20)+'px';document.body.appendChild(boo);
    boo.animate([{transform:'translateY(0) scale(.6)',opacity:0},{transform:'translateY(-20px) scale(1.2)',opacity:1,offset:.3},{transform:'translateY(-50px) scale(1)',opacity:0}],{duration:1100,easing:'ease-out'}).onfinish=()=>boo.remove();
    if(!found.has('ghost'))setTimeout(()=>dropPumpkin('ghost',cx,cy),250);
  }

  /* ---------- «Ласощі чи капость?» ---------- */
  const app=document.querySelector(opt.appRoot)||document.body;
  const batCursor='url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><path d="M20 6C18.5 3 16.5 3 15.5 5 12 2 6 1.5 0 4c4 1 6 4 6 7 3-2 6-1 8 2 2-2 4-1.5 6 2 2-3.5 4-4 6-2 2-3 5-4 8-2 0-3 2-6 6-7-6-2.5-12-2-15.5 1-1-2-3-2-4.5 1z" fill="#2b2238" stroke="#fff" stroke-width="1"/></svg>')+'") 20 8, auto';
  const curStyle=document.createElement('style');curStyle.textContent='html.hw-batcursor,html.hw-batcursor *{cursor:'+batCursor+' !important}';document.head.appendChild(curStyle);cleanups.push(()=>curStyle.remove());
  let trickBusy=false;
  tools.querySelector('#hw-trick').addEventListener('click',()=>{
    if(trickBusy)return;trickBusy=true;setTimeout(()=>trickBusy=false,1500);
    if(Math.random()<.5){burst('candy',80);toast(reduce?'Ласощі! Тримай віртуальну цукерку 🍬':'Ласощі! Цукерковий дощ 🍬');return;}
    const tricks=[
      ()=>{root.classList.add('hw-batcursor');setTimeout(()=>root.classList.remove('hw-batcursor'),30000);toast('Капость! Курсор на 30 секунд став кажаном 🦇');},
      ()=>{if(!reduce)app.animate([{transform:'translate(0)'},{transform:'translate(-8px,2px) rotate(-.4deg)'},{transform:'translate(7px,-2px) rotate(.4deg)'},{transform:'translate(-5px,1px)'},{transform:'translate(4px,0)'},{transform:'translate(0)'}],{duration:650});toast('Капость! Хтось трусонув екран 👻');},
    ];
    const logo=opt.logo&&document.querySelector(opt.logo);
    if(logo)tricks.push(()=>{logo.classList.add('hw-flip');setTimeout(()=>logo.classList.remove('hw-flip'),5000);toast('Капость! Логотип перекинувся догори дриґом 🎃');});
    tricks[Math.floor(Math.random()*tricks.length)]();
  });

  /* ---------- режим ліхтарика ---------- */
  const lightBtn=tools.querySelector('#hw-light');
  let dark=null,eyes=[];
  function setLight(){
    if(!dark)return;
    dark.style.setProperty('--x',mx+'px');dark.style.setProperty('--y',my+'px');
    for(const e of eyes)e.el.classList.toggle('is-hidden',Math.hypot(mx-e.x,my-e.y)<190);
  }
  /* 7-й гарбуз: видно лише в нічному режимі, велика версія зі сяйвом */
  let nightPumpkin=null;
  function placeNightPumpkin(){
    if(found.has('night'))return;
    if(!nightPumpkin||!nightPumpkin.isConnected){nightPumpkin=pumpkinEl('night','hw-night-pumpkin');document.body.appendChild(nightPumpkin);}
    const minX=sideRight()+60;
    nightPumpkin.style.left=rnd(minX,Math.max(minX+60,innerWidth-80))+'px';
    nightPumpkin.style.top=rnd(100,Math.max(140,innerHeight-100))+'px';
  }
  function toggleLight(on){
    on=on===undefined?!dark:on;
    lightBtn.setAttribute('aria-pressed',String(on));
    root.classList.toggle('hw-night-on',on);
    if(on&&!dark){
      dark=document.createElement('div');dark.className='hw-dark';document.body.appendChild(dark);
      const minX=sideRight()+30;
      for(let i=0;i<8;i++){
        const el=document.createElement('div');el.className='hw-eyes';el.innerHTML='<span></span><span></span>';
        const x=rnd(minX,innerWidth-40),y=rnd(40,innerHeight-40);
        el.style.left=(x-13)+'px';el.style.top=(y-3)+'px';
        el.querySelectorAll('span').forEach(s=>s.style.animationDelay=(-rnd(0,4))+'s');
        document.body.appendChild(el);eyes.push({el,x,y});
      }
      placeNightPumpkin();
      setLight();bats(5);toast('Нічний режим. Хтось дивиться з темряви…');
    }else if(!on&&dark){dark.remove();dark=null;eyes.forEach(e=>e.el.remove());eyes=[];}
  }
  lightBtn.addEventListener('click',()=>toggleLight());

  /* ---------- загальне ---------- */
  on(window,'pointermove',e=>{mx=e.clientX;my=e.clientY;checkSpider();setLight();},{passive:true});
  on(window,'keydown',e=>{if(e.key==='Escape'&&dark)toggleLight(false);});

  const sw=tools.querySelector('#hw-enabled');
  function setEnabled(v){
    enabled=v;store.set(KEY_ON,v);sw.checked=v;root.classList.toggle('hw-off',!v);
    if(!v){leaveSpider(spider);removeGhost(ghost);toggleLight(false);document.querySelectorAll('.hw-dropped').forEach(b=>b.remove());}
    else placeSpots();
  }
  sw.addEventListener('change',()=>setEnabled(sw.checked));

  function every(fn,first,gap){const run=()=>{if(dead)return;if(enabled&&!document.hidden)fn();setTimeout(run,gap*rnd(.75,1.25));};setTimeout(run,first);}
  every(spawnSpider,CFG.spiderFirst,CFG.spiderEvery);
  every(spawnGhost,CFG.ghostFirst,CFG.ghostEvery);

  placeSpots();updateHud();setEnabled(enabled);
  setTimeout(loadThree,600);

  /* SPA: якщо React перемалював сайдбар, повертаємо гарбузи й блок керування на місце */
  let moT=0;const mo=new MutationObserver(()=>{clearTimeout(moT);moT=setTimeout(()=>{if(dead)return;mountTools();placeSpots();},300);});
  mo.observe(document.body,{childList:true,subtree:true});
  cleanups.push(()=>{mo.disconnect();clearTimeout(moT);});

  const api={spawnSpider,spawnGhost,
    reset(){found=new Set();store.set(KEY_FOUND,[]);document.querySelectorAll('.hw-dropped').forEach(b=>b.remove());placeSpots();updateHud();toast('Гарбузи знову сховані');}};
  window.__hwHalloween=api; // для ручної перевірки з консолі: __hwHalloween.spawnSpider()

  return function destroy(){
    if(dead)return;dead=true;
    cleanups.forEach(f=>{try{f();}catch(e){}});
    if(spider)spider.el.remove();if(ghost)removeGhost(ghost);
    document.querySelectorAll('.hw-toast,.hw-hud,.hw-fx,.hw-spider,.hw-ghost,.hw-dark,.hw-eyes,.hw-modal,.hw-pumpkin,.hw-tools,.hw-bat,.hw-mist,.hw-boo,.hw-crumb').forEach(e=>e.remove());
    root.classList.remove('hw-off','hw-batcursor');
    (G3.renderers||[]).forEach(r=>{try{r.dispose();r.forceContextLoss();}catch(e){}});
    delete window.__hwHalloween;window.__hwHalloweenActive=false;
  };
}

export default initHalloween;
