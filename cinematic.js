/* ============================================================
   Shared CINEMATIC ENGINE for all SOLUTIONS style variants.
   Handles: scroll-jacked full-screen sections ("screen replaces
   screen"), per-section reveal choreography, hybrid release into
   the conversion site, i18n (EN/RU/UK) and WhatsApp lead capture.
   The 3D cube is provided by each style (self-contained Three.js)
   and only needs to implement: start(), toSection(i,dir,N),
   enterSite(), exitSite(). The engine drives its EVOLUTION by
   calling toSection on every screen change.

   A style page provides:
     - CSS skinning the generic hooks (.cine/.ccopy/.ckick/.ch1/
       .csub/.cextra/.cctas + .hdr/.vsec/.vgrid/.vplan/... )
     - containers in <body>: #cube canvas, #cine, #siteHeader,
       #site, #cineChrome (built by engine), #ld loader
     - Cinematic.start({ content, ui, cube, config, icons?,
       onSection?, pos? })
============================================================ */
window.Cinematic = (function () {
  const gsap = window.gsap;

  function start(opts) {
    const content = opts.content;
    const UI = opts.ui;                    // { en:{heroCta,cases,more,contact,scroll,micro}, ... }
    const cube = opts.cube || {};
    const CONFIG = opts.config || { whatsapp:'', email:'', telegram:'' };
    const ICONS = opts.icons || null;      // optional [svg,...] for service/why cards
    const POS = opts.pos || ['left','right','left','right','center'];
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const N = 5;

    /* ---- language ---- */
    let lang = (() => { try { const s = localStorage.getItem('lang'); if (s && content[s]) return s; } catch(e){}
      const n = (navigator.language||'en').toLowerCase();
      return n.startsWith('uk') ? 'uk' : n.startsWith('ru') ? 'ru' : 'en'; })();

    /* ---- WhatsApp ---- */
    const waDigits = () => (CONFIG.whatsapp||'').replace(/[^\d]/g,'');
    function leadHref(msg){ const t=encodeURIComponent(msg), d=waDigits();
      if(d) return `https://wa.me/${d}?text=${t}`;
      const subj=(content[lang]&&content[lang].mailSubject)||'Lead from SOLUTIONS';
      return `mailto:${CONFIG.email}?subject=${encodeURIComponent(subj)}&body=${t}`; }
    const openLead = m => window.open(leadHref(m), '_blank');

    /* ---- helpers ---- */
    function splitWords(html){
      const tmp=document.createElement('div'); tmp.innerHTML=html;
      const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const out=[];
      tmp.childNodes.forEach(node=>{
        if(node.nodeType===3){ node.textContent.split(/(\s+)/).forEach(tok=>{
          if(tok==='') return; if(/^\s+$/.test(tok)) out.push(' ');
          else out.push(`<span class="cw"><span class="ci">${esc(tok)}</span></span>`); });
        } else out.push(`<span class="cw"><span class="ci">${node.outerHTML}</span></span>`);
      });
      return out.join('');
    }
    const langBtns = () =>
      `<button class="langbtn" data-lang="en">EN</button><span class="sep">/</span>`+
      `<button class="langbtn" data-lang="ru">RU</button><span class="sep">/</span>`+
      `<button class="langbtn" data-lang="uk">UA</button>`;

    /* ---- cinematic section markup ---- */
    function extrasFor(i, L){
      const u = UI[lang];
      if(i < N-1) return '';
      // final screen — CTA cluster (skin styles it)
      return `<div class="cctas">
        <button class="cine-cta" data-act="wa">${u.heroCta}</button>
        <a class="cine-ghost" data-go="cases" href="#">${u.cases}</a>
        <button class="cine-more" data-go="site">${u.more}<span class="chev">↓</span></button>
      </div>`;
    }
    function copyHTML(d, i, L){
      return `<div class="ccopy">
        <div class="ckick">${d.kicker}</div>
        <h1 class="ch1">${d.headline}</h1>
        <p class="csub">${d.sub}</p>
        <div class="cextra">${extrasFor(i, L)}</div>
      </div>`;
    }

    /* ---- conversion site markup (generic classes, skin styles) ---- */
    function siteHTML(L){
      const s=L.site;
      const icon = i => ICONS ? `<div class="vic">${ICONS[i%ICONS.length]}</div>` : '';
      const card=(c,i)=>`<div class="vcell">${icon(i)}<h3>${c[1]}</h3><p>${c[2]}</p></div>`;
      const step=c=>`<div class="vstep"><span class="vn">${c[0]}</span><h4>${c[1]}</h4><p>${c[2]}</p></div>`;
      const plan=p=>`<div class="vplan${p.feat?' feat':''}"><div class="vptag">${p.feat&&p.tag?p.tag:''}</div>`+
        `<div class="vpname">${p.name}</div><div class="vpamt">${p.amt}${p.small?`<span>${p.small}</span>`:''}</div>`+
        `<p class="vpdesc">${p.desc}</p><ul>${p.li.map(x=>`<li>${x}</li>`).join('')}</ul>`+
        `<button class="vbtn full js-lead" data-pkg="${p.pkg}">${p.btn}</button></div>`;
      const why=w=>`<div class="vcell"><h3>${w[1]}</h3><p>${w[2]}</p></div>`;
      const qa=(q,i)=>`<details class="vqa"><summary><span class="vqn">Q${i+1}</span><span class="vqt">${q[0]}</span><span class="vpm"></span></summary><div class="va">${q[1]}</div></details>`;
      const H=(n,e,h,l)=>`<div class="vhead"><span class="veyebrow"><b>${n}</b> ${e}</span><h2 class="vh2">${h}</h2>${l?`<p class="vlead">${l}</p>`:''}</div>`;
      return `<a id="top"></a>
        <section class="vsec" id="services"><div class="vwrap">${H('01',s.services.eyebrow,s.services.h2,s.services.lead)}<div class="vgrid g3">${s.services.cards.map(card).join('')}</div></div></section>
        <section class="vsec" id="process"><div class="vwrap">${H('02',s.process.eyebrow,s.process.h2,s.process.lead)}<div class="vsteps">${s.process.steps.map(step).join('')}</div></div></section>
        <section class="vsec" id="pricing"><div class="vwrap">${H('03',s.pricing.eyebrow,s.pricing.h2,s.pricing.lead)}<div class="vplans">${s.pricing.items.map(plan).join('')}</div><p class="vnote">${s.pricing.note}</p></div></section>
        <section class="vsec" id="why"><div class="vwrap">${H('04',s.why.eyebrow,s.why.h2,'')}<div class="vgrid g3">${s.why.items.map(why).join('')}</div></div></section>
        <section class="vsec" id="cases"><div class="vwrap">${H('05',s.cases.eyebrow,s.cases.h2,s.cases.lead)}<div class="vgrid g3">${s.cases.cards.map(card).join('')}</div></div></section>
        <section class="vsec" id="faq"><div class="vwrap">${H('06',s.faq.eyebrow,s.faq.h2,'')}<div class="vfaq">${s.faq.qa.map(qa).join('')}</div></div></section>
        <section class="vsec" id="contact"><div class="vwrap"><div class="vcontact">
          <div class="vcontact-l"><span class="veyebrow"><b>07</b> ${s.contact.eyebrow}</span><h2 class="vh2">${s.contact.h2}</h2><p class="vlead">${s.contact.lead}</p>
            <div class="vchips">${s.contact.chips.map(c=>`<span>${c}</span>`).join('')}</div></div>
          <form class="vform" id="leadForm">
            <input id="lf-name" placeholder="${s.contact.ph.name}" autocomplete="name" required />
            <input id="lf-contact" placeholder="${s.contact.ph.contact}" required />
            <textarea id="lf-task" rows="3" placeholder="${s.contact.ph.task}"></textarea>
            <button class="vbtn full" type="submit">${s.contact.submit}</button>
            <div class="valt">${s.contact.altPre}<a id="lf-email-link" href="#">${s.contact.altLink}</a></div>
            <div class="vmicro">${s.contact.micro}</div>
          </form></div></div></section>
        <footer class="vfoot"><div class="vwrap vfoot-in">
          <a class="hbrand" data-go="top" href="#top">SOLUTIONS<span class="bdot"></span></a>
          <div class="vfmid">${s.footer.tagline}</div>
          <div class="vflinks"><a data-act="wa">${s.footer.wa}</a><a id="foot-email" href="#">${s.footer.email}</a><a data-go="top" href="#top">${s.footer.top}</a><span class="lang">${langBtns()}</span></div>
        </div></footer>`;
    }
    function headerHTML(L){
      return `<div class="hdr-in">
        <a class="hbrand" data-go="intro" href="#">SOLUTIONS<span class="bdot"></span></a>
        <nav class="hnav"><a class="nlink" href="#services">${L.nav.services}</a><a class="nlink" href="#pricing">${L.nav.pricing}</a><a class="nlink" href="#faq">${L.nav.faq}</a></nav>
        <div class="hright"><span class="lang">${langBtns()}</span><button class="hwa vbtn sm" data-act="wa">${UI[lang].contact}</button></div>
      </div>`;
    }

    /* ---- build cinematic sections ---- */
    const cineRoot = document.getElementById('cine');
    const railRoot = document.getElementById('crail');
    let current = 0, isAnimating = false, siteMode = false;

    function fillSection(s, d, i){
      s.el.innerHTML = copyHTML(d, i, content[lang]);
      const h1 = s.el.querySelector('.ch1'); h1.innerHTML = splitWords(h1.innerHTML);
      s.kick = s.el.querySelector('.ckick');
      s.sub = s.el.querySelector('.csub');
      s.words = [...h1.querySelectorAll('.cw .ci')];
      s.extra = s.el.querySelector('.cextra');
      gsap.set(s.words, {yPercent:118});
      if(i===N-1){ const c=s.el.querySelector('.cctas'); if(c) gsap.set(c.children,{opacity:0,y:20}); }
    }

    const secs = content[lang].sections.map((d,i)=>{
      const el=document.createElement('section');
      el.className=`cine pos-${POS[i]}`;
      cineRoot.appendChild(el);
      let tick=null;
      if(railRoot){ tick=document.createElement('button'); tick.className='ctick';
        tick.innerHTML='<i></i>'; tick.addEventListener('click',()=>{ if(siteMode) exitSite(); goTo(i); });
        railRoot.appendChild(tick); }
      const s={el,tick,i,final:i===N-1};
      fillSection(s,d,i);
      return s;
    });

    function reveal(s){
      const tl=gsap.timeline();
      tl.fromTo(s.kick,{y:14,opacity:0},{y:0,opacity:1,duration:0.5,ease:'power2.out'});
      tl.to(s.words,{yPercent:0,duration:0.75,ease:'power4.out',stagger:0.05},'-=0.28');
      tl.fromTo(s.sub,{y:16,opacity:0},{y:0,opacity:1,duration:0.55,ease:'power2.out'},'-=0.42');
      if(s.final){ const c=s.el.querySelector('.cctas'); if(c) tl.to(c.children,{opacity:1,y:0,duration:0.6,stagger:0.1,ease:'back.out(1.5)'},'-=0.3'); }
    }
    function hideReset(s){ gsap.set(s.words,{yPercent:118}); gsap.set([s.kick,s.sub],{clearProps:'all'});
      const c=s.el.querySelector('.cctas'); if(c) gsap.set(c.children,{opacity:0,y:20}); }

    function updateRail(){ secs.forEach((s,i)=>{ if(s.tick) s.tick.classList.toggle('on', i===current); }); }

    function goTo(idx){
      if(idx<0||idx>=N||idx===current||isAnimating) return;
      const dir=idx>current?1:-1; isAnimating=true;
      const prev=secs[current], next=secs[idx];
      if(RM){ prev.el.classList.remove('active'); hideReset(prev); }
      else gsap.to(prev.el,{opacity:0,filter:'blur(9px)',yPercent:dir>0?-3:3,duration:0.45,ease:'power2.inOut',
        onComplete:()=>{ prev.el.classList.remove('active'); hideReset(prev); gsap.set(prev.el,{clearProps:'filter,transform,opacity'}); }});
      next.el.classList.add('active');
      if(RM){ gsap.set(next.el,{opacity:1}); gsap.set(next.words,{yPercent:0}); }
      else { gsap.fromTo(next.el,{opacity:0,yPercent:dir>0?3:-3},{opacity:1,yPercent:0,duration:0.5,ease:'power2.out',delay:0.12});
        gsap.delayedCall(0.18,()=>reveal(next)); }
      if(cube.toSection) cube.toSection(idx, dir, N);   // <-- EVOLVE the cube
      current=idx; updateRail();
      const hint=document.getElementById('chint'); if(hint) hint.style.opacity = idx<N-1 ? '1':'0';
      gsap.delayedCall(RM?0.05:1.0, ()=>{ isAnimating=false; });
    }

    /* ---- hybrid release into conversion site ---- */
    function enterSite(){ if(siteMode) return; siteMode=true; document.body.classList.add('site-mode');
      if(cube.enterSite) cube.enterSite(); window.scrollTo(0,0); }
    function exitSite(){ if(!siteMode) return; siteMode=false; document.body.classList.remove('site-mode');
      if(cube.exitSite) cube.exitSite(); window.scrollTo(0,0); }

    /* ---- input ---- */
    let wheelLock=0;
    addEventListener('wheel',(e)=>{
      if(siteMode) return;
      e.preventDefault();
      const now=performance.now();
      if(isAnimating||now<wheelLock) return;
      if(Math.abs(e.deltaY)<14) return;
      if(current===N-1 && e.deltaY>0){ enterSite(); return; }
      wheelLock=now+900; goTo(current+(e.deltaY>0?1:-1));
    },{passive:false});
    addEventListener('keydown',(e)=>{
      if(siteMode) return;
      if(['ArrowDown','PageDown',' ','Spacebar'].includes(e.key)){ e.preventDefault(); if(current===N-1) enterSite(); else goTo(current+1); }
      else if(['ArrowUp','PageUp'].includes(e.key)){ e.preventDefault(); goTo(current-1); }
      else if(e.key==='Home') goTo(0); else if(e.key==='End') goTo(N-1);
    });
    let touchY=null;
    addEventListener('touchstart',e=>{ touchY=e.touches[0].clientY; },{passive:true});
    addEventListener('touchmove',e=>{ if(!siteMode) e.preventDefault(); },{passive:false});
    addEventListener('touchend',e=>{
      if(touchY===null) return; const dy=touchY-e.changedTouches[0].clientY;
      if(siteMode){ touchY=null; return; }
      if(Math.abs(dy)>40){ if(dy>0 && current===N-1) enterSite(); else goTo(current+(dy>0?1:-1)); }
      touchY=null;
    },{passive:true});

    /* ---- delegation ---- */
    document.addEventListener('click',(e)=>{
      const t=e.target;
      const lb=t.closest('.langbtn'); if(lb){ e.preventDefault(); setLang(lb.dataset.lang); return; }
      if(t.closest('[data-act="wa"]')){ e.preventDefault(); openLead(content[lang].waMsg); return; }
      const go=t.closest('[data-go]'); if(go){ const g=go.dataset.go;
        if(g==='site'){ enterSite(); setTimeout(()=>{location.hash='#services';},80); }
        else if(g==='cases'){ e.preventDefault(); enterSite(); setTimeout(()=>{location.hash='#cases';},80); }
        else if(g==='intro'){ e.preventDefault(); exitSite(); }
        else if(g==='top'){ if(siteMode){ const el=document.getElementById('top'); if(el) el.scrollIntoView({behavior:'smooth'}); } }
        return; }
      const lead=t.closest('.js-lead'); if(lead){ const task=document.getElementById('lf-task');
        if(task && !task.value) task.value=content[lang].pkgTpl(lead.dataset.pkg||'');
        const c=document.getElementById('contact'); if(c) c.scrollIntoView({behavior:'smooth'});
        setTimeout(()=>{ const n=document.getElementById('lf-name'); if(n) n.focus({preventScroll:true}); },500); }
    });
    document.addEventListener('submit',(e)=>{
      if(e.target && e.target.id==='leadForm'){ e.preventDefault();
        const v=id=>(document.getElementById(id).value||'').trim();
        openLead(content[lang].leadTpl(v('lf-name'),v('lf-contact'),v('lf-task'))); }
    });

    /* ---- i18n render ---- */
    function renderChrome(l){
      const L=content[l];
      const hdr=document.getElementById('siteHeader'); if(hdr) hdr.innerHTML=headerHTML(L);
      const site=document.getElementById('site'); if(site) site.innerHTML=siteHTML(L);
      const mail=`mailto:${CONFIG.email}?subject=${encodeURIComponent(L.mailSubject)}&body=${encodeURIComponent(L.waMsg)}`;
      ['lf-email-link','foot-email'].forEach(id=>{ const el=document.getElementById(id); if(el) el.href=mail; });
    }
    function applyCinematic(l){
      const SS=content[l].sections;
      secs.forEach((s,i)=>{ const wasActive=s.el.classList.contains('active');
        fillSection(s,SS[i],i);
        if(wasActive){ gsap.set(s.words,{yPercent:0});
          const c=s.el.querySelector('.cctas'); if(c) gsap.set(c.children,{opacity:1,y:0}); } });
      const chint=document.querySelector('#chint .htxt'); if(chint) chint.textContent=UI[l].scroll;
    }
    function setLang(l){
      if(!content[l]) l='en'; lang=l; try{localStorage.setItem('lang',l);}catch(e){}
      const L=content[l];
      document.documentElement.lang=L.htmlLang; document.title=L.title;
      const md=document.querySelector('meta[name="description"]'); if(md) md.setAttribute('content',L.desc);
      applyCinematic(l); renderChrome(l);
      document.querySelectorAll('.langbtn').forEach(b=> b.classList.toggle('on', b.dataset.lang===l));
    }

    /* ---- boot ---- */
    if(cube.start) cube.start();
    setLang(lang);
    secs[0].el.classList.add('active');
    updateRail();
    if(cube.toSection) cube.toSection(0, 1, N);
    setTimeout(()=>{ const ld=document.getElementById('ld'); if(ld) ld.classList.add('done');
      if(RM){ gsap.set(secs[0].words,{yPercent:0}); gsap.set(secs[0].el,{opacity:1}); }
      else { gsap.set(secs[0].el,{opacity:1}); reveal(secs[0]); } }, 600);
    setTimeout(()=>{ const ld=document.getElementById('ld'); if(ld) ld.classList.add('done'); }, 2000);

    return { setLang, goTo };
  }

  return { start };
})();
