/* ============================================================
   views/mem-views.js — each station's own left picture (Daniel, 7 Oct 2026: "a thing the pupil learns FROM").

   chamber   Diffusion: two equal boxes and a divider to lift
   places    Through the membrane: oxygen entering a root hair cell, urea leaving a liver cell
   race      The rate: one box beside another that differs in ONE factor
   solvent   Water: molecules touching, with hydrogen bonds that break and form, each solute held by its shell of water
   osmo      Osmosis: a partially permeable membrane between two solutions of equal volume
   tubing    A tied bag of dialysis tubing in a beaker, with a close-up of its wall
   twocells  A plant cell and an animal cell in the same liquid
   carrierv  A protein carrier at work, with respiration on or off
   roothair  A root hair at the soil: ions, water and oxygen
   compare   One membrane, three processes
   Every picture runs while it is on the screen, keeps its state when a card opens or shuts, and with Reduce motion shows
   the same state as a still (memory animations-wait-for-the-reader).
   ============================================================ */
(function (global) {
  'use strict';
  var Views = global.Views, D = global.MemDraw, Sim = global.MemSim, MV = global.MemView, MF = global.MemFilms;
  if (!Views || !D || !Sim || !MV || !MF) return;
  var C = D.C, seg = D.seg, lerp = D.lerp, clamp = D.clamp, ease = D.ease, DT = Sim.DT, TAU = D.TAU;
  var NET = '#FFF3C4', WHITE = '#FFFFFF';
  var molsBy = MF.molsBy;
  function many(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function stepN(sim, dt) { var n = Math.max(1, Math.round(dt / DT)); while (n-- > 0) sim.step(); }

  /* ======================================================================= Diffusion */
  Views.add('chamber', function (spec, ctx) {
    var W = 560, H = 330, foc = null, lifted = false, dv = { r: 0, bal: false, since: 0 };
    var sim = Sim.make({
      seed: 31, w: W, h: H,
      gate: { x: W / 2, hw: 3, pass: function (k, y, dir, s) {
        if (y < H - dv.r) return 0;
        if (!dv.bal) return 1;
        /* a few dozen particles swing far more than real air: once about equal, the two counts stay within 2 of each other */
        var n = s.side[s.kindIx(k)], from = dir > 0 ? n[0] : n[1], to = dir > 0 ? n[1] : n[0];
        return from > to ? 1 : from === to ? .5 : 0;
      } },
      kinds: { air: { n: [14, 40], speed: 116, tau: .9 }, scent: { n: [26, 0], speed: 116, tau: .9 } }
    });
    var ringI = 54;
    sim.onMove = function (s) { s.trail.push(s.X[ringI], s.Y[ringI]); if (s.trail.length > 150) s.trail.splice(0, 2); };
    function reset() { sim.reset(); lifted = false; dv.r = 0; dv.bal = false; dv.since = 0; }
    function lift() { lifted = true; }
    function about() { var n = sim.count('scent'); return Math.abs(n[0] - n[1]) <= 2; }
    function jumpToEqual() {
      lifted = true; dv.r = H + 10;
      for (var q = 0; !dv.bal && q < 60 * 40; q++) { sim.step(); if (q > 180 && about()) dv.bal = true; }
      var n = 60 * 2; while (n-- > 0) sim.step();
      dv.since = 20;
    }
    var scene = {
      W: W, H: H,
      tick: function (dt) {
        if (lifted) { dv.r = Math.min(H + 10, dv.r + dt * 150); dv.since += dt; if (!dv.bal && dv.since > 3 && about()) dv.bal = true; }
        stepN(sim, dt);
      },
      draw: function (c) {
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W, H, C.air1, C.air0);
          c.strokeStyle = 'rgba(190,220,245,.4)'; c.lineWidth = 1; c.setLineDash([3, 5]);
          c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke(); c.setLineDash([]);
          /* the concentration gradient, as the two boxes' own tints */
          if (foc === 'gradient' || foc === 'conc') {
            var n = sim.count('scent'), max = Math.max(1, n[0], n[1]);
            c.fillStyle = 'rgba(255,127,191,' + (.3 * n[0] / max).toFixed(3) + ')'; c.fillRect(0, 0, W / 2, H);
            c.fillStyle = 'rgba(255,127,191,' + (.3 * n[1] / max).toFixed(3) + ')'; c.fillRect(W / 2, 0, W / 2, H);
          }
          if (foc === 'random' && sim.trail.length > 4) {
            c.strokeStyle = 'rgba(255,230,160,.8)'; c.lineWidth = 1.5; c.lineJoin = 'round';
            c.beginPath(); for (var i = 0; i < sim.trail.length; i += 2) c[i ? 'lineTo' : 'moveTo'](sim.trail[i], sim.trail[i + 1]); c.stroke();
          }
          if (foc === 'energy') {
            /* the movement of each particle, as a short streak behind it */
            c.strokeStyle = 'rgba(255,230,160,.6)'; c.lineWidth = 2; c.lineCap = 'round';
            for (var j = 0; j < sim.N; j++) { c.beginPath(); c.moveTo(sim.X[j], sim.Y[j]); c.lineTo(sim.X[j] - sim.VX[j] * 18, sim.Y[j] - sim.VY[j] * 18); c.stroke(); }
          }
          molsBy(c, sim, 34, ['air', 'scent']);
          if (foc === 'random') { c.strokeStyle = 'rgba(255,240,190,1)'; c.lineWidth = 2; c.beginPath(); c.arc(sim.X[ringI], sim.Y[ringI], 12, 0, TAU); c.stroke(); }
          var by = H - dv.r;
          if (by > -4) {
            var lg = c.createLinearGradient(W / 2 - 4, 0, W / 2 + 4, 0);
            lg.addColorStop(0, '#9FB4C8'); lg.addColorStop(.5, '#E8F1F8'); lg.addColorStop(1, '#8499AE');
            c.fillStyle = lg; c.fillRect(W / 2 - 3.5, -2, 7, by + 2);
            c.fillStyle = '#5E7387'; c.fillRect(W / 2 - 3.5, by - 1.5, 7, 2);
          }
          var n2 = sim.count('scent');
          if (lifted && !dv.bal && n2[0] > n2[1] + 2) D.arrow(c, W / 2 - 58, H / 2, W / 2 + 62, H / 2, 16, NET, { head: 22, headW: 18 });
          if (dv.bal) {
            D.arrow(c, W / 2 - 46, H / 2 - 18, W / 2 + 46, H / 2 - 18, 7, WHITE, { head: 15, headW: 11 });
            D.arrow(c, W / 2 + 46, H / 2 + 18, W / 2 - 46, H / 2 + 18, 7, WHITE, { head: 15, headW: 11 });
          }
        });
      },
      labels: function () {
        var it = [];
        if (!lifted) it.push({ id: 'dv', text: 'divider', x: W / 2, y: 22, side: 'T' });
        if ((lifted && !dv.bal) || (!lifted && (foc === 'conc' || foc === 'gradient'))) { it.push({ id: 'hi', text: 'higher concentration', x: W * .25, y: 20, side: 'T' }); it.push({ id: 'lo', text: 'lower concentration', x: W * .75, y: 20, side: 'T' }); }
        if (dv.bal) { it.push({ id: 'hi', text: 'equal concentration', x: W * .25, y: 20, side: 'T' }); it.push({ id: 'lo', text: 'equal concentration', x: W * .75, y: 20, side: 'T' }); }
        return it;
      },
      read: function (pill) {
        var n = sim.count('scent'), x = sim.crossed('scent');
        pill('l', String(n[0]), n[0] > n[1] + 3 ? 'warn' : 'ok');
        pill('r', String(n[1]), n[0] > n[1] + 3 ? 'warn' : 'ok');
        pill('n', !lifted ? 'none yet' : dv.bal ? 'about zero now' : '→ ' + many(Math.max(0, x.net), 'particle') + ' so far', dv.bal ? 'ok' : 'warn');
      }
    };
    var V = MV({
      scene: scene, aria: 'Two boxes of equal volume with a divider between them. Scent particles are in the left box; when the divider is lifted they spread until the two concentrations are equal.',
      barLabel: 'The divider', buttons: [['go', 'Lift the divider'], ['reset', 'Start again']],
      read: [['l', 'Left box:', 'scent', 'scent particles'], ['r', 'Right box:', 'scent', 'scent particles'], ['n', 'Net movement:']],
      key: { all: [['scent', 'scent particle'], ['air', 'air particle'], ['net', 'net movement'], ['ways', 'crossing each way']],
             sets: [['scent particle', 'air particle', 'net movement'], ['scent particle', 'air particle', 'crossing each way']],
             now: function () {
               var a = ['scent particle', 'air particle'], n = sim.count('scent');
               return dv.bal ? a.concat('crossing each way') : lifted && n[0] > n[1] + 2 ? a.concat('net movement') : a;
             } },
      onButton: function (id) { if (id === 'go') { lift(); ctx.pick('net', { stay: true }); } else { reset(); } sync(); }
    });
    /* with Reduce motion nothing moves, so the press shows at once what the moving picture reaches */
    function settle() { if (!V.isStill() || !lifted || dv.since > 0) return; dv.r = H + 10; dv.since = 6; var n = 60 * 6; while (n-- > 0) sim.step(); }
    function sync() { settle(); V.button('go').disabled = lifted; V.names(); V.paint(); }
    return {
      el: V.el, start: function () { V.start(); sync(); }, stop: V.stop,
      say: 'Two boxes of the same volume: the particles move at random',
      credit: 'Particles drawn for this lab. They are shown many millions of times slower than in reality.',
      focus: function (part) {
        foc = part || null;
        if (part === 'net' && !lifted) lift();
        if (part === 'equal' && !dv.bal) jumpToEqual();
        if (part === 'random') { sim.trail.length = 0; }
        sync();
      }
    };
  });

  /* ======================================================================= Through the cell membrane */
  Views.add('places', function (spec, ctx) {
    var W = 560, H = 330, u = 26, mode = 'oxygen', foc = null, E = { x: W + 120, y: H + 96, r: 300 }, flow = 0;
    function make(m) {
      if (m === 'oxygen') {
        var s = Sim.make({ seed: 6, w: W, h: H,
          gate: { x: W / 2, hw: 2.5 * u, pass: function () { return .4; } },
          kinds: { oxygen: { n: [34, 7], speed: 62, tau: .8, through: 56, keep: [34, 99] } } });
        s.onMove = function (q) {
          for (var i = 0; i < q.N; i++) {
            if (q.TR[i] || q.X[i] < W / 2) continue;
            var dx = q.X[i] - E.x, dy = q.Y[i] - E.y;
            if (dx * dx + dy * dy < E.r * E.r) { q.side[0][1]--; q.side[0][0]++; q.X[i] = 6; q.Y[i] = 10 + q.r() * (H - 20); q.VX[i] = Math.abs(q.VX[i]); }
          }
        };
        return s;
      }
      return Sim.make({ seed: 4, w: W, h: H,
        gate: { x: W / 2, hw: 2.5 * u, pass: function () { return .4; } },
        kinds: { urea: { n: [7, 30], speed: 50, tau: .8, through: 52, keep: [7, 30] } } });
    }
    var sims = { oxygen: make('oxygen'), urea: make('urea') }, shownNet = {};
    var scene = {
      W: W, H: H,
      tick: function (dt) { stepN(sims[mode], dt); flow += dt; },
      draw: function (c) {
        var s = sims[mode];
        D.frame(c, 0, 0, W, H, 16, function () {
          if (mode === 'oxygen') {
            D.ground(c, 0, 0, W / 2, H, '#1B2C3A', '#13212C');
            D.wallBand(c, W / 2 - 136, W / 2 - 66, 0, H);
          } else {
            /* the blood on the left, flowing past */
            D.ground(c, 0, 0, W / 2, H, '#5A1F2C', '#3F1520');
            c.strokeStyle = 'rgba(255,190,190,.2)'; c.lineWidth = 2; c.setLineDash([16, 22]); c.lineDashOffset = -flow * 26;
            for (var x = 26; x < W / 2 - 74; x += 44) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
            c.setLineDash([]); c.lineDashOffset = 0;
          }
          D.ground(c, W / 2, 0, W / 2, H, C.cytoDark[0], C.cytoDark[1]);
          if (mode === 'oxygen') D.mitoEdge(c, E, foc === 'keep' ? .8 : 0);
          D.bilayer(c, W / 2, 0, H, u);
          molsBy(c, s, u, [mode]);
          /* the arrow of the net movement, once more have crossed that way */
          var into = mode === 'oxygen', xc = s.crossed(mode);
          if ((into ? xc.ab - xc.ba : xc.ba - xc.ab) >= 3) shownNet[mode] = true;
          if (shownNet[mode]) D.arrow(c, into ? W / 2 - 112 : W / 2 + 112, 52, into ? W / 2 + 112 : W / 2 - 112, 52, 15, NET, { head: 22, headW: 18 });
        });
      },
      labels: function () {
        var it = [];
        it.push({ id: 'mem', text: 'cell membrane', x: W / 2, y: 14, side: 'T' });
        if (mode === 'oxygen') {
          it.push({ id: 'out', text: 'air in the soil', x: 62, y: H - 18, side: 'B' });
          it.push({ id: 'wall', text: 'cell wall', x: W / 2 - 100, y: H - 18, side: 'B' });
          it.push({ id: 'in', text: 'cytoplasm of a root hair cell', x: W / 2 + 96, y: H - 18, side: 'B' });
          it.push({ id: 'mi', text: 'mitochondrion', x: 470, y: 232, side: 'T' });
        } else {
          it.push({ id: 'out', text: 'blood', x: 90, y: H - 18, side: 'B' });
          it.push({ id: 'in', text: 'cytoplasm of a liver cell', x: W - 120, y: H - 18, side: 'B' });
        }
        return it;
      },
      read: function (pill) {
        /* the cell is on the right in both pictures */
        var x = sims[mode].crossed(mode);
        pill('a', many(x.ab, 'molecule'), 'ok'); pill('b', many(x.ba, 'molecule'), 'ok');
        var nt = mode === 'oxygen' ? x.ab - x.ba : x.ba - x.ab;
        pill('n', nt > 0 ? nt + (mode === 'oxygen' ? ' into the cell' : ' out of the cell') : 'counting', 'warn');
      }
    };
    var V = MV({
      scene: scene, aria: 'A cell membrane with molecules crossing it in both directions. There are more on one side, so there is a net movement to the other.',
      barLabel: 'Which cell', buttons: [['oxygen', 'Oxygen into a root hair cell'], ['urea', 'Urea out of a liver cell']],
      read: [['a', 'Into the cell:'], ['b', 'Out of the cell:'], ['n', 'Net movement:']],
      key: { all: [['oxygen', 'oxygen molecule'], ['urea', 'urea molecule'], ['lipid', 'lipid of the cell membrane'], ['net', 'net movement']],
             sets: [['oxygen molecule', 'lipid of the cell membrane', 'net movement'], ['urea molecule', 'lipid of the cell membrane', 'net movement']],
             now: function () { var a = [mode + ' molecule', 'lipid of the cell membrane']; return shownNet[mode] ? a.concat('net movement') : a; } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    function show(m) { mode = m; if (V.isStill() && sims[m].t < 8) { var n = 60 * 10; while (n-- > 0) sims[m].step(); } V.press(m); V.names(); V.paint(); }
    return {
      el: V.el, start: function () { V.start(); show(mode); }, stop: V.stop,
      say: 'At the cell membrane: each molecule moves at random, and more cross one way',
      credit: 'Molecules and membrane at their true sizes beside each other (5 nm thick). The cell wall is drawn much thinner than it really is, and only some molecules are drawn.',
      focus: function (part) { foc = part; if (part === 'urea') show('urea'); else if (part === 'oxygen' || part === 'keep') show('oxygen'); else { V.names(); V.paint(); } }
    };
  });

  /* ======================================================================= The rate of diffusion
     Two boxes, side by side, that differ in ONE factor. The same seed, the same start: the difference is the factor. */
  Views.add('race', function (spec, ctx) {
    var W = 560, H = 318, pw = 272, gapX = 16, foc = 'temp', t = 0, END = 10, go = 0;
    /* `seeds`: runs measured so that, at every second from the fourth on, the faster box is ahead, by a clear margin at the end */
    var FACT = {
      temp: { name: 'Temperature', a: 'lower temperature', b: 'higher temperature', heat: [1, 2], n: [40, 40], door: [120, 120], hw: [5, 5], seeds: [9, 6, 1] },
      grad: { name: 'Concentration gradient', a: 'smaller gradient', b: 'steeper gradient', heat: [1, 1], n: [18, 52], door: [120, 120], hw: [5, 5], seeds: [3, 16, 5] },
      area: { name: 'Surface area', a: 'smaller surface area', b: 'larger surface area', heat: [1, 1], n: [40, 40], door: [50, 190], hw: [5, 5], seeds: [25, 18, 16] },
      dist: { name: 'Distance', a: 'longer distance', b: 'shorter distance', heat: [1, 1], n: [40, 40], door: [120, 120], hw: [46, 5], seeds: [28, 65, 5] }
    };
    /* each wall starts at the same place, so the side the particles start in has the same volume in both boxes */
    function wallX(hw) { return pw / 2 - 5 + hw; }
    var sims = [null, null];
    function build() {
      var f = FACT[foc], seed = f.seeds[go % f.seeds.length];
      sims = [0, 1].map(function (i) {
        var door = f.door[i], hw = f.hw[i];
        var s = Sim.make({ seed: seed, w: pw, h: H, margin: 6,
          gate: { x: wallX(hw), hw: hw, walk: true, y0: H / 2 - door / 2, y1: H / 2 + door / 2, pass: function (k, y) { return Math.abs(y - H / 2) < door / 2 ? 1 : 0; } },
          kinds: { scent: { n: [f.n[i], 0], speed: 60, tau: .3 } } });
        s.heat = f.heat[i];
        return s;
      });
      t = 0;
    }
    build();
    function panel(c, i, f) {
      var s = sims[i], door = f.door[i], hw = f.hw[i], gx = wallX(hw);
      D.frame(c, 0, 0, pw, H, 12, function () {
        D.ground(c, 0, 0, pw, H, C.air1, C.air0);
        if (f.heat[i] > 1) { c.fillStyle = 'rgba(255,120,60,.13)'; c.fillRect(0, 0, pw, H); }
        /* the wall, with its doorway: the doorway's height is the surface area, the wall's thickness the distance */
        var lg = c.createLinearGradient(gx - hw, 0, gx + hw, 0);
        lg.addColorStop(0, '#7E93A8'); lg.addColorStop(.5, '#C9D7E3'); lg.addColorStop(1, '#6E8499');
        c.fillStyle = lg;
        c.fillRect(gx - hw, 0, 2 * hw, H / 2 - door / 2);
        c.fillRect(gx - hw, H / 2 + door / 2, 2 * hw, H / 2 - door / 2);
        molsBy(c, s, 26, ['scent']);
      });
    }
    var scene = {
      W: W, H: H,
      tick: function (dt) { if (t < END) { t += dt; stepN(sims[0], dt); stepN(sims[1], dt); } },
      draw: function (c) {
        var f = FACT[foc], T = c.getTransform();
        panel(c, 0, f);
        c.translate(pw + gapX, 0);
        panel(c, 1, f);
        c.setTransform(T);
      },
      labels: function () {
        var f = FACT[foc];
        return [{ id: 'a', text: f.a, x: pw / 2 - 74, y: 14, side: 'T' }, { id: 'b', text: f.b, x: W - pw / 2 + 74, y: 14, side: 'T' }];
      },
      read: function (pill) {
        var a = sims[0].crossed('scent').net, b = sims[1].crossed('scent').net;
        var f = FACT[foc];
        pill('a', many(Math.max(0, a), 'particle'), 'ok', f.a + ':'); pill('b', many(Math.max(0, b), 'particle'), 'ok', f.b + ':');
        pill('c', t >= END ? 'stopped at ' + END + ' s' : Math.floor(t) + ' s', t >= END ? 'warn' : 'ok');
      }
    };
    var V = MV({
      scene: scene, aria: 'Two boxes side by side, each with a doorway in a wall. They differ in one factor; the box with the faster diffusion has more particles across its wall.',
      barLabel: 'Which factor', buttons: [['temp', 'Temperature'], ['grad', 'Gradient'], ['area', 'Surface area'], ['dist', 'Distance'], ['run', 'Run again']],
      read: [['a', 'Net movement:'], ['b', 'Net movement:'], ['c', 'Time:']],
      key: { all: [['scent', 'scent particle']], sets: [['scent particle']], now: function () { return ['scent particle']; } },
      onButton: function (id) { if (id === 'run') { go++; build(); ran(); V.names(); V.paint(); } else ctx.pick(id, { stay: true }); }
    });
    function ran() { if (V.isStill()) { var n = 60 * END; while (n-- > 0) { sims[0].step(); sims[1].step(); } t = END; } }
    function show(k) { if (FACT[k]) { foc = k; go = 0; V.press(k); build(); ran(); V.names(); V.paint(); } }
    return {
      el: V.el, start: function () { V.start(); V.press(foc); if (t === 0) ran(); V.names(); V.paint(); }, stop: V.stop,
      say: 'One factor changed, the rest the same: which box moves more particles across?',
      credit: 'Particles drawn for this lab, shown many millions of times slower than in reality.',
      focus: function (part) { if (part) show(part); }
    };
  });

  /* ======================================================================= Water, the solvent
     Liquid water as it really is: molecules touching and sliding past each other, with hydrogen bonds (dashed) that break
     and form again (memory particle-model-in-diagrams). Each dissolved particle is held by water molecules that move with
     it. Molecules are at their true sizes beside each other; the picture is about 6 nm wide. */
  Views.add('solvent', function (spec, ctx) {
    var W = 560, H = 330, u = 72, sp = 29, t = 0, mode = 'solution', pts = [];
    for (var j = 0, y = -sp; y < H + sp; y += sp * .88, j++)
      for (var x = -sp + (j % 2) * sp / 2; x < W + sp; x += sp) pts.push({ x: x, y: y, a: (j * 7 + x * .3) % TAU, ph: (j * 13 + x) % 7 });
    var SOL = {
      solution: [{ k: 'glucose', x: 170, y: 120, r: 34 }, { k: 'glucose', x: 395, y: 215, r: 34 }],
      digestion: [{ k: 'glucose', x: 150, y: 105, r: 34 }, { k: 'glucose', x: 400, y: 120, r: 34 }, { k: 'glucose', x: 270, y: 245, r: 34 }],
      excretion: [{ k: 'urea', x: 150, y: 110, r: 24 }, { k: 'urea', x: 330, y: 80, r: 24 }, { k: 'urea', x: 235, y: 245, r: 24 }, { k: 'urea', x: 440, y: 225, r: 24 }],
      transport: [{ k: 'glucose', x: 140, y: 110, r: 34 }, { k: 'urea', x: 415, y: 95, r: 24 }, { k: 'mg', x: 280, y: 210, r: 16 }, { k: 'mg', x: 470, y: 250, r: 16 }]
    };
    function at(q, tt) {
      /* each solute drifts slowly, with its shell of water */
      var i = q.x * .013 + q.y * .021;
      return [q.x + 26 * Math.sin(tt * .32 + i), q.y + 18 * Math.cos(tt * .27 + i * 1.7)];
    }
    var scene = {
      W: W, H: H,
      tick: function (dt) { t += dt; },
      draw: function (c) {
        var list = SOL[mode], P = list.map(function (q) { return at(q, t); });
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W, H, C.water0, C.water1);
          var drawn = [];
          pts.forEach(function (p, n) {
            /* each molecule trembles round its place and slides a little */
            var x = p.x + 2.6 * Math.sin(t * 1.3 + p.ph) + 1.6 * Math.sin(t * .7 + n), y = p.y + 2.6 * Math.cos(t * 1.1 + p.ph * 1.4) + 1.6 * Math.cos(t * .6 + n * .7), a = p.a + 1.2 * Math.sin(t * .8 + p.ph), hug = -1;
            /* a molecule beside a solute is held in a shell round it */
            for (var i = 0; i < list.length; i++) {
              var dx = x - P[i][0], dy = y - P[i][1], d = Math.sqrt(dx * dx + dy * dy), R = list[i].r + 13;
              if (d < R + 6) { var f = (R + (d < .01 ? 0 : 0)) / (d || 1); x = P[i][0] + dx * f; y = P[i][1] + dy * f; hug = i; a = Math.atan2(dy, dx) + Math.PI / 2 + (list[i].k === 'mg' ? Math.PI : 0); }
            }
            drawn.push({ x: x, y: y, a: a, hug: hug, n: n });
          });
          drawn.forEach(function (m) { D.mol(c, 'water', m.x, m.y, m.a, u, m.hug < 0 ? .45 : 1); });
          /* the hydrogen bonds: dashed, in the gaps between the molecules, breaking and forming */
          c.strokeStyle = 'rgba(214,240,255,.95)'; c.lineWidth = 1.5; c.setLineDash([2.4, 2.6]);
          c.beginPath();
          for (var a1 = 0; a1 < drawn.length; a1++) {
            for (var b1 = a1 + 1; b1 < Math.min(drawn.length, a1 + 44); b1++) {
              var ddx = drawn[b1].x - drawn[a1].x, ddy = drawn[b1].y - drawn[a1].y, q2 = ddx * ddx + ddy * ddy;
              if (q2 < 1260 && q2 > 300 && Math.sin(t * .9 + (a1 + b1) * 1.7) > .05) {
                var dd = Math.sqrt(q2), ux = ddx / dd, uy = ddy / dd;
                c.moveTo(drawn[a1].x + ux * 11.5, drawn[a1].y + uy * 11.5); c.lineTo(drawn[b1].x - ux * 11.5, drawn[b1].y - uy * 11.5);
              }
            }
          }
          c.stroke(); c.setLineDash([]);
          list.forEach(function (q, i) {
            /* the solute itself, and a soft light so a reader can find it */
            c.save(); c.globalCompositeOperation = 'lighter';
            var rg = c.createRadialGradient(P[i][0], P[i][1], 2, P[i][0], P[i][1], q.r + 8);
            rg.addColorStop(0, 'rgba(255,240,190,.42)'); rg.addColorStop(1, 'rgba(255,240,190,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(P[i][0], P[i][1], q.r + 8, 0, TAU); c.fill(); c.restore();
            D.mol(c, q.k, P[i][0], P[i][1], t * .25 + i, u);
          });
        });
      },
      labels: function () { return []; }   /* the key names each particle */
    };
    var SOLUTE = { glucose: 'glucose molecule', urea: 'urea molecule', mg: 'magnesium ion' };
    var V = MV({
      scene: scene, aria: 'Water molecules touching each other, with dashed hydrogen bonds. Each dissolved particle is surrounded by a shell of water molecules.',
      barLabel: 'Where', buttons: [['digestion', 'Digestion'], ['excretion', 'Excretion'], ['transport', 'Transport']],
      key: { all: [['water', 'water molecule'], ['glucose', 'glucose molecule'], ['urea', 'urea molecule'], ['mg', 'magnesium ion'], ['hbond', 'hydrogen bond']],
             sets: [['water molecule', 'glucose molecule', 'hydrogen bond'], ['water molecule', 'urea molecule', 'hydrogen bond'], ['water molecule', 'glucose molecule', 'urea molecule', 'magnesium ion', 'hydrogen bond']],
             now: function () {
               var out = ['water molecule'];
               SOL[mode].forEach(function (q) { if (out.indexOf(SOLUTE[q.k]) < 0) out.push(SOLUTE[q.k]); });
               return out.concat('hydrogen bond');
             } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    function show(m) { mode = m; V.press(m); V.names(); V.paint(); }
    return {
      el: V.el, start: function () { V.start(); show(mode); }, stop: V.stop,
      say: 'Water surrounds each dissolved particle and carries it',
      credit: 'Water molecules and solutes at their true sizes. Hydrogen bonds break and form all the time.',
      focus: function (part) { show(part && part !== 'solution' ? part : 'solution'); }
    };
  });

  /* ======================================================================= Osmosis */
  Views.add('osmo', function (spec, ctx) {
    var W = 560, H = 340, u = 26, same = false, foc = null;
    function make(eq) {
      var nL = eq ? 44 : 60, nR = eq ? 44 : 28, sL = eq ? 10 : 3, sR = eq ? 10 : 15;
      return Sim.make({ seed: eq ? 69 : 11, w: W, h: H,
        gate: { x: W / 2, hw: 2.5 * u, pass: function (k) { return k === 'water' ? .4 : 0; } },
        kinds: { water: { n: [nL, nR], speed: 56, tau: .8, through: 58, keep: [nL, nR] }, sucrose: { n: [sL, sR], speed: 22, tau: .5 } } });
    }
    var sims = { a: make(false), b: make(true) };
    function cur() { return same ? sims.b : sims.a; }
    var scene = {
      W: W, H: H,
      tick: function (dt) { stepN(cur(), dt); },
      draw: function (c) {
        var s = cur();
        D.frame(c, 0, 0, W, H, 16, function () {
          /* a dilute solution is blue and a concentrated one brown, here as in every picture */
          if (same) D.ground(c, 0, 0, W, H, D.mixHex(C.dilute[0], C.conc[0], .5), D.mixHex(C.dilute[1], C.conc[1], .5));
          else { D.ground(c, 0, 0, W / 2, H, C.dilute[0], C.dilute[1]); D.ground(c, W / 2, 0, W / 2, H, C.conc[0], C.conc[1]); }
          D.bilayer(c, W / 2, 0, H, u);
          if (foc === 'ppm') { c.strokeStyle = 'rgba(255,240,190,.95)'; c.lineWidth = 2.4; D.rr(c, W / 2 - 2.6 * u, 3, 5.2 * u, H - 6, 12); c.stroke(); }
          molsBy(c, s, u, ['sucrose', 'water']);
          if (!same) D.arrow(c, W / 2 - 110, H / 2, W / 2 + 112, H / 2, 16, NET, { head: 24, headW: 19 });
          else {
            D.arrow(c, W / 2 - 98, H / 2 - 20, W / 2 + 98, H / 2 - 20, 7, WHITE, { head: 15, headW: 11 });
            D.arrow(c, W / 2 + 98, H / 2 + 20, W / 2 - 98, H / 2 + 20, 7, WHITE, { head: 15, headW: 11 });
          }
        });
      },
      labels: function () {
        var it = [{ id: 'ppm', text: 'partially permeable membrane', x: W / 2, y: 14, side: 'T' }], wp = foc === 'wp' || foc === 'def', cell = foc === 'cells';
        var l = same ? 'same solution' : wp ? 'higher water potential' : cell ? 'outside the cell' : 'dilute solution';
        var r = same ? 'same solution' : wp ? 'lower water potential' : cell ? 'cytoplasm' : 'concentrated solution';
        it.push({ id: 'l', text: l, x: 104, y: H - 16, side: 'B' }); it.push({ id: 'r', text: r, x: W - 104, y: H - 16, side: 'B' });
        return it;
      },
      read: function (pill) {
        var x = cur().crossed('water');
        pill('a', String(x.ab), 'ok'); pill('b', String(x.ba), 'ok');
        pill('n', same ? 'about zero' : x.net > 0 ? '→ ' + many(x.net, 'molecule') : 'counting', same ? 'ok' : 'warn');
      }
    };
    var V = MV({
      scene: scene, aria: 'A partially permeable membrane between two solutions that start with equal volumes. Water molecules cross in both directions; sucrose molecules cannot cross.',
      barLabel: 'The two solutions', buttons: [['diff', 'Dilute and concentrated'], ['same', 'The same solution on both sides']],
      read: [['a', 'Water crossing →'], ['b', 'Water crossing ←'], ['n', 'Net movement:']],
      key: { all: [['water', 'water molecule'], ['sucrose', 'sucrose molecule'], ['lipid', 'lipid of the membrane'], ['net', 'net movement of water'], ['ways', 'crossing each way']],
             sets: [['water molecule', 'sucrose molecule', 'lipid of the membrane', 'net movement of water'], ['water molecule', 'sucrose molecule', 'lipid of the membrane', 'crossing each way']],
             now: function () { return ['water molecule', 'sucrose molecule', 'lipid of the membrane', same ? 'crossing each way' : 'net movement of water']; } },
      onButton: function (id) { same = id === 'same'; warm(); V.press(id); V.names(); V.paint(); }
    });
    function warm() { var q = cur(); if (V.isStill() && q.t < 8) { var n = 60 * 10; while (n-- > 0) q.step(); } }
    return {
      el: V.el, start: function () { V.start(); warm(); V.press(same ? 'same' : 'diff'); V.names(); V.paint(); }, stop: V.stop,
      say: 'Two solutions that start with equal volumes, with a partially permeable membrane between them',
      credit: 'Only some of the water molecules are drawn: water fills all the space. True sizes beside each other.',
      focus: function (part) { foc = part || null; if (part === 'dilute' || part === 'wp' || part === 'def' || part === 'osm') { same = false; V.press('diff'); } V.names(); V.paint(); }
    };
  });

  /* ======================================================================= Dialysis tubing
     A tied bag in a beaker, firm or soft, and a close-up of its wall: water crosses, sucrose does not. */
  Views.add('tubing', function (spec, ctx) {
    var W = 560, H = 356, setup = 'in', full = .45, target = 1, u = 16;
    var B = { x: 26, y: 58, w: 292, h: 262 };
    var LX = 438, LY = 118, LR = 104;
    var SET = {
      in: { seed: 5, label: 'bag of sucrose solution, in water', nL: 30, nR: 14, sL: 0, sR: 6, liquid: ['rgba(120,200,240,.38)', 'rgba(60,150,210,.56)'], bag: null, to: 1, net: 1 },
      out: { seed: 6, label: 'bag of water, in sucrose solution', nL: 14, nR: 30, sL: 6, sR: 0, liquid: ['rgba(240,200,120,.42)', 'rgba(205,148,66,.62)'], bag: ['rgba(190,226,246,.72)', 'rgba(150,204,236,.72)', 'rgba(104,166,208,.82)'], to: 0, net: -1 },
      same: { seed: 23, label: 'the same solution in both', nL: 22, nR: 22, sL: 4, sR: 4, liquid: ['rgba(240,200,120,.42)', 'rgba(205,148,66,.62)'], bag: null, to: .62, net: 0 }
    };
    function make(k) {
      var f = SET[k];
      return Sim.make({ seed: f.seed, w: 2 * LR, h: 2 * LR, margin: 4,
        gate: { x: LR, hw: 7, pass: function (nm) { return nm === 'water' ? .55 : 0; } },
        kinds: { water: { n: [f.nL, f.nR], speed: 44, tau: .8, through: 40, keep: [f.nL, f.nR] }, sucrose: { n: [f.sL, f.sR], speed: 16, tau: .5 } } });
    }
    var sims = { in: make('in'), out: make('out'), same: make('same') };
    /* the upper edge of the bag, and the middle of its contents, at a distance dx along it */
    function nearI(Pp, dx) { var n = Pp.top.length - 1; return Math.max(0, Math.min(n, Math.round((dx + 107) / 214 * n))); }
    function edgeAt(Pp, dx) { return Pp.top[nearI(Pp, dx)]; }
    function midAt(Pp, dx) { var i = nearI(Pp, dx); return (Pp.top[i][1] + Pp.bot[i][1]) / 2; }
    var scene = {
      W: W, H: H,
      tick: function (dt) {
        full = full < target ? Math.min(target, full + dt / 5) : Math.max(target, full - dt / 5);
        stepN(sims[setup], dt);
      },
      draw: function (c) {
        var f = SET[setup];
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W, H, '#1C2F40', '#142430');
          /* the bench */
          var bg = c.createLinearGradient(0, H - 24, 0, H); bg.addColorStop(0, '#3A4B5B'); bg.addColorStop(1, '#2A3845');
          c.fillStyle = bg; c.fillRect(0, H - 26, W, 26);
          var o = { x: B.x, y: B.y, w: B.w, h: B.h, level: .76, liquid0: f.liquid[0], liquid1: f.liquid[1], surface: f.liquid[0] };
          D.beaker(c, o);
          var bx = B.x + B.w / 2, by = B.y + B.h * .62;
          var fills = f.bag ? { fill0: f.bag[0], fill1: f.bag[1], fill2: f.bag[2] } : {};
          var P = D.bag(c, Object.assign({ x: bx, y: by, L: 214, r: 42, full: full }, fills));
          D.beakerGlass(c, o);
          /* the net movement of water through the wall of the bag */
          var moving = Math.abs(full - target) > .004;
          if (f.net && moving) {
            var dir = f.net;
            [-30, 14, 58].forEach(function (dx) {
              /* each arrow crosses the wall of the bag where the wall is now */
              var top = by + edgeAt(P, dx)[1], y0 = dir > 0 ? top - 34 : top + 5, y1 = dir > 0 ? top + 4 : top - 31;
              D.arrow(c, bx + dx, y0, bx + dx, y1, 7, NET, { head: 12, headW: 10 });
            });
          }
          /* the close-up of the tubing's wall */
          c.save();
          /* the small ring stands on the wall of the bag, wherever the wall is now */
          var ringAt = edgeAt(P, 72), rx = bx + ringAt[0], ry = by + ringAt[1];
          c.beginPath(); c.moveTo(rx, ry); c.lineTo(LX - LR * .72, LY + LR * .69); c.lineWidth = 1.4; c.strokeStyle = 'rgba(232,242,250,.7)'; c.stroke();
          c.beginPath(); c.arc(rx, ry, 7, 0, TAU); c.stroke();
          c.beginPath(); c.arc(LX, LY, LR, 0, TAU); c.save(); c.clip();
          /* the line leaves the right side of the bag, so the close-up has the bag on its left and the beaker on its right */
          var bagDil = setup === 'out', beakDil = setup === 'in';
          D.ground(c, LX - LR, LY - LR, LR, 2 * LR, bagDil ? C.dilute[0] : C.conc[0], bagDil ? C.dilute[1] : C.conc[1]);
          D.ground(c, LX, LY - LR, LR, 2 * LR, beakDil ? C.dilute[0] : C.conc[0], beakDil ? C.dilute[1] : C.conc[1]);
          c.fillStyle = 'rgba(230,222,200,.9)';
          for (var i = 4; i < 2 * LR; i += 12) { c.fillRect(LX - 7, LY - LR + i, 14, 7.6); }
          var sm = sims[setup];
          ['sucrose', 'water'].forEach(function (nm) {
            var kk = sm.kindIx(nm);
            for (var q = 0; q < sm.N; q++) if (sm.K[q] === kk) D.mol(c, nm, LX + LR - sm.X[q], LY - LR + sm.Y[q], sm.A[q], u);
          });
          c.restore();
          c.beginPath(); c.arc(LX, LY, LR, 0, TAU); c.strokeStyle = 'rgba(232,242,250,.92)'; c.lineWidth = 2.5; c.stroke();
          c.restore();
        });
      },
      labels: function () {
        var bx = B.x + B.w / 2, by = B.y + B.h * .62;
        var inside = setup === 'in' ? 'sucrose solution' : setup === 'out' ? 'water' : 'sucrose solution', around = setup === 'in' ? 'water' : 'sucrose solution';
        var Pn = D.bagPath({ L: 214, r: 42, full: full }), e = edgeAt(Pn, -64), m = midAt(Pn, 16);
        return [{ id: 'tub', text: 'dialysis tubing', x: bx - 64, y: by + e[1], side: 'T' },
                { id: 'gap', text: 'close-up of the tubing', x: LX, y: LY - LR + 4, side: 'T' },
                { id: 'in', text: inside, x: bx + 16, y: by + m, side: 'B' },
                { id: 'ar', text: around, x: B.x + 48, y: B.y + B.h - 22, side: 'B' },
                { id: 'lb', text: 'bag', x: LX - 52, y: LY + LR * .78, side: 'B' },
                { id: 'lo', text: 'beaker', x: LX + 52, y: LY + LR * .78, side: 'B' }];
      },
      read: function (pill) {
        var f = SET[setup];
        pill('w', f.net > 0 ? 'into the bag' : f.net < 0 ? 'out of the bag' : 'none', f.net ? 'warn' : 'ok');
        pill('b', full > .8 ? 'firm and swollen' : full < .2 ? 'soft' : setup === 'same' ? 'not changing' : 'changing', full > .8 ? 'ok' : full < .2 ? 'bad' : 'warn');
      }
    };
    var V = MV({
      scene: scene, liveNames: true, aria: 'A tied bag of dialysis tubing in a beaker. In water a bag of sucrose solution swells and becomes firm; a bag of water in sucrose solution becomes soft.',
      barLabel: 'What is in the bag and the beaker', buttons: [['in', 'Sucrose solution in the bag'], ['out', 'Water in the bag'], ['same', 'The same solution in both']],
      read: [['w', 'Net movement of water:'], ['b', 'The bag:']],
      key: { all: [['water', 'water molecule'], ['sucrose', 'sucrose molecule'], ['net', 'net movement of water']],
             sets: [['water molecule', 'sucrose molecule', 'net movement of water']],
             now: function () { var a = ['water molecule', 'sucrose molecule']; return SET[setup].net && Math.abs(full - target) > .004 ? a.concat('net movement of water') : a; } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    function show(k, restart) {
      setup = k; V.press(k); target = SET[k].to;
      if (restart !== false) full = k === 'in' ? .4 : k === 'out' ? .92 : .62;
      if (V.isStill()) full = target;
      V.names(); V.paint();
    }
    return {
      el: V.el, start: function () { V.start(); show(setup, false); }, stop: V.stop,
      say: 'A bag of dialysis tubing, tied at both ends, represents a cell',
      credit: 'Drawn for this lab. In the close-up, sizes are true relative to each other, and only some of the water molecules are drawn.',
      focus: function (part) { if (part === 'in' || part === 'out' || part === 'same') show(part); }
    };
  });

  /* ======================================================================= A plant cell and an animal cell */
  Views.add('twocells', function (spec, ctx) {
    var W = 560, H = 330, liquid = 'water', k = 0, foc = null;   /* k: 0 at rest → 1 at the end of the change */
    var P = { x: 136, y: 168, a: 112, b: 104, wall: 8, seed: 3, mitos: 3 }, A = { x: 420, y: 168, r: 84, seed: 2 };
    function plantWater() { return liquid === 'water' ? lerp(.72, 1, k) : lerp(.72, .14, k); }
    function animal() {
      if (liquid === 'water') { var sw = 1 + .32 * clamp(k / .82), br = clamp((k - .82) / .18); return { swell: sw, burst: br }; }
      return { swell: 1 - .3 * k, burst: 0 };
    }
    var scene = {
      W: W, H: H,
      tick: function (dt) { if (k < 1) k = Math.min(1, k + dt / 6); },
      draw: function (c) {
        var wet = liquid === 'water', w = plantWater();
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W, H, wet ? C.dilute[0] : C.conc[0], wet ? C.dilute[1] : C.conc[1]);
          var G = D.plantCell(c, Object.assign({ water: w, sap: clamp((1 - w) * 1.05) }, P));
          if (G.pl > .001) {
            c.save(); D.polyPath(c, G.inner); c.clip();
            c.beginPath();
            G.inner.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath();
            G.mem.slice().reverse().forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath();
            var sg = c.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, wet ? C.dilute[0] : C.conc[0]); sg.addColorStop(1, wet ? C.dilute[1] : C.conc[1]);
            c.fillStyle = sg; c.fill('evenodd'); c.restore();
            D.polyPath(c, G.mem); c.strokeStyle = C.memb; c.lineWidth = 1.5; c.stroke();
          }
          var a = animal();
          D.animalCell(c, Object.assign({}, A, a));
          /* arrows while the water is moving */
          if (k < 1) {
            var into = wet;
            var ar = A.r * a.swell;
            [[P.x - P.a - 20, P.y, P.x - P.a + 2, P.y], [P.x + P.a + 20, P.y, P.x + P.a - 2, P.y], [P.x, P.y - P.b - 20, P.x, P.y - P.b + 2], [P.x, P.y + P.b + 20, P.x, P.y + P.b - 2],
             [A.x - ar - 20, A.y, A.x - ar + 2, A.y], [A.x + ar + 20, A.y, A.x + ar - 2, A.y], [A.x, A.y - ar - 20, A.x, A.y - ar + 2], [A.x, A.y + ar + 20, A.x, A.y + ar - 2]].forEach(function (q) {
              if (into) D.arrow(c, q[0], q[1], q[2], q[3], 8, NET, { head: 13, headW: 11 }); else D.arrow(c, q[2], q[3], q[0], q[1], 8, NET, { head: 13, headW: 11 });
            });
          }
        });
      },
      labels: function () {
        var a = animal();
        var it = [{ id: 'p', text: 'plant cell', x: P.x, y: 6, side: 'T' }];
        it.push({ id: 'pw', text: 'cell wall', x: P.x + 40, y: P.y + P.b - 3, side: 'B' });
        if (a.burst < .5) { it.push({ id: 'a', text: 'animal cell', x: A.x, y: 6, side: 'T' }); it.push({ id: 'am', text: 'cell membrane, and no cell wall', x: A.x + 20, y: A.y + A.r * a.swell * .92, side: 'B' }); }
        else it.push({ id: 'a', text: 'the animal cell has burst', x: A.x, y: 6, side: 'T' });
        return it;
      },
      read: function (pill) {
        var wet = liquid === 'water', a = animal(), w = plantWater();
        pill('s', wet ? 'pure water' : 'concentrated solution', wet ? 'ok' : 'warn');
        pill('p', w >= .92 ? 'turgid' : w >= .55 ? (wet ? 'gaining water' : 'flaccid') : 'plasmolysed', w >= .92 ? 'ok' : w >= .55 ? 'warn' : 'bad');
        pill('a', a.burst > .5 ? 'burst' : wet ? 'swelling' : a.swell < .86 ? 'shrunken' : 'shrinking', a.burst > .5 ? 'bad' : 'warn');
      }
    };
    var V = MV({
      scene: scene, liveNames: true, aria: 'A plant cell and an animal cell in the same liquid. In pure water the plant cell becomes turgid and the animal cell swells and bursts; in a concentrated solution the plant cell is plasmolysed and the animal cell shrinks.',
      barLabel: 'The liquid', buttons: [['water', 'In pure water'], ['conc', 'In a concentrated solution']],
      read: [['s', 'Liquid:'], ['p', 'Plant cell:'], ['a', 'Animal cell:']],
      key: { all: [['net', 'net movement of water']], sets: [['net movement of water']], now: function () { return k < 1 ? ['net movement of water'] : []; } },
      onButton: function (id) { set(id); }
    });
    function set(id) { liquid = id; k = V.isStill() ? 1 : 0; V.press(id); V.names(); V.paint(); }
    return {
      el: V.el, start: function () { V.start(); V.press(liquid); if (V.isStill()) k = 1; V.names(); }, stop: V.stop,
      say: 'The same liquid, two kinds of cell: only one has a cell wall',
      credit: 'Cells drawn for this lab.',
      focus: function (part) { foc = part; if (part === 'animal') set('water'); else if (part === 'root') set('water'); else if (part === 'blood') set('conc'); }
    };
  });

  /* ======================================================================= Active transport */
  function carrierScene(o) {
    var W = 560, H = 340, u = 26, cx = W / 2, cy = H / 2, E = { x: W + 120, y: H + 96, r: 300 }, T = 0, cycle = 6, moved = 0, last = -1, on = true, ph = 0;
    var sim = Sim.make({ seed: 9, w: W, h: H,
      gate: { x: W / 2, hw: 2.5 * u, pass: function () { return 0; } },
      kinds: { nitrate: { n: [4, 15], speed: 34, tau: .4 } } });
    sim.onMove = MF.keepClear(cx, cy, u, E);
    /* cause, then effect: the energy reaches the carrier, and then the carrier changes shape */
    function shape(p) { return ease(seg(p, .37, .52)) * (1 - ease(seg(p, .78, .96))); }
    function ionAt(p) {
      var ax = cx - 170, ay = cy + 8;
      if (p < .28) { var k = ease(seg(p, .04, .28)); return [lerp(ax, cx - 2, k), lerp(ay, cy, k)]; }
      if (p < .55) return [cx - 2 + 4 * ease(seg(p, .37, .52)), cy];
      var q = ease(seg(p, .55, .78));
      return [lerp(cx + 2, cx + 168, q), lerp(cy, cy - 34, q) + 7 * Math.sin(p * 14) * q];
    }
    return {
      W: W, H: H,
      setOn: function (v) { on = v; },
      isOn: function () { return on; },
      tick: function (dt) {
        stepN(sim, dt);
        /* with no energy the carrier waits, with its pocket facing the low side and the ion inside it */
        if (on) {
          T += dt; ph = (T % cycle) / cycle;
          var n = Math.floor(T / cycle); if (n !== last) { if (last >= 0) moved++; last = n; }
        } else if (ph > .3) {
          /* it finishes the turn it had begun, and stops at the pocket with the next ion */
          T += dt; ph = (T % cycle) / cycle; var n2 = Math.floor(T / cycle); if (n2 !== last) { if (last >= 0) moved++; last = n2; ph = 0; T = n2 * cycle; }
        } else if (ph < .28) { T = Math.min(Math.floor(T / cycle) * cycle + .28 * cycle, T + dt); ph = (T % cycle) / cycle; }
      },
      draw: function (c) {
        var p = ph;
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W / 2, H, C.water0, C.water1);
          D.ground(c, W / 2, 0, W / 2, H, C.cytoDark[0], C.cytoDark[1]);
          var active = on ? seg(p, .2, .3) * (1 - seg(p, .46, .56)) : 0;
          if (!on) { c.save(); c.globalAlpha = .38; }
          D.mitoEdge(c, E, active);
          if (!on) c.restore();
          D.bilayer(c, W / 2, 0, H, u);
          if (on) {
            var e = seg(p, .22, .36);
            if (e > 0 && e < 1) {
              var ex = lerp(430, cx + 20, ease(e)), ey = lerp(270, cy + 14, ease(e));
              c.save(); c.globalCompositeOperation = 'lighter';
              var rg = c.createRadialGradient(ex, ey, 1, ex, ey, 22); rg.addColorStop(0, 'rgba(255,240,170,1)'); rg.addColorStop(.35, 'rgba(255,226,120,.7)'); rg.addColorStop(1, 'rgba(255,226,120,0)');
              c.fillStyle = rg; c.beginPath(); c.arc(ex, ey, 22, 0, TAU); c.fill(); c.restore();
            }
          }
          D.carrier(c, cx, cy, u, shape(p), on ? seg(p, .36, .42) * (1 - seg(p, .52, .6)) : 0);
          molsBy(c, sim, u, ['nitrate']);
          var q = ionAt(p);
          D.mol(c, 'nitrate', q[0], q[1], T * .6, u);
          c.strokeStyle = 'rgba(255,245,200,.95)'; c.lineWidth = 1.6; c.beginPath(); c.arc(q[0], q[1], 15, 0, TAU); c.stroke();
        });
      },
      labels: function () {
        return [{ id: 'lo', text: 'outside the cell: lower concentration', x: 104, y: H - 18, side: 'B' }, { id: 'hi', text: 'inside the cell: higher concentration', x: W - 110, y: 18, side: 'T' },
                { id: 'mem', text: 'cell membrane', x: W / 2 - 40, y: 14, side: 'T' }, { id: 'car', text: 'protein carrier', x: cx + 20, y: cy + 54, side: 'B' },
                { id: 'mi', text: 'mitochondrion', x: 470, y: 250, side: 'B' }];
      },
      read: function (pill) {
        pill('m', moved + (moved === 1 ? ' ion' : ' ions'), 'ok');
        pill('r', on ? 'on' : 'stopped', on ? 'ok' : 'bad');
        pill('c', on ? 'moving ions' : 'stopped: no energy', on ? 'ok' : 'bad');
      }
    };
  }
  Views.add('carrierv', function (spec, ctx) {
    var scene = carrierScene();
    var V = MV({
      scene: scene, aria: 'A protein carrier in a cell membrane moves nitrate ions from the side of lower concentration to the side of higher concentration, using energy from a mitochondrion.',
      barLabel: 'Respiration', buttons: [['on', 'Respiration on'], ['off', 'Stop respiration']],
      read: [['m', 'Moved against the gradient:'], ['r', 'Respiration:'], ['c', 'Carrier:']],
      key: { all: [['nitrate', 'nitrate ion'], ['energy', 'energy from respiration']], sets: [['nitrate ion', 'energy from respiration']],
             now: function () { return scene.isOn() ? ['nitrate ion', 'energy from respiration'] : ['nitrate ion']; } },
      onButton: function (id) { scene.setOn(id === 'on'); V.press(id); V.names(); V.paint(); if (id === 'off') ctx.pick('energy', { stay: true }); }
    });
    var warmed = false;
    function warm() { if (V.isStill() && !warmed) { warmed = true; var a = 60 * 15; while (a-- > 0) scene.tick(1 / 60); } }
    return {
      el: V.el, start: function () { V.start(); warm(); V.press(scene.isOn() ? 'on' : 'off'); V.names(); V.paint(); }, stop: V.stop,
      say: 'One protein carrier in the cell membrane, moving ions against the gradient',
      credit: 'Carrier, ions and membrane at their true sizes beside each other. Only the side of the much larger mitochondrion is in the picture.',
      focus: function (part) { if (part === 'def' || part === 'against' || part === 'carrier') { scene.setOn(true); V.press('on'); V.names(); } }
    };
  });

  /* ======================================================================= Root hairs and ions */
  Views.add('roothair', function (spec, ctx) {
    var W = 560, H = 330, mode = 'air', t = 0, foc = null, r = Sim.rng(5), ions = [];
    var GRAINS = [[38, 44, 34, 28, .4], [130, 22, 38, 25, 1.2], [230, 58, 32, 27, 2.1], [44, 168, 37, 30, 1.7], [140, 124, 26, 22, .6], [232, 186, 36, 29, 2.8], [60, 288, 42, 30, 1.1], [168, 272, 38, 28, 2.3], [262, 298, 28, 24, 1.9]];
    var AIR = [[96, 78, 15], [186, 112, 18], [88, 226, 17], [196, 236, 14]];
    /* the nitrate ions are in the water round the grains */
    function clear(x, y) {
      return GRAINS.every(function (g) { var dx = (x - g[0]) / (g[2] + 7), dy = (y - g[1]) / (g[3] + 7); return dx * dx + dy * dy > 1.25; }) &&
             AIR.every(function (b) { var dx = x - b[0], dy = y - b[1]; return dx * dx + dy * dy > (b[2] + 8) * (b[2] + 8); });
    }
    for (var tries = 0; ions.length < 22 && tries < 2400; tries++) {
      var ix0 = 8 + r() * 254, iy0 = 8 + r() * 314;
      if (clear(ix0, iy0)) ions.push({ x: ix0, y: iy0, a: r() * 6, ph: r() * 6, sp: .5 + r() });
    }
    var GATES = [62, 132, 202, 272], W0 = 274, W1 = 286, MC = 313, IN = 340;   /* the wall 274–286, then the membrane, 286–340, which holds the carriers */
    var scene = {
      W: W, H: H,
      tick: function (dt) { t += dt; },
      draw: function (c) {
        var wet = mode === 'wet', rate = wet ? .22 : 1;
        D.frame(c, 0, 0, W, H, 16, function () {
          /* the soil: grains with water films round them, and air between (or water, when waterlogged) */
          D.ground(c, 0, 0, W, H, wet ? '#14476A' : '#20303A', wet ? '#0F3652' : '#16222C');
          c.save(); c.beginPath(); c.rect(0, 0, W0, H); c.clip();
          GRAINS.forEach(function (q, gi) { MF.grain(c, q[0], q[1], q[2], q[3], q[4], (gi * .37) % 1); });
          if (!wet) {
            /* bubbles of air, with oxygen, between the grains */
            AIR.forEach(function (b) {
              c.fillStyle = 'rgba(230,244,255,.16)'; c.strokeStyle = 'rgba(230,244,255,.5)'; c.lineWidth = 1;
              c.beginPath(); c.arc(b[0], b[1], b[2], 0, TAU); c.fill(); c.stroke();
              D.mol(c, 'oxygen', b[0], b[1], t * .4 + b[0], 20);
            });
          }
          ions.forEach(function (q) {
            var x = q.x + 4 * Math.sin(t * q.sp * .6 + q.ph), y = q.y + 4 * Math.cos(t * q.sp * .5 + q.a);
            D.mol(c, 'nitrate', x, y, t * .4 + q.a, 20);
          });
          c.restore();
          /* the cell: wall, membrane, cytoplasm, with mitochondria */
          D.wallBand(c, W0, W1, 0, H);
          var cg = c.createLinearGradient(W1, 0, W, 0); cg.addColorStop(0, C.cyto0); cg.addColorStop(1, C.cyto1);
          c.fillStyle = cg; c.fillRect(W1, 0, W - W1, H);
          c.fillStyle = '#6E6450'; c.fillRect(W1, 0, IN - W1, H);
          D.bilayer(c, MC, 0, H, 8.8);
          c.save(); if (wet) c.globalAlpha = .55;
          D.mito(c, 444, 84, 92, 40, .3, wet ? 0 : .45 + .3 * Math.sin(t * 2));
          D.mito(c, 492, 240, 86, 38, -.5, wet ? 0 : .4 + .3 * Math.sin(t * 2 + 1));
          c.restore();
          /* the edge of the vacuole, at the right */
          c.fillStyle = C.sap0; D.rr(c, 396, 118, 220, 96, 34); c.fill(); c.strokeStyle = 'rgba(120,48,92,.75)'; c.lineWidth = 1; c.stroke();
          /* protein carriers in the membrane, each moving an ion in */
          GATES.forEach(function (gy, n) {
            var p = ((t * rate * .42 + n * .27) % 1);
            c.save(); c.translate(MC, gy);
            D.carrier(c, 0, 0, 8.8, ease(seg(p, .3, .5)) * (1 - ease(seg(p, .7, .95))), 0);
            c.restore();
            var ix = p < .5 ? lerp(W0 - 44, MC, ease(seg(p, 0, .5))) : lerp(MC, IN + 40, ease(seg(p, .5, 1)));
            var iy = gy + (p < .5 ? 0 : 8 * Math.sin(p * 9));
            D.mol(c, 'nitrate', ix, iy, t + n, 20);
          });
          /* water enters by osmosis all along the membrane */
          [30, 100, 170, 240, 310].forEach(function (y, n) {
            var p = ((t * .36 + n * .21) % 1), x = lerp(W0 - 40, IN + 34, p);
            c.globalAlpha = Math.min(1, Math.min(p * 6, (1 - p) * 6));
            D.mol(c, 'water', x, y, t + n, 20);
            c.globalAlpha = 1;
          });
        });
      },
      labels: function () {
        var it = [{ id: 'car', text: 'protein carrier', x: MC, y: GATES[0] - 16, side: 'T' },
                  { id: 'mi', text: 'mitochondrion', x: 452, y: 72, side: 'T' },
                  { id: 'ion', text: 'soil water', x: ions.length ? ions[0].x : 150, y: 322, side: 'B' },
                  { id: 'wall', text: 'cell wall', x: 280, y: 322, side: 'B' },
                  { id: 'mem', text: 'cell membrane', x: MC + 18, y: 322, side: 'B' }];
        it.push(mode === 'air' ? { id: 'air', text: 'air space', x: 96, y: 78, side: 'T' } : { id: 'air', text: 'water fills the air spaces', x: 96, y: 78, side: 'T' });
        return it;
      },
      read: function (pill) {
        var wet = mode === 'wet';
        pill('o', wet ? 'very little' : 'plenty', wet ? 'bad' : 'ok');
        pill('r', wet ? 'much slower' : 'fast', wet ? 'bad' : 'ok');
        pill('i', wet ? 'few ions' : 'many ions', wet ? 'bad' : 'ok');
      }
    };
    var V = MV({
      scene: scene, aria: 'The edge of a root hair cell in the soil. Protein carriers move nitrate ions into the cell, water enters by osmosis, and mitochondria release energy using oxygen from the air spaces.',
      barLabel: 'The soil', buttons: [['air', 'Soil with air spaces'], ['wet', 'Waterlogged soil']],
      read: [['o', 'Oxygen in the soil:'], ['r', 'Respiration:'], ['i', 'Ions absorbed:']],
      key: { all: [['nitrate', 'nitrate ion'], ['water', 'water molecule'], ['oxygen', 'oxygen molecule']], sets: [['nitrate ion', 'water molecule', 'oxygen molecule']],
             now: function () { return mode === 'wet' ? ['nitrate ion', 'water molecule'] : ['nitrate ion', 'water molecule', 'oxygen molecule']; } },
      onButton: function (id) { mode = id; V.press(id); V.names(); V.paint(); if (id === 'wet') ctx.pick('oxygen', { stay: true }); }
    });
    return {
      el: V.el, start: function () { V.start(); V.press(mode); V.names(); }, stop: V.stop,
      say: 'The edge of a root hair cell: soil, cell wall and cell membrane',
      credit: 'Drawn for this lab. The ions, carriers and mitochondria are drawn much larger than they really are beside the cell.',
      focus: function (part) { if (part === 'oxygen') { mode = 'wet'; V.press('wet'); } else { mode = 'air'; V.press('air'); } V.names(); V.paint(); }
    };
  });

  /* ======================================================================= The three compared */
  Views.add('compare', function (spec, ctx) {
    var W = 560, H = 340, u = 26, mode = 'diff';
    var sims = {
      diff: Sim.make({ seed: 1, w: W, h: H, gate: { x: W / 2, hw: 2.5 * u, pass: function () { return .4; } },
        kinds: { oxygen: { n: [34, 8], speed: 62, tau: .8, through: 56, keep: [34, 8] } } }),
      osmo: Sim.make({ seed: 11, w: W, h: H, gate: { x: W / 2, hw: 2.5 * u, pass: function (k) { return k === 'water' ? .4 : 0; } },
        kinds: { water: { n: [60, 28], speed: 56, tau: .8, through: 58, keep: [60, 28] }, sucrose: { n: [3, 15], speed: 22, tau: .5 } } })
    };
    var car = carrierScene();
    var TXT = {
      diff: { n: 'Net movement of oxygen', l: 'higher concentration', r: 'lower concentration', e: 'no', m: 'oxygen' },
      osmo: { n: 'Net movement of water', l: 'higher water potential', r: 'lower water potential', e: 'no', m: 'water' },
      actv: { n: 'Movement of nitrate ions', l: 'lower concentration', r: 'higher concentration', e: 'yes', m: 'nitrate ions' }
    };
    var scene = {
      W: W, H: H,
      tick: function (dt) { if (mode === 'actv') car.tick(dt); else stepN(sims[mode], dt); },
      draw: function (c) {
        if (mode === 'actv') { car.draw(c); D.frame(c, 0, 0, W, H, 16, function () { D.arrow(c, W / 2 - 112, 40, W / 2 + 112, 40, 15, NET, { head: 22, headW: 18 }); }); return; }
        var s = sims[mode];
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W / 2, H, mode === 'osmo' ? C.dilute[0] : C.water0, mode === 'osmo' ? C.dilute[1] : C.water1);
          D.ground(c, W / 2, 0, W / 2, H, mode === 'osmo' ? C.conc[0] : C.water0, mode === 'osmo' ? C.conc[1] : C.water1);
          D.bilayer(c, W / 2, 0, H, u);
          molsBy(c, s, u, mode === 'osmo' ? ['sucrose', 'water'] : ['oxygen']);
          D.arrow(c, W / 2 - 112, 40, W / 2 + 112, 40, 15, NET, { head: 22, headW: 18 });
        });
      },
      labels: function () {
        var f = TXT[mode];
        var it = [{ id: 'l', text: f.l, x: 104, y: H - 18, side: 'B' }, { id: 'r', text: f.r, x: W - 104, y: mode === 'actv' ? 40 : H - 18, side: mode === 'actv' ? 'T' : 'B' },
                  { id: 'mem', text: 'cell membrane', x: W / 2 + 48, y: 12, side: 'T' }];
        if (mode === 'actv') it.push({ id: 'car', text: 'protein carrier', x: W / 2 - 40, y: H / 2 + 54, side: 'B' });
        return it;
      },
      read: function (pill) {
        var f = TXT[mode];
        pill('m', f.m, 'ok'); pill('d', mode === 'actv' ? 'against the gradient' : mode === 'osmo' ? 'higher to lower water potential' : 'down the gradient', mode === 'actv' ? 'warn' : 'ok');
        pill('e', f.e, f.e === 'yes' ? 'warn' : 'ok');
      }
    };
    var V = MV({
      scene: scene, aria: 'One cell membrane showing diffusion, osmosis or active transport, with the arrow showing the direction of movement.',
      barLabel: 'Which process', buttons: [['diff', 'Diffusion'], ['osmo', 'Osmosis'], ['actv', 'Active transport']],
      read: [['m', 'What moves:'], ['d', 'Direction:'], ['e', 'Energy from respiration:']],
      key: { all: [['oxygen', 'oxygen molecule'], ['water', 'water molecule'], ['sucrose', 'sucrose molecule'], ['nitrate', 'nitrate ion'], ['energy', 'energy from respiration'],
                   ['net', 'net movement'], ['net', 'net movement of water'], ['net', 'movement against the gradient']],
             sets: [['oxygen molecule', 'net movement'], ['water molecule', 'sucrose molecule', 'net movement of water'], ['nitrate ion', 'energy from respiration', 'movement against the gradient']],
             now: function () { return this.sets[mode === 'diff' ? 0 : mode === 'osmo' ? 1 : 2]; } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    function show(m) { mode = m; if (V.isStill()) { if (m === 'actv') { var a = 60 * 8; while (a-- > 0) car.tick(1 / 60); } else if (sims[m].t < 8) { var n = 60 * 10; while (n-- > 0) sims[m].step(); } } V.press(m); V.names(); V.paint(); }
    return {
      el: V.el, start: function () { V.start(); show(mode); }, stop: V.stop,
      say: 'One membrane, three ways across it',
      credit: 'Drawn for this lab. Only some of the water molecules are drawn.',
      focus: function (part) { if (part) show(part); }
    };
  });
})(window);
