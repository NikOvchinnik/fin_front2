/* eslint-disable */
/**
 * Хеловін на сторінці входу Financial Booking:
 *  1) 3D-привид над заголовком панелі «не підглядає»: стежить за полем логіна, відвертається на полі пароля,
 *     підглядає одним оком, коли пароль показано; дивується, коли кажан зривається;
 *  2) кажани під «стелею» синьої панелі: сплять, прокидаються від курсора, зриваються, летять і повертаються.
 * Самодостатній модуль без React. three.js підвантажується динамічно (import('three')).
 * Використання: const destroy = initHalloweenLogin({ ...опції }); ... destroy();
 * Класи мають префікс .hwl-*, стилі у halloween-login.css.
 */

const DEFAULTS = {
  from: [10, 24], to: [11, 2],      // період показу [місяць, день] включно
  force: false,                      // true — завжди (або ?halloween=1 в URL)
  panel: '[data-hw-login-panel]',    // синя декоративна панель (контейнер для кажанів)
  ghostAnchor: '[data-hw-login-ghost]', // блок із заголовком «Financial Booking»; привид з'явиться НАД ним
  login: '[data-hw-login-input]',    // поле логіна
  password: '[data-hw-login-password]', // поле пароля (позначати атрибутом: його type змінюється на text при показі)
  eye: '[data-hw-login-eye]',        // кнопка «показати пароль»
  roost: null,                       // власна розкладка кажанів під стелею: [[x у % ширини панелі, ширина px], ...]
  ghostOffset: { x: -15, y: -36 },   // зсув привида: x — від лівого краю ghostAnchor, y — нахлест на його верх (px)
};

// кажан у польоті
const BAT = '<svg viewBox="0 0 40 20" aria-hidden="true"><path d="M20 6C18.5 3 16.5 3 15.5 5 12 2 6 1.5 0 4c4 1 6 4 6 7 3-2 6-1 8 2 2-2 4-1.5 6 2 2-3.5 4-4 6-2 2-3 5-4 8-2 0-3 2-6 6-7-6-2.5-12-2-15.5 1-1-2-3-2-4.5 1z" fill="#0f1d44"/><circle cx="18.6" cy="7.6" r=".9" fill="#ffd23f"/><circle cx="21.4" cy="7.6" r=".9" fill="#ffd23f"/></svg>';
const GHOST_SVG = '<svg viewBox="0 0 56 52"><path d="M10 48V24a18 18 0 0 1 36 0v24l-4.5-4-4.5 4-4.5-4-4.5 4-4.5-4-4.5 4-4.5-4z" fill="#eef2ff" opacity=".9"/><ellipse cx="22" cy="23" rx="2.6" ry="4" fill="#0e0c1f"/><ellipse cx="34" cy="23" rx="2.6" ry="4" fill="#0e0c1f"/><ellipse cx="28" cy="32" rx="2" ry="3.4" fill="#0e0c1f" opacity=".6"/></svg>';
// сплячий кажан догори дриґом (.ec — заплющені очі, .eo — розплющені)
const HANG = '<svg viewBox="0 0 30 46" aria-hidden="true"><path d="M12 0v5M18 0v5" stroke="#0f1d44" stroke-width="2" stroke-linecap="round"/><path d="M15 4C6 6 3.5 18 6.5 28 8.5 34 11.5 37.5 15 39 18.5 37.5 21.5 34 23.5 28 26.5 18 24 6 15 4Z" fill="#0f1d44"/><path d="M15 6C11 12 10 22 12 32M15 6C19 12 20 22 18 32" stroke="#2a4588" stroke-width="1.2" fill="none"/><circle cx="15" cy="37" r="5" fill="#0f1d44"/><path d="M11.6 40.5l-.8 4.3 3-2.6zM18.4 40.5l.8 4.3-3-2.6z" fill="#0f1d44"/><g class="ec"><path d="M11.6 36.6q1.4 1.3 2.6 0M15.8 36.6q1.4 1.3 2.6 0" stroke="#6d86c9" stroke-width="1" fill="none" stroke-linecap="round"/></g><g class="eo"><circle cx="12.9" cy="37" r="1.3" fill="#ffd23f"/><circle cx="17.1" cy="37" r="1.3" fill="#ffd23f"/></g></svg>';

