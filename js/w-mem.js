/* ============================================================
   w-mem.js — the Membrane Lab's five step animations, and the plant that wilts.

   Each step's words are in parts with their level (the Inheritance Lab's rule): IGCSE lines first; IB lines name their
   statement of the IB Biology guide (2025) in a comment; Beyond lines are in neither syllabus.
   Every process here is true at every frame:
   - particles keep moving at equilibrium, and a net movement is only ever the difference of two counted movements;
   - the two regions compared are always equal volumes;
   - sizes at the membrane are true relative to each other (js/mem-draw.js);
   - only some of the water molecules are drawn at the membrane (liquid water fills the whole space), and the keys say so.
   ============================================================ */
(function (global) {
  'use strict';
  var L = global.CircLearn, K = global.WKit, D = global.MemDraw, Sim = global.MemSim, Film = global.MemFilm;
  if (!L || !K || !D || !Sim || !Film) return;
  var seg = D.seg, ease = D.ease, lerp = D.lerp, clamp = D.clamp, C = D.C;

  /* every particle of a simulation, kind by kind, so a small one is never hidden under a large one */
  function molsBy(c, s, u, order) {
    order.forEach(function (nm) { var k = s.kindIx(nm); for (var i = 0; i < s.N; i++) if (s.K[i] === k) D.mol(c, nm, s.X[i], s.Y[i], s.A[i], u); });
  }
  function scene(sim, rules, o) {
    var tr = Sim.Track(sim, rules);
    return Object.assign({ W: sim.w, H: sim.h, seek: function (t) { tr.seek(t); }, to: function (t) { tr.to(t); }, idle: function (d) { tr.idle(d); } }, o);
  }
  var WHITE = '#FFFFFF', NET = '#FFF3C4';
  /* free ions move round the protein carrier and the mitochondrion, never over them, so a pupil can see which ion the
     carrier holds: a particle that enters either shape is put back on its edge */
  function keepClear(cx, cy, u, E) {
    var ax = 3.45 * u, ay = 2.9 * u;
    return function (s) {
      for (var i = 0; i < s.N; i++) {
        var dx = s.X[i] - cx, dy = s.Y[i] - cy, q = dx * dx / (ax * ax) + dy * dy / (ay * ay);
        if (q < 1 && q > 0) { var f = 1 / Math.sqrt(q); s.X[i] = cx + dx * f; s.Y[i] = cy + dy * f; s.VX[i] = Math.abs(s.VX[i]) * (dx < 0 ? -1 : 1); s.VY[i] = Math.abs(s.VY[i]) * (dy < 0 ? -1 : 1); }
        if (E) {
          var ex = s.X[i] - E.x, ey = s.Y[i] - E.y, d2 = ex * ex + ey * ey;
          if (d2 < E.r * E.r && d2 > 0) { var g = (E.r + 1) / Math.sqrt(d2); s.X[i] = E.x + ex * g; s.Y[i] = E.y + ey * g; s.VX[i] = -Math.abs(s.VX[i]); s.VY[i] = -Math.abs(s.VY[i]); }
        }
      }
    };
  }

  /* ==================================================================================== 1. Diffusion, step by step */
  L.add('diffusionfilm', Film({
    title: 'Diffusion, step by step',
    aria: 'Scent particles and air particles move at random in two boxes of equal volume. A divider is lifted, the scent spreads, and the two concentrations become equal.',
    pills: [['l', 'Left box:', 'scent', 'scent particles'], ['r', 'Right box:', 'scent', 'scent particles'], ['n', 'Net movement:']],
    key: [['scent', 'scent particle'], ['air', 'air particle'], ['net', 'net movement', [2]], ['ways', 'crossing each way', [3]]],
    M: [0, 6, 11, 21, 31],
    steps: [
      { t: 0, h: 'Particles move at random', p: [['ig', 'The two boxes have the **same volume**. Every particle moves in a straight line until it hits something, then moves in a new direction. This is **random movement**. Follow the ringed particle.']] },
      { t: 6, h: 'The divider is lifted', p: [['ig', 'All the scent particles are in the left box: its **concentration** of scent is higher. The divider rises, and now particles can cross **in both directions**.']] },
      { t: 11, h: 'More cross one way', p: [['ig', 'More scent particles cross from left to right than from right to left, because more are on the left. Look at the counts: the left box loses particles, and the right box gains them. This is a **net movement** down the **concentration gradient**: **diffusion**.']] },
      { t: 21, h: 'Equilibrium', p: [['ig', 'The concentrations are now **equal**. The particles do not stop: they keep moving, and equal numbers cross each way, so the **net movement is zero**. The counts change a little at each moment, because the movement is random.'], ['bey', 'The air particles diffused too, the opposite way.']] }
    ],
    make: function () {
      var W = 560, H = 330, dv = { r: 0, bal: false };
      var sim = Sim.make({
        seed: 31, w: W, h: H,
        gate: { x: W / 2, hw: 3, pass: function (k, y, dir, s) {
          if (y < H - dv.r) return 0;
          if (!s.holdAllows(k, dir)) return 0;   /* while a step waits, what it shows remains */
          if (!dv.bal) return 1;
          /* a few dozen particles swing far more than the billions in real air: once the two sides are about equal,
             a crossing that would take them further apart is turned back, so the counts stay within 2 of each other */
          var n = s.side[s.kindIx(k)], from = dir > 0 ? n[0] : n[1], to = dir > 0 ? n[1] : n[0];
          return from > to ? 1 : from === to ? .5 : 0;
        } },
        kinds: { air: { n: [14, 40], speed: 116, tau: .9 }, scent: { n: [26, 0], speed: 116, tau: .9 } }
      });
      var ringI = sim.kinds[0].n[0] + sim.kinds[0].n[1];   /* the first scent particle */
      /* the ringed particle's path, and the moment it last changed direction: the ring pulses as it hits something */
      var vx0 = 0, vy0 = 0, hitAt = -9;
      sim.onMove = function (s) {
        s.trail.push(s.X[ringI], s.Y[ringI]); if (s.trail.length > 150) s.trail.splice(0, 2);
        if (s.VX[ringI] !== vx0 || s.VY[ringI] !== vy0) { vx0 = s.VX[ringI]; vy0 = s.VY[ringI]; hitAt = s.t; }
      };
      var reset0 = sim.reset; sim.reset = function () { reset0.call(sim); vx0 = vy0 = 0; hitAt = -9; };
      function rules(t, s) {
        dv.r = (H + 10) * ease(seg(t, 6.8, 9.6));
        if (t < 12) dv.bal = false;
        else if (!dv.bal) { var n = s.count('scent'); if (Math.abs(n[0] - n[1]) <= 2) dv.bal = true; }
      }
      return scene(sim, rules, {
        draw: function (c, t) {
          D.frame(c, 0, 0, W, H, 16, function () {
            D.ground(c, 0, 0, W, H, C.air1, C.air0);
            /* the two equal volumes, marked on the ground */
            c.strokeStyle = 'rgba(190,220,245,.4)'; c.lineWidth = 1; c.setLineDash([3, 5]);
            c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke(); c.setLineDash([]);
            /* the ringed particle's path */
            var ring = clamp(1 - seg(t, 6, 6.7));
            if (ring > 0 && sim.trail.length > 4) {
              c.strokeStyle = 'rgba(255,230,160,' + (.75 * ring).toFixed(3) + ')'; c.lineWidth = 1.5; c.lineJoin = 'round';
              c.beginPath(); for (var i = 0; i < sim.trail.length; i += 2) c[i ? 'lineTo' : 'moveTo'](sim.trail[i], sim.trail[i + 1]); c.stroke();
            }
            molsBy(c, sim, 34, ['air', 'scent']);
            if (ring > 0) {
              var pulse = clamp(1 - (sim.t - hitAt) / .3);
              c.strokeStyle = 'rgba(255,240,190,' + ring.toFixed(3) + ')'; c.lineWidth = 2 + 1.4 * pulse;
              c.beginPath(); c.arc(sim.X[ringI], sim.Y[ringI], 12 + 6 * pulse, 0, D.TAU); c.stroke();
            }
            /* the divider: a plate that lifts straight up, out of the box */
            var by = H - dv.r;
            if (by > -4) {
              var lg = c.createLinearGradient(W / 2 - 4, 0, W / 2 + 4, 0);
              lg.addColorStop(0, '#9FB4C8'); lg.addColorStop(.5, '#E8F1F8'); lg.addColorStop(1, '#8499AE');
              c.fillStyle = lg; c.fillRect(W / 2 - 3.5, -2, 7, by + 2);
              c.fillStyle = '#5E7387'; c.fillRect(W / 2 - 3.5, by - 1.5, 7, 2);
            }
            /* the net movement */
            var a = seg(t, 12, 13.2) * (1 - seg(t, 21, 21.7));
            if (a > 0) { c.globalAlpha = a; D.arrow(c, W / 2 - 58, H / 2, W / 2 + 62, H / 2, 16, NET, { head: 22, headW: 18 }); c.globalAlpha = 1; }
            var b = seg(t, 22, 23);
            if (b > 0) {
              c.globalAlpha = b;
              D.arrow(c, W / 2 - 46, H / 2 - 18, W / 2 + 46, H / 2 - 18, 7, WHITE, { head: 15, headW: 11 });
              D.arrow(c, W / 2 + 46, H / 2 + 18, W / 2 - 46, H / 2 + 18, 7, WHITE, { head: 15, headW: 11 });
              c.globalAlpha = 1;
            }
          });
        },
        labels: function (t) {
          var it = [];
          if (t < 9.6) it.push({ id: 'dv', text: 'divider', x: W / 2, y: 22, side: 'T' });
          if (t >= 6.2 && t < 21) { it.push({ id: 'hi', text: 'higher concentration', x: W * .25, y: 20, side: 'T' }); it.push({ id: 'lo', text: 'lower concentration', x: W * .75, y: 20, side: 'T' }); }
          if (t >= 21) { it.push({ id: 'hi', text: 'equal concentration', x: W * .25, y: 20, side: 'T' }); it.push({ id: 'lo', text: 'equal concentration', x: W * .75, y: 20, side: 'T' }); }
          return it;
        },
        read: function (t, pill) {
          var n = sim.count('scent'), x = sim.crossed('scent');
          pill('l', String(n[0]), n[0] > n[1] + 3 ? 'warn' : 'ok');
          pill('r', String(n[1]), n[0] > n[1] + 3 ? 'warn' : 'ok');
          pill('n', t < 9 ? 'none yet' : t >= 21 ? 'about zero now' : '→ ' + Math.max(0, x.net) + (x.net === 1 ? ' particle' : ' particles') + ' so far', t >= 21 ? 'ok' : 'warn');
        }
      });
    }
  }));

  /* ==================================================================================== 2. From a cell to its membrane
     The camera goes from the whole root hair cell to its tip, and a close-up of the cell membrane grows out of that spot
     (memory: a close-up is a window in the wider picture). The tip's membrane is upright there, as it is in the close-up:
     the soil is on the left and the cytoplasm on the right. */
  var GRAIN = { x: 0, y: 0 }, AIR = { x: 34, y: 262 };
  var SOIL = (function () {
    var r = Sim.rng(19), g = [];
    for (var i = 0; i < 46; i++) g.push({ x: r() * 620 - 30, y: r() * 400 - 30, a: 18 + r() * 30, b: 15 + r() * 22, rot: r() * 3, s: r() });
    g = g.filter(function (q) {                                                /* no grain lies across the root hair */
      return !(q.y > 118 && q.y < 222 && q.x > 40) && !(q.x > 320 && q.y > 70 && q.y < 270);
    });
    /* a whole grain in the lower half, to name */
    var nm = g.filter(function (q) { return q.y > 245 && q.y < 310 && q.x > 150 && q.x < 330; })[0] || g[0];
    GRAIN.x = nm.x; GRAIN.y = nm.y;
    return g;
  })();
  function soil(c) { SOIL.forEach(function (q) { grain(c, q.x, q.y, q.a, q.b, q.rot, q.s); }); }
  /* a soil grain: a smooth rounded stone, lit from the upper left, with the thin film of soil water round it */
  function grain(c, x, y, a, b, rot, s) {
    var pts = [], n = 14;
    for (var i = 0; i < n; i++) {
      var th = i / n * D.TAU, f = 1 + .1 * Math.sin(i * 2.3 + s * 9) + .07 * Math.sin(i * 4.1 + s * 5);
      pts.push([a * f * Math.cos(th), b * f * Math.sin(th)]);
    }
    c.save(); c.translate(x, y); c.rotate(rot);
    D.polyPath(c, pts.map(function (p) { return [p[0] * 1.09, p[1] * 1.12]; }));
    c.fillStyle = 'rgba(120,200,240,.34)'; c.fill();
    c.rotate(-rot);
    var lg = c.createRadialGradient(-a * .38, -b * .42, 2, 0, 0, Math.max(a, b) * 1.25);
    lg.addColorStop(0, s > .5 ? '#C4A684' : '#AE9070'); lg.addColorStop(.55, s > .5 ? '#8E7053' : '#7E6248'); lg.addColorStop(1, '#4D3A2A');
    c.rotate(rot);
    D.polyPath(c, pts); c.fillStyle = lg; c.fill();
    c.strokeStyle = 'rgba(40,28,18,.55)'; c.lineWidth = .8; c.stroke();
    c.restore();
  }
  /* a root hair cell: the body at the right, the hair running left, its tip at the left. o: { glowM } */
  function rootHairCell(c, o) {
    o = o || {};
    var x0 = 346, y0 = 92, w = 200, h = 150, hy = 170, tip = 92, hr = 11;
    function outline(k) {
      /* the hair and the body as one outline; k insets it (the wall, then the membrane) */
      var r = Math.max(2, hr - k);
      c.beginPath();
      c.moveTo(tip + r + k, hy - r);
      c.lineTo(x0 + k - 26, hy - r);
      c.quadraticCurveTo(x0 + k, hy - r - 2, x0 + k, hy - r - 26);
      c.lineTo(x0 + k, y0 + k + 16);
      c.quadraticCurveTo(x0 + k, y0 + k, x0 + k + 16, y0 + k);
      c.lineTo(x0 + w - k - 16, y0 + k);
      c.quadraticCurveTo(x0 + w - k, y0 + k, x0 + w - k, y0 + k + 16);
      c.lineTo(x0 + w - k, y0 + h - k - 16);
      c.quadraticCurveTo(x0 + w - k, y0 + h - k, x0 + w - k - 16, y0 + h - k);
      c.lineTo(x0 + k + 16, y0 + h - k);
      c.quadraticCurveTo(x0 + k, y0 + h - k, x0 + k, y0 + h - k - 16);
      c.lineTo(x0 + k, hy + r + 26);
      c.quadraticCurveTo(x0 + k, hy + r + 2, x0 + k - 26, hy + r);
      c.lineTo(tip + r + k, hy + r);
      c.arc(tip + r + k, hy, r, Math.PI / 2, Math.PI * 1.5);
      c.closePath();
    }
    outline(0);
    var lg = c.createLinearGradient(tip, y0, x0 + w, y0 + h); lg.addColorStop(0, C.wall0); lg.addColorStop(1, C.wall1);
    c.fillStyle = lg; c.fill(); c.strokeStyle = C.wallLo; c.lineWidth = 1; c.stroke();
    outline(4);
    var cg = c.createLinearGradient(0, y0, 0, y0 + h); cg.addColorStop(0, C.cyto0); cg.addColorStop(1, C.cyto1);
    c.fillStyle = cg; c.fill(); c.strokeStyle = C.memb; c.lineWidth = 1.3; c.stroke();
    /* the vacuole, the nucleus, the mitochondria */
    D.rr(c, x0 + 34, y0 + 26, w - 62, h - 56, 26);
    var vg = c.createLinearGradient(0, y0 + 26, 0, y0 + h - 30); vg.addColorStop(0, C.sap0); vg.addColorStop(1, C.sap1);
    c.fillStyle = vg; c.fill(); c.strokeStyle = 'rgba(120,48,92,.75)'; c.lineWidth = 1; c.stroke();
    var nx = x0 + 22, ny = y0 + h - 30, nr = 15;
    var ng = c.createRadialGradient(nx - 4, ny - 5, 1, nx, ny, nr); ng.addColorStop(0, C.nuc0); ng.addColorStop(1, C.nuc1);
    c.fillStyle = ng; c.beginPath(); c.arc(nx, ny, nr, 0, D.TAU); c.fill(); c.strokeStyle = C.nucLo; c.lineWidth = 1; c.stroke();
    [[x0 + 62, y0 + 15, 0], [x0 + 120, y0 + 14, .2], [x0 + w - 16, y0 + 56, 1.5], [x0 + w - 44, y0 + h - 13, .1], [x0 + 92, y0 + h - 13, -.1], [210, hy, 0]].forEach(function (m) { D.mito(c, m[0], m[1], 21, 9, m[2], o.glowM || 0); });
  }
  L.add('zoomfilm', Film({
    title: 'From a cell to its membrane',
    aria: 'A root hair cell in the soil. The view zooms to the tip of the root hair and then to its cell membrane, where oxygen molecules cross in both directions.',
    pills: [['w', 'Width of this view:'], ['i', 'Oxygen into the cell:'], ['o', 'Oxygen out of the cell:']],
    key: [['oxygen', 'oxygen molecule', [1, 2, 3]], ['lipid', 'lipid of the cell membrane', [1, 2, 3]], ['ways', 'crossing each way', [2, 3]], ['net', 'net movement', [2, 3]]],
    M: [0, 6, 13, 24, 34],
    steps: [
      { t: 0, h: 'A root hair cell in the soil', p: [['ig', 'This **root hair cell** is alive and **respiring**, so it needs **oxygen**. The air spaces between the soil grains hold oxygen.']] },
      { t: 6, h: 'Closer: the cell membrane', p: [['ig', 'The picture now shows the tip of the **root hair**. The **cell wall** lets oxygen through. The thin layer inside the wall is the **cell membrane**, two layers of lipid molecules.']] },
      { t: 13, h: 'Oxygen crosses both ways', p: [['ig', 'Oxygen molecules pass between the lipids **in both directions**. There are more outside the cell, so more cross **into the cell** than out of it.'], ['ib', 'Small, uncharged molecules such as oxygen cross the lipid bilayer by simple diffusion.']] },
      { t: 24, h: 'Respiration keeps the gradient', p: [['ig', 'A **mitochondrion** uses oxygen in **respiration**, so the concentration inside the cell remains **lower** than outside. The **concentration gradient** remains and the net movement continues.']] }
    ],
    make: function () {
      var W = 560, H = 330, u = 26, FX = 96, FY = 170, E = { x: W + 120, y: H + 96, r: 300 }, base = { ab: 0, ba: 0, on: false };
      var sim = Sim.make({
        seed: 6, w: W, h: H,
        gate: { x: W / 2, hw: 2.5 * u, pass: function () { return .4; } },
        kinds: { oxygen: { n: [34, 7], speed: 62, tau: .8, through: 56, keep: [34, 99] } }
      });
      /* the mitochondrion uses oxygen: a molecule that reaches it is gone, and another enters at the far edge of the soil air */
      sim.onMove = function (s) {
        for (var i = 0; i < s.N; i++) {
          if (s.TR[i] || s.X[i] < W / 2) continue;
          var dx = s.X[i] - E.x, dy = s.Y[i] - E.y;
          if (dx * dx + dy * dy < E.r * E.r) {
            s.side[0][1]--; s.side[0][0]++;
            s.X[i] = 6; s.Y[i] = 10 + s.r() * (H - 20); s.VX[i] = Math.abs(s.VX[i]);
          }
        }
      };
      /* the counters start at zero when the step about crossing starts */
      function rules(t, s) {
        if (t < 13) base.on = false;
        else if (!base.on) { var x = s.crossed('oxygen'); base.ab = x.ab; base.ba = x.ba; base.on = true; }
      }
      function cam(t) { return ease(seg(t, 6.2, 9.4)); }
      function lens(t) { return ease(seg(t, 10.8, 12.8)); }
      return scene(sim, rules, {
        draw: function (c, t) {
          D.frame(c, 0, 0, W, H, 16, function () {
            /* the camera moves so that the tip of the hair travels steadily to the middle of the picture */
            var k = cam(t), l = lens(t), z = Math.pow(5.2, k), ox = lerp(FX, W / 2, k) - FX * z, oy = lerp(FY, H / 2, k) - FY * z;
            /* the whole cell in the soil, as the camera moves in */
            if (l < 1) {
              c.save();
              D.ground(c, 0, 0, W, H, '#20303A', '#16222C');
              c.translate(ox, oy); c.scale(z, z);
              soil(c); rootHairCell(c);
              c.restore();
            }
            /* the close-up grows out of the spot on the membrane */
            if (l > 0) {
              c.save();
              c.beginPath(); c.arc(W / 2, H / 2, lerp(4, Math.sqrt(W * W + H * H) / 2 + 4, l), 0, D.TAU); c.clip();
              /* outside the cell, the cell wall, then the membrane and the cytoplasm */
              D.ground(c, 0, 0, W / 2, H, '#1B2C3A', '#13212C');
              D.wallBand(c, W / 2 - 136, W / 2 - 66, 0, H);
              D.ground(c, W / 2, 0, W / 2, H, C.cytoDark[0], C.cytoDark[1]);
              D.mitoEdge(c, E, seg(t, 24.6, 26));
              D.bilayer(c, W / 2, 0, H, u);
              molsBy(c, sim, u, ['oxygen']);
              if (l < 1) { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(W / 2, H / 2, lerp(4, Math.sqrt(W * W + H * H) / 2 + 4, l), 0, D.TAU); c.stroke(); }
              c.restore();
            }
            /* first the crossings each way, then what is left of them: the net movement */
            var w = seg(t, 13.4, 14.2);
            if (w > 0) {
              c.globalAlpha = w;
              D.arrow(c, W / 2 - 112, 32, W / 2 + 112, 32, 9, WHITE, { head: 14, headW: 11 });
              D.arrow(c, W / 2 + 112, 60, W / 2 - 112, 60, 4, WHITE, { head: 10, headW: 7 });
              c.globalAlpha = 1;
            }
            var a = seg(t, 15, 16.4);
            if (a > 0) {
              c.globalAlpha = a;
              D.arrow(c, W / 2 - 112, 96, W / 2 + 112, 96, 15, NET, { head: 22, headW: 18 });
              c.globalAlpha = 1;
            }
          });
        },
        labels: function (t) {
          var it = [];
          if (t < 6.2) {
            it.push({ id: 'hair', text: 'root hair', x: 240, y: 162, side: 'T' });
            it.push({ id: 'cell', text: 'root hair cell', x: 448, y: 96, side: 'T' });
            it.push({ id: 'soil', text: 'soil grain', x: GRAIN.x, y: GRAIN.y, side: 'B' });
            it.push({ id: 'air', text: 'air space, with oxygen', x: AIR.x, y: AIR.y, side: 'B' });
          }
          /* the camera has stopped: the two layers at the tip of the hair are named before the close-up opens */
          if (t >= 9.4 && t < 10.9) {
            var zz = 5.2, xx = W / 2 - FX * zz, yy = H / 2 - FY * zz;
            it.push({ id: 'wall', text: 'cell wall', x: xx + 96.6 * zz, y: yy + 164 * zz, side: 'T' });
            it.push({ id: 'mem', text: 'cell membrane', x: xx + 99.4 * zz, y: yy + 176 * zz, side: 'B' });
          }
          if (t >= 12.1) {
            it.push({ id: 'out', text: 'outside the cell', x: 62, y: H - 18, side: 'B' });
            it.push({ id: 'wall', text: 'cell wall', x: W / 2 - 100, y: H - 18, side: 'B' });
            it.push({ id: 'mem', text: 'cell membrane', x: W / 2, y: 14, side: 'T' });
            it.push({ id: 'in', text: 'cytoplasm', x: W / 2 + 96, y: H - 18, side: 'B' });
          }
          if (t >= 24.4) it.push({ id: 'mito', text: 'mitochondrion', x: 470, y: 232, side: 'T' });
          return it;
        },
        read: function (t, pill) {
          var k = cam(t), l = lens(t), w = l > .5 ? 21 : 240 / Math.pow(5.2, k);
          pill('w', l > .5 ? w + ' nm' : Math.round(w) + ' µm', 'ok');
          var x = sim.crossed('oxygen'), on = t >= 13;
          pill('i', on ? String(x.ab - base.ab) : '–', 'ok');
          pill('o', on ? String(x.ba - base.ba) : '–', 'ok');
        }
      });
    }
  }));

  /* ==================================================================================== 3. Osmosis, step by step */
  L.add('osmosisfilm', Film({
    title: 'Osmosis, step by step',
    aria: 'A partially permeable membrane between a dilute and a concentrated sucrose solution that start with equal volumes. Water molecules cross both ways, more from the dilute side. Sucrose molecules cannot cross.',
    pills: [['a', 'Water crossing →'], ['b', 'Water crossing ←'], ['n', 'Net movement:']],
    key: [['water', 'water molecule'], ['sucrose', 'sucrose molecule'], ['lipid', 'lipid of the membrane'], ['net', 'net movement of water', [2, 3]]],
    notes: [['Only some of the water molecules are drawn: water fills all the space.']],
    M: [0, 7, 14, 24, 32],
    steps: [
      { t: 0, h: 'Two solutions, one membrane', p: [['ig', 'A **partially permeable membrane** separates two solutions that start with **equal volumes**. The left one is **dilute** (few sucrose molecules). The right one is **concentrated** (many).']] },
      { t: 7, h: 'Water passes, sucrose does not', p: [['ig', 'Follow the two ringed molecules. Small **water molecules** pass through the membrane **in both directions**. **Sucrose** molecules are too large: they hit the membrane and move away.']] },
      { t: 14, h: 'More water crosses one way', p: [['ig', 'Look at the counts. More water molecules cross from the **dilute** solution to the **concentrated** solution than the other way. This **net movement of water** is **osmosis**.']] },
      { t: 24, h: 'The words for the exam', p: [['ig', 'The dilute solution has a **higher water potential**. The concentrated solution has a **lower water potential**. Water moves **from higher to lower** water potential.'], ['ib', 'IB Biology compares these solutions as hypotonic and hypertonic.']] }
    ],
    make: function () {
      var W = 560, H = 340, u = 26, base = { ab: 0, ba: 0, on: false };
      var sim = Sim.make({
        seed: 11, w: W, h: H,
        gate: { x: W / 2, hw: 2.5 * u, pass: function (k) { return k === 'water' ? .4 : 0; } },
        kinds: { water: { n: [60, 28], speed: 56, tau: .8, through: 58, keep: [60, 28] }, sucrose: { n: [3, 15], speed: 22, tau: .5 } }
      });
      /* the counters start at zero when the step about crossing starts */
      function rules(t, s) {
        if (t < 7) base.on = false;
        else if (!base.on) { var x = s.crossed('water'); base.ab = x.ab; base.ba = x.ba; base.on = true; }
      }
      /* the two molecules to follow in step 2: one water molecule crosses, one sucrose molecule hits the membrane and moves away */
      function followW(t) { var k = ease(seg(t, 7.8, 12)); return [lerp(W / 2 - 150, W / 2 + 122, k), 92 + 9 * Math.sin(k * 7)]; }
      function followS(t) {
        var a = ease(seg(t, 7.8, 10)), b = ease(seg(t, 10, 12.6));
        return [lerp(lerp(W / 2 + 156, W / 2 + 2.5 * u + 16, a), W / 2 + 150, b), lerp(lerp(262, 240, a), 268, b)];
      }
      return scene(sim, rules, {
        draw: function (c, t) {
          D.frame(c, 0, 0, W, H, 16, function () {
            D.ground(c, 0, 0, W / 2, H, C.dilute[0], C.dilute[1]);
            D.ground(c, W / 2, 0, W / 2, H, C.conc[0], C.conc[1]);
            D.bilayer(c, W / 2, 0, H, u);
            molsBy(c, sim, u, ['sucrose', 'water']);
            var f = seg(t, 7.2, 7.8) * (1 - seg(t, 14, 14.6));
            if (f > 0) {
              var pw = followW(t), ps = followS(t);
              c.globalAlpha = f;
              D.mol(c, 'water', pw[0], pw[1], t * .8, u);
              D.mol(c, 'sucrose', ps[0], ps[1], t * .3, u);
              c.strokeStyle = 'rgba(255,245,200,.95)'; c.lineWidth = 2;
              c.beginPath(); c.arc(pw[0], pw[1], 15, 0, D.TAU); c.stroke();
              c.beginPath(); c.arc(ps[0], ps[1], 24, 0, D.TAU); c.stroke();
              c.globalAlpha = 1;
            }
            var a = seg(t, 15.2, 16.6);
            if (a > 0) { c.globalAlpha = a; D.arrow(c, W / 2 - 110, H / 2, W / 2 + 112, H / 2, 16, NET, { head: 24, headW: 19 }); c.globalAlpha = 1; }
          });
        },
        labels: function (t) {
          var it = [{ id: 'ppm', text: 'partially permeable membrane', x: W / 2, y: 14, side: 'T' }];
          if (t < 24) { it.push({ id: 'l', text: 'dilute solution', x: 104, y: H - 16, side: 'B' }); it.push({ id: 'r', text: 'concentrated solution', x: W - 104, y: H - 16, side: 'B' }); }
          else { it.push({ id: 'l', text: 'dilute: higher water potential', x: 104, y: H - 16, side: 'B' }); it.push({ id: 'r', text: 'concentrated: lower water potential', x: W - 104, y: H - 16, side: 'B' }); }
          return it;
        },
        read: function (t, pill) {
          var x = sim.crossed('water'), on = t >= 7, ab = x.ab - base.ab, ba = x.ba - base.ba, net = ab - ba;
          pill('a', on ? String(ab) : '–', 'ok'); pill('b', on ? String(ba) : '–', 'ok');
          pill('n', on ? (t >= 14 ? '→ ' + Math.max(0, net) + (net === 1 ? ' molecule' : ' molecules') + ' so far' : 'counting') : '–', 'warn');
        }
      });
    }
  }));

  /* ==================================================================================== 4. A plant cell gains and loses water
     One plant cell, seen cut through: turgid in a dilute solution, then flaccid and plasmolysed in a concentrated one, then
     back in a dilute solution. At this scale water molecules are far too small to draw, so the net movement of water is the
     arrows. The cell is a general plant cell (never drawn as an onion cell: memory never-do-the-assessment). */
  function waterIn(t) {
    /* the water in the cell, 1 turgid … 0 fully plasmolysed */
    if (t < 8) return lerp(.72, 1, ease(seg(t, .4, 7.9)));
    if (t < 13) return 1;
    if (t < 21) return lerp(1, .55, ease(seg(t, 13.1, 20.9)));
    if (t < 29) return lerp(.55, .08, ease(seg(t, 21.1, 28.9)));
    return lerp(.08, 1, ease(seg(t, 29.2, 36.9)));
  }
  L.add('plantfilm', Film({
    title: 'A plant cell gains and loses water',
    aria: 'One plant cell in a dilute solution becomes turgid; in a concentrated solution it becomes flaccid and then plasmolysed, with its cell membrane separated from the cell wall; in a dilute solution again it recovers.',
    pills: [['s', 'Solution:'], ['w', 'Net movement of water:'], ['c', 'The cell is:']],
    key: [['net', 'net movement of water', [0, 2, 3, 4]], ['press', 'turgor pressure', [1]]],
    M: [0, 8, 13, 21, 29, 37],
    steps: [
      { t: 0, h: 'In a dilute solution', p: [['ig', 'The solution outside has a **higher water potential** than the cell sap. Water enters the cell by **osmosis**, through the cell membrane, and the **vacuole** swells.']] },
      { t: 8, h: 'Turgid', p: [['ig', 'The cell contents press on the **cell wall**. This **turgor pressure** makes the cell **turgid**. The strong wall resists it, so the cell does not burst.']] },
      { t: 13, h: 'In a concentrated solution: flaccid', p: [['ig', 'The solution now has a **lower water potential** than the cell sap, so water **leaves by osmosis**. The vacuole shrinks, the pressure on the wall is lost, and the cell is **flaccid**.']] },
      { t: 21, h: 'Plasmolysed', p: [['ig', 'More water leaves. The cytoplasm shrinks and the **cell membrane separates from the cell wall**: this is **plasmolysis**. The cell wall lets the **outside solution** through, and the outside solution fills the space.']] },
      { t: 29, h: 'Back in a dilute solution', p: [['ig', 'Water enters by **osmosis** again. The vacuole swells, the cell membrane returns to the wall, and the cell is **turgid** again.']] }
    ],
    make: function () {
      var W = 560, H = 356, cell = { x: W / 2, y: H / 2 + 2, a: 186, b: 128, wall: 9, seed: 3, mitos: 4 }, T = 0;
      function geom(t) { return D.plantGeom(Object.assign({ water: waterIn(t) }, cell)); }
      function conc(t) { return t < 13 ? 0 : t < 13.8 ? seg(t, 13, 13.8) : t < 29 ? 1 : 1 - seg(t, 29, 29.8); }
      /* how wide the space between the cell wall and the cell membrane is, at the place it is named */
      function gapAt(t) {
        var G = geom(t), near = function (pts) { var b = null; pts.forEach(function (p) { if (p[1] > cell.y && (!b || Math.abs(p[0] - cell.x + 120) < Math.abs(b[0] - cell.x + 120))) b = p; }); return b; };
        return near(G.inner)[1] - near(G.mem)[1];
      }
      return {
        W: W, H: H,
        seek: function (t) { T = t; }, to: function (t) { T = t; }, idle: function () {},
        draw: function (c, t) {
          var w = waterIn(t), k = conc(t), top = D.mixHex(C.dilute[0], C.conc[0], k), low = D.mixHex(C.dilute[1], C.conc[1], k);
          D.frame(c, 0, 0, W, H, 16, function () {
            D.ground(c, 0, 0, W, H, top, low);
            var G = D.plantCell(c, Object.assign({ water: w, sap: clamp((1 - w) * 1.05) }, cell));
            /* the solution in the space: it has the colour of the solution outside */
            if (G.pl > .001) {
              c.save();
              D.polyPath(c, G.inner); c.clip();
              c.beginPath();
              /* everything inside the wall that is not the cell: fill with the solution */
              G.inner.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath();
              G.mem.slice().reverse().forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath();
              var sg = c.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, top); sg.addColorStop(1, low);
              c.fillStyle = sg; c.fill('evenodd');
              c.restore();
              D.polyPath(c, G.mem); c.strokeStyle = C.memb; c.lineWidth = 1.6; c.stroke();
            }
            /* the net movement of water: filled arrows across the wall */
            var inA = t < 13 ? seg(t, .3, 1) * (1 - seg(t, 8, 8.5)) : seg(t, 29.2, 29.9), outA = seg(t, 13.1, 13.8) * (1 - seg(t, 29, 29.3));
            [[inA, false], [outA, true]].forEach(function (way) {
              if (way[0] <= 0) return;
              c.globalAlpha = way[0];
              [[-1, -.55], [-1, .55], [1, -.55], [1, .55], [-.45, -1], [.45, -1], [-.45, 1], [.45, 1]].forEach(function (q) {
                var ex = cell.x + q[0] * (cell.a + (Math.abs(q[0]) === 1 ? 2 : 0)), ey = cell.y + q[1] * (cell.b + (Math.abs(q[1]) === 1 ? 2 : 0));
                var nx = Math.abs(q[0]) === 1 ? q[0] : 0, ny = Math.abs(q[1]) === 1 ? q[1] : 0;
                var ox = ex + nx * 42, oy = ey + ny * 34, ix = ex - nx * 4, iy = ey - ny * 4;
                if (way[1]) D.arrow(c, ix, iy, ox, oy, 9, NET, { head: 15, headW: 12 });
                else D.arrow(c, ox, oy, ix, iy, 9, NET, { head: 15, headW: 12 });
              });
              c.globalAlpha = 1;
            });
            /* turgor pressure: pushing outwards from the vacuole to the wall */
            var P = seg(t, 8.4, 9.4) * (1 - seg(t, 13, 13.7));
            if (P > 0) {
              c.globalAlpha = P;
              [[-1, 0], [1, 0], [0, -1], [0, 1], [-.72, -.72], [.72, -.72], [-.72, .72], [.72, .72]].forEach(function (q) {
                var ix = cell.x + q[0] * cell.a * .46, iy = cell.y + q[1] * cell.b * .46, ox = cell.x + q[0] * (cell.a - 13), oy = cell.y + q[1] * (cell.b - 13);
                D.arrow(c, ix, iy, ox, oy, 6, '#B7193F', { head: 12, headW: 9, halo: 'rgba(255,255,255,.75)' });
              });
              c.globalAlpha = 1;
            }
          });
        },
        labels: function (t) {
          var G = geom(t), it = [], o = G.outer, m = G.mem, v = G.vac;
          /* each name on its own part: the wall at the top left, the membrane, the vacuole, the cytoplasm */
          /* the wall and the membrane from above, at the top of the cell; the vacuole and the cytoplasm from below */
          var top = function (ptsL, xWant) { var b = null; ptsL.forEach(function (p) { if (p[1] < cell.y && (!b || Math.abs(p[0] - xWant) < Math.abs(b[0] - xWant))) b = p; }); return b; };
          var bot = function (ptsL, xWant) { var b = null; ptsL.forEach(function (p) { if (p[1] > cell.y && (!b || Math.abs(p[0] - xWant) < Math.abs(b[0] - xWant))) b = p; }); return b; };
          var pw = top(o, cell.x - 110), pm = top(m, cell.x + 118), pc = bot(m, cell.x + 110), pcv = bot(v, cell.x + 110);
          var vx = v.map(function (p) { return p[0]; }), vy = v.map(function (p) { return p[1]; });
          var vx0 = Math.min.apply(null, vx), vx1 = Math.max.apply(null, vx), vy0 = Math.min.apply(null, vy), vy1 = Math.max.apply(null, vy);
          it.push({ id: 'wall', text: 'cell wall', x: pw[0], y: pw[1] + 4, side: 'T' });
          it.push({ id: 'mem', text: 'cell membrane', x: pm[0], y: pm[1], side: 'T' });
          it.push({ id: 'vac', text: 'vacuole', x: lerp(vx0, vx1, .36), y: lerp(vy0, vy1, .72), side: 'B' });
          it.push({ id: 'cyt', text: 'cytoplasm', x: pc[0], y: lerp(pc[1], pcv[1], .5), side: 'B' });
          /* the space between the wall and the membrane is named as soon as it can be seen, and until it closes */
          if (gapAt(t) >= 6) { var qi = bot(G.inner, cell.x - 120), qm = bot(m, cell.x - 120); it.push({ id: 'sol', text: 'outside solution', x: qi[0], y: (qi[1] + qm[1]) / 2, side: 'B' }); }
          /* the solution round the cell */
          it.push({ id: 'out', text: t >= 13 && t < 29 ? 'concentrated solution' : 'dilute solution', x: W - 62, y: 22, side: 'T' });
          return it;
        },
        read: function (t, pill) {
          pill('s', t < 13 ? 'dilute' : t < 29 ? 'concentrated' : 'dilute', t >= 13 && t < 29 ? 'warn' : 'ok');
          pill('w', t < 8 ? 'into the cell' : t < 13 ? 'none' : t < 29 ? 'out of the cell' : 'into the cell', 'ok');
          var w = waterIn(t);
          var pl = gapAt(t) >= 6;
          pill('c', pl ? 'plasmolysed' : w > .97 ? 'turgid' : t < 8 || t >= 29 ? 'gaining water' : w > .6 ? 'losing water' : 'flaccid', pl ? 'bad' : w > .97 ? 'ok' : 'warn');
        }
      };
    }
  }));

  /* ==================================================================================== 5. How a protein carrier works
     One ion, from the side of lower concentration to the side of higher concentration. Each change of the carrier's shape
     uses energy, drawn as light from a mitochondrion. A nitrate ion is the example (0610 names ion uptake by root hairs). */
  L.add('carrierfilm', Film({
    title: 'How a protein carrier works',
    aria: 'A nitrate ion enters a protein carrier from the side of lower concentration. Energy from a mitochondrion changes the shape of the carrier, the ion is released on the side of higher concentration, and the carrier returns to its first shape.',
    pills: [['l', 'Lower concentration side:'], ['r', 'Higher concentration side:']],
    key: [['nitrate', 'nitrate ion'], ['carrier', 'protein carrier'], ['energy', 'energy from respiration', [1]], ['net', 'movement against the gradient', [2]]],
    M: [0, 6, 12, 18, 24],
    steps: [
      { t: 0, h: 'The ion attaches', p: [['ig', 'A **protein carrier** crosses the full width of the cell membrane. Its pocket faces the side of **lower concentration**. Follow the ringed **nitrate ion**: it moves into the pocket and attaches to the carrier.']] },
      { t: 6, h: 'Energy changes its shape', p: [['ig', 'A **mitochondrion** releases **energy from respiration**. This energy changes the **shape** of the carrier, so the pocket now faces the side of **higher concentration**.'], ['ib', 'The immediate source of the energy is ATP, and the protein is called a pump (B2.1.7).']] },
      { t: 12, h: 'The ion is released', p: [['ig', 'The ion leaves the carrier on the side where its concentration is **higher**. It has moved **against the concentration gradient**: this is **active transport**.']] },
      { t: 18, h: 'The carrier resets', p: [['ig', 'The carrier returns to its first shape, ready for the next ion. If **respiration stops**, no energy is released, and active transport stops.']] }
    ],
    make: function () {
      var W = 560, H = 340, u = 26, cx = W / 2, cy = H / 2, E = { x: W + 120, y: H + 96, r: 300 };
      var sim = Sim.make({
        seed: 9, w: W, h: H,
        gate: { x: W / 2, hw: 2.5 * u, pass: function () { return 0; } },
        kinds: { nitrate: { n: [4, 15], speed: 34, tau: .4 } }
      });
      sim.onMove = keepClear(cx, cy, u, E);
      /* cause, then effect: the energy reaches the carrier, and then the carrier changes shape */
      function shape(t) { return ease(seg(t, 8, 10.2)) * (1 - ease(seg(t, 18.6, 21))); }
      function ionPos(t) {
        var ax = cx - 170, ay = cy + 8;
        if (t < 3.6) { var k = ease(seg(t, .5, 3.6)); return [lerp(ax, cx - 2, k), lerp(ay, cy, k)]; }
        if (t < 12.4) return [cx - 2 + 4 * ease(seg(t, 8, 10.2)), cy];
        var q = ease(seg(t, 12.4, 16)), d = Math.max(0, t - 16);
        return [lerp(cx + 2, cx + 168, q) + 14 * Math.sin(d * .6), lerp(cy, cy - 34, q) + 7 * Math.sin((t - 12.4) * 1.4) * q + 12 * Math.sin(d * .45)];
      }
      return scene(sim, null, {
        draw: function (c, t) {
          D.frame(c, 0, 0, W, H, 16, function () {
            D.ground(c, 0, 0, W / 2, H, C.water0, C.water1);
            D.ground(c, W / 2, 0, W / 2, H, C.cytoDark[0], C.cytoDark[1]);
            D.mitoEdge(c, E, seg(t, 6.4, 7.4) * (1 - seg(t, 12, 12.8)));
            D.bilayer(c, W / 2, 0, H, u);
            /* the energy travels from the mitochondrion to the carrier */
            var e = seg(t, 6.6, 7.9);
            if (e > 0 && e < 1) {
              var ex = lerp(430, cx + 20, ease(e)), ey = lerp(270, cy + 14, ease(e));
              c.save(); c.globalCompositeOperation = 'lighter';
              var rg = c.createRadialGradient(ex, ey, 1, ex, ey, 22); rg.addColorStop(0, 'rgba(255,240,170,1)'); rg.addColorStop(.35, 'rgba(255,226,120,.7)'); rg.addColorStop(1, 'rgba(255,226,120,0)');
              c.fillStyle = rg; c.beginPath(); c.arc(ex, ey, 22, 0, D.TAU); c.fill(); c.restore();
            }
            D.carrier(c, cx, cy, u, shape(t), seg(t, 7.9, 8.5) * (1 - seg(t, 12, 12.8)));
            molsBy(c, sim, u, ['nitrate']);
            var p = ionPos(t), ra = 1 - seg(t, 18, 19);
            D.mol(c, 'nitrate', p[0], p[1], t * .6, u);
            if (ra > 0) { c.strokeStyle = 'rgba(255,245,200,' + (.95 * ra).toFixed(3) + ')'; c.lineWidth = 1.6; c.beginPath(); c.arc(p[0], p[1], 15, 0, D.TAU); c.stroke(); }
            /* against the gradient */
            var a = seg(t, 13, 14.2) * (1 - seg(t, 18, 18.6));
            if (a > 0) { c.globalAlpha = a; D.arrow(c, 64, 42, W - 64, 42, 13, NET, { head: 20, headW: 16 }); c.globalAlpha = 1; }
          });
        },
        labels: function (t) {
          var it = [{ id: 'lo', text: 'outside the cell: lower concentration', x: 104, y: H - 18, side: 'B' },
                    { id: 'hi', text: 'inside the cell: higher concentration', x: W - 110, y: 18, side: 'T' },
                    { id: 'mem', text: 'cell membrane', x: W / 2 - 40, y: 14, side: 'T' },
                    { id: 'car', text: 'protein carrier', x: cx - 40, y: cy + 54, side: 'B' }];
          if (t >= 6.2) it.push({ id: 'mi', text: 'mitochondrion', x: 470, y: 250, side: 'B' });
          return it;
        },
        read: function (t, pill) {
          pill('l', (t < 3 ? 5 : 4) + ' ions', 'ok');
          pill('r', (t < 14 ? 15 : 16) + ' ions', 'ok');
        }
      });
    }
  }));

  /* ==================================================================================== the plant that wilts (3.2.6) */
  L.add('seedling', function (spec) {
    var box = L.h('div', 'widget mf-plant');
    box.appendChild(L.head(spec.title || 'Water and a plant’s support', 'Press a button to see the whole plant.', null));
    var row = L.h('div', 'memv__bar');
    var bt1 = L.h('button', 'memv__btn', 'Cells turgid'), bt2 = L.h('button', 'memv__btn', 'Cells flaccid');
    bt1.type = bt2.type = 'button';
    row.appendChild(bt1); row.appendChild(bt2); box.appendChild(row);
    var wrap = L.h('div', 'mf-plant__wrap');
    var cv = document.createElement('canvas'); cv.className = 'mf-plant__cv'; cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'A young plant in a pot. With turgid cells it stands upright; with flaccid cells its stem and leaves droop.');
    wrap.appendChild(cv);
    var note = L.h('p', 'widget__note mf-plant__note');
    wrap.appendChild(note); box.appendChild(wrap);
    var d = 0, target = 0, raf = null;
    function paint() {
      var w = cv.clientWidth || 320, h = cv.clientHeight || 240, dpr = Math.min(2, global.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      var s = Math.min(w / 340, h / 240);
      D.frame(c, 0, 0, w, h, 12, function () { D.ground(c, 0, 0, w, h, '#1E3347', '#142533'); D.seedling(c, w / 2 - 12 * s, h - 58 * s, s, d); });
    }
    function say() {
      note.textContent = target ? 'With flaccid cells, nothing presses on the cell walls, so the stem and the leaves wilt.'
        : 'With turgid cells, the pressure of the water inside the cells presses outwards on the cell walls, so the plant is supported.';
      bt1.setAttribute('aria-pressed', target ? 'false' : 'true'); bt2.setAttribute('aria-pressed', target ? 'true' : 'false');
    }
    function go(v) {
      target = v; say();
      if (L.still()) { d = v; paint(); return; }
      if (raf) return;
      var last = null;
      (function step(ts) {
        if (last == null) last = ts;
        var dt = Math.min(.05, (ts - last) / 1000); last = ts;
        var dir = target > d ? 1 : -1; d = clamp(d + dir * dt / 1.6);
        paint();
        if ((dir > 0 && d < target) || (dir < 0 && d > target)) raf = requestAnimationFrame(step); else { d = target; paint(); raf = null; }
      })(performance.now());
    }
    bt1.addEventListener('click', function () { go(0); });
    bt2.addEventListener('click', function () { go(1); });
    say();
    if (global.ResizeObserver) new ResizeObserver(function () { if (box.isConnected) paint(); }).observe(cv);
    requestAnimationFrame(paint);
    return box;
  });

  global.MemFilms = { molsBy: molsBy, keepClear: keepClear, rootHairCell: rootHairCell, soil: soil, grain: grain };
})(window);
