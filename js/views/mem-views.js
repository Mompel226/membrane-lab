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
    /* H: the box. Under it, a graph of the concentration of scent across the box, so the words have pictures (Daniel,
       25 Nov 2026: "a gradient is kind of like a slope ... some of the students have never seen these terms, so you
       really need to help them understand with images"). A higher concentration is red and a lower one blue, on the box,
       the graph, the names and the counters. */
    var W = 560, H = 330, GY = H + 12, GH = 96, foc = null, lifted = false, dv = { r: 0, bal: false, since: 0 }, G = null;
    var sim = Sim.make({
      seed: 31, w: W, h: H, hit: true,
      /* the divider is the only wall: a particle that meets the opening always crosses, so the counts change a little at random
         even at equilibrium (an independent review, 25 Nov 2026: a crossing turned back where nothing is drawn is a false turn) */
      gate: { x: W / 2, hw: 3, thin: true, blocks: function (y) { return y < H - dv.r; }, pass: function (k, y) { return y < H - dv.r ? 0 : 1; } },
      kinds: { air: { n: [14, 40], speed: 116, tau: 1e9, r: 6 }, scent: { n: [26, 0], speed: 116, tau: 1e9, r: 6.5 } }
    });
    var ringI = 54;
    sim.onMove = function (s) { s.trail.push(s.X[ringI], s.Y[ringI]); if (s.trail.length > 150) s.trail.splice(0, 2); };
    /* the concentration of scent across the box: 1 is the left box at the start. While the divider stands, the boxes are apart */
    var prof = Sim.profile(sim, 'scent', { full: 26 / (W / 2), sigma: 52, tau: 1.4, split: function () { return dv.r < H ? W / 2 : null; } });
    prof.step(0);
    function reset() { sim.reset(); lifted = false; dv.r = 0; dv.bal = false; dv.since = 0; prof.reset(); prof.step(0); }
    function lift() { lifted = true; }
    /* equal: about the same number in each box, AND the scent spread evenly (a flat graph), never one without the other */
    function about() { var n = sim.count('scent'); return Math.abs(n[0] - n[1]) <= 2 && prof.flat(); }
    function run(steps) { while (steps-- > 0) { sim.step(); prof.step(DT); } }
    function jumpToEqual() {
      lifted = true; dv.r = H + 10;
      for (var q = 0; !dv.bal && q < 60 * 40; q++) { run(1); if (q > 180 && about()) dv.bal = true; }
      run(60 * 2);
      dv.since = 20;
    }
    /* the concentration is drawn on the box as a colour while a card about it is open */
    function tinted() { return foc === 'conc' || foc === 'gradient' || foc === 'net' || foc === 'equal'; }
    var scene = {
      W: W, H: GY + GH,
      tick: function (dt) {
        if (lifted) { dv.r = Math.min(H + 10, dv.r + dt * 150); dv.since += dt; if (!dv.bal && dv.since > 3 && about()) dv.bal = true; }
        run(Math.max(1, Math.round(dt / DT)));
      },
      draw: function (c) {
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W, H, C.air1, C.air0);
          if (tinted()) D.heatTint(c, 0, 0, W, H, prof, .3);
          c.strokeStyle = 'rgba(190,220,245,.4)'; c.lineWidth = 1; c.setLineDash([3, 5]);
          c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke(); c.setLineDash([]);
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
        /* the graph; on the gradient's card, the way down its slope */
        G = D.concGraph(c, prof, { x: 0, y: GY, w: W, h: GH, mid: W / 2 });
        var sl = foc === 'gradient' && !dv.bal && D.slopeOf(G, prof);
        if (sl) D.arrow(c, sl.a[0] + 6, sl.a[1] - 13, sl.b[0] - 6, sl.b[1] - 13, 7, NET, { head: 14, headW: 11 });
      },
      labels: function () {
        var it = [];
        if (!lifted) it.push({ id: 'dv', text: 'divider', x: W / 2, y: 22, side: 'T' });
        if ((lifted && !dv.bal) || (!lifted && (foc === 'conc' || foc === 'gradient'))) {
          it.push({ id: 'hi', text: 'higher concentration of scent', x: W * .25, y: 20, side: 'T', cls: 'lb--hi' });
          it.push({ id: 'lo', text: 'lower concentration of scent', x: W * .75, y: 20, side: 'T', cls: 'lb--lo' });
        }
        if (dv.bal) { it.push({ id: 'hi', text: 'equal concentration of scent', x: W * .25, y: 20, side: 'T' }); it.push({ id: 'lo', text: 'equal concentration of scent', x: W * .75, y: 20, side: 'T' }); }
        /* the graph, and what it shows now */
        if (G) {
          /* the graph's name stands clear of the slope's */
          var sl = !dv.bal && D.slopeOf(G, prof), sx = sl ? (sl.a[0] + sl.b[0]) / 2 : W / 2, gx = sl && foc === 'gradient' && sx < 300 ? W - 110 : 110;
          it.push({ id: 'graph', text: 'concentration of scent across the box', x: gx, y: G.base - 3, side: 'B' });
          if (sl && foc === 'gradient') it.push({ id: 'slope', text: 'concentration gradient', x: sx, y: (sl.a[1] + sl.b[1]) / 2, side: 'B' });
          if (dv.bal) it.push({ id: 'flat', text: 'no concentration gradient', x: W * .55, y: G.pts[Math.round(G.pts.length * .55)][1], side: 'B' });
        }
        return it;
      },
      read: function (pill) {
        var n = sim.count('scent'), x = sim.crossed('scent'), d = dv.bal ? 0 : n[0] - n[1];
        pill('l', String(n[0]), d > 2 ? 'hi' : d < -2 ? 'lo' : 'ok');
        pill('r', String(n[1]), d > 2 ? 'lo' : d < -2 ? 'hi' : 'ok');
        pill('n', !lifted ? 'none yet' : dv.bal ? 'about zero now' : '→ ' + many(Math.max(0, x.net), 'particle') + ' so far', dv.bal ? 'ok' : 'warn');
      }
    };
    var V = MV({
      scene: scene, liveNames: true,
      aria: 'Two boxes of equal volume with a divider between them, and under them a graph of the concentration of scent across the boxes. Scent particles are in the left box; when the divider is lifted they spread, the graph slopes down from left to right and then becomes flat, and the two concentrations become equal.',
      barLabel: 'The divider', buttons: [['go', 'Lift the divider'], ['reset', 'Start again']],
      read: [['l', 'Left box:', 'scent', 'scent particles'], ['r', 'Right box:', 'scent', 'scent particles'], ['n', 'Net movement:']],
      key: { all: [['scent', 'scent particle'], ['air', 'air particle'], ['net', 'net movement'], ['ways', 'crossing each way']],
             sets: [['scent particle', 'air particle', 'net movement'], ['scent particle', 'air particle', 'crossing each way']],
             now: function () {
               var a = ['scent particle', 'air particle'], n = sim.count('scent');
               return dv.bal ? a.concat('crossing each way') : lifted && (n[0] > n[1] + 2 || (foc === 'gradient' && D.slopeOf(G || { pts: [] }, prof))) ? a.concat('net movement') : a;
             } },
      onButton: function (id) { if (id === 'go') { lift(); ctx.pick('net', { stay: true }); } else { reset(); } sync(); }
    });
    /* with Reduce motion nothing moves, so the press shows at once what the moving picture reaches */
    function settle() { if (!V.isStill() || !lifted || dv.since > 0) return; dv.r = H + 10; dv.since = 6; run(60 * 6); }
    function sync() { settle(); V.button('go').disabled = lifted; V.names(); V.paint(); }
    return {
      el: V.el, start: function () { V.start(); sync(); }, stop: V.stop,
      say: 'Two boxes of the same volume: the particles move at random',
      credit: 'Particles drawn for this lab, shown many millions of times slower than in reality. With so few particles, the counts at equilibrium go up and down a little.',
      focus: function (part) {
        foc = part || null;
        /* the net movement and the gradient are seen only while the concentrations differ: from equal, start again */
        if ((part === 'net' || part === 'gradient') && dv.bal) reset();
        if ((part === 'net' || part === 'gradient') && !lifted) lift();
        if (part === 'equal' && !dv.bal) jumpToEqual();
        if (part === 'random') { sim.trail.length = 0; }
        sync();
      }
    };
  });

  /* ======================================================================= Through the cell membrane */
  Views.add('places', function (spec, ctx) {
    var W = 560, H = 330, u = 26, mode = 'oxygen', foc = null, E = { x: W + 120, y: H + 96, r: 300 }, flow = 0;
    /* urea is polar, so it crosses the lipid only slowly: in a liver cell most of it leaves through channel proteins
       (Jelen et al. 2012, Am J Physiol Gastrointest Liver Physiol, hepatocyte membranes without those channels) */
    var CHU = Sim.channels(MF.lanes(H), 18, .03, 20, .7), CHO = { pore: .3, mouth: .66, hh: 1.08 };
    function make(m) {
      if (m === 'oxygen') {
        var s = Sim.make({ seed: 6, w: W, h: H, hit: true,
          gate: { x: W / 2, hw: 2.5 * u, pass: function () { return .4; } },
          /* the respiring cell uses oxygen and makes carbon dioxide: oxygen diffuses in, carbon dioxide out (the card says both) */
          kinds: { oxygen: { n: [34, 7], speed: 62, tau: .8, through: 56, keep: [34, 99], r: 5 }, co2: { n: [8, 26], speed: 56, tau: .8, through: 52, keep: [8, 26], r: 6 } } });
        s.onMove = function (q) {
          for (var i = 0; i < q.N; i++) {
            if (q.K[i] !== 0 || q.TR[i] || q.X[i] < W / 2) continue;      /* the mitochondrion uses oxygen */
            var dx = q.X[i] - E.x, dy = q.Y[i] - E.y;
            if (dx * dx + dy * dy < E.r * E.r) { q.side[0][1]--; q.side[0][0]++; q.X[i] = 6; q.Y[i] = 10 + q.r() * (H - 20); q.VX[i] = Math.abs(q.VX[i]); }
          }
        };
        return s;
      }
      return Sim.make({ seed: 13, w: W, h: H, hit: true,
        gate: { x: W / 2, hw: 2.5 * u, lane: CHU.lane, pass: function (k, y, dir, q) { return CHU.pass(y, dir, q); } },
        kinds: { urea: { n: [10, 30], speed: 70, tau: .8, through: 104, keep: [10, 30], r: 7.5 } } });
    }
    var sims = { oxygen: make('oxygen'), urea: make('urea') }, shownNet = {};
    var scene = {
      W: W, H: H,
      tick: function (dt) { stepN(sims[mode], dt); flow += dt; },
      draw: function (c) {
        var s = sims[mode];
        D.frame(c, 0, 0, W, H, 16, function () {
          if (mode === 'oxygen') {
            D.ground(c, 0, 0, W / 2, H, C.dilute[0], C.dilute[1]);
            D.wallBand(c, W / 2 - 136, W / 2 - 66, 0, H);
          } else {
            /* the blood plasma on the left, flowing past */
            D.ground(c, 0, 0, W / 2, H, '#5A1F2C', '#3F1520');
            c.strokeStyle = 'rgba(255,190,190,.2)'; c.lineWidth = 2; c.setLineDash([16, 22]); c.lineDashOffset = -flow * 26;
            for (var x = 26; x < W / 2 - 74; x += 44) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
            c.setLineDash([]); c.lineDashOffset = 0;
          }
          D.ground(c, W / 2, 0, W / 2, H, C.cytoDark[0], C.cytoDark[1]);
          if (mode === 'oxygen') D.mitoEdge(c, E, foc === 'keep' ? .8 : 0);
          D.bilayer(c, W / 2, 0, H, u);
          if (mode === 'urea') CHU.lines.forEach(function (y) { D.channel(c, W / 2, y, u, CHO); });
          molsBy(c, s, u, mode === 'oxygen' ? ['oxygen', 'co2'] : ['urea']);
          /* the arrow of each net movement, once more have crossed that way: oxygen in; carbon dioxide and urea out */
          var into = mode === 'oxygen', xc = s.crossed(mode);
          if ((into ? xc.ab - xc.ba : xc.ba - xc.ab) >= 3) shownNet[mode] = true;
          if (shownNet[mode]) D.arrow(c, into ? W / 2 - 112 : W / 2 + 112, 52, into ? W / 2 + 112 : W / 2 - 112, 52, 15, NET, { head: 22, headW: 18 });
          if (into) { var xg = s.crossed('co2'); if (xg.ba - xg.ab >= 3) shownNet.co2 = true; if (shownNet.co2) D.arrow(c, W / 2 + 112, H - 58, W / 2 - 112, H - 58, 15, NET, { head: 22, headW: 18 }); }
        });
      },
      labels: function () {
        var it = [];
        it.push({ id: 'mem', text: 'cell membrane', x: W / 2, y: 14, side: 'T' });
        if (mode === 'oxygen') {
          it.push({ id: 'out', text: 'soil water', x: 62, y: H - 18, side: 'B' });
          it.push({ id: 'wall', text: 'cell wall', x: W / 2 - 100, y: H - 18, side: 'B' });
          it.push({ id: 'in', text: 'cytoplasm of a root hair cell', x: W / 2 + 96, y: H - 18, side: 'B' });
          it.push({ id: 'mi', text: 'mitochondrion', x: 470, y: 232, side: 'T' });
        } else {
          it.push({ id: 'out', text: 'blood plasma', x: 90, y: H - 18, side: 'B' });
          it.push({ id: 'in', text: 'cytoplasm of a liver cell', x: W - 120, y: H - 18, side: 'B' });
        }
        return it;
      },
      read: function (pill) {
        /* the cell is on the right in both pictures */
        var x = sims[mode].crossed(mode);
        if (mode === 'oxygen') {
          var g = sims.oxygen.crossed('co2'), on = x.ab - x.ba, gn = g.ba - g.ab;
          pill('a', x.ab + ' in · ' + x.ba + ' out', 'ok', 'Oxygen:'); pill('b', g.ab + ' in · ' + g.ba + ' out', 'ok', 'Carbon dioxide:');
          pill('n', on > 0 && gn > 0 ? 'oxygen in, carbon dioxide out' : 'counting', 'warn', 'Net movement:');
          return;
        }
        pill('a', many(x.ab, 'molecule'), 'ok', 'Into the cell:'); pill('b', many(x.ba, 'molecule'), 'ok', 'Out of the cell:');
        var nt = x.ba - x.ab;
        pill('n', nt > 0 ? nt + ' out of the cell' : 'counting', 'warn', 'Net movement:');
      }
    };
    var V = MV({
      scene: scene, aria: 'A cell membrane with molecules crossing it in both directions. Oxygen dissolved in soil water passes between the lipids into a root hair cell, and carbon dioxide passes out. Urea leaves a liver cell mostly through channel proteins, into the blood plasma. There are more on one side, so there is a net movement to the other.',
      barLabel: 'Which cell', buttons: [['oxygen', 'Oxygen into a root hair cell'], ['urea', 'Urea out of a liver cell']],
      read: [['a', 'Into the cell:'], ['b', 'Out of the cell:'], ['n', 'Net movement:']],
      key: { all: [['oxygen', 'oxygen molecule'], ['co2', 'carbon dioxide molecule'], ['urea', 'urea molecule'], ['lipid', 'lipid of the cell membrane'], ['channel', 'channel protein'], ['net', 'net movement']],
             sets: [['oxygen molecule', 'carbon dioxide molecule', 'lipid of the cell membrane', 'net movement'], ['urea molecule', 'lipid of the cell membrane', 'channel protein', 'net movement']],
             now: function () { var a = mode === 'oxygen' ? ['oxygen molecule', 'carbon dioxide molecule', 'lipid of the cell membrane'] : ['urea molecule', 'lipid of the cell membrane', 'channel protein']; return shownNet[mode] ? a.concat('net movement') : a; } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    /* each cell its own caption: a liver cell has no cell wall */
    var CREDIT = { oxygen: 'Molecules and membrane at their true sizes beside each other (5 nm thick). The cell wall and the mitochondrion are drawn much smaller than they really are, and only some molecules are drawn.',
                   urea: 'Molecules, channel proteins and membrane at their true sizes beside each other (5 nm thick). Only some molecules are drawn.' };
    function show(m) { mode = m; if (V.isStill() && sims[m].t < 8) { var n = 60 * 10; while (n-- > 0) sims[m].step(); } api.credit = CREDIT[m]; if (ctx.caption) ctx.caption(); V.press(m); V.names(); V.paint(); }
    var api = {
      el: V.el, start: function () { V.start(); show(mode); }, stop: V.stop,
      say: 'At the cell membrane: each molecule moves at random, and more cross one way',
      credit: CREDIT.oxygen,
      focus: function (part) { foc = part; if (part === 'urea') show('urea'); else if (part === 'oxygen' || part === 'keep') show('oxygen'); else { V.names(); V.paint(); } }
    };
    return api;
  });

  /* ======================================================================= The rate of diffusion
     Two boxes, side by side, that differ in ONE factor. The same seed, the same start: the difference is the factor. */
  Views.add('race', function (spec, ctx) {
    /* H: the two boxes; under each, the graph of its concentration of scent, so a steeper gradient is seen as a steeper drop */
    var W = 560, H = 318, GY = H + 10, GH = 78, pw = 272, gapX = 16, foc = 'temp', t = 0, END = 10, go = 0, profs = [];
    /* `seeds`: runs measured so that, at every second from the fourth on, the faster box is ahead; each is a middle run of
       those that do, so the size of the difference is not exaggerated */
    var FACT = {
      temp: { name: 'Temperature', a: 'lower temperature', b: 'higher temperature', heat: [1, 2], n: [40, 40], door: [120, 120], hw: [5, 5], seeds: [76, 79, 68] },
      grad: { name: 'Concentration gradient', a: 'smaller gradient', b: 'steeper gradient', heat: [1, 1], n: [18, 52], door: [120, 120], hw: [5, 5], seeds: [117, 116, 118] },
      area: { name: 'Surface area', a: 'smaller surface area', b: 'larger surface area', heat: [1, 1], n: [40, 40], door: [50, 190], hw: [5, 5], seeds: [181, 177, 188] },
      dist: { name: 'Distance', a: 'longer distance', b: 'shorter distance', heat: [1, 1], n: [40, 40], door: [120, 120], hw: [46, 5], seeds: [50, 41, 73] }
    };
    /* each wall starts at the same place, so the side the particles start in has the same volume in both boxes */
    function wallX(hw) { return pw / 2 - 5 + hw; }
    var sims = [null, null];
    function build() {
      var f = FACT[foc], seed = f.seeds[go % f.seeds.length];
      sims = [0, 1].map(function (i) {
        var door = f.door[i], hw = f.hw[i];
        var s = Sim.make({ seed: seed, w: pw, h: H, margin: 6, hit: true,
          gate: { x: wallX(hw), hw: hw, walk: true, y0: H / 2 - door / 2, y1: H / 2 + door / 2, pass: function (k, y) { return Math.abs(y - H / 2) < door / 2 ? 1 : 0; } },
          kinds: { scent: { n: [f.n[i], 0], speed: 60, tau: .3, r: 5 } } });
        s.heat = f.heat[i];
        return s;
      });
      /* both graphs on one scale, the larger starting concentration as 1 */
      var full = Math.max(f.n[0], f.n[1]) / (pw / 2 - 5);
      profs = sims.map(function (s, i) { var p = Sim.profile(s, 'scent', { full: full, n: 15, sigma: 26, tau: 1.1, split: function () { return wallX(f.hw[i]); } }); p.step(0); return p; });
      t = 0;
    }
    function race(steps) { while (steps-- > 0) { sims[0].step(); sims[1].step(); profs[0].step(DT); profs[1].step(DT); } }
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
      D.concGraph(c, profs[i], { x: 0, y: GY, w: pw, h: GH, mid: gx, max: 1.2 });
    }
    var scene = {
      W: W, H: GY + GH,
      tick: function (dt) { if (t < END) { t += dt; race(Math.max(1, Math.round(dt / DT))); } },
      draw: function (c) {
        var f = FACT[foc], T = c.getTransform();
        panel(c, 0, f);
        c.translate(pw + gapX, 0);
        panel(c, 1, f);
        c.setTransform(T);
      },
      labels: function () {
        var f = FACT[foc];
        return [{ id: 'a', text: f.a, x: pw / 2 - 74, y: 14, side: 'T' }, { id: 'b', text: f.b, x: W - pw / 2 + 74, y: 14, side: 'T' },
                { id: 'g', text: 'concentration of scent across each box', x: 60, y: GY + GH - 16, side: 'B' }];
      },
      read: function (pill) {
        var a = sims[0].crossed('scent').net, b = sims[1].crossed('scent').net;
        var f = FACT[foc];
        pill('a', many(Math.max(0, a), 'particle'), 'ok', f.a + ':'); pill('b', many(Math.max(0, b), 'particle'), 'ok', f.b + ':');
        pill('c', t >= END ? 'stopped at ' + END + ' s' : Math.floor(t) + ' s', t >= END ? 'warn' : 'ok');
      }
    };
    var V = MV({
      scene: scene, aria: 'Two boxes side by side, each with a doorway in a wall, and under each a graph of its concentration of scent. They differ in one factor; the box with the faster diffusion has more particles across its wall.',
      barLabel: 'Which factor', buttons: [['temp', 'Temperature'], ['grad', 'Gradient'], ['area', 'Surface area'], ['dist', 'Distance'], ['run', 'Run again']],
      read: [['a', 'Net movement:'], ['b', 'Net movement:'], ['c', 'Time:']],
      key: { all: [['scent', 'scent particle']], sets: [['scent particle']], now: function () { return ['scent particle']; } },
      onButton: function (id) { if (id === 'run') { go++; build(); ran(); V.names(); V.paint(); } else ctx.pick(id, { stay: true }); }
    });
    function ran() { if (V.isStill()) { race(60 * END); t = END; } }
    function show(k) { if (FACT[k]) { foc = k; go = 0; V.press(k); build(); ran(); V.names(); V.paint(); } }
    return {
      el: V.el, start: function () { V.start(); V.press(foc); if (t === 0) ran(); V.names(); V.paint(); }, stop: V.stop,
      say: 'One factor changed, the rest the same: which box moves more particles across?',
      credit: 'Particles drawn for this lab, shown many millions of times slower than in reality.',
      focus: function (part) { if (part) show(part); }
    };
  });

  /* ======================================================================= Water, the solvent
     Liquid water as it really is: molecules touching, in no regular pattern, and sliding past each other, with hydrogen bonds (dashed) that break
     and form again (memory particle-model-in-diagrams). Each dissolved particle is held by water molecules that move with
     it. Molecules are at their true sizes beside each other; the picture is about 8 nm wide.
     Each place shows what water does there (Daniel, 28 Nov 2026, of a digestion picture that only added a glucose molecule:
     "I don't understand what that adds to the understanding of what you're explaining"): in digestion an enzyme dissolved in
     water cuts starch, which does not dissolve, into maltose, which does; in excretion and in transport the liquid flows and
     carries what is dissolved in it. */
  Views.add('solvent', function (spec, ctx) {
    var W = 560, H = 330, u = 72, D0 = 26, M = 34, t = 0, t0 = 0, mode = 'solution', rnd = Sim.rng(12), pts = [];
    var SOL = {
      solution: [{ k: 'glucose', x: 170, y: 120, r: 34 }, { k: 'glucose', x: 395, y: 215, r: 34 }],
      excretion: [{ k: 'urea', x: 150, y: 110, r: 24 }, { k: 'urea', x: 330, y: 80, r: 24 }, { k: 'urea', x: 235, y: 245, r: 24 }, { k: 'urea', x: 440, y: 225, r: 24 }],
      transport: [{ k: 'glucose', x: 140, y: 110, r: 34 }, { k: 'urea', x: 415, y: 95, r: 24 }, { k: 'mg', x: 280, y: 210, r: 16 }, { k: 'mg', x: 470, y: 250, r: 16 }]
    };
    /* where the liquid flows, and how fast (px a second): urine and blood plasma carry what is dissolved in them */
    var FLOW = { excretion: 14, transport: 20 };
    var BW = W + 2 * M, BH = H + 2 * M;
    function wrapX(x) { return ((x + M) % BW + BW) % BW - M; }
    function at(q, tt) {
      /* each solute drifts slowly, with its shell of water, and goes with the liquid where it flows */
      var i = q.x * .013 + q.y * .021;
      return [wrapX(q.x + 26 * Math.sin(tt * .32 + i) + (FLOW[mode] || 0) * tt), q.y + 18 * Math.cos(tt * .27 + i * 1.7)];
    }

    /* ---- digestion. Amylase is a protein about as wide as this picture: only its left part is drawn, with its active site,
       a cleft that holds the end of a starch chain. Starch is a chain of glucose units far longer than the picture, so it
       comes in from the left edge. Every CUT seconds the chain moves two units into the cleft, the enzyme cuts the bond
       behind them, and the two units leave as one molecule of maltose through the open lower side of the cleft. Water
       molecules gather round each maltose molecule: it dissolves. They never gather round the starch: it does not dissolve. */
    var CUT = 4.4, SP = 58, GX = 500, GY = 150, ENZ = { x: 650, y: 150, r: 236 }, KEEP = 4;
    var NOTCH = [[392, 116], [546, 116], [546, 200], [516, 262], [392, 262]];
    function inPoly(P, x, y) {
      var c = false;
      for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
        if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
      }
      return c;
    }
    function enzR(a) { return ENZ.r + 8 * Math.sin(5 * a + .3) + 5 * Math.sin(11 * a + 1.2); }
    /* the nearest point on the cleft's edges, for water pushed into the enzyme from the cleft: [x, y, distance] */
    function toNotch(x, y) {
      var best = null, bd = 1e18;
      for (var i = 0; i < NOTCH.length; i++) {
        var a = NOTCH[i], b = NOTCH[(i + 1) % NOTCH.length], ex = b[0] - a[0], ey = b[1] - a[1];
        var s = clamp(((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey)), px = a[0] + s * ex, py = a[1] + s * ey, d = (x - px) * (x - px) + (y - py) * (y - py);
        if (d < bd) { bd = d; best = [px, py, Math.sqrt(d)]; }
      }
      return best;
    }
    function digest(tt) {
      var k = Math.floor(tt / CUT), ph = tt / CUT - k, adv = ease(clamp(ph / .32)), cutDone = ph >= .5;
      var rings = [], pairs = [], j, x;
      /* the chain: unit 0 lies at the back of the cleft once the chain has moved in */
      var x0 = GX - 2 * SP * (1 - adv);
      for (j = cutDone ? 2 : 0; j < 16; j++) {
        x = x0 - j * SP;
        if (x < -M - 30) break;
        rings.push({ k: 'glucose', x: x, y: GY + clamp((392 - x) / 200) * 14 * Math.sin(x * .021 + tt * .45), r: 30, shell: false, starch: true, j: j });
      }
      /* the maltose molecules: the newest leaves the cleft through its open lower side, the older ones drift away, dissolved */
      for (var m = 0; m < KEEP; m++) {
        var age = tt - ((k - m) * CUT + .5 * CUT);
        if (k - m < 0 || age < 0) continue;
        var e = ease(clamp(age / 1.8)), cx = GX - SP / 2, cy = GY;
        if (e < .5) cy = GY + 64 * ease(e / .5);
        else { var f = ease((e - .5) / .5); cx = lerp(GX - SP / 2, 404, f); cy = lerp(GY + 64, GY + 112, f); }
        /* out of the cleft, each one drifts away on its own path, so the newer ones never land on the older ones */
        var drift = Math.max(0, age - 1.8), K = k - m, phi = -.15 + .6 * (Math.sin(K * 2.3) + 1) / 2;
        cx -= 26 * Math.cos(phi) * drift; cy += 26 * Math.sin(phi) * drift + 6 * Math.sin(drift * .6 + K);
        if (cx < -M - 60 || cy > H + M + 40) continue;
        /* it dissolves once it is out of the enzyme: water molecules gather round it there (a shell that formed in the cleft
           would carry the cleft's water out with it) */
        var ang = lerp(0, .5, e) + .12 * Math.sin(drift * .5 + K), dx = Math.cos(ang) * SP / 2, dy = Math.sin(ang) * SP / 2, free = age > 1.65;
        var a1 = { k: 'glucose', x: cx - dx, y: cy - dy, r: 30, shell: free, ang: ang }, a2 = { k: 'glucose', x: cx + dx, y: cy + dy, r: 30, shell: free, ang: ang };
        rings.push(a1, a2);
        pairs.push({ a: a1, b: a2, x: cx, y: cy, age: age, free: free });
      }
      return { rings: rings, pairs: pairs, flash: ph >= .32 && ph < .5 ? Math.sin((ph - .32) / .18 * Math.PI) : 0, cutX: x0 - 1.5 * SP };
    }
    function solutes() {
      if (mode === 'digestion') return digest(t - t0).rings;
      return SOL[mode].map(function (q) { var p = at(q, t); return { k: q.k, x: p[0], y: p[1], r: q.r, shell: true }; });
    }
    /* the enzyme takes a quarter of the picture, so a quarter of the water molecules are out of play while it is there */
    function inEnzyme(x, y, pad) {
      var dx = x - ENZ.x, dy = y - ENZ.y;
      return dx * dx + dy * dy < Math.pow(enzR(Math.atan2(dy, dx)) + pad, 2) && !inPoly(NOTCH, x, y);
    }

    /* liquid water has no pattern (a regular pattern is ice): the molecules touch, push each other and slide past each
       other, so each molecule's neighbours change */
    var N = 322, NN = N, COLS = Math.ceil(BW / D0) + 1, ROWS = Math.ceil(BH / D0) + 1;
    var head = new Int32Array(COLS * ROWS), next = new Int32Array(N);
    for (var j = 0; j < N; j++) pts.push({ x: rnd() * BW - M, y: rnd() * BH - M, a: rnd() * TAU, s: (rnd() - .5) * 1.5 });
    function jostle(jit) {
      var list = solutes(), fl = (FLOW[mode] || 0) / 60, i, p, q;
      head.fill(-1);
      for (i = 0; i < NN; i++) {
        p = pts[i];
        if (jit) { p.x += (rnd() - .5) * jit + fl; p.y += (rnd() - .5) * jit; p.a += p.s / 60; }
        if (p.x < -M) p.x += BW; else if (p.x >= W + M) p.x -= BW;
        if (p.y < -M) p.y += BH; else if (p.y >= H + M) p.y -= BH;
        var id = Math.min(COLS - 1, Math.max(0, Math.floor((p.x + M) / D0))) + Math.min(ROWS - 1, Math.max(0, Math.floor((p.y + M) / D0))) * COLS;
        next[i] = head[id]; head[id] = i;
      }
      for (i = 0; i < NN; i++) {
        p = pts[i];
        var cx = Math.min(COLS - 1, Math.max(0, Math.floor((p.x + M) / D0))), cy = Math.min(ROWS - 1, Math.max(0, Math.floor((p.y + M) / D0)));
        for (var yy = Math.max(0, cy - 1); yy <= Math.min(ROWS - 1, cy + 1); yy++) {
          for (var xx = Math.max(0, cx - 1); xx <= Math.min(COLS - 1, cx + 1); xx++) {
            for (var k = head[xx + yy * COLS]; k >= 0; k = next[k]) {
              if (k <= i) continue;
              q = pts[k];
              var dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy;
              if (d2 >= D0 * D0) continue;
              var d = Math.sqrt(d2) || .01, f = (D0 - d) * .4 / d;
              p.x -= dx * f; p.y -= dy * f; q.x += dx * f; q.y += dy * f;
            }
          }
        }
      }
      /* a dissolved particle pushes the water aside, and holds a shell of water molecules; starch pushes it aside only */
      list.forEach(function (sol) {
        var R = sol.r + 13;
        for (var n = 0; n < NN; n++) {
          var m = pts[n], ex = m.x - sol.x, ey = m.y - sol.y, e = Math.sqrt(ex * ex + ey * ey) || .01;
          if (e < R) { m.x = sol.x + ex / e * R; m.y = sol.y + ey / e * R; }
          /* water is attracted to a dissolved particle, so a whole shell of molecules surrounds it */
          else if (sol.shell && e < R + 15) { var pull = (e - R) * .22 / e; m.x -= ex * pull; m.y -= ey * pull; }
        }
      });
      /* the enzyme is solid: water stays outside it, and outside its cleft's walls */
      if (mode === 'digestion') for (i = 0; i < NN; i++) {
        p = pts[i];
        if (!inEnzyme(p.x, p.y, 12)) continue;
        var ax = p.x - ENZ.x, ay = p.y - ENZ.y, aa = Math.atan2(ay, ax), rr = enzR(aa) + 12, nb = toNotch(p.x, p.y);
        /* water pushed into the enzyme from its cleft goes back into the cleft, which is full of water too */
        if (nb[2] + 12 < rr - Math.sqrt(ax * ax + ay * ay)) { var vl = nb[2] || .01; p.x = nb[0] + (nb[0] - p.x) / vl * 12; p.y = nb[1] + (nb[1] - p.y) / vl * 12; }
        else { p.x = ENZ.x + Math.cos(aa) * rr; p.y = ENZ.y + Math.sin(aa) * rr; }
      }
    }
    for (var w0 = 0; w0 < 200; w0++) jostle(1.4);                       /* it starts as a liquid */

    function drawEnzyme(c) {
      /* the protein, then the water in its cleft, then the cleft's walls (the active site) */
      c.beginPath();
      for (var i = 0; i <= 120; i++) { var a = i / 120 * TAU, rr = enzR(a); c[i ? 'lineTo' : 'moveTo'](ENZ.x + rr * Math.cos(a), ENZ.y + rr * Math.sin(a)); }
      c.closePath();
      var rg = c.createRadialGradient(ENZ.x - 110, ENZ.y - 90, 20, ENZ.x, ENZ.y, ENZ.r + 20);
      rg.addColorStop(0, '#F4C9AB'); rg.addColorStop(1, '#C77650');
      c.fillStyle = rg; c.fill();
      c.strokeStyle = 'rgba(120,58,30,.8)'; c.lineWidth = 1.6; c.stroke();
      c.save(); c.beginPath(); NOTCH.forEach(function (q, n) { c[n ? 'lineTo' : 'moveTo'](q[0], q[1]); }); c.closePath(); c.clip();
      D.ground(c, 0, 0, W, H, C.water0, C.water1); c.restore();
      var top = ENZ.x - Math.sqrt(Math.pow(enzR(Math.PI), 2) - Math.pow(NOTCH[0][1] - ENZ.y, 2));
      var bot = ENZ.x - Math.sqrt(Math.pow(enzR(Math.PI), 2) - Math.pow(NOTCH[4][1] - ENZ.y, 2));
      c.strokeStyle = 'rgba(150,70,36,.95)'; c.lineWidth = 3; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); c.moveTo(top, NOTCH[0][1]); c.lineTo(NOTCH[1][0], NOTCH[1][1]); c.lineTo(NOTCH[2][0], NOTCH[2][1]); c.lineTo(NOTCH[3][0], NOTCH[3][1]); c.lineTo(bot, NOTCH[4][1]); c.stroke();
    }
    function bond(c, a, b) {
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / d, uy = dy / d;
      c.moveTo(a.x + ux * 24, a.y + uy * 24); c.lineTo(b.x - ux * 24, b.y - uy * 24);
    }
    function drawDigestion(c, dg) {
      var chain = dg.rings.filter(function (q) { return q.starch; });
      c.strokeStyle = C.sugar; c.lineWidth = 3.2; c.lineCap = 'round';
      c.beginPath();
      for (var i = 1; i < chain.length; i++) bond(c, chain[i], chain[i - 1]);
      dg.pairs.forEach(function (q) { bond(c, q.a, q.b); });
      c.stroke();
      dg.pairs.forEach(function (q) {
        if (!q.free) return;
        /* a soft light on each maltose molecule that has dissolved, so a reader can find it */
        c.save(); c.globalCompositeOperation = 'lighter';
        var rg = c.createRadialGradient(q.x, q.y, 2, q.x, q.y, 62);
        rg.addColorStop(0, 'rgba(255,240,190,.34)'); rg.addColorStop(1, 'rgba(255,240,190,0)');
        c.fillStyle = rg; c.beginPath(); c.arc(q.x, q.y, 62, 0, TAU); c.fill(); c.restore();
      });
      dg.rings.forEach(function (q, n) { D.mol(c, 'glucose', q.x, q.y, (q.ang || 0) + (q.starch ? .2 * Math.sin(q.j * 1.3) : 0), u); });
      if (dg.flash > 0) {
        /* the enzyme cuts the bond */
        c.save(); c.globalCompositeOperation = 'lighter';
        var fg = c.createRadialGradient(dg.cutX, GY, 1, dg.cutX, GY, 26);
        fg.addColorStop(0, 'rgba(255,255,235,' + (.95 * dg.flash).toFixed(3) + ')'); fg.addColorStop(1, 'rgba(255,240,190,0)');
        c.fillStyle = fg; c.beginPath(); c.arc(dg.cutX, GY, 26, 0, TAU); c.fill(); c.restore();
      }
    }

    var scene = {
      W: W, H: H,
      tick: function (dt) { t += dt; var n = Math.max(1, Math.round(dt * 60)); while (n-- > 0) jostle(1.5); },
      draw: function (c) {
        var list = solutes(), dg = mode === 'digestion' ? digest(t - t0) : null, shells = list.filter(function (q) { return q.shell; });
        D.frame(c, 0, 0, W, H, 16, function () {
          D.ground(c, 0, 0, W, H, C.water0, C.water1);
          if (dg) drawEnzyme(c);
          var drawn = [];
          for (var n = 0; n < NN; n++) {
            var p = pts[n], a = p.a, hug = -1;
            /* a molecule beside a dissolved particle is in its shell, and turns towards it */
            for (var i = 0; i < shells.length; i++) {
              var dx = p.x - shells[i].x, dy = p.y - shells[i].y, R = shells[i].r + 13;
              if (dx * dx + dy * dy < (R + 7) * (R + 7)) { hug = i; a = Math.atan2(dy, dx) + Math.PI / 2 + (shells[i].k === 'mg' ? Math.PI : 0); }
            }
            /* the enzyme is dissolved too: a shell of water molecules covers its surface */
            if (dg && hug < 0 && inEnzyme(p.x, p.y, 19)) { hug = 0; a = Math.atan2(p.y - ENZ.y, p.x - ENZ.x) + Math.PI / 2; }
            drawn.push({ x: p.x, y: p.y, a: a, hug: hug });
          }
          drawn.forEach(function (m) { D.mol(c, 'water', m.x, m.y, m.a, u, m.hug < 0 ? .45 : 1); });
          /* the hydrogen bonds: dashed, in the gaps between the molecules, breaking and forming */
          c.strokeStyle = 'rgba(214,240,255,.95)'; c.lineWidth = 1.5; c.setLineDash([2.4, 2.6]);
          c.beginPath();
          for (var a1 = 0; a1 < drawn.length; a1++) {
            for (var b1 = a1 + 1; b1 < drawn.length; b1++) {
              var ddx = drawn[b1].x - drawn[a1].x, ddy = drawn[b1].y - drawn[a1].y, q2 = ddx * ddx + ddy * ddy;
              if (q2 < 1260 && q2 > 300 && Math.sin(t * .9 + (a1 + b1) * 1.7) > .05) {
                var dd = Math.sqrt(q2), ux = ddx / dd, uy = ddy / dd;
                c.moveTo(drawn[a1].x + ux * 11.5, drawn[a1].y + uy * 11.5); c.lineTo(drawn[b1].x - ux * 11.5, drawn[b1].y - uy * 11.5);
              }
            }
          }
          c.stroke(); c.setLineDash([]);
          /* the liquid flows: every molecule in it moves on together, and the arrow says which way */
          if (FLOW[mode]) D.arrow(c, 36, H - 28, W - 36, H - 28, 12, 'rgba(170,225,255,.62)', { head: 22, headW: 20 });
          if (dg) { drawDigestion(c, dg); return; }
          list.forEach(function (q, i) {
            /* the solute itself, and a soft light so a reader can find it */
            c.save(); c.globalCompositeOperation = 'lighter';
            var rg = c.createRadialGradient(q.x, q.y, 2, q.x, q.y, q.r + 8);
            rg.addColorStop(0, 'rgba(255,240,190,.42)'); rg.addColorStop(1, 'rgba(255,240,190,0)');
            c.fillStyle = rg; c.beginPath(); c.arc(q.x, q.y, q.r + 8, 0, TAU); c.fill(); c.restore();
            D.mol(c, q.k, q.x, q.y, t * .25 + i, u);
          });
        });
      },
      /* the key names each particle; the names say what each one is here (the reviewer, 25 Nov 2026: solvent, solute and
         solution, and where the water is, were never named) */
      labels: function () {
        if (mode === 'digestion') {
          var dg = digest(t - t0), it = [], best = null;
          dg.rings.forEach(function (q) { if (q.starch && q.x > 40 && (!best || Math.abs(q.x - 150) < Math.abs(best.x - 150))) best = q; });
          if (best) it.push({ id: 'starch', text: 'starch: does not dissolve', x: best.x, y: best.y, side: 'T' });
          it.push({ id: 'enz', text: 'amylase: an enzyme, dissolved in water', x: 470, y: 40, side: 'T' });
          var mal = dg.pairs.filter(function (q) { return q.free && q.x > 50 && q.y < H - 30; }).sort(function (a, b) { return a.age - b.age; })[0];
          if (mal) it.push({ id: 'malt', text: 'maltose: dissolves', x: mal.x, y: mal.y, side: 'B' });
          return it;
        }
        var list = solutes();
        if (mode === 'solution') {
          var bst = null, bd = -1;
          pts.forEach(function (p) {
            if (p.x < 40 || p.x > W - 40 || p.y < H * .55 || p.y > H - 24) return;
            var d = Math.min.apply(null, list.map(function (q) { return Math.hypot(p.x - q.x, p.y - q.y); }));
            if (d > bd) { bd = d; bst = p; }
          });
          var out = [{ id: 'sol', text: 'solute: glucose', x: list[0].x, y: list[0].y, side: 'T' }];
          if (bst) out.push({ id: 'solv', text: 'solvent: water', x: bst.x, y: bst.y, side: 'B' });
          return out;
        }
        /* where the liquid flows: the solute nearest the middle is named, and the flow */
        var mid = list.filter(function (q) { return q.x > 60 && q.x < W - 60; }).sort(function (a, b) { return Math.abs(a.x - W * .45) - Math.abs(b.x - W * .45); })[0];
        if (mode === 'excretion') {
          var ex = [{ id: 'flow', text: 'urine flows, carrying the urea', x: W * .5, y: H - 28, side: 'B' }];
          if (mid) ex.unshift({ id: 'what', text: 'urea, dissolved in the water of urine', x: mid.x, y: mid.y, side: 'T' });
          return ex;
        }
        return [{ id: 'flow', text: 'blood plasma flows, carrying what is dissolved in it', x: W * .5, y: H - 28, side: 'B' }];
      }
    };
    var NAME = { glucose: 'glucose molecule', urea: 'urea molecule', mg: 'magnesium ion' };
    var V = MV({
      scene: scene, liveNames: true, aria: 'Water molecules touching each other, with dashed hydrogen bonds. Each dissolved particle is surrounded by a shell of water molecules. In digestion, amylase cuts starch into maltose, which dissolves; in urine and in blood plasma the liquid flows and carries what is dissolved in it.',
      barLabel: 'Where', buttons: [['digestion', 'Digestion'], ['excretion', 'Excretion'], ['transport', 'Transport']],
      key: { all: [['water', 'water molecule'], ['glucose', 'glucose molecule'], ['urea', 'urea molecule'], ['mg', 'magnesium ion'], ['starch', 'starch: a chain of glucose units'], ['maltose', 'maltose molecule: two glucose units'], ['amylase', 'amylase, an enzyme'], ['flow', 'the flow of the liquid'], ['hbond', 'hydrogen bond']],
             sets: [['water molecule', 'glucose molecule', 'hydrogen bond'], ['water molecule', 'starch: a chain of glucose units', 'maltose molecule: two glucose units', 'amylase, an enzyme', 'hydrogen bond'], ['water molecule', 'urea molecule', 'the flow of the liquid', 'hydrogen bond'], ['water molecule', 'glucose molecule', 'urea molecule', 'magnesium ion', 'the flow of the liquid', 'hydrogen bond']],
             now: function () {
               if (mode === 'digestion') return ['water molecule', 'starch: a chain of glucose units', 'maltose molecule: two glucose units', 'amylase, an enzyme', 'hydrogen bond'];
               var out = ['water molecule'];
               SOL[mode].forEach(function (q) { if (out.indexOf(NAME[q.k]) < 0) out.push(NAME[q.k]); });
               if (FLOW[mode]) out.push('the flow of the liquid');
               return out.concat('hydrogen bond');
             } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    var SAY = { solution: 'A solution: glucose (the solute) dissolved in water (the solvent)', digestion: 'In the gut: amylase, an enzyme dissolved in water, breaks starch into maltose, which dissolves',
                excretion: 'In urine: urea dissolved in water, carried out of the body', transport: 'In blood plasma: glucose, urea and ions dissolved in water, carried round the body' };
    var CREDIT = { digestion: 'Water molecules, glucose units and amylase at their true sizes beside each other. Only part of the amylase molecule is drawn: the whole molecule is about as wide as this picture. A starch chain is far longer than the picture, and its glucose units are drawn a little further apart than they are.',
                   other: 'Water molecules and solutes at their true sizes. Hydrogen bonds break and form all the time.' };
    function show(m) {
      if (m !== mode) { mode = m; t0 = t; NN = m === 'digestion' ? N - 70 : N; for (var n = 0; n < 40; n++) jostle(0); }
      /* with Reduce motion, the one still is a moment after three cuts, with maltose that has dissolved */
      if (m === 'digestion' && V.isStill && V.isStill()) { t0 = t - 3.1 * CUT; for (var s = 0; s < 40; s++) jostle(0); }
      api.say = SAY[m]; api.credit = m === 'digestion' ? CREDIT.digestion : CREDIT.other;
      if (ctx.caption) ctx.caption(); V.press(m); V.names(); V.paint();
    }
    var api = {
      el: V.el, start: function () { V.start(); show(mode); }, stop: V.stop,
      say: SAY.solution, credit: CREDIT.other,
      focus: function (part) { show(part && part !== 'solution' ? part : 'solution'); }
    };
    return api;
  });

  /* ======================================================================= Osmosis */
  Views.add('osmo', function (spec, ctx) {
    var W = 560, H = 340, u = 26, same = false, foc = null, CH = Sim.channels(MF.lanes(H), 17, .02, 16, .5);
    function make(eq) {
      var nL = eq ? 44 : 60, nR = eq ? 44 : 28, sL = eq ? 10 : 3, sR = eq ? 10 : 15;
      return Sim.make({ seed: eq ? 8 : 16, w: W, h: H, hit: true,
        gate: { x: W / 2, hw: 2.5 * u, lane: CH.lane, pass: function (k, y, dir, q) { return k === 'water' ? CH.pass(y, dir, q) : 0; } },
        kinds: { water: { n: [nL, nR], speed: 56, tau: .8, through: 118, keep: [nL, nR], r: 5.4 }, sucrose: { n: [sL, sR], speed: 22, tau: .5, r: 14 } } });
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
          CH.lines.forEach(function (y) { D.channel(c, W / 2, y, u); });
          if (foc === 'ppm') { c.strokeStyle = 'rgba(255,240,190,.95)'; c.lineWidth = 2.4; D.rr(c, W / 2 - 2.6 * u, 3, 5.2 * u, H - 6, 12); c.stroke(); }
          molsBy(c, s, u, ['sucrose', 'water']);
          if (!same) D.arrow(c, W / 2 - 110, 54, W / 2 + 112, 54, 16, NET, { head: 24, headW: 19 });
          else {
            D.arrow(c, W / 2 - 98, 38, W / 2 + 98, 38, 7, WHITE, { head: 15, headW: 11 });
            D.arrow(c, W / 2 + 98, 70, W / 2 - 98, 70, 7, WHITE, { head: 15, headW: 11 });
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
      scene: scene, aria: 'A partially permeable membrane between two solutions that start with equal volumes. Water molecules cross in both directions, mostly through channel proteins; sucrose molecules cannot cross.',
      barLabel: 'The two solutions', buttons: [['diff', 'Dilute and concentrated'], ['same', 'The same solution on both sides']],
      read: [['a', 'Water crossing →'], ['b', 'Water crossing ←'], ['n', 'Net movement:']],
      key: { all: [['water', 'water molecule'], ['sucrose', 'sucrose molecule'], ['sucrose', 'solute molecule'], ['lipid', 'lipid of the membrane'], ['channel', 'channel protein for water'], ['net', 'net movement of water'], ['ways', 'crossing each way']],
             sets: [['water molecule', 'sucrose molecule', 'lipid of the membrane', 'channel protein for water', 'net movement of water'], ['water molecule', 'sucrose molecule', 'lipid of the membrane', 'channel protein for water', 'crossing each way']],
             /* in a real cell the dissolved substance is not sucrose, so there the key says what it stands for */
             now: function () { return ['water molecule', foc === 'cells' ? 'solute molecule' : 'sucrose molecule', 'lipid of the membrane', 'channel protein for water', same ? 'crossing each way' : 'net movement of water']; } },
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
    /* the close-up shows what the bag does (Daniel, 25 Nov 2026: "make sure that the animation is in line with the close-up"):
       while the bag changes, more water molecules cross one way, counted, with the arrow of the net movement; once it has
       stopped changing, as many cross each way. RATE: the seconds for a full change of the bag.
       Each model is true to its end (Daniel, 28 Nov 2026: "the dialysis tubing gets empty ... but I still see a lot of water
       molecules on the left and not to the right ... make sure that the models are correct"):
       - sucrose solution in the bag: as water enters, the solution in the bag becomes more dilute (in the close-up, fewer
         sucrose molecules and more water molecules), but it never becomes pure water; the net movement stops only when the
         bag is firm and the stretched tubing presses on the solution (the pressure is drawn), and then as many water
         molecules leave the bag as enter it;
       - water in the bag: the water in the bag stays pure water, so it keeps the higher water potential: water goes on
         leaving until the bag is soft and almost empty, and the net movement never stops while any water is left in it
         (it used to stop, with as many crossing each way, while the close-up still showed far more water in the bag);
       - the same solution in both: as many cross each way from the start;
       - a model of a cell: the same solution in both, each part named as the part of a cell it represents. */
    var W = 560, H = 356, setup = 'in', full = .45, target = 1, u = 16, RATE = 9, cnt = { ab: 0, ba: 0 }, eqBase = null, el = 0, PRESS = '#E0345F';
    function settled() { return SET[setup].stops !== false && Math.abs(full - target) <= .004; }
    var B = { x: 26, y: 58, w: 292, h: 262 };
    var LX = 438, LY = 118, LR = 104;
    /* the tubing in the close-up: solid bars with pores between them, wider than a water molecule and narrower than sucrose */
    var PER = 15, BAR = 6.5, PORES = [];
    for (var py = 2; py < 2 * LR; py += PER) PORES.push(py + BAR + (PER - BAR) / 2);
    var PORE = Sim.channels(PORES, 4, 0, 11);
    var SET = {
      /* spare: water molecules the bag's side gains as its solution becomes more dilute (parked until then) */
      in: { seed: 5, label: 'bag of sucrose solution, in water', nL: 34, nR: 16, spare: 4, sL: 0, sR: 6, liquid: ['rgba(120,200,240,.38)', 'rgba(60,150,210,.56)'], bag: null, to: 1, net: 1 },
      out: { seed: 6, label: 'bag of water, in sucrose solution', nL: 12, nR: 34, sL: 6, sR: 0, liquid: ['rgba(240,200,120,.42)', 'rgba(205,148,66,.62)'], bag: ['rgba(190,226,246,.72)', 'rgba(150,204,236,.72)', 'rgba(104,166,208,.82)'], to: 0, net: -1, stops: false },
      same: { seed: 23, label: 'the same solution in both', nL: 22, nR: 22, sL: 4, sR: 4, liquid: ['rgba(240,200,120,.42)', 'rgba(205,148,66,.62)'], bag: null, to: .62, net: 0 },
      bag: { seed: 29, label: 'a model of a cell', nL: 22, nR: 22, sL: 4, sR: 4, liquid: ['rgba(240,200,120,.42)', 'rgba(205,148,66,.62)'], bag: null, to: .62, net: 0, model: true }
    };
    function make(k) {
      var f = SET[k];
      return Sim.make({ seed: f.seed, w: 2 * LR, h: 2 * LR, margin: 4, hit: true,
        gate: { x: LR, hw: 7, lane: PORE.lane, pass: function (nm, y, dir, q) {
          if (nm !== 'water') return 0;
          var p = PORE.pass(y, dir, q), f2 = SET[k], x = q.crossed('water');
          if (p <= 0 || q !== sims[setup]) return p;
          /* the bag no longer changes: as many water molecules enter it as leave it */
          if (eqBase != null) return Math.abs(x.ab - x.ba - eqBase + dir) > 1 ? -1 : p;
          if (!f2.net) return p;
          /* while it changes: water moves out of a sucrose solution less easily (its lower water potential, as the card on
             water potential says), and the less easily the more sucrose there is, so more water crosses one way, and the counts
             grow with the bag's change, never against it */
          var sOn = q.count('sucrose')[dir > 0 ? 0 : 1];
          if (sOn > 0) p *= 1 - .55 * Math.min(1, sOn / 6);
          if (dir !== f2.net && f2.net * ((x.ab - cnt.ab) - (x.ba - cnt.ba)) - 1 < Math.floor(el * .4)) return -1;
          return p;
        } },
        kinds: { water: { n: [f.nL, f.nR], speed: 58, tau: .8, through: 46, keep: [f.nL, f.nR - (f.spare || 0)], r: 3.4 }, sucrose: { n: [f.sL, f.sR], speed: 16, tau: .5, r: 9 } } });
    }
    var sims = {};
    function build(k) {
      var f = SET[k], s = make(k);
      /* the water the bag's side will gain waits out of the picture until the solution in the bag becomes more dilute */
      if (f.spare) { var wi = s.kindIx('water'), left = f.spare; for (var q = s.N - 1; q >= 0 && left > 0; q--) if (s.K[q] === wi && s.X[q] >= LR && s.park(q)) left--; }
      return s;
    }
    ['in', 'out', 'same', 'bag'].forEach(function (k) { sims[k] = build(k); });
    /* the bag swells, so the same sucrose is in more water: in the close-up a sucrose molecule leaves at the far edge of the
       bag's side (into the rest of the bag), and two water molecules come in there for each. force: at once (a still) */
    function dilute(force) {
      var f = SET[setup]; if (!f.spare) return false;
      var sm = sims[setup], si = sm.kindIx('sucrose'), wi = sm.kindIx('water'), changed = false;
      var sT = full < .62 ? f.sR : full < .84 ? f.sR - 1 : f.sR - 2, wT = f.nR - f.spare + 2 * (f.sR - sT);
      if (sm.count('sucrose')[1] > sT) {
        /* one that is out of sight (the close-up is round, its box square) goes first, else one at the far edge */
        var best = -1, bx = -1;
        for (var q = 0; q < sm.N; q++) {
          if (sm.K[q] !== si || sm.PK[q] || sm.TR[q] || sm.X[q] < LR) continue;
          var hidden = Math.pow(sm.X[q] - LR, 2) + Math.pow(sm.Y[q] - LR, 2) > Math.pow(LR - 4, 2), sc = sm.X[q] + (hidden ? 1e4 : 0);
          if (sc > bx) { bx = sc; best = q; }
        }
        if (best >= 0 && (force || bx > 1e4 || bx > 2 * LR - 30)) changed = sm.park(best) || changed;
      }
      sm.kinds[wi].keep[1] = wT;
      if (sm.count('water')[1] < wT) for (var q2 = 0; q2 < sm.N; q2++) if (sm.K[q2] === wi && sm.PK[q2]) { changed = sm.unpark(q2, 1) || changed; break; }
      return changed;
    }
    /* the upper edge of the bag, and the middle of its contents, at a distance dx along it */
    function nearI(Pp, dx) { var n = Pp.top.length - 1; return Math.max(0, Math.min(n, Math.round((dx + 107) / 214 * n))); }
    function edgeAt(Pp, dx) { return Pp.top[nearI(Pp, dx)]; }
    function midAt(Pp, dx) { var i = nearI(Pp, dx); return (Pp.top[i][1] + Pp.bot[i][1]) / 2; }
    var scene = {
      W: W, H: H,
      tick: function (dt) {
        full = full < target ? Math.min(target, full + dt / RATE) : Math.max(target, full - dt / RATE);
        el += dt;
        if (settled() && eqBase == null) { var x = sims[setup].crossed('water'); eqBase = x.ab - x.ba; }
        stepN(sims[setup], dt);
        dilute(false);
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
          /* the net movement of water through the wall of the bag (a bag of water never stops losing water) */
          var moving = !settled();
          if (f.net && moving) {
            var dir = f.net;
            [-30, 14, 58].forEach(function (dx) {
              /* each arrow crosses the wall of the bag where the wall is now */
              var top = by + edgeAt(P, dx)[1], y0 = dir > 0 ? top - 34 : top + 5, y1 = dir > 0 ? top + 4 : top - 31;
              D.arrow(c, bx + dx, y0, bx + dx, y1, 7, NET, { head: 12, headW: 10 });
            });
          }
          /* a full, firm bag: the stretched tubing presses on the solution inside, so as many water molecules leave as enter */
          if (setup === 'in' && settled()) {
            [-58, 4, 64].forEach(function (dx) {
              var i = nearI(P, dx), top = by + P.top[i][1], bot = by + P.bot[i][1];
              D.arrow(c, bx + dx, top + 3, bx + dx, top + 22, 6, PRESS, { head: 10, headW: 9 });
              D.arrow(c, bx + dx, bot - 3, bx + dx, bot - 22, 6, PRESS, { head: 10, headW: 9 });
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
          for (var i = 2; i < 2 * LR; i += PER) { c.fillRect(LX - 7, LY - LR + i, 14, BAR); }
          var sm = sims[setup];
          ['sucrose', 'water'].forEach(function (nm) {
            var kk = sm.kindIx(nm);
            for (var q = 0; q < sm.N; q++) if (sm.K[q] === kk && !sm.PK[q]) D.mol(c, nm, LX + LR - sm.X[q], LY - LR + sm.Y[q], sm.A[q], u);
          });
          /* each water molecule passing through a pore is ringed, so the crossings can be seen and compared */
          c.strokeStyle = 'rgba(255,240,190,.95)'; c.lineWidth = 1.4;
          for (var qq = 0; qq < sm.N; qq++) if (sm.TR[qq]) { c.beginPath(); c.arc(LX + LR - sm.X[qq], LY - LR + sm.Y[qq], 6.5, 0, TAU); c.stroke(); }
          /* the net movement through the tubing, the same way as on the bag; once the bag has stopped, equal crossings each way */
          var yA = LY - LR * .6;
          if (!settled() && f.net) {
            if (f.net > 0) D.arrow(c, LX + 60, yA, LX - 60, yA, 10, NET, { head: 15, headW: 12 });
            else D.arrow(c, LX - 60, yA, LX + 60, yA, 10, NET, { head: 15, headW: 12 });
          } else {
            D.arrow(c, LX - 46, yA - 9, LX + 46, yA - 9, 5, WHITE, { head: 11, headW: 8 });
            D.arrow(c, LX + 46, yA + 9, LX - 46, yA + 9, 5, WHITE, { head: 11, headW: 8 });
          }
          c.restore();
          c.beginPath(); c.arc(LX, LY, LR, 0, TAU); c.strokeStyle = 'rgba(232,242,250,.92)'; c.lineWidth = 2.5; c.stroke();
          c.restore();
        });
      },
      labels: function () {
        var bx = B.x + B.w / 2, by = B.y + B.h * .62;
        var inside = setup === 'in' ? 'sucrose solution' : setup === 'out' ? 'water' : 'sucrose solution', around = setup === 'in' ? 'water' : 'sucrose solution';
        var Pn = D.bagPath({ L: 214, r: 42, full: full }), e = edgeAt(Pn, -64), m = midAt(Pn, 16);
        /* a model of a cell: each part named as the part of a cell it represents */
        if (SET[setup].model) {
          var pore = PORES.reduce(function (a, b) { return Math.abs(b - LR * 1.5) < Math.abs(a - LR * 1.5) ? b : a; });
          return [{ id: 'tub', text: 'dialysis tubing: represents the cell membrane', x: bx - 64, y: by + e[1], side: 'T' },
                  { id: 'gap', text: 'close-up of the tubing', x: LX, y: LY - LR + 4, side: 'T' },
                  { id: 'knot', text: 'tied at both ends', x: bx - 110, y: by + Pn.sag(0), side: 'B' },
                  { id: 'pore', text: 'pore: only water molecules pass', x: LX, y: LY - LR + pore, side: 'B' },
                  { id: 'lb', text: 'bag', x: LX - 52, y: LY + LR * .78, side: 'B' },
                  { id: 'lo', text: 'beaker', x: LX + 52, y: LY + LR * .78, side: 'B' }];
        }
        return [{ id: 'tub', text: 'dialysis tubing', x: bx - 64, y: by + e[1], side: 'T' },
                { id: 'gap', text: 'close-up of the tubing', x: LX, y: LY - LR + 4, side: 'T' },
                { id: 'in', text: inside, x: bx + 16, y: by + m, side: 'B' },
                { id: 'ar', text: around, x: B.x + 48, y: B.y + B.h - 22, side: 'B' },
                { id: 'lb', text: 'bag', x: LX - 52, y: LY + LR * .78, side: 'B' },
                { id: 'lo', text: 'beaker', x: LX + 52, y: LY + LR * .78, side: 'B' }];
      },
      read: function (pill) {
        /* the sim's left side is the beaker (the close-up shows it on the right): a crossing to its right is into the bag */
        var x = sims[setup].crossed('water');
        pill('i', String(x.ab - cnt.ab), 'ok'); pill('o', String(x.ba - cnt.ba), 'ok');
        pill('b', full > .8 ? 'firm and swollen' : full < .2 ? (setup === 'out' ? 'soft, still losing water' : 'soft') : !SET[setup].net ? 'not changing' : 'changing', full > .8 ? 'ok' : full < .2 ? 'bad' : 'warn');
      }
    };
    var V = MV({
      scene: scene, liveNames: true, aria: 'A tied bag of dialysis tubing in a beaker. In water a bag of sucrose solution swells and becomes firm; a bag of water in sucrose solution becomes soft.',
      barLabel: 'What is in the bag and the beaker', buttons: [['in', 'Sucrose solution in the bag'], ['out', 'Water in the bag'], ['same', 'The same solution in both']],
      read: [['i', 'Water into the bag:'], ['o', 'Water out of the bag:'], ['b', 'The bag:']],
      /* in this order the key keeps to two rows in the smallest laptop window, the tubing's pressure included */
      key: { all: [['water', 'water molecule'], ['sucrose', 'sucrose molecule'], ['ways', 'crossing each way'], ['net', 'net movement of water'], ['crossing', 'water molecule crossing the tubing'], ['press', 'pressure of the stretched tubing']],
             sets: [['water molecule', 'sucrose molecule', 'water molecule crossing the tubing', 'net movement of water'], ['water molecule', 'sucrose molecule', 'water molecule crossing the tubing', 'crossing each way', 'pressure of the stretched tubing']],
             now: function () {
               var a = ['water molecule', 'sucrose molecule', 'water molecule crossing the tubing'].concat(SET[setup].net && !settled() ? 'net movement of water' : 'crossing each way');
               return setup === 'in' && settled() ? a.concat('pressure of the stretched tubing') : a;
             } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    function show(k, restart) {
      setup = k; V.press(k); target = SET[k].to;
      if (restart !== false) { full = k === 'in' ? .4 : k === 'out' ? .92 : .62; if (SET[k].spare) sims[k] = build(k); }
      /* with Reduce motion, the end of each model: the bag of sucrose solution firm, with its solution as dilute as it gets */
      if (V.isStill()) { full = target; if (SET[k].spare) for (var g = 0; g < 12 && dilute(true); g++); }
      /* the counts start again at each press; the bag that is not changing has its crossings balanced from now */
      /* a molecule already in a pore finishes its crossing: it counts for the time before this press */
      var sm = sims[k], x = sm.crossed('water'), wi = sm.kindIx('water'), tAB = 0, tBA = 0;
      for (var q = 0; q < sm.N; q++) if (sm.K[q] === wi && sm.TR[q]) { if (sm.TR[q] > 0) tAB++; else tBA++; }
      cnt.ab = x.ab + tAB; cnt.ba = x.ba + tBA; eqBase = settled() ? cnt.ab - cnt.ba : null; el = 0;
      V.names(); V.paint();
    }
    return {
      el: V.el, start: function () { V.start(); show(setup, false); }, stop: V.stop,
      say: 'A bag of dialysis tubing, tied at both ends, represents a cell',
      credit: 'Drawn for this lab. In the close-up, water and sucrose molecules are at their true sizes beside each other, the pores are drawn smaller than they really are, and only some of the water molecules are drawn.',
      focus: function (part) { if (SET[part]) show(part); }
    };
  });

  /* ======================================================================= A plant cell and an animal cell */
  Views.add('twocells', function (spec, ctx) {
    var W = 560, H = 330, liquid = 'water', k = 0, foc = null, lastMitos = [], cytI = -1;   /* k: 0 at rest → 1 at the end of the change */
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
          var G = D.plantCell(c, Object.assign({ water: w, sap: clamp((1 - w) * 1.05) }, P)); lastMitos = G.mitos;
          if (G.pl > .001) {
            c.save(); D.polyPath(c, G.inner); c.clip();
            c.beginPath();
            G.inner.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath();
            G.mem.slice().reverse().forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath();
            var sg = c.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, wet ? C.dilute[0] : C.conc[0]); sg.addColorStop(1, wet ? C.dilute[1] : C.conc[1]);
            c.fillStyle = sg; c.fill('evenodd'); c.restore();
            D.polyPath(c, G.mem); c.strokeStyle = C.memb; c.lineWidth = 1.5; c.stroke();
          }
          /* turgor pressure: the vacuole presses the cytoplasm and the cell membrane on the wall, which stretches a little */
          var tp = wet ? clamp((w - .9) / .08) : 0;
          if (tp > 0) {
            c.globalAlpha = tp;
            [[-1, 0], [1, 0], [0, -1], [0, 1], [-.72, -.72], [.72, -.72], [-.72, .72], [.72, .72]].forEach(function (q) {
              D.arrow(c, P.x + q[0] * P.a * .42, P.y + q[1] * P.b * .42, P.x + q[0] * (G.ao - 14), P.y + q[1] * (G.bo - 14), 6, '#B7193F', { head: 11, headW: 8, halo: 'rgba(255,255,255,.75)' });
            });
            c.globalAlpha = 1;
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
        var a = animal(), G = D.plantGeom(Object.assign({ water: plantWater() }, P));
        /* each part of the plant cell is named on the part itself, wherever it is now (Daniel, 25 Nov 2026: "the yellow bit is
           not the cytoplasm ... the pink thing is the vacuole ... that's not well labeled") */
        var near = function (pts, xw, up) { var b = null; pts.forEach(function (p) { if ((up ? p[1] < P.y : p[1] > P.y) && (!b || Math.abs(p[0] - xw) < Math.abs(b[0] - xw))) b = p; }); return b; };
        /* the two cells' titles are headings over their cells; the plant cell's membrane is named at its top right corner,
           the outside solution in the space at the top left, beside the nucleus; from below, the wall at its lower left
           corner, the vacuole left of the middle and the cytoplasm at the lower right, clear of the mitochondria (27 Nov
           2026: in a short window four names over the plant cell could not all stand over their own lines, and the
           cytoplasm's line ended on a mitochondrion) */
        var it = [{ id: 'p', text: 'plant cell', x: P.x, y: 6, side: 'T', head: true }];
        /* the cytoplasm: of the places on its lower right, the one whose line, straight down to its name, passes furthest
           from every mitochondrion (they move as the cell changes); the line moves only when another place is clearly better */
        var n = G.mem.length, mid = function (i) { return [(G.mem[i][0] + G.vac[i][0]) / 2, (G.mem[i][1] + G.vac[i][1]) / 2]; };
        var clear = function (i) { var q = mid(i), m = 1e9; lastMitos.forEach(function (o) { m = Math.min(m, o[1] > q[1] - 12 ? Math.abs(o[0] - q[0]) : Math.hypot(o[0] - q[0], o[1] - q[1])); }); return m; };
        var ci = -1, cs = -1;
        for (var i = Math.round(n / 24); i <= Math.round(n / 4); i++) if (mid(i)[0] >= P.x + 35) { var v = clear(i); if (v > cs) { cs = v; ci = i; } }
        if (ci < 0) ci = Math.round(n / 12);
        if (cytI >= 0 && cytI < n && mid(cytI)[0] >= P.x + 35 && clear(cytI) > cs - 3) ci = cytI;
        cytI = ci;
        var pm = near(G.mem, P.x + 85, true), pc = G.mem[ci], pcv = G.vac[ci], pw = near(G.outer, P.x - 100, false);
        it.push({ id: 'pm', text: 'cell membrane', x: pm[0], y: pm[1], side: 'T' });
        it.push({ id: 'pv', text: 'vacuole', x: P.x - 20, y: P.y + 22, side: 'B' });
        it.push({ id: 'pc', text: 'cytoplasm', x: (pc[0] + pcv[0]) / 2, y: (pc[1] + pcv[1]) / 2, side: 'B' });
        it.push({ id: 'pn', text: 'nucleus', x: G.nuc.x, y: G.nuc.y - G.nuc.r * .6, side: 'T' });
        it.push({ id: 'pw', text: 'cell wall', x: pw[0], y: pw[1] - 3, side: 'B' });
        /* when the cell membrane has left the wall, the outside solution in the space between them */
        if (G.pl > .25) { var gi = near(G.inner, P.x - 90, true), gm = near(G.mem, P.x - 90, true); it.push({ id: 'ps', text: 'outside solution', x: gi[0], y: (gi[1] + gm[1]) / 2, side: 'T' }); }
        /* the caption says that only one has a cell wall: a name too long for its band is cut, and "cell wall" alone would be false */
        if (a.burst < .5) { it.push({ id: 'a', text: 'animal cell', x: A.x, y: 6, side: 'T', head: true }); it.push({ id: 'am', text: 'cell membrane', x: A.x + 20, y: A.y + A.r * a.swell * .92, side: 'B' }); }
        else it.push({ id: 'a', text: 'the animal cell has burst', x: A.x, y: 6, side: 'T', head: true });
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
      scene: scene, liveNames: true, heads: true, aria: 'A plant cell and an animal cell in the same liquid. In pure water the plant cell becomes turgid and the animal cell swells and bursts; in a concentrated solution the plant cell is plasmolysed and the animal cell shrinks.',
      barLabel: 'The liquid', buttons: [['water', 'In pure water'], ['conc', 'In a concentrated solution']],
      read: [['s', 'Liquid:'], ['p', 'Plant cell:'], ['a', 'Animal cell:']],
      key: { all: [['net', 'net movement of water'], ['press', 'turgor pressure']], sets: [['net movement of water', 'turgor pressure']],
             now: function () { var out = k < 1 ? ['net movement of water'] : []; if (liquid === 'water' && plantWater() > .9) out.push('turgor pressure'); return out; } },
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
    var sim = Sim.make({ seed: 9, w: W, h: H, hit: true,
      gate: { x: W / 2, hw: 2.5 * u, pass: function () { return 0; } },
      kinds: { nitrate: { n: [4, 15], speed: 34, tau: .4, r: 6.5 } } });
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
        return [{ id: 'lo', text: 'outside the cell: lower concentration of nitrate ions', x: 104, y: H - 18, side: 'B', cls: 'lb--lo' }, { id: 'hi', text: 'inside the cell: higher concentration of nitrate ions', x: W - 110, y: 18, side: 'T', cls: 'lb--hi' },
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
      /* its two names are the longest of the lab ("inside the cell: higher concentration of nitrate ions"): bands of three
         lines, so they never run over the other names in a small picture */
      scene: scene, lines: 3, aria: 'A protein carrier in a cell membrane moves nitrate ions from the side of lower concentration to the side of higher concentration, using energy from a mitochondrion.',
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
      credit: 'Carrier, ions and membrane at their true sizes beside each other. The mitochondrion is drawn much smaller than it really is.',
      focus: function (part) { if (part === 'def' || part === 'against' || part === 'carrier') { scene.setOn(true); V.press('on'); V.names(); } }
    };
  });

  /* ======================================================================= Root hairs and ions */
  Views.add('roothair', function (spec, ctx) {
    var W = 560, H = 330, mode = 'air', wetK = 0, t = 0, foc = null, r = Sim.rng(5), ions = [], dissolved = [];
    var GRAINS = [[38, 44, 34, 28, .4], [130, 22, 38, 25, 1.2], [230, 58, 32, 27, 2.1], [44, 168, 37, 30, 1.7], [140, 124, 26, 22, .6], [232, 186, 36, 29, 2.8], [60, 288, 42, 30, 1.1], [168, 272, 38, 28, 2.3], [262, 298, 28, 24, 1.9]];
    /* soil water covers every grain and fills the narrow gaps, so the ions are in the WATER; the air spaces are the wide gaps,
       and the oxygen of the air is in them. When the soil is waterlogged, water fills them. [x, y, r, shape] */
    var AIR = [[97, 84, 28, 1], [188, 116, 25, 2.2], [102, 226, 30, 3.4], [200, 232, 24, 4.6]];
    function clear(x, y) {
      return GRAINS.every(function (g) { var dx = (x - g[0]) / (g[2] + 7), dy = (y - g[1]) / (g[3] + 7); return dx * dx + dy * dy > 1.25; }) &&
             AIR.every(function (b) { var dx = x - b[0], dy = y - b[1], q = b[2] * 1.2 + 8; return dx * dx + dy * dy > q * q; });
    }
    for (var tries = 0; ions.length < 14 && tries < 3000; tries++) {
      var ix0 = 8 + r() * 254, iy0 = 8 + r() * 314;
      if (clear(ix0, iy0)) ions.push({ x: ix0, y: iy0, a: r() * 6, ph: r() * 6, sp: .5 + r() });
    }
    /* inside the cell the nitrate ions are MORE concentrated than in the soil water (about twice as many in the same area):
       that is why the cell needs active transport (an independent review, 25 Nov 2026: the cell held fewer than the soil) */
    var inside = [];
    function inCyto(x, y) {
      var inVac = x > 386 && y > 108 && y < 224, m1 = Math.hypot(x - 444, y - 84) < 54, m2 = Math.hypot(x - 492, y - 240) < 52;
      return x > 352 && x < W - 10 && y > 10 && y < H - 10 && !inVac && !m1 && !m2;
    }
    for (var t3 = 0; inside.length < 24 && t3 < 4000; t3++) {
      var jx = 352 + r() * 200, jy = 10 + r() * 310;
      if (inCyto(jx, jy) && inside.every(function (q) { return Math.hypot(q.x - jx, q.y - jy) > 22; })) inside.push({ x: jx, y: jy, a: r() * 6, ph: r() * 6, sp: .5 + r() });
    }
    /* a little oxygen stays dissolved in the water */
    for (var t2 = 0; dissolved.length < 3 && t2 < 900; t2++) {
      var ox = 12 + r() * 246, oy = 12 + r() * 306;
      if (clear(ox, oy) && ions.every(function (q) { return Math.abs(q.x - ox) + Math.abs(q.y - oy) > 26; })) dissolved.push({ x: ox, y: oy, ph: r() * 6 });
    }
    function pocket(c, b, k) {
      var pts = [];
      for (var i = 0; i < 18; i++) {
        var th = i / 18 * TAU, f = 1 + .13 * Math.sin(th * 3 + b[3]) + .08 * Math.sin(th * 5 + b[3] * 2);
        pts.push([b[0] + b[2] * k * f * Math.cos(th), b[1] + b[2] * k * .88 * f * Math.sin(th)]);
      }
      D.polyPath(c, pts); c.fillStyle = '#12222F'; c.fill(); c.strokeStyle = 'rgba(205,232,250,.8)'; c.lineWidth = 1.3; c.stroke();
    }
    var GATES = [62, 132, 202, 272], WATER = [97, 167, 237], W0 = 274, W1 = 286, MC = 313, IN = 340;   /* the wall 274–286, then the membrane, 286–340, which holds the carriers and the water channels */
    var scene = {
      W: W, H: H,
      tick: function (dt) {
        t += dt;
        var aim = mode === 'wet' ? 1 : 0; wetK = aim > wetK ? Math.min(aim, wetK + dt / 1.4) : Math.max(aim, wetK - dt / 1.4);
      },
      draw: function (c) {
        var wet = mode === 'wet', rate = wet ? .22 : 1;
        /* the card about the root hair shows the whole cell in the soil, as the film of station 2 does, so its shape is seen */
        if (foc === 'hair') { D.frame(c, 0, 0, W, H, 16, function () { D.ground(c, 0, 0, W, H, '#20303A', '#16222C'); MF.soil(c); MF.rootHairCell(c); }); return; }
        D.frame(c, 0, 0, W, H, 16, function () {
          /* the soil: water, the air spaces in it, and the grains */
          D.ground(c, 0, 0, W, H, C.dilute[0], C.dilute[1]);
          c.save(); c.beginPath(); c.rect(0, 0, W0, H); c.clip();
          if (wetK < 1) AIR.forEach(function (b) { pocket(c, b, 1 - wetK); });
          GRAINS.forEach(function (q, gi) { MF.grain(c, q[0], q[1], q[2], q[3], q[4], (gi * .37) % 1); });
          /* oxygen molecules in the air spaces */
          if (wetK < .85) AIR.forEach(function (b, bi) {
            for (var o = 0; o < 3; o++) {
              var th = t * (.5 + o * .13) + o * 2.1 + bi, rr = b[2] * .5 * (1 - wetK);
              D.mol(c, 'oxygen', b[0] + rr * Math.cos(th), b[1] + rr * .8 * Math.sin(th * 1.3), t * .4 + o + bi, 20);
            }
          });
          /* in waterlogged soil only a little oxygen is left, dissolved in the water */
          if (wetK > .5) dissolved.forEach(function (q) { D.mol(c, 'oxygen', q.x + 4 * Math.sin(t * .5 + q.ph), q.y + 4 * Math.cos(t * .4 + q.ph), t * .4 + q.ph, 20); });
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
          /* the nitrate ions already in the cytoplasm */
          inside.forEach(function (q) { D.mol(c, 'nitrate', q.x + 4 * Math.sin(t * q.sp * .6 + q.ph), q.y + 4 * Math.cos(t * q.sp * .5 + q.a), t * .4 + q.a, 20); });
          /* channel proteins: water crosses both ways, and more of it enters, so the net movement is into the cell */
          WATER.forEach(function (y) { D.channel(c, MC, y, 8.8, { hh: 1.3, mouth: .92, pore: .5 }); });
          WATER.forEach(function (y, n) {
            var T = t * .36 + n * .37, p = T % 1, dir = [1, 1, -1][Math.floor(T) % 3], x = dir > 0 ? lerp(W0 - 40, IN + 34, p) : lerp(IN + 34, W0 - 40, p);
            c.globalAlpha = Math.min(1, Math.min(p * 6, (1 - p) * 6));
            D.mol(c, 'water', x, y, t + n, 20);
            c.globalAlpha = 1;
          });
          /* protein carriers in the membrane: each ion is in the pocket before the carrier turns, and leaves after it */
          GATES.forEach(function (gy, n) {
            var p = ((t * rate * .42 + n * .27) % 1);
            c.save(); c.translate(MC, gy);
            D.carrier(c, 0, 0, 8.8, ease(seg(p, .3, .5)) * (1 - ease(seg(p, .74, .95))), 0);
            c.restore();
            var ix = p < .28 ? lerp(W0 - 44, MC, ease(seg(p, 0, .28))) : p < .52 ? MC : lerp(MC, IN + 40, ease(seg(p, .52, .72)));
            var iy = gy + (p < .52 ? 0 : 8 * Math.sin((p - .52) * 9));
            c.globalAlpha = Math.min(1, Math.min(p / .05, (1 - p) / .05));
            D.mol(c, 'nitrate', ix, iy, t + n, 20);
            c.globalAlpha = 1;
          });
        });
      },
      labels: function () {
        if (foc === 'hair') return [{ id: 'film', text: 'soil water', x: 130, y: 156, side: 'T' }, { id: 'hair', text: 'root hair', x: 240, y: 162, side: 'T' },
          { id: 'cell', text: 'root hair cell', x: 448, y: 96, side: 'T' }, { id: 'air', text: 'air space', x: 34, y: 262, side: 'B' },
          { id: 'nuc', text: 'nucleus', x: 368, y: 214, side: 'B' }, { id: 'vac', text: 'vacuole', x: 470, y: 200, side: 'B' }];
        var it = [{ id: 'car', text: 'protein carrier', x: MC, y: GATES[0] - 16, side: 'T' },
                  { id: 'mi', text: 'mitochondrion', x: 452, y: 72, side: 'T' },
                  { id: 'ion', text: 'soil water', x: 116, y: 322, side: 'B' },
                  { id: 'wall', text: 'cell wall', x: 280, y: 322, side: 'B' },
                  { id: 'mem', text: 'cell membrane', x: MC + 18, y: 322, side: 'B' },
                  { id: 'vac', text: 'vacuole', x: 545, y: 160, side: 'T' }, { id: 'cyt', text: 'cytoplasm', x: 470, y: 304, side: 'B' }];
        it.push(mode === 'air' ? { id: 'air', text: 'air space', x: 97, y: 78, side: 'T' } : { id: 'air', text: 'water fills the air spaces', x: 97, y: 78, side: 'T' });
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
      scene: scene, aria: 'The edge of a root hair cell in the soil. Nitrate ions are dissolved in the soil water and protein carriers move them into the cell. Water enters by osmosis through channel proteins, and mitochondria release energy using oxygen from the air spaces.',
      barLabel: 'The soil', buttons: [['air', 'Soil with air spaces'], ['wet', 'Waterlogged soil']],
      read: [['o', 'Oxygen in the soil:'], ['r', 'Respiration:'], ['i', 'Ions absorbed:']],
      key: { all: [['nitrate', 'nitrate ion'], ['water', 'water molecule'], ['oxygen', 'oxygen molecule'], ['channel', 'channel protein for water']],
             sets: [['nitrate ion', 'water molecule', 'oxygen molecule', 'channel protein for water']],
             now: function () { return foc === 'hair' ? [] : ['nitrate ion', 'water molecule', 'oxygen molecule', 'channel protein for water']; } },
      onButton: function (id) { mode = id; settle(); V.press(id); V.names(); V.paint(); if (id === 'wet') ctx.pick('oxygen', { stay: true }); }
    });
    /* with Reduce motion nothing moves, so the state shows at once */
    function settle() { if (V.isStill()) wetK = mode === 'wet' ? 1 : 0; }
    var EDGE = ['The edge of a root hair cell: soil, cell wall and cell membrane', 'Drawn for this lab. The ions, carriers and mitochondria are drawn much larger than they really are beside the cell, and the cell wall much thinner.'],
        WHOLE = ['A root hair cell in the soil: the root hair gives a large surface area', 'Drawn for this lab.'];
    var api = {
      el: V.el, start: function () { V.start(); V.press(mode); V.names(); }, stop: V.stop,
      say: EDGE[0], credit: EDGE[1],
      focus: function (part) {
        foc = part || null; if (part === 'oxygen') { mode = 'wet'; V.press('wet'); } else { mode = 'air'; V.press('air'); } settle();
        var cap = foc === 'hair' ? WHOLE : EDGE; api.say = cap[0]; api.credit = cap[1]; if (ctx.caption) ctx.caption();
        V.names(); V.paint();
      }
    };
    return api;
  });

  /* ======================================================================= The three compared */
  Views.add('compare', function (spec, ctx) {
    var W = 560, H = 340, u = 26, mode = 'diff', CH = Sim.channels(MF.lanes(H), 17, .02, 16, .5);
    var sims = {
      diff: Sim.make({ seed: 1, w: W, h: H, hit: true, gate: { x: W / 2, hw: 2.5 * u, pass: function () { return .4; } },
        kinds: { oxygen: { n: [34, 8], speed: 62, tau: .8, through: 56, keep: [34, 8], r: 5 } } }),
      osmo: Sim.make({ seed: 16, w: W, h: H, hit: true, gate: { x: W / 2, hw: 2.5 * u, lane: CH.lane, pass: function (k, y, dir, q) { return k === 'water' ? CH.pass(y, dir, q) : 0; } },
        kinds: { water: { n: [60, 28], speed: 56, tau: .8, through: 118, keep: [60, 28], r: 5.4 }, sucrose: { n: [3, 15], speed: 22, tau: .5, r: 14 } } })
    };
    var car = carrierScene();
    var TXT = {
      diff: { n: 'Net movement of oxygen', l: 'higher concentration of oxygen', r: 'lower concentration of oxygen', lc: 'lb--hi', rc: 'lb--lo', e: 'no', m: 'oxygen' },
      osmo: { n: 'Net movement of water', l: 'higher water potential', r: 'lower water potential', e: 'no', m: 'water' },
      actv: { n: 'Movement of nitrate ions', l: 'lower concentration of nitrate ions', r: 'higher concentration of nitrate ions', lc: 'lb--lo', rc: 'lb--hi', e: 'yes', m: 'nitrate ions' }
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
          if (mode === 'osmo') CH.lines.forEach(function (y) { D.channel(c, W / 2, y, u); });
          molsBy(c, s, u, mode === 'osmo' ? ['sucrose', 'water'] : ['oxygen']);
          D.arrow(c, W / 2 - 112, 40, W / 2 + 112, 40, 15, NET, { head: 22, headW: 18 });
        });
      },
      labels: function () {
        var f = TXT[mode];
        var it = [{ id: 'l', text: f.l, x: 104, y: H - 18, side: 'B', cls: f.lc }, { id: 'r', text: f.r, x: W - 104, y: mode === 'actv' ? 40 : H - 18, side: mode === 'actv' ? 'T' : 'B', cls: f.rc },
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
      key: { all: [['oxygen', 'oxygen molecule'], ['water', 'water molecule'], ['sucrose', 'sucrose molecule'], ['channel', 'channel protein for water'], ['nitrate', 'nitrate ion'], ['energy', 'energy from respiration'],
                   ['net', 'net movement'], ['net', 'net movement of water'], ['net', 'movement against the gradient']],
             sets: [['oxygen molecule', 'net movement'], ['water molecule', 'sucrose molecule', 'channel protein for water', 'net movement of water'], ['nitrate ion', 'energy from respiration', 'movement against the gradient']],
             now: function () { return this.sets[mode === 'diff' ? 0 : mode === 'osmo' ? 1 : 2]; } },
      onButton: function (id) { ctx.pick(id, { stay: true }); }
    });
    function show(m) { mode = m; if (V.isStill()) { if (m === 'actv') { var a = 60 * 8; while (a-- > 0) car.tick(1 / 60); } else if (sims[m].t < 8) { var n = 60 * 10; while (n-- > 0) sims[m].step(); } } V.press(m); V.names(); V.paint(); }
    return {
      el: V.el, start: function () { V.start(); show(mode); }, stop: V.stop,
      say: 'One membrane, three ways across it',
      credit: 'Drawn for this lab. Only some of the water molecules are drawn, and the mitochondrion is drawn much smaller than it really is.',
      focus: function (part) { if (part) show(part); }
    };
  });
})(window);
