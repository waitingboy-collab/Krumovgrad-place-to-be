/* ---------- WebGL: релефна карта на Родопите ----------
   • Прозрачен слой зад сайта: топографски линии (хоризонтали) на хълмове, през
     които криволичи долината на Арда; релефът е осветен като на карта.
   • Под мишката/пръста изниква хълм — линиите се събират в кръгове около него.
     При наклон на телефона хълмът се търкаля и се разтяга, докато се движи.
   • Следва светлата/тъмната тема на сайта.
   • Слоят не зависи от скрола и се рисува рядко, когато нищо не се движи.
   • Без WebGL или при prefers-reduced-motion сайтът изглежда както преди. */
(function(){
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  var cv = document.createElement('canvas');
  cv.id = 'gl-relief'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  var gl = cv.getContext('webgl', { antialias:false, alpha:true, premultipliedAlpha:true, powerPreference:'low-power' });
  if (!gl){ cv.remove(); return; }
  var deriv = gl.getExtension('OES_standard_derivatives');

  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
  deriv ? '#extension GL_OES_standard_derivatives : enable\n#define HAS_D 1' : '',
  'precision highp float;',
  'uniform vec2 uRes; uniform float uDpr; uniform float uTime;',
  'uniform vec2 uMouse; uniform vec2 uLight; uniform float uLens; uniform float uR; uniform vec3 uSq; uniform vec2 uLdir;',
  'uniform float uDark;',
  'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
  'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);',
  '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }',
  'float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+17.1; a*=.5; } return v; }',
  'vec4 over(vec4 d, vec3 c, float a){ return vec4(c*a + d.rgb*(1.-a), a + d.a*(1.-a)); }',
  'void main(){',
  '  vec3 INK = mix(vec3(.063,.161,.169), vec3(.925,.945,.933), uDark);',
  '  vec3 TEAL = mix(vec3(.043,.478,.471), vec3(.263,.776,.745), uDark);',
  '  vec3 TERRA = mix(vec3(.663,.278,.184), vec3(.910,.565,.416), uDark);',
  '  vec3 HI = mix(vec3(1.), vec3(.55,.85,.82), uDark);',
  '  float px = 1./uDpr;',
  '  vec2 v = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;',
  '  vec2 vp = uRes / uDpr;',
  '  float t = uTime;',
  '  vec4 o = vec4(0.);',
  // терен
  '  vec2 q = v / 540. + vec2(t*.006, -t*.004);',
  '  float h = fbm(q) * .9 + fbm(q*2.3 + 5.) * .25;',
  // долината на Арда
  '  float ry = vp.y*.66 + sin(v.x/240. + t*.02)*58. + sin(v.x/97. + 1.3)*18.;',
  '  float rd = abs(v.y - ry);',
  '  h -= .30 * exp(-rd*rd/(90.*90.));',
  // хълм под показалеца (разтегнат по посоката на движение)
  '  vec2 dm = v - uMouse;',
  '  float sa = dot(dm, uSq.xy);',
  '  vec2 dq = uSq.xy * (sa / uSq.z) + (dm - uSq.xy * sa) * sqrt(uSq.z);',
  '  float bump = exp(-dot(dq,dq)/(uR*uR)) * uLens;',
  '  h += bump * .42;',
  // хоризонтали; всяка пета е по-плътна
  '  float k = h * 22.;',
  '  float cd = .5 - abs(fract(k) - .5);',
  '#ifdef HAS_D',
  '  float aw = fwidth(k) * .9;',
  '#else',
  '  float aw = .03;',
  '#endif',
  '  float line = 1. - smoothstep(aw*.4, aw*1.2, cd);',
  '  float idx = step(4.5, mod(floor(k + .5), 5.));',
  '  vec3 lc = mix(INK, TERRA, smoothstep(.55, .9, h) * .6);',
  '  lc = mix(lc, TEAL, bump * .8);',
  '  o = over(o, lc, line * (mix(.07, .13, idx) + bump*.12) * (1. - uDark*.25));',
  // релефно осветяване (hillshade)
  '#ifdef HAS_D',
  '  float K = 60. * uDpr;',
  '  vec3 n = normalize(vec3(-dFdx(h)*K, -dFdy(h)*K, 1.));',
  '  vec2 lp = vec2(uLight.x*uDpr, uRes.y - uLight.y*uDpr);',
  '  vec3 L = normalize(vec3(lp - gl_FragCoord.xy, 340.*uDpr));',
  '  float sh = dot(n, L) - L.z;',
  '  o = over(o, HI, clamp(sh*.8, 0., .16) * (1. - uDark*.5));',
  '  o = over(o, INK, clamp(-sh*.5, 0., mix(.07, .14, uDark)));',
  '#endif',
  // Арда: тънка тюркоазена лента в дъното на долината
  '  float river = (1. - smoothstep(1.2, 1.2 + px*2., rd - 2. - sin(v.x/53.)*1.5)) ;',
  '  o = over(o, TEAL, river * .14);',
  '  o = over(o, TEAL, exp(-rd*rd/(26.*26.)) * .045);',
  '  gl_FragColor = o;',
  '}'].join('\n');

  function sh(t, s){ var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(o)); return null; } return o; }
  var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
  if (!a || !b){ cv.remove(); return; }
  var pr = gl.createProgram(); gl.attachShader(pr, a); gl.attachShader(pr, b); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)){ cv.remove(); return; }
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['uRes','uDpr','uTime','uMouse','uLight','uLens','uR','uSq','uLdir','uDark'].forEach(function(n){ U[n] = gl.getUniformLocation(pr, n); });
  gl.clearColor(0, 0, 0, 0);
  root.classList.add('webgl');

  var W = 0, H = 0, dpr = 1, force = true;
  // светла / тъмна тема на сайта
  var dark = 0;
  function readTheme(){ dark = root.getAttribute('data-theme') === 'dark' ? 1 : 0; force = true; kick(); }
  new MutationObserver(readTheme).observe(root, { attributes:true, attributeFilter:['data-theme'] });
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, fine ? 1.5 : 1);
    W = Math.max(1, Math.round(cv.clientWidth * dpr)); H = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    force = true; kick();
  }
  function now(){ return performance.now() / 1000; }

  var mouse = { x:-999, y:-999 }, lens = 0, lensTarget = 0, lastHuman = -10, lastScroll = -10;
  var touching = false, lastTouchT = 0, mb = { vx:0, vy:0 }, lightX = -999, lightY = -999;
  function marbleOn(){ return !fine && window.RadoTilt && window.RadoTilt.on; }

  addEventListener('pointermove', function(e){
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    lastHuman = now(); mouse.x = e.clientX; mouse.y = e.clientY; lensTarget = 1; kick();
  }, { passive:true });
  document.addEventListener('mouseleave', function(){ lensTarget = 0; kick(); });
  function onTouch(e){
    var tt = e.touches && e.touches[0]; if (!tt) return;
    var t = now(), dt = Math.max(.008, t - lastTouchT);
    if (touching && e.type === 'touchmove'){ mb.vx = (tt.clientX - mouse.x) / dt; mb.vy = (tt.clientY - mouse.y) / dt; } else { mb.vx = mb.vy = 0; }
    lastTouchT = t; lastHuman = t; touching = true; mouse.x = tt.clientX; mouse.y = tt.clientY; lensTarget = 1; kick();
  }
  addEventListener('touchstart', onTouch, { passive:true });
  addEventListener('touchmove', onTouch, { passive:true });
  function endTouch(e){ if (!e.touches || !e.touches.length){ touching = false; if (!marbleOn()) lensTarget = 0; kick(); } }
  addEventListener('touchend', endTouch, { passive:true });
  addEventListener('touchcancel', endTouch, { passive:true });
  addEventListener('scroll', function(){ lastScroll = now(); }, { passive:true });
  addEventListener('radotilt', function(){
    if (!marbleOn()) return;
    if (mouse.x < -900){ mouse.x = cv.clientWidth * .72; mouse.y = cv.clientHeight * .4; }
    lensTarget = 1; kick();
  });

  var lastStep = 0;
  function stepMarble(t){
    var dt = Math.min(.05, lastStep ? t - lastStep : .016); lastStep = t;
    if (!marbleOn() || touching) return;
    var T = window.RadoTilt, vw = cv.clientWidth, vh = cv.clientHeight, m = 46;
    mb.vx += T.x * 2400 * dt; mb.vy += T.y * 2400 * dt;
    var fr = Math.exp(-1.7 * dt); mb.vx *= fr; mb.vy *= fr;
    mouse.x += mb.vx * dt; mouse.y += mb.vy * dt;
    if (mouse.x < m){ mouse.x = m; mb.vx = Math.abs(mb.vx) * .55; }
    if (mouse.x > vw - m){ mouse.x = vw - m; mb.vx = -Math.abs(mb.vx) * .55; }
    if (mouse.y < m + 20){ mouse.y = m + 20; mb.vy = Math.abs(mb.vy) * .55; }
    if (mouse.y > vh - m){ mouse.y = vh - m; mb.vy = -Math.abs(mb.vy) * .55; }
  }

  var raf = 0, t0 = now(), lastDraw = -1;
  function frame(){
    raf = 0;
    if (document.hidden) return;
    var t = now();
    stepMarble(t);
    lens += (lensTarget - lens) * (reduce ? 1 : .15);
    var vw = cv.clientWidth, vh = cv.clientHeight, lt = reduce ? 0 : (t - t0) * .25;
    var ltx = lens > .05 ? mouse.x : vw * .5 + Math.cos(lt) * vw * .45;
    var lty = lens > .05 ? mouse.y : vh * .4 + Math.sin(lt) * vh * .35;
    if (lightX < -900){ lightX = ltx; lightY = lty; }
    lightX += (ltx - lightX) * .2; lightY += (lty - lightY) * .2;
    var speed = Math.sqrt(mb.vx * mb.vx + mb.vy * mb.vy);
    var active = Math.abs(lens - lensTarget) > .01 || (lens > .01 && (t - lastHuman < .6 || touching || speed > 4)) || Math.abs(lightX - ltx) + Math.abs(lightY - lty) > 2;
    var scrolling = t - lastScroll < .25;
    var interval = active ? (scrolling ? 1 / 30 : 0) : (scrolling ? 1e9 : 1 / 12);
    if (force || reduce || t - lastDraw >= interval){
      force = false; lastDraw = t;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uTime, reduce ? 0 : t - t0);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform2f(U.uLight, lightX, lightY);
      gl.uniform1f(U.uLens, lens);
      gl.uniform1f(U.uR, fine ? 150 : 95);
      gl.uniform1f(U.uDark, dark);
      var st = marbleOn() ? 1 + Math.min(speed / 1600, .45) : 1;
      gl.uniform3f(U.uSq, speed > 1 ? mb.vx / speed : 1, speed > 1 ? mb.vy / speed : 0, st);
      var T = window.RadoTilt || { x:0, y:0 };
      gl.uniform2f(U.uLdir, -.45 - T.x * .7, -.6 - T.y * .7);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!reduce || active) raf = requestAnimationFrame(frame);
  }
  function kick(){ if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  readTheme();   resize(); addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden){ force = true; kick(); } });
  cv.addEventListener('webglcontextlost', function(e){ e.preventDefault(); root.classList.remove('webgl'); cv.style.display = 'none'; });
})();
