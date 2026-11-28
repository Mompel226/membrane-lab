/* ============================================================
   mem-sim.js — the particles of the Membrane Lab (Topic 3).

   One rule runs through the whole lab: a net movement is never drawn as particles marching one way. Every particle
   moves AT RANDOM, in both directions, for ever; a net movement is what is left when the crossings each way are
   counted and one is taken from the other (0610 3.1.1). So this file holds a box of particles on random paths, a wall
   (a divider, a doorway or a membrane) that a particle may or may not cross, and the two counters.

   What is true here, and what is simplified (memory biology-before-pedagogy):
   - with `hit` the particles are solid: two never lie over each other, and each moves in a straight line until it hits
     another particle or a wall (Daniel's standard, 23 Nov 2026: show the mechanism). In a gas that is the only change of
     direction (`tau` is huge); in a liquid `tau` stands for the hits from the water molecules that are not drawn;
   - a `lane` of a gate is a channel: a particle that enters it stays on the channel's line until it leaves, in single file;
   - the two sides of the wall are always the SAME volume (memory concentration-pictures-equal-volumes), so the number
     of particles on a side IS its concentration;
   - with `keep` the far edge of each side is open: the rest of the room, the soil or the cytoplasm. A particle that
     meets the far edge of a side holding more than its share leaves there, and one enters at the far edge of the other
     side, so a gradient can last (a tissue keeps its gradients in the same way);
   - the motion is slowed down many millions of times (real gas particles move at about 500 m/s).

   Everything is decided by a seeded random number generator, so the same seed gives the same particles every time, and
   Track can replay any moment (memory headless-raf-animations).
   ============================================================ */