export function initHalloweenLogin(userOptions = {}) {
  const opt = { ...DEFAULTS, ...userOptions, ghostOffset: { ...DEFAULTS.ghostOffset, ...(userOptions.ghostOffset || {}) } };
  if (typeof window === 'undefined' || window.__hwLoginActive) return () => {};
  const forced = opt.force || /[?&]halloween=1\b/.test(location.search);
  if (!forced) { const d = new Date(), n = (d.getMonth() + 1) * 100 + d.getDate(); if (n < opt.from[0] * 100 + opt.from[1] || n > opt.to[0] * 100 + opt.to[1]) return () => {}; }
  const panel = document.querySelector(opt.panel);
  if (!panel) { console.warn('[halloween-login] не знайдено панель', opt.panel); return () => {}; }
  window.__hwLoginActive = true;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  let dead = false, raf = 0, renderer = null;
  const cleanups = [], timers = new Set();
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };
  const ensurePos = el => { if (getComputedStyle(el).position === 'static') { el.style.position = 'relative'; cleanups.push(() => { el.style.position = ''; }); } };

  let mx = innerWidth * .7, my = innerHeight * .5;
  on(window, 'pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  // поля форми: React може перемалювати інпути, тому шукаємо їх щоразу (з кешем-запасом)
  let pwCache = null;
  const els = () => {
    let pw = document.querySelector(opt.password);
    if (!pw) { pw = (pwCache && pwCache.isConnected) ? pwCache : document.querySelector('input[type="password"]'); }
    if (pw) pwCache = pw;
    let lg = document.querySelector(opt.login);
    if (!lg && pw && pw.form) lg = [...pw.form.querySelectorAll('input')].find(i => i !== pw && i.type !== 'hidden' && i.type !== 'checkbox');
    let eye = document.querySelector(opt.eye);
    if (!eye && pw && pw.parentElement) eye = pw.parentElement.querySelector('button');
    return { lg, pw, eye };
  };

  let onBat = () => {};
  ensurePos(panel);
  const prevOverflow = panel.style.overflow; panel.style.overflow = 'hidden'; cleanups.push(() => { panel.style.overflow = prevOverflow; });

  /* ---------- кажани під стелею: сплять, прокидаються від курсора, зриваються й повертаються ---------- */
  const ROOST=opt.roost||[[6,38],[13,31],[20,44],[28,35],[36,41],[47,32],[55,46],[63,36],[71,42],[79,33],[87,45],[94,36]];
  const roost=document.createElement('div');roost.className='hwl-roost';panel.appendChild(roost);
  const hang=ROOST.map(([x,w])=>{
    const el=document.createElement('div');el.className='hwl-hang';el.style.left=x+'%';el.style.width=w+'px';el.style.marginLeft=(-w/2)+'px';
    el.style.animationDuration=rnd(3,5)+'s';el.style.animationDelay=(-rnd(0,4))+'s';el.innerHTML=HANG;roost.appendChild(el);
    const o={el,x,gone:false};el.addEventListener('pointerenter',()=>startle(o,true));return o;});
  on(panel,'pointermove',()=>{hang.forEach(o=>{if(o.gone)return;const r=o.el.getBoundingClientRect();
    const d=Math.hypot(mx-(r.left+r.width/2),my-(r.top+r.height*.7));o.el.classList.toggle('is-peek',d<140);if(d<30)startle(o,true);});});
  const bw=a=>`translate(${a[0]-23}px,${a[1]-10}px) scale(${a[2]}) rotate(${a[3]}deg)`;
  function startle(o,first){
    if(o.gone)return;o.gone=true;
    const r=o.el.getBoundingClientRect();o.el.classList.add('is-gone');o.el.classList.remove('is-peek');
    if(first)hang.forEach(n=>{if(n!==o&&!n.gone&&Math.abs(n.x-o.x)<15&&Math.random()<.65)later(()=>startle(n,false),rnd(140,420));});
    later(()=>comeBack(o),rnd(7000,11000));
    if(reduce){onBat(null);return;}
    const pr=panel.getBoundingClientRect(),x=r.left+r.width/2-pr.left,y=r.top+r.height*.6-pr.top;
    const b=document.createElement('div');b.className='hwl-bat';b.innerHTML=BAT;panel.appendChild(b);onBat(b);
    const dir=Math.abs(mx-(r.left+r.width/2))<40?(Math.random()<.5?1:-1):(mx<r.left+r.width/2?1:-1);
    b.animate([
      {transform:bw([x,y,.8,180])},
      {transform:bw([x+dir*25,y+60,1,dir*25]),offset:.16},
      {transform:bw([x+dir*rnd(150,300),y+rnd(150,280),1.1,dir*-10]),offset:.5},
      {transform:bw([x+dir*rnd(380,620),y+rnd(60,160),1.15,dir*10]),offset:.78},
      {transform:bw([x+dir*rnd(650,950),-80,1.2,dir*-15])}
    ],{duration:rnd(2200,3000),easing:'ease-in-out',fill:'forwards'}).onfinish=()=>b.remove();
  }
  function comeBack(o){
    const done=()=>{o.el.classList.remove('is-gone');o.gone=false;
      if(!reduce)o.el.animate([{transform:'translateY(5px) rotate(14deg)'},{transform:'translateY(-2px) rotate(-8deg)'},{transform:'translateY(0) rotate(0)'}],{duration:650,easing:'ease-out'});};
    if(reduce){done();return;}
    const pr=panel.getBoundingClientRect(),r=o.el.getBoundingClientRect(),x=r.left+r.width/2-pr.left,y=r.top+r.height*.5-pr.top;
    const b=document.createElement('div');b.className='hwl-bat';b.innerHTML=BAT;panel.appendChild(b);
    const dir=Math.random()<.5?1:-1;
    b.animate([
      {transform:bw([x+dir*rnd(250,450),-60,1.1,dir*-10])},
      {transform:bw([x+dir*70,y+80,1,dir*12]),offset:.65},
      {transform:bw([x,y,.85,170])}
    ],{duration:1400,easing:'ease-in-out',fill:'forwards'}).onfinish=()=>{b.remove();done();};
  }

  /* ---------- привид, що «не підглядає» ---------- */
  const anchor = document.querySelector(opt.ghostAnchor);
  let stage = null;
  if (anchor) {
    ensurePos(anchor);
    stage = document.createElement('div'); stage.className = 'hwl-ghost';
    stage.style.marginLeft = opt.ghostOffset.x + 'px'; stage.style.marginBottom = opt.ghostOffset.y + 'px';
    anchor.insertBefore(stage, anchor.firstChild);
    const webgl = (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } })();
    if (!webgl) stage.innerHTML = GHOST_SVG;
    else import('three').then(T => { if (!dead) { try { startGhost(T); } catch (e) { console.warn('[halloween-login] 3D вимкнено:', e); stage.innerHTML = GHOST_SVG; } } })
      .catch(e => { console.warn('[halloween-login] three.js не завантажився:', e); if (!dead) stage.innerHTML = GHOST_SVG; });
  } else console.warn('[halloween-login] не знайдено місце для привида', opt.ghostAnchor);

  function startGhost(T) {
    const W = 260, H = 300;
    renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
    stage.appendChild(renderer.domElement);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, W / H, .1, 50); cam.position.set(0, -.5, 8.4);
    const sph = new T.SphereGeometry(1, 24, 16);
    const HL = 2.1, pts = [];
    for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI / 2; pts.push(new T.Vector2(Math.max(.0001, Math.sin(a) * .8), Math.cos(a) * .85)); }
    for (let i = 1; i <= 40; i++) { const t = i / 40; pts.push(new T.Vector2(.8 + .32 * Math.pow(t, 1.4), -t * HL)); }
    const vert = `uniform float uTime; uniform float uLean; uniform float uFlare;
      varying vec3 vN; varying vec3 vV; varying float vT; varying float vA;
      void main(){ vec3 p=position; float a=atan(p.z,p.x); float t=clamp(-p.y/${HL.toFixed(2)},0.,1.);
        p.y+=(sin(a*5.+uTime*2.4)*.13*t*t+sin(a*9.-uTime*3.1)*.05*t*t)*(1.+uFlare*1.8);
        p.xz*=1.+.1*t*sin(uTime*1.8+a*3.)+.05*t*sin(uTime*3.3-a*7.)+uFlare*.42*t*t;
        p.x+=-uLean*t*t*.8+sin(uTime*1.3+t*4.)*.09*t; p.z+=cos(uTime*1.1+t*3.)*.06*t;
        vec4 mv=modelViewMatrix*vec4(p,1.); vV=normalize(-mv.xyz); vN=normalize(normalMatrix*normal); vT=t; vA=a;
        gl_Position=projectionMatrix*mv; }`;
    const frag = `uniform float uOpacity; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying float vT; varying float vA;
      void main(){ float n=.5+.5*sin(vA*9.+uTime*1.4)*cos(vA*5.-uTime*.8); float n2=.5+.5*sin(vA*23.-uTime*2.2);
        float edge=.58+.3*n+.08*n2; if(vT>edge) discard;
        vec3 nn=normalize(vN); if(!gl_FrontFacing) nn=-nn;
        float fres=pow(1.-abs(dot(nn,normalize(vV))),1.8);
        vec3 L=normalize(vec3(-.4,.8,.6)); float wrap=max((dot(nn,L)+.6)/1.6,0.);
        vec3 col=mix(vec3(.80,.85,.97),vec3(.98,.99,1.),wrap);
        col=mix(col,vec3(.62,.72,1.),fres*.7); col=mix(col,vec3(.75,.8,.96),vT*.6);
        if(!gl_FrontFacing) col*=.82;
        float alpha=mix(.55,.97,fres)*(1.-smoothstep(edge-.3,edge,vT))*(1.-vT*.35);
        gl_FragColor=vec4(col,alpha*uOpacity); }`;
    const bodyMat = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uLean: { value: 0 }, uOpacity: { value: 1 }, uFlare: { value: 0 } }, vertexShader: vert, fragmentShader: frag, transparent: true, side: T.DoubleSide, depthWrite: false });
    const ghostG = new T.Group(); scene.add(ghostG);
    ghostG.add(new T.Mesh(new T.LatheGeometry(pts, 120), bodyMat));
    const voidM = new T.MeshBasicMaterial({ color: 0x0e0c1f, transparent: true, opacity: .92, depthWrite: false });
    const mouthM = new T.MeshBasicMaterial({ color: 0x0e0c1f, transparent: true, opacity: .6, depthWrite: false });
    const glintM = new T.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: .9, depthWrite: false });
    const disc = new T.CircleGeometry(1, 32);
    const onFace = (m, x, y) => { const z = Math.sqrt(Math.max(0, .64 - x * x - (y * .8 / .85) * (y * .8 / .85))) + .012; m.position.set(x, y, z); m.lookAt(x * 3, y * 3, z * 3); ghostG.add(m); return m; };
    const sockets = [-1, 1].map(s => { const e = onFace(new T.Mesh(disc, voidM), s * .24, .18); e.rotation.z -= s * .32; return e; });
    const glints = [-1, 1].map(s => { const g = new T.Mesh(sph, glintM); g.scale.setScalar(.018); g.position.set(s * .24, .2, .8); ghostG.add(g); return g; });
    const mouth = onFace(new T.Mesh(disc, mouthM), 0, -.2);
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gx = gc.getContext('2d');
    const grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, 'rgba(200,215,255,.5)'); grd.addColorStop(1, 'rgba(200,215,255,0)'); gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(gc), depthWrite: false, transparent: true })); halo.scale.set(3.6, 5, 1); halo.position.set(0, -.6, -1.4); scene.add(halo);

    // привид «читає» логін: дивиться туди, де курсор уведення
    const mctx = document.createElement('canvas').getContext('2d');
    const caretPoint = lg => {
      const r = lg.getBoundingClientRect(), cs = getComputedStyle(lg);
      mctx.font = cs.fontSize + ' ' + cs.fontFamily;
      const w = mctx.measureText(lg.value.slice(0, lg.selectionStart ?? lg.value.length)).width;
      return [Math.min(r.left + parseFloat(cs.paddingLeft) + w, r.right - 40), r.top + r.height / 2];
    };

    let time = 0, last = performance.now(), visSince = -1, nod = 0, lastLen = -1;
    let surT = 0, surBat = null; onBat = b => { surT = 1.6; surBat = b; };
    const st = { ry: 0, rx: 0, eL: 1, eR: 1, op: 1, away: 0 };
    const AWAY = { ry: 1.25, rx: .12, eL: .06, eR: .06, op: .82, away: 1 };
    function frame(now) {
      if (dead) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
      const k = 1 - Math.pow(.0005, dt), kf = 1 - Math.pow(.00001, dt);
      const sr = stage.getBoundingClientRect(), gx0 = sr.left + sr.width / 2, gy0 = sr.top + sr.height * .33;
      const { lg, pw, eye } = els();
      if (lg && lg.value.length !== lastLen) { if (lastLen >= 0) nod = 1; lastLen = lg.value.length; }
      const act = document.activeElement, pwFocus = !!pw && (act === pw || act === eye), shown = !!pw && pw.type === 'text';
      if (shown && visSince < 0) visSince = time; if (!shown) visSince = -1;
      let tgt = { ry: 0, rx: 0, eL: 1, eR: 1, op: 1, away: 0 };
      const lookAt = (px, py) => { tgt.ry = clamp((px - gx0) / 420, -.9, 1) * .85; tgt.rx = clamp((py - gy0) / 420, -1, 1) * .35; };
      if (pwFocus && !shown) tgt = { ...AWAY };                       // відвертається й заплющує очі
      else if (shown) {                                                // підглядає одним оком і ховається
        const p = (time - visSince) % 4.2;
        if (p > .25 && p < 1.45) { const r = pw.getBoundingClientRect(); lookAt(r.left + 40, r.top + r.height / 2); tgt.ry = Math.max(tgt.ry, -.55); tgt.eR = .08; }
        else tgt = { ...AWAY };
      } else if (lg && act === lg) lookAt(...caretPoint(lg));
      else lookAt(mx, my);
      // здивування від кажана: блимає, пружно підскакує, поділ розлітається, проводжає кажана поглядом
      let amt = 0, osc = 0, flick = 1;
      if (surT > 0) {
        surT = Math.max(0, surT - dt); amt = Math.min(1, (1.6 - surT) / .08) * Math.min(1, surT / .6);
        const e = 1.6 - surT; osc = Math.exp(-e * 5) * Math.sin(e * 17);
        if (e < .32) flick = Math.sin(e * 70) > 0 ? 1 : .45;
        if (!tgt.away && surBat && surBat.isConnected) { const br = surBat.getBoundingClientRect(); lookAt(br.left + br.width / 2, br.top + br.height / 2); }
      }
      st.ry = lerp(st.ry, tgt.ry, tgt.away || shown ? kf : k); st.rx = lerp(st.rx, tgt.rx, k);
      st.eL = lerp(st.eL, tgt.eL, kf); st.eR = lerp(st.eR, tgt.eR, kf); st.op = lerp(st.op, tgt.op, k); st.away = lerp(st.away, tgt.away, k);
      nod = Math.max(0, nod - dt * 4);
      const opF = st.op * flick;
      bodyMat.uniforms.uTime.value = time;
      bodyMat.uniforms.uLean.value = lerp(bodyMat.uniforms.uLean.value, -st.ry * .35, k);
      bodyMat.uniforms.uOpacity.value = opF; voidM.opacity = .92 * opF; mouthM.opacity = .6 * opF; glintM.opacity = Math.min(1, (.9 + amt * .4) * opF);
      bodyMat.uniforms.uFlare.value = lerp(bodyMat.uniforms.uFlare.value, amt * (1 - Math.min(1, (1.6 - surT) / 1.2) * .6), 1 - Math.pow(1e-5, dt));
      ghostG.rotation.y = st.ry; ghostG.rotation.x = st.rx + Math.sin(nod * Math.PI) * .12 - amt * .12;
      ghostG.rotation.z = Math.sin(time * .9) * .04 + st.away * Math.sin(time * 7) * .015;
      ghostG.scale.set(1 - .1 * osc, 1 + .17 * osc, 1 - .1 * osc); ghostG.position.z = -amt * .35;
      ghostG.position.y = (reduce ? 0 : Math.sin(time * 1.3) * .07) + amt * .16;
      sockets[0].scale.set(.105 + .012 * amt, (.21 + .035 * amt) * st.eL, 1); sockets[1].scale.set(.105 + .012 * amt, (.21 + .035 * amt) * st.eR, 1);
      glints[0].visible = st.eL > .4; glints[1].visible = st.eR > .4;
      mouth.scale.set(.07 - .008 * amt, (.16 + .03 * Math.sin(time * 1.7)) * (1 - .5 * amt) * (1 - st.away * .5), 1);
      halo.material.opacity = (.6 + Math.sin(time * 1.3) * .2) * st.op * flick * (1 + amt * .3);
      renderer.render(scene, cam);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  return function destroy() {
    if (dead) return; dead = true;
    cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear();
    cleanups.forEach(f => { try { f(); } catch (e) {} });
    document.querySelectorAll('.hwl-ghost,.hwl-bat,.hwl-roost').forEach(e => e.remove());
    if (renderer) { try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {} }
    window.__hwLoginActive = false;
  };
}

export default initHalloweenLogin;
