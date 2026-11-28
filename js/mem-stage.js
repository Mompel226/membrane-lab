/* ============================================================
   mem-stage.js — how this lab puts a moving picture on the page.

   A picture is a canvas (the particles, the membranes and the cells: hundreds of moving things) under an svg (the names,
   on ruled level lines that end ON their parts: CircLearn.labels). Two users:

   MemFilm(cfg)   a step animation in its own card (WKit: shell, timeline, stepper, mount). While a step waits for the
                  reader the particles go on moving: particles never stop, at equilibrium either (0610 3.1.1). With Reduce
                  motion nothing moves and each step shows one still with every name. cfg.lines: 3 for bands that hold
                  three lines (names too long for two, as MemView's o.lines).
   MemView(o)     a station's left picture, with its own buttons and read-outs, running while it is on the screen.

   A scene is { W, H, seek(t), to(t), idle(dt), draw(c, t, lay), labels(t), read?(t, pill) }: every frame is worked out from
   the scene's own time, so any moment can be drawn on demand (window.__memFreeze stops the idle motion for the tools).
   ============================================================ */
(function (global) {
  'use strict';
  var L = global.CircLearn, K = global.WKit;
  if (!L || !K) return;
  var h = L.h;

  /* The picture takes the whole width of its column, and its names stand in a band above it and a band below it, each
     joined to its part by one upright line that ends ON the part (Daniel, 5 Nov 2026: "put it at the top if you need it").
     Upright lines at different places cannot cross. On a phone each name is a numbered pin, with the words in a key. */
  function frame(svg, bg, W, H, D, narrow, px, aspect, lines, heads) {
    var f = px * (W + 4) / D, band = narrow ? f * 1.7 : f * (.59 + 1.18 * (lines || 2)) + 3, hd = heads && !narrow ? f * 1.3 : 0;
    var vb = { x: -2, y: -band - hd, w: W + 4, h: H + 2 * band + hd, bw: W, bh: H, ex: 0, hd: hd };
    /* aspect: the figure's shape (width over height). A picture made smaller by the height of its column stands in the
       middle of the figure, and the width beside it is its names' (25 Nov 2026: at 1101 to 1366 px in a short window the
       long names, "higher concentration of nitrate ions", were cut or ran over each other in bands as narrow as the drawing) */
    if (aspect && aspect * vb.h > vb.w) { vb.ex = (aspect * vb.h - vb.w) / 2; vb.x -= vb.ex; vb.w += 2 * vb.ex; }
    svg.setAttribute('viewBox', K.n1(vb.x) + ' ' + K.n1(vb.y) + ' ' + K.n1(vb.w) + ' ' + K.n1(vb.h));
    bg.setAttribute('x', vb.x); bg.setAttribute('y', vb.y); bg.setAttribute('width', vb.w); bg.setAttribute('height', vb.h);
    return { f: f, vb: vb, narrow: narrow, to: function (x, y) { return [x, y]; } };
  }
  /* a long name in a band breaks at its meaning ("partially permeable" over "membrane"), never in the middle of either part.
     Only the drawing is tied: the scene's words stay plain, so the reading time still counts every word. In bands of three
     lines (loose), a second part too long for one line breaks at its own words, under the first part */
  var FIRST_LINES = ['outside the cell:', 'inside the cell:', 'partially permeable', 'water fills', 'cytoplasm of a'];
  function tied(text, loose) {
    var t = String(text), keep = function (x) { return x.replace(/ /g, '\u00A0'); };
    for (var i = 0; i < FIRST_LINES.length; i++) {
      var a = FIRST_LINES[i];
      if (t.indexOf(a + ' ') === 0) { var rest = t.slice(a.length + 1); return keep(a) + ' ' + (loose && rest.length > 22 ? rest : keep(rest)); }
    }
    return t;
  }
  /* a name's real width, in the font its own class gives it (a higher or lower concentration is bolder), read from a
     name drawn for a moment off the page, and measured once at 100 px. A width is kept only once the page's own font has
     loaded, and every picture places its names again when it has (27 Nov 2026: measured in the stand-in font, a name a
     tenth narrower than its drawing stood past the picture's edge, "ir space, with oxygen") */
  var MC = null, MW = {}, MF = {}, AGAIN = [];
  function whenFonts(fn) { AGAIN.push(fn); }
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () {
    MW = {};
    AGAIN = AGAIN.filter(function (fn) { return fn() !== false; });
  });
  function fontOf(hl) {
    var k = hl === 'head' ? 'head' : hl ? 'hl' : 'n';
    if (MF[k]) return MF[k];
    var NS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NS, 'svg'), g = document.createElementNS(NS, 'g'), t = document.createElementNS(NS, 'text');
    sv.setAttribute('aria-hidden', 'true'); sv.style.cssText = 'position:absolute;left:-9999px;width:10px;height:10px';
    g.setAttribute('class', 'lb' + (hl === true ? ' lb--hi' : '')); t.setAttribute('class', hl === 'head' ? 'cellv__head' : 'lb__txt'); t.textContent = 'x';
    g.appendChild(t); sv.appendChild(g); document.body.appendChild(sv);
    var cs = global.getComputedStyle(t), f = (cs.fontWeight || 500) + ' 100px ' + (cs.fontFamily || 'sans-serif');
    document.body.removeChild(sv);
    return (MF[k] = f);
  }
  function measure(t, font, cls) {
    var hl = cls === 'head' ? 'head' : /lb--(hi|lo)/.test(cls || ''), k = (hl === 'head' ? 'H|' : hl ? 'h|' : 'n|') + t, v = MW[k];
    if (v == null) {
      if (!MC) MC = document.createElement('canvas').getContext('2d');
      var fnt = fontOf(hl);
      MC.font = fnt;
      v = MC.measureText(String(t)).width / 100;
      if (!document.fonts || !document.fonts.check || document.fonts.check(fnt.replace('100px', '16px'))) MW[k] = v;
    }
    return v * font;
  }
  /* heads: the title of a whole thing in the picture ("plant cell", "animal cell"), in a row of its own above the names,
     over the middle of its thing and with no line, as a photograph's headings (27 Nov 2026: in a short window the plant
     cell's title, the nucleus, the outside solution and the cell membrane could not all stand over their own lines) */
  function headsSvg(lay, heads) {
    var vb = lay.vb, f = lay.f, lo = vb.x + 4, hi = vb.x + vb.w - 4;
    return heads.map(function (q) {
      var w = measure(q.text, f, 'head') * 1.06, x = Math.max(lo + w / 2, Math.min(hi - w / 2, q.x));
      return '<text class="cellv__head" x="' + K.n1(x) + '" y="' + K.n1(vb.y + f * 1.02) + '" text-anchor="middle" style="font-size:' + K.n1(f) + 'px">' + L.esc(q.text) + '</text>';
    }).join('');
  }
  function putNames(lay, items, narrow, key, lines) {
    var heads = narrow || !lay.vb.hd ? [] : items.filter(function (q) { return q.head; });
    if (heads.length) items = items.filter(function (q) { return !q.head; });
    var vb = lay.vb, ex = vb.ex || 0, o = { items: items, left: -2, right: vb.bw + 2, font: lay.f, top: vb.y + 4, bottom: vb.y + vb.h - 4, bandT: -3, bandB: vb.bh + 3, bandL: 2 - ex, bandR: vb.bw - 2 + ex };
    if (narrow) {
      var P = L.pinLabels(Object.assign({}, o, { gap: 4 }));
      if (key) { key.hidden = !P.order.length; key.innerHTML = P.order.map(function (q) { return '<li><b>' + q.n + '</b> ' + L.esc(q.text) + '</li>'; }).join(''); }
      return P.svg;
    }
    if (key) key.hidden = true;
    o.items = items.map(function (q) { return Object.assign({}, q, { text: tied(q.text, lines > 2) }); });
    /* a band whose names cannot all stand clear of each other at this size has them a little smaller, down to .875 of
       their size (12.25 px on the screen or more), before any would run over another (27 Nov 2026: in a 1101 px window
       the carrier film's three bottom names, the longest "outside the cell: lower concentration of nitrate ions") */
    var f0 = lay.f, f = f0, nl = lines || 2;
    function fits(ff) {
      return ['T', 'B'].every(function (sd) {
        var it = o.items.filter(function (q) { return q.side === sd && !q.hidden; });
        return !it.length || L.labelBand(it, { font: ff, bandL: o.bandL, bandR: o.bandR, left: o.left, right: o.right, lines: nl, measure: measure }).fits;
      });
    }
    if (!fits(f0)) { f = f0; for (var k = 1; k <= 5; k++) if (fits(f0 * (1 - .025 * k))) { f = f0 * (1 - .025 * k); break; } }
    return L.labels(Object.assign({}, o, { font: f, gap: 6, width: 150, lines: nl, measure: measure })) + headsSvg(lay, heads);
  }

  /* the canvas under an svg: both show the same model units */
  function attach(svg) {
    var screen = h('div', 'mm__screen');
    svg.parentNode.insertBefore(screen, svg);
    var cv = document.createElement('canvas'); cv.className = 'mm__cv'; cv.setAttribute('aria-hidden', 'true');
    screen.appendChild(cv); screen.appendChild(svg);
    var g = cv.getContext('2d');
    function begin() {
      var m = svg.getScreenCTM(); if (!m) return null;
      var r = cv.getBoundingClientRect(); if (!r.width || !r.height) return null;
      var dpr = Math.min(2, global.devicePixelRatio || 1), w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, hh);
      g.setTransform(m.a * dpr, 0, 0, m.d * dpr, (m.e - r.left) * dpr, (m.f - r.top) * dpr);
      return g;
    }
    return { screen: screen, canvas: cv, begin: begin };
  }

  /* ---------- a step animation in a card ---------- */
  function MemFilm(cfg) {
    return function (spec) {
      var title = spec.title || cfg.title;
      var S = K.shell(spec, 'mf', title, cfg.aria, cfg.pills || []);
      var svg = S.svg, NSV = K.NS;
      var bg = document.createElementNS(NSV, 'rect'); bg.setAttribute('class', 'mf__bg'); svg.appendChild(bg);
      var model = document.createElementNS(NSV, 'g'); svg.appendChild(model);
      var gLab = document.createElementNS(NSV, 'g'); svg.appendChild(gLab);
      var lay = null, narrow = false, key = K.pinKey(S);
      var stage = attach(svg), scene = cfg.make();
      /* the film runs in real seconds: the step bar's bands are the seconds each step lasts, then its names' reading time */
      var TL = K.timeline(cfg.M, 1, null, title, function (m) { return scene.labels(m).map(function (q) { return q.text; }); }), clock = TL.clock;
      var itemsAt = K.itemsOf(function () { return lay; }, function (tt) { return scene.labels(clock(tt)); }, true), memo = {};
      var exact = false, raf = null, tsLast = null, sp, clockWas = -1;

      function canvasOnly(t) { var c = stage.begin(); if (c && lay) scene.draw(c, t, lay); }
      function draw(tt, still) {
        var t = clock(tt);
        if (still || exact) { scene.seek(t); exact = false; } else scene.to(t);
        canvasOnly(t);
        var items = L.stillItems(still, itemsAt, itemsAt(tt), tt, memo, narrow + '|' + lay.f);
        gLab.innerHTML = putNames(lay, items, narrow, key, cfg.lines);
        if (scene.read) scene.read(t, S.pill);
        if (!raf && !still && !L.still() && !global.__memFreeze) raf = requestAnimationFrame(amble);
      }
      /* the particles go on moving while the step waits for the reader */
      function amble(ts) {
        raf = null;
        if (!S.box.isConnected || global.__memFreeze || L.still()) { tsLast = null; return; }
        var card = S.box.closest ? S.box.closest('.xcard') : null;
        if ((card && !card.classList.contains('is-open')) || S.box.hidden) { tsLast = null; return; }
        /* a step that waits for the reader, or Play all's reading time at the end of a step: the story stands still */
        var now = sp ? clock(sp.time()) : 0, waiting = sp && sp.time() > 0 && (!sp.playing() || Math.abs(now - clockWas) < 1e-6);
        clockWas = now;
        if (waiting) {
          var dt = tsLast == null ? 0 : Math.min(.05, (ts - tsLast) / 1000);
          if (dt > 0) { scene.idle(dt); canvasOnly(now); if (scene.read) scene.read(now, S.pill); }
        }
        tsLast = ts;
        raf = requestAnimationFrame(amble);
      }
      /* a sentence card that only repeated a step is merged into it (Daniel, 27 and 28 Nov 2026: "you're not removing
         information necessarily, you're just kind of merging everything within the animation button"; app.js `inFilm`).
         spec.cards[i] = { html: [its sentences, marked], head? }: they stand where the step's own line marked 'card' (the
         words the card said) stood, or first; the step's other lines stay, because they add to the card; with `head` the
         step takes the card's heading. Without cards the film keeps every line of its own */
      var steps = !spec.cards ? cfg.steps : cfg.steps.map(function (st, i) {
        var c = spec.cards[i]; if (!c) return st;
        var o = {}, k, mine = c.html.map(function (x) { return ['ig', x, 'html']; }), out = [], put = false;
        for (k in st) o[k] = st[k];
        (st.p || []).forEach(function (q) { if (q[2] === 'card') { if (!put) { out = out.concat(mine); put = true; } } else out.push(q); });
        o.p = put ? out : mine.concat(out);
        if (c.head) o.h = c.head;
        return o;
      });
      sp = L.stepper({ steps: K.readerSteps(steps, TL.R), end: TL.end, render: draw, flow: TL.flow, stills: K.stillsOf(steps, TL) });
      var box = K.mount(S, sp, 'mf', cfg.key ? [{ key: cfg.key }].concat(cfg.notes || []) : (cfg.notes || []), function (Dw, nar, room) {
        narrow = nar;
        lay = frame(svg, bg, scene.W, scene.H, Dw, nar, 14.5, 0, cfg.lines);
        /* room: the height the picture's column leaves it (WKit.mount). A taller drawing is made smaller to fit, in the
           middle of the width, and its names keep their size and may stand in the width beside it (as MemView's) */
        var want = Dw * lay.vb.h / lay.vb.w;
        if (room >= 120 && room < want - 1) lay = frame(svg, bg, scene.W, scene.H, room * lay.vb.w / lay.vb.h, nar, 14.5, Dw / room, cfg.lines);
      });
      var seek0 = box.__seek, wasIn = false;
      box.__seek = function (t) { exact = true; return seek0(t); };
      whenFonts(function () { if (box.isConnected) { wasIn = true; sp.paint(sp.time()); return true; } return !wasIn; });
      return box;
    };
  }

  /* ---------- a station's left picture ----------
     o = { scene, cls?, buttons?: [[id, label]], say(state)?, read?: [[key, label, icon?, words behind the icon?]], cL, cR,
         lines? (3: bands that hold three lines, for names too long for two), heads? (a row of headings above the names:
         the scene's labels marked head: true),
         key?: { all: [[kind, name], …], sets: [[name, …], …] (what each state shows), now() (the names shown now) } }
     returns { el, setButtons(id), repaint(), labels(), stage: ... } for a view to wrap in Views.add */
  /* one short flash of a tab (none with Reduce motion: the CSS keeps no animation there) */
  function flashTab(x) { x.classList.remove('psw__tab--flash'); void x.offsetWidth; x.classList.add('psw__tab--flash'); }

  function MemView(o) {
    var root = h('div', 'memv ' + (o.cls || ''));
    /* the picture's switch (Daniel, 28 Nov 2026): its name in words, then one joined row of tabs standing on the picture's top
       edge, the chosen one filled; a button that does something rather than choose (memv__btn--act: Run again) stands apart */
    var bar = h('div', 'vbar memv__bar');
    var btn = {}, chosen = null, barAt = 0;
    var isAct = function (b) { return /memv__btn--act/.test(b[2] || ''); };
    var picks = (o.buttons || []).filter(function (b) { return !isAct(b); });
    var tabs = bar, acts = bar;
    if (picks.length > 1) {
      bar.classList.add('psw');
      var nm = h('span', 'psw__name', o.barLabel || 'What to show'); nm.id = 'psw' + Math.random().toString(36).slice(2, 8);
      tabs = h('div', 'psw__tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-labelledby', nm.id);
      bar.appendChild(nm); bar.appendChild(tabs);
      if (picks.length < (o.buttons || []).length) { acts = h('div', 'psw__acts'); bar.appendChild(acts); }
    } else { bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', o.barLabel || 'What to show'); }
    (o.buttons || []).forEach(function (b) {
      var act = isAct(b), tab = picks.length > 1 && !act;
      var x = h('button', 'memv__btn' + (tab ? ' psw__tab' : '') + (b[2] ? ' ' + b[2] : ''), b[1]); x.type = 'button'; x.setAttribute('data-b', b[0]);
      x.__act = act;
      x.addEventListener('click', function () { barAt = Date.now(); if (o.onButton) o.onButton(b[0]); });
      btn[b[0]] = x; (tab ? tabs : acts).appendChild(x);
    });
    if (!(o.buttons || []).length) bar.hidden = true;
    var fig = h('figure', 'memv__fig');
    var svg = document.createElementNS(K.NS, 'svg');
    svg.setAttribute('class', 'memv__svg'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', o.aria || '');
    var bg = document.createElementNS(K.NS, 'rect'); bg.setAttribute('class', 'mf__bg'); svg.appendChild(bg);
    var model = document.createElementNS(K.NS, 'g'); svg.appendChild(model);
    var gLab = document.createElementNS(K.NS, 'g'); svg.appendChild(gLab);
    fig.appendChild(svg);
    var read = h('div', 'memv__read' + ((o.read || []).length < 3 ? ' memv__read--short' : ''));   /* two counters need one row on a laptop: the picture keeps that height */
    /* the key: a drawn sample of each thing in the picture beside its name, only what the picture shows now
       (Daniel, 22 Nov 2026: "add a key, okay, with the icons. It's more clear, and avoid repetition") */
    var keyEl = o.key ? K.keyOf(o.key.all) : null, keyWas = null, keyW = 0;
    if (keyEl) keyEl.classList.add('memv__key');
    root.appendChild(bar); root.appendChild(fig);
    if (keyEl) root.appendChild(keyEl);
    if (o.read) root.appendChild(read);
    var pillEl = {};
    (o.read || []).forEach(function (p) {
      var el = h('span', 'memv__pill', '<b>' + p[1] + '</b> ' + (p[2] ? K.swatch(p[2]) + ' ' : '') + '<i></i>' + (p[3] ? '<span class="memv__vh"> ' + p[3] + '</span>' : '')); el.setAttribute('data-k', p[0]); pillEl[p[0]] = el; read.appendChild(el);
    });
    function pill(k, text, tone, label) {
      var el = pillEl[k]; if (!el) return;
      var i = el.querySelector('i'); if (i.textContent !== text) i.textContent = text;
      if (label) { var bb = el.querySelector('b'); if (bb.textContent !== label) bb.textContent = label; }
      el.className = 'memv__pill' + (tone ? ' is-' + tone : '');
    }
    var pk = h('ol', 'pinkey'); pk.hidden = true; root.appendChild(pk);
    var stage = attach(svg), lay = null, narrow = false, lastKey = '', running = false, raf = null, tsLast = null, scene = o.scene;
    var namesT = 0, pinW = 0, pinMax = 0;

    function showKey(names) {
      if (!keyEl) return;
      var id = names.join('|'); if (id === keyWas) return; keyWas = id;
      Array.prototype.forEach.call(keyEl.children, function (li) { li.hidden = names.indexOf(li.textContent) < 0; });
    }
    /* the key keeps the height of its fullest state, so the picture never jumps when an arrow appears */
    function sizeKey() {
      keyEl.style.minHeight = '';
      var mx = 0;
      o.key.sets.forEach(function (s) { showKey(s); mx = Math.max(mx, keyEl.offsetHeight); });
      keyEl.style.minHeight = mx + 'px';
      showKey(o.key.now());
    }
    function layout() {
      var rw = fig.getBoundingClientRect().width, H0 = root.clientHeight; if (!rw || !H0) return false;
      if (keyEl && Math.round(rw) !== keyW) { keyW = Math.round(rw); sizeKey(); }
      /* the counters and the key can take another row when the words change: the picture then makes room for them */
      var key = Math.round(rw) + 'x' + Math.round(H0) + 'x' + (o.read ? read.offsetHeight : 0) + 'x' + (pk.hidden ? 0 : pk.offsetHeight) + 'x' + (keyEl ? keyEl.offsetHeight : 0);
      if (key === lastKey && lay) return true;
      lastKey = key; narrow = rw < 440;
      var cs = global.getComputedStyle(root), pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom), gap = parseFloat(cs.rowGap) || 6;
      var room = H0 - pad - (bar.hidden ? 0 : bar.offsetHeight + gap) - (keyEl ? keyEl.offsetHeight + gap : 0) - (o.read ? read.offsetHeight + gap : 0) - (pk.hidden ? 0 : pk.offsetHeight + gap);
      lay = frame(svg, bg, scene.W, scene.H, rw, narrow, 14, 0, o.lines, o.heads);
      var want = rw * lay.vb.h / lay.vb.w;
      /* on a phone the picture scrolls with the page, whatever its height; in a column it fits the room there is */
      var fits = (global.matchMedia && global.matchMedia('(max-width: 1000px)').matches) || room < 120 ? want : Math.min(room, want);
      fig.style.height = Math.round(fits) + 'px';
      /* a picture limited by the height of its column: the names keep their size on the screen all the same, and may stand
         in the width beside the drawing */
      if (fits < want - 1) lay = frame(svg, bg, scene.W, scene.H, fits * lay.vb.w / lay.vb.h, narrow, 14, rw / fits, o.lines, o.heads);
      return true;
    }
    function names() {
      if (!lay) return;
      var items = scene.labels().map(function (q) {
        var p = lay.to(q.x, q.y), it = { id: q.id, text: q.text, x: p[0], y: p[1], side: q.side, pri: q.pri, cls: q.cls, head: q.head };
        if (q.alts) it.alts = q.alts.map(function (a) { return lay.to(a[0], a[1]); });
        return it;
      });
      gLab.innerHTML = putNames(lay, items, narrow, pk, o.lines);
      /* the numbered names keep the height of their fullest state at this width, so the picture does not jump between buttons */
      if (!pk.hidden) {
        var w = Math.round(fig.getBoundingClientRect().width);
        if (w !== pinW) { pinW = w; pinMax = 0; pk.style.minHeight = ''; }
        pinMax = Math.max(pinMax, pk.offsetHeight); pk.style.minHeight = pinMax + 'px';
      }
    }
    function paint() {
      var was = lastKey;
      if (keyEl) showKey(o.key.now());
      if (!layout()) return;
      var c = stage.begin(); if (c) scene.draw(c, lay);
      if (scene.read) scene.read(pill);
      if (was && lastKey !== was) names();   /* the picture changed size: its names follow it */
    }
    function full() { lastKey = ''; if (layout()) { paint(); names(); } }
    function loop(ts) {
      raf = null;
      if (!running) return;
      if (!root.isConnected || root.closest('[hidden]')) { tsLast = null; raf = requestAnimationFrame(loop); return; }
      var dt = tsLast == null ? 1 / 60 : Math.min(.05, (ts - tsLast) / 1000); tsLast = ts;
      if (!L.still() && !global.__memFreeze) {
        scene.tick(dt); paint();
        if (o.liveNames && (namesT += dt) > .22) { namesT = 0; names(); }   /* a name on a moving part moves with it */
      }
      raf = requestAnimationFrame(loop);
    }
    var ro = global.ResizeObserver ? new ResizeObserver(function () { if (root.isConnected) full(); }) : null, wasIn = false;
    if (ro) ro.observe(root);
    whenFonts(function () { if (root.isConnected) { wasIn = true; full(); return true; } return !wasIn; });
    return {
      el: root, pill: pill, names: names, paint: paint, full: full,
      press: function (id) {
        Object.keys(btn).forEach(function (k) { if (!btn[k].__act) btn[k].setAttribute('aria-pressed', k === id ? 'true' : 'false'); });
        /* a card, not the switch, changed the picture: the chosen tab flashes once, so the eye finds what changed */
        if (chosen !== null && id !== chosen && btn[id] && Date.now() - barAt > 600) flashTab(btn[id]);
        chosen = id;
      },
      button: function (id) { return btn[id]; },
      start: function () { running = true; tsLast = null; if (!raf) raf = requestAnimationFrame(loop); full(); },
      stop: function () { running = false; if (raf) cancelAnimationFrame(raf); raf = null; },
      isStill: function () { return L.still(); }
    };
  }

  global.MemStage = { attach: attach, flashTab: flashTab };
  global.MemFilm = MemFilm;
  global.MemView = MemView;
})(window);