(function (global) {
  'use strict';
  var DT = 1 / 60, TAU = Math.PI * 2;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* o = { seed, w, h,
           gate: { x, hw, pass(kindName, y, dir, sim) → chance of crossing at each meeting with the wall (0: it bounces off a
                   wall; -1: there is no wall there, but this crossing is turned back: it leaves in a new random direction),
                   walk?, y0?, y1?, lane?(y) → the line of the channel at y, or -1 } | null,
                                               (walk: a doorway with depth, y0–y1: inside it a particle goes on moving at
                                                random, so it may come back, and a longer way through takes longer)
           kinds: { name: { n: [left, right], speed, tau, through?, r?, keep? } }, margin?, hit? }
     Without a gate there is one region, and n[0] particles of each kind. */
  function Sim(o) {
    this.o = o; this.w = o.w; this.h = o.h;
    /* thin: a divider with an opening, not a membrane: a particle that may pass goes straight on through, and where the divider
       does not stand (`blocks(y)` false) particles on the two sides meet and hit each other as anywhere else */
    this.gate = o.gate ? { x: o.gate.x, hw: o.gate.hw || 2, pass: o.gate.pass || null, walk: !!o.gate.walk, y0: o.gate.y0, y1: o.gate.y1, lane: o.gate.lane || null,
                           thin: !!o.gate.thin, blocks: o.gate.blocks || null } : null;
    this.names = Object.keys(o.kinds);
    this.kinds = this.names.map(function (k) { return o.kinds[k]; });
    var n = 0, self = this;
    this.kinds.forEach(function (k) { n += k.n[0] + (self.gate ? k.n[1] : 0); });
    this.N = n;
    this.X = new Float32Array(n); this.Y = new Float32Array(n);
    this.VX = new Float32Array(n); this.VY = new Float32Array(n);
    this.A = new Float32Array(n); this.SP = new Float32Array(n);   /* each particle's turn on itself, and how fast */
    this.K = new Uint8Array(n); this.TR = new Int8Array(n);         /* TR: crossing the wall (+1 to the right, -1 to the left) */
    this.LN = new Float32Array(n);                                  /* the channel a crossing particle is in, or -1 */
    this.PK = new Uint8Array(n);                                    /* parked: out of the picture (Sim.prototype.park) */
    this.hit = !!o.hit;
    if (this.hit) {
      /* a grid of cells, so each particle is compared only with those near it */
      this.RK = this.kinds.map(function (k) { return k.r || 0; });
      this.cs = Math.max(10, 2 * Math.max.apply(null, this.RK) + 1);
      this.cols = Math.ceil(o.w / this.cs) + 1; this.rows = Math.ceil(o.h / this.cs) + 1;
      this.head = new Int32Array(this.cols * this.rows); this.next = new Int32Array(n);
    }
    this.heat = 1;                                                  /* how fast all particles move (temperature) */
    this.onMove = null;                                             /* a hook for a scene's own rules */
    this.reset();
  }
  Sim.DT = DT;

  /* the kind's index by name */
  Sim.prototype.kindIx = function (name) { return this.names.indexOf(name); };

  Sim.prototype.reset = function () {
    var r = this.r = rng(this.o.seed), self = this, g = this.gate, m = this.o.margin == null ? 8 : this.o.margin, i = 0;
    this.t = 0;
    this.ab = this.kinds.map(function () { return 0; });            /* crossed left → right */
    this.ba = this.kinds.map(function () { return 0; });            /* crossed right → left */
    this.side = this.kinds.map(function (k) { return [k.n[0], g ? k.n[1] : 0]; });
    this.trail = [];
    this.PK.fill(0);
    this.kinds.forEach(function (k, ki) {
      [0, 1].forEach(function (s) {
        if (s && !g) return;
        var x0 = g ? (s ? g.x + g.hw + m : m) : m, x1 = g ? (s ? self.w - m : g.x - g.hw - m) : self.w - m, y0 = m, y1 = self.h - m;
        for (var c = 0; c < k.n[s]; c++, i++) {
          /* best-candidate sampling: the point farthest from those already placed, so the first frame is evenly spread */
          var bx = 0, by = 0, bd = -1;
          for (var t = 0; t < 10; t++) {
            var x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), d = 1e9;
            for (var j = 0; j < i; j++) { var dx = self.X[j] - x, dy = self.Y[j] - y, q = dx * dx + dy * dy; if (q < d) d = q; }
            if (d > bd) { bd = d; bx = x; by = y; }
          }
          self.X[i] = bx; self.Y[i] = by;
          var a = r() * TAU;
          self.VX[i] = Math.cos(a); self.VY[i] = Math.sin(a);
          self.A[i] = r() * TAU; self.SP[i] = (r() - .5) * 3;
          self.K[i] = ki; self.TR[i] = 0; self.LN[i] = -1;
        }
      });
    });
    if (this.hit) for (var q = 0; q < 16; q++) this.collide();       /* the first frame has no particle over another */
  };

  /* two solid particles that touch push apart, and each turns away. Each keeps its own speed. */
  Sim.prototype.collide = function () {
    var n = this.N, X = this.X, Y = this.Y, VX = this.VX, VY = this.VY, TR = this.TR, K = this.K, RK = this.RK, g = this.gate, PK = this.PK;
    var cs = this.cs, cols = this.cols, rows = this.rows, head = this.head, next = this.next, w = this.w, h = this.h, m = 3, i;
    head.fill(-1);
    for (i = 0; i < n; i++) {
      if (TR[i] || !RK[K[i]] || PK[i]) continue;
      var id = Math.max(0, Math.min(cols - 1, Math.floor(X[i] / cs))) + Math.max(0, Math.min(rows - 1, Math.floor(Y[i] / cs))) * cols;
      next[i] = head[id]; head[id] = i;
    }
    for (i = 0; i < n; i++) {
      if (TR[i] || !RK[K[i]] || PK[i]) continue;
      var ci = Math.max(0, Math.min(cols - 1, Math.floor(X[i] / cs))), cj = Math.max(0, Math.min(rows - 1, Math.floor(Y[i] / cs)));
      for (var b = Math.max(0, cj - 1); b <= Math.min(rows - 1, cj + 1); b++) {
        for (var a = Math.max(0, ci - 1); a <= Math.min(cols - 1, ci + 1); a++) {
          for (var j = head[a + b * cols]; j >= 0; j = next[j]) {
            if (j <= i) continue;
            if (g && (X[i] < g.x) !== (X[j] < g.x) && !(g.thin && g.blocks && !g.blocks((Y[i] + Y[j]) / 2))) continue;   /* the wall stands between them */
            var dx = X[j] - X[i], dy = Y[j] - Y[i], R = RK[K[i]] + RK[K[j]], d2 = dx * dx + dy * dy;
            if (d2 >= R * R) continue;
            var d = Math.sqrt(d2) || .01, ux = d2 ? dx / d : 1, uy = d2 ? dy / d : 0, ov = (R - d) / 2;
            X[i] -= ux * ov; Y[i] -= uy * ov; X[j] += ux * ov; Y[j] += uy * ov;
            var vi = VX[i] * ux + VY[i] * uy, vj = VX[j] * ux + VY[j] * uy;
            if (vi > 0) { VX[i] -= 2 * vi * ux; VY[i] -= 2 * vi * uy; }
            if (vj < 0) { VX[j] -= 2 * vj * ux; VY[j] -= 2 * vj * uy; }
          }
        }
      }
    }
    /* a push never carries a particle out of the box or through the wall */
    for (i = 0; i < n; i++) {
      if (TR[i] || PK[i]) continue;
      if (Y[i] < m) Y[i] = m; else if (Y[i] > h - m) Y[i] = h - m;
      if (X[i] < m) X[i] = m; else if (X[i] > w - m) X[i] = w - m;
      if (g && !(g.thin && g.blocks && !g.blocks(Y[i]))) { var gL = g.x - g.hw, gR = g.x + g.hw; if (X[i] < g.x) { if (X[i] > gL) X[i] = gL; } else if (X[i] < gR) X[i] = gR; }
    }
  };

  /* is there room in this channel for one more particle going this way? It holds one direction at a time, in single file */
  Sim.prototype.laneRoom = function (line, dir, gap) {
    var g = this.gate, ex = dir > 0 ? g.x - g.hw : g.x + g.hw;
    for (var i = 0; i < this.N; i++) if (this.TR[i] && this.LN[i] === line && (this.TR[i] !== dir || Math.abs(this.X[i] - ex) < gap)) return false;
    return true;
  };

  /* A particle taken out of the picture, into the rest of a volume too large to draw, and one put back at the far edge of a
     side. A bag that swells by osmosis holds the same sucrose in more water: fewer sucrose molecules are in a close-up of its
     wall, and more water molecules (the Membrane Lab's tubing, Daniel, 28 Nov 2026: "make sure that the models are correct").
     A parked particle does not move, hit or count. */
  Sim.prototype.park = function (i) {
    if (this.PK[i] || this.TR[i]) return false;
    var g = this.gate, s = g && this.X[i] >= g.x ? 1 : 0;
    this.PK[i] = 1; this.side[this.K[i]][s]--;
    return true;
  };
  Sim.prototype.unpark = function (i, s) {
    if (!this.PK[i]) return false;
    var m = 4, a = this.r() * TAU;
    this.PK[i] = 0; this.TR[i] = 0;
    this.X[i] = s ? this.w - m - 1 : m + 1; this.Y[i] = m + this.r() * (this.h - 2 * m);
    this.VX[i] = (s ? -1 : 1) * Math.abs(Math.cos(a)); this.VY[i] = Math.sin(a);
    this.side[this.K[i]][s]++;
    return true;
  };

  /* how many of this kind are on each side now: [left, right] (one crossing the wall counts for the side it left) */
  Sim.prototype.count = function (name) { var s = this.side[this.kindIx(name)]; return [s[0], s[1]]; };
  Sim.prototype.crossed = function (name) { var i = this.kindIx(name); return { ab: this.ab[i], ba: this.ba[i], net: this.ab[i] - this.ba[i] }; };

  /* No crossing is ever turned back where nothing is drawn to hold a count (an independent review, 25 Nov 2026): a scene
     keeps its wall down while a step waits, or lets the process go on, as it would. */

  Sim.prototype.step = function () {
    var r = this.r, g = this.gate, w = this.w, h = this.h, heat = this.heat, m = 3;
    if (g && g.thin) { this.S0 = this.S0 || new Uint8Array(this.N); for (var q0 = 0; q0 < this.N; q0++) this.S0[q0] = this.X[q0] < g.x ? 0 : 1; }
    for (var i = 0; i < this.N; i++) {
      if (this.PK[i]) continue;
      var ki = this.K[i], k = this.kinds[ki], sp = k.speed * heat;
      this.A[i] += this.SP[i] * DT * Math.max(.6, heat);
      if (this.TR[i]) {
        var dir = this.TR[i];
        if (g.walk) {
          /* in a doorway with depth: still at random. It leaves at either end, and only the far end counts as a crossing */
          if (r() < DT / k.tau) { var b = r() * TAU; this.VX[i] = Math.cos(b); this.VY[i] = Math.sin(b); }
          var ix = this.X[i] + this.VX[i] * sp * DT, iy = this.Y[i] + this.VY[i] * sp * DT;
          if (iy < g.y0) { iy = 2 * g.y0 - iy; this.VY[i] = Math.abs(this.VY[i]); }
          if (iy > g.y1) { iy = 2 * g.y1 - iy; this.VY[i] = -Math.abs(this.VY[i]); }
          var wL = g.x - g.hw, wR = g.x + g.hw;
          if (ix >= wR) {
            this.TR[i] = 0; ix = wR + .5; this.VX[i] = Math.abs(this.VX[i]);
            if (dir > 0) { this.ab[ki]++; this.side[ki][0]--; this.side[ki][1]++; }
          } else if (ix <= wL) {
            this.TR[i] = 0; ix = wL - .5; this.VX[i] = -Math.abs(this.VX[i]);
            if (dir < 0) { this.ba[ki]++; this.side[ki][1]--; this.side[ki][0]++; }
          }
          this.X[i] = ix; this.Y[i] = iy;
          continue;
        }
        /* inside the wall: it goes on to the other side, at its own pace */
        this.X[i] += dir * (k.through || sp * .8) * DT;
        if (this.LN[i] >= 0) this.Y[i] += (this.LN[i] - this.Y[i]) * .22;   /* in a channel: on its line */
        else this.Y[i] += (r() - .5) * 1.4;
        if (this.Y[i] < m) this.Y[i] = m; if (this.Y[i] > h - m) this.Y[i] = h - m;
        if (dir > 0 && this.X[i] >= g.x + g.hw) { this.TR[i] = 0; this.X[i] = g.x + g.hw + .5; this.VX[i] = Math.abs(this.VX[i]); this.ab[ki]++; this.side[ki][0]--; this.side[ki][1]++; }
        else if (dir < 0 && this.X[i] <= g.x - g.hw) { this.TR[i] = 0; this.X[i] = g.x - g.hw - .5; this.VX[i] = -Math.abs(this.VX[i]); this.ba[ki]++; this.side[ki][1]--; this.side[ki][0]++; }
        continue;
      }
      if (r() < DT / k.tau) { var a = r() * TAU; this.VX[i] = Math.cos(a); this.VY[i] = Math.sin(a); }
      var nx = this.X[i] + this.VX[i] * sp * DT, ny = this.Y[i] + this.VY[i] * sp * DT;
      if (ny < m) { ny = 2 * m - ny; this.VY[i] = Math.abs(this.VY[i]); }
      if (ny > h - m) { ny = 2 * (h - m) - ny; this.VY[i] = -Math.abs(this.VY[i]); }
      if (g && g.thin) {
        /* a divider with an opening: where it stands, a particle bounces off it; elsewhere it goes straight on (counted below) */
        var gL2 = g.x - g.hw, gR2 = g.x + g.hw;
        if (g.blocks && g.blocks(ny)) {
          if (this.X[i] <= gL2 && nx > gL2) { nx = 2 * gL2 - nx; this.VX[i] = -Math.abs(this.VX[i]); }        /* off its left face */
          else if (this.X[i] >= gR2 && nx < gR2) { nx = 2 * gR2 - nx; this.VX[i] = Math.abs(this.VX[i]); }  /* off its right face */
        }
      } else if (g) {
        var L = g.x - g.hw, R = g.x + g.hw;
        if (this.X[i] <= L && nx > L) {
          var p = g.pass ? g.pass(this.names[ki], ny, 1, this) : 0;
          if (p > 0 && (p >= 1 || r() < p)) { this.TR[i] = 1; nx = L + .5; this.LN[i] = g.lane ? g.lane(ny) : -1; }
          else { nx = 2 * L - nx; this.VX[i] = -Math.abs(this.VX[i]); if (p < 0) { var aL = (r() - .5) * 2.6; this.VX[i] = -Math.cos(aL); this.VY[i] = Math.sin(aL); } }
        } else if (this.X[i] >= R && nx < R) {
          var p2 = g.pass ? g.pass(this.names[ki], ny, -1, this) : 0;
          if (p2 > 0 && (p2 >= 1 || r() < p2)) { this.TR[i] = -1; nx = R - .5; this.LN[i] = g.lane ? g.lane(ny) : -1; }
          else { nx = 2 * R - nx; this.VX[i] = Math.abs(this.VX[i]); if (p2 < 0) { var aR = (r() - .5) * 2.6; this.VX[i] = Math.cos(aR); this.VY[i] = Math.sin(aR); } }
        }
      }
      if (nx < m || nx > w - m) {
        var s = nx < m ? 0 : 1;
        /* `keep`: the open far edge of a side (see the head of this file) */
        if (g && k.keep && this.side[ki][s] > k.keep[s]) {
          this.side[ki][s]--; this.side[ki][1 - s]++;
          nx = s ? m + 1 : w - m - 1; ny = m + r() * (h - 2 * m);
          this.VX[i] = s ? Math.abs(this.VX[i]) : -Math.abs(this.VX[i]);
        } else if (nx < m) { nx = 2 * m - nx; this.VX[i] = Math.abs(this.VX[i]); }
        else { nx = 2 * (w - m) - nx; this.VX[i] = -Math.abs(this.VX[i]); }
      }
      this.X[i] = nx; this.Y[i] = ny;
    }
    if (this.hit) this.collide();
    /* a thin divider: each crossing is counted from where the particle is now, whether it moved or was pushed across */
    if (g && g.thin) for (var q1 = 0; q1 < this.N; q1++) {
      var s1 = this.X[q1] < g.x ? 0 : 1, k1 = this.K[q1];
      if (s1 !== this.S0[q1]) { if (s1) { this.ab[k1]++; this.side[k1][0]--; this.side[k1][1]++; } else { this.ba[k1]++; this.side[k1][1]--; this.side[k1][0]++; } }
    }
    if (this.onMove) this.onMove(this);
    this.t += DT;
  };

  /* A scene's clock over a simulation. `rules(story, sim)` sets what the story decides at each moment (a divider rising,
     the heat). The story's time is the film's own; while a step waits for the reader the particles go on moving (idle:
     the story stands still, the particles do not), and a jump back replays the story from its start, so any moment can be
     drawn on demand and is the same each time. */
  function Track(sim, rules) {
    var off = 0, last = 0;
    function run(to) {
      var guard = 0;
      while (sim.t - off + 1e-9 < to && guard++ < 9000) { if (rules) rules(sim.t - off, sim); sim.step(); }
    }
    return {
      sim: sim,
      seek: function (t) { sim.reset(); off = 0; last = 0; run(t); last = t; },
      to: function (t) {
        if (t < last - 1e-6 || t - last > 5) this.seek(t);
        else { run(t); last = t; }
      },
      idle: function (dt) {
        var n = Math.max(1, Math.round(dt / DT));
        while (n-- > 0) { if (rules) rules(last, sim); sim.step(); off += DT; }
      },
      time: function () { return last; }
    };
  }

  /* a membrane with channels. lines: the y of each channel. A particle that meets a channel's mouth enters it if the channel
     has room (`enter`: the chance at each meeting, so that a particle does not simply return at once through the same mouth);
     anywhere else it crosses between the lipids only rarely (`lipid`: the chance at each meeting). */
  function channels(lines, mouth, lipid, gap, enter) {
    function near(y) { var b = -1, d = mouth; lines.forEach(function (l) { var q = Math.abs(l - y); if (q <= d) { d = q; b = l; } }); return b; }
    return { lines: lines, lane: near, pass: function (y, dir, sim) { var l = near(y); return l < 0 ? lipid : sim.laneRoom(l, dir, gap || 16) ? (enter || 1) : 0; } };
  }

  /* The concentration of one kind of particle across the box, for a graph under the picture (Daniel, 25 Nov 2026: "a
     gradient is kind of like a slope"). Each particle counts as a small spread-out piece (a gaussian, folded back at
     the walls, so nothing is lost outside the box): a few dozen particles still give a smooth curve, and the curve is
     steadied over time as an eye would read it. While a wall stands (`split()` gives its x, or null) the two sides are
     worked out apart. o = { full: particles per px that count as 1, n?, sigma?, tau?, split? }; values[i] at xs[i]. */
  function profile(sim, kind, o) {
    var n = o.n || 29, w = sim.w, sg = o.sigma || 34, tau = o.tau || .7, ki = sim.kindIx(kind), xs = [], i;
    for (i = 0; i < n; i++) xs.push(w * i / (n - 1));
    var v = new Float32Array(n), raw = new Float32Array(n), fresh = true, norm = 1 / (sg * Math.sqrt(2 * Math.PI) * o.full);
    function g(d) { d /= sg; return Math.exp(-d * d / 2); }
    return {
      xs: xs, values: v, w: w,
      /* flat: the ups and downs of a few particles, not a slope (MemDraw.slopeOf uses the same .45) */
      flat: function () { var mx = -1e9, mn = 1e9; for (var j = 0; j < n; j++) { mx = Math.max(mx, v[j]); mn = Math.min(mn, v[j]); } return mx - mn < .45; },
      reset: function () { fresh = true; },
      step: function (dt) {
        var split = o.split ? o.split() : null;
        for (i = 0; i < n; i++) raw[i] = 0;
        for (var q = 0; q < sim.N; q++) {
          if (sim.K[q] !== ki) continue;
          var px = sim.X[q], right = split != null && px >= split, lo = right ? split : 0, hi = split != null && !right ? split : w;
          for (i = 0; i < n; i++) {
            if (split != null && (xs[i] >= split) !== right) continue;      /* the wall stands between them */
            raw[i] += g(xs[i] - px) + g(xs[i] - (2 * lo - px)) + g(xs[i] - (2 * hi - px));
          }
        }
        var a = fresh ? 1 : 1 - Math.exp(-dt / tau); fresh = false;
        for (i = 0; i < n; i++) v[i] += (raw[i] * norm - v[i]) * a;
      }
    };
  }

  global.MemSim = { make: function (o) { return new Sim(o); }, Track: Track, rng: rng, DT: DT, channels: channels, profile: profile };
})(window);
