/* ---------- 3D карти: снимките на местата изпъкват като картички ----------
   • С мишка: снимката на мястото (плочката с тема, картата в началото) се
     накланя към показалеца, повдига се, етикетите излизат напред, минава отблясък.
   • На телефон: снимките леко се превъртат като барабан при скрол и се накланят
     с телефона.
   • Местата се рисуват наново (търсене, филтри, език) — новите карти се хващат сами.
   • При prefers-reduced-motion нищо не се движи. */
(function(){
  'use strict';
  var SEL = '.card .card-media, .tile, .ha-card';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  root.classList.add('fx');

  function set(c, rx, ry, gx, gy){
    c.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    c.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    c.style.setProperty('--gx', gx.toFixed(1) + '%');
    c.style.setProperty('--gy', gy.toFixed(1) + '%');
    c.style.setProperty('--sx', (-ry * 1.4).toFixed(1) + 'px');
    c.style.setProperty('--sy', (rx * 1.4).toFixed(1) + 'px');
  }

  var vis = [], io = null, pending = false;
  if (!fine){
    io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        var i = vis.indexOf(e.target);
        if (e.isIntersecting && i < 0) vis.push(e.target);
        if (!e.isIntersecting && i >= 0) vis.splice(i, 1);
      });
      queue();
    }, { rootMargin: '10% 0px' });
  }
  function prep(c){
    if (c.classList.contains('tilt')) return;
    c.classList.add('tilt');
    var g = document.createElement('span');
    g.className = 'glare'; g.setAttribute('aria-hidden', 'true');
    c.appendChild(g);
    if (io){ c.classList.add('rolling'); io.observe(c); }
  }
  function scan(){
    vis = vis.filter(function(c){ return c.isConnected; });
    Array.prototype.forEach.call(document.querySelectorAll(SEL), prep);
    queue();
  }
  var scanQ = false;
  new MutationObserver(function(){ if (!scanQ){ scanQ = true; requestAnimationFrame(function(){ scanQ = false; scan(); }); } }).observe(document.body, { childList:true, subtree:true });
  scan();

  if (fine){
    var cur = null, raf = 0, ex = 0, ey = 0;
    function leave(c){ c.classList.remove('tilting'); set(c, 0, 0, 50, 0); }
    document.addEventListener('pointermove', function(e){
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      var card = e.target.closest ? e.target.closest('.card') : null;
      var c = card ? card.querySelector('.card-media.tilt') : (e.target.closest ? e.target.closest('.tilt') : null);
      if (c !== cur){ if (cur) leave(cur); cur = c; if (c) c.classList.add('tilting'); }
      if (!c) return;
      ex = e.clientX; ey = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function(){
        raf = 0; if (!cur) return;
        var r = cur.getBoundingClientRect();
        var x = Math.min(1, Math.max(0, (ex - r.left) / r.width));
        var y = Math.min(1, Math.max(0, (ey - r.top) / r.height));
        set(cur, (.5 - y) * 12, (x - .5) * 12, x * 100, y * 100);
      });
    }, { passive:true });
    document.addEventListener('mouseleave', function(){ if (cur){ leave(cur); cur = null; } });
    return;
  }

  // телефон: първо четем всички позиции, после пишем
  function update(){
    pending = false;
    var vh = window.innerHeight, T = window.RadoTilt || { x:0, y:0 };
    var rects = vis.map(function(c){ return c.getBoundingClientRect(); });
    vis.forEach(function(c, i){
      var r = rects[i];
      var k = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh));
      set(c, -k * 4 - T.y * 9, T.x * 12, 50 - T.x * 60, 50 + k * 70 - T.y * 60);
    });
  }
  function queue(){ if (!pending){ pending = true; requestAnimationFrame(update); } }
  addEventListener('scroll', queue, { passive:true });
  addEventListener('resize', queue);
  addEventListener('radotilt', queue);
})();
