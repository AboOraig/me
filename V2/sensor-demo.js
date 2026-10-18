/* sensor-demo.js
   "How much should you trust a sensor?" A small toy demo for the Home page.
   Vanilla JS, no dependencies. The fusion below is a hand-tuned heuristic
   (a Kalman filter whose per-sensor trust follows agreement with the median),
   not my research model. */
(() => {
  'use strict';

  // ==== MODEL (no DOM) ====================================================

  const SENSORS = [
    { id: 'a', sigma: 10 },   // precise
    { id: 'b', sigma: 18 },   // average
    { id: 'c', sigma: 28 },   // noisy
  ];

  const DT_SIM = 1 / 60;       // physics step (s)
  const DT_MEAS = 0.05;        // the sensors report at 20 Hz
  const FOLLOW_W = 5;          // rad/s: how fast the target chases the pointer
  const ACCEL_STD = 2000;      // Kalman process noise (px/s^2 at scale 1)
  const GATE = 2.5;            // disagreement (in sigmas) at which trust halves
  const TRUST_TAU = 0.5;       // s: how fast trust reacts
  const ERR_TAU = 1;           // s: smoothing of the error read-outs
  const BIAS_RATE = 60;        // px/s: how fast a drifting sensor walks away
  const BIAS_MAX = 110;        // px: where the drift stops
  const NOISE_MULT = 6;        // noise burst: sigma multiplier
  const FADE = 0.6;            // s: how long a measurement stays on screen
  const TRAIL = 36;            // estimate-trail length (samples)

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function median(values) {
    const s = values.slice().sort((p, q) => p - q);
    const n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }

  function createModel({ width, height, rng }) {
    rng = rng || Math.random;
    let W = width;
    let H = height;
    const scale = () => Math.min(W, H) / 320;   // noise levels scale with the plot

    const gauss = () => {
      let u = 0;
      while (!u) u = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
    };

    const m = {
      t: 0,
      tMeas: 0,
      goal: null,                                   // pointer goal, or null = autopilot
      truth: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
      est: { x: W / 2, y: H / 2, vx: 0, vy: 0, Ppp: 0, Ppv: 0, Pvv: 0, t: 0 },
      plain: { x: W / 2, y: H / 2, valid: false },
      err: { fused: NaN, plain: NaN },
      trail: [],
      sensors: SENSORS.map((s) => ({
        id: s.id, sigma: s.sigma, trust: 1, fault: null, z: null, hist: [],
      })),
    };
    m.est.Ppp = (SENSORS[0].sigma * scale()) ** 2;
    m.est.Pvv = 1e4;

    const autoGoal = (t) => ({
      x: W / 2 + 0.36 * W * Math.sin(0.55 * t),
      y: H / 2 + 0.30 * H * Math.sin(0.83 * t + 1),
    });

    function moveTruth(h) {
      const g = m.goal || autoGoal(m.t);
      const tr = m.truth;
      const ax = FOLLOW_W * FOLLOW_W * (g.x - tr.x) - 2 * FOLLOW_W * tr.vx;
      const ay = FOLLOW_W * FOLLOW_W * (g.y - tr.y) - 2 * FOLLOW_W * tr.vy;
      tr.vx += ax * h;
      tr.vy += ay * h;
      tr.x += tr.vx * h;
      tr.y += tr.vy * h;
    }

    // Constant-velocity Kalman filter. The two axes share one covariance
    // because the noise is isotropic.
    function predict(dt) {
      if (dt <= 0) return;
      const e = m.est;
      const q = (ACCEL_STD * scale()) ** 2;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const Ppp = e.Ppp + 2 * dt * e.Ppv + dt * dt * e.Pvv + q * dt ** 4 / 4;
      const Ppv = e.Ppv + dt * e.Pvv + q * dt ** 3 / 2;
      const Pvv = e.Pvv + q * dt * dt;
      e.Ppp = Ppp; e.Ppv = Ppv; e.Pvv = Pvv;
    }

    function update(z, R) {
      const e = m.est;
      const S = e.Ppp + R;
      const Kp = e.Ppp / S;
      const Kv = e.Ppv / S;
      const yx = z.x - e.x;
      const yy = z.y - e.y;
      e.x += Kp * yx; e.vx += Kv * yx;
      e.y += Kp * yy; e.vy += Kv * yy;
      e.Pvv -= Kv * e.Ppv;
      e.Ppv -= Kp * e.Ppv;
      e.Ppp -= Kp * e.Ppp;
    }

    function measure() {
      const sc = scale();
      const now = m.t;
      const tr = m.truth;
      const live = [];

      for (const s of m.sensors) {
        s.z = null;
        const f = s.fault;
        if (!f || f.mode !== 'dropout') {
          let sig = s.sigma * sc;
          let bx = 0;
          let by = 0;
          if (f && f.mode === 'noise') sig *= NOISE_MULT;
          if (f && f.mode === 'bias') {
            const b = Math.min(BIAS_MAX, BIAS_RATE * (now - f.t0)) * sc;
            bx = b * Math.cos(f.angle);
            by = b * Math.sin(f.angle);
            sig *= 1.5;
          }
          s.z = { x: tr.x + bx + sig * gauss(), y: tr.y + by + sig * gauss() };
          s.hist.push({ x: s.z.x, y: s.z.y, t: now });
          live.push(s);
        }
        while (s.hist.length && now - s.hist[0].t > FADE) s.hist.shift();
      }

      predict(now - m.est.t);
      m.est.t = now;

      // Trust = how well a sensor agrees with the median of the sensors,
      // smoothed over time. A silent sensor's trust decays to zero.
      const alpha = 1 - Math.exp(-DT_MEAS / TRUST_TAU);
      let mx = 0;
      let my = 0;
      if (live.length) {
        mx = median(live.map((s) => s.z.x));
        my = median(live.map((s) => s.z.y));
      }
      for (const s of m.sensors) {
        let g = 0;
        if (s.z) {
          const d = Math.hypot(s.z.x - mx, s.z.y - my);
          const k = GATE * s.sigma * sc;
          g = 1 / (1 + (d / k) ** 2);
        }
        s.trust += alpha * (g - s.trust);
      }

      for (const s of live) {
        if (s.trust < 0.03) continue;
        const sig = s.sigma * sc;
        update(s.z, (sig * sig) / (s.trust * s.trust));
      }

      // The baseline: just average whatever the sensors say right now.
      if (live.length) {
        m.plain.x = live.reduce((a, s) => a + s.z.x, 0) / live.length;
        m.plain.y = live.reduce((a, s) => a + s.z.y, 0) / live.length;
        m.plain.valid = true;
      } else {
        m.plain.valid = false;
      }

      const beta = 1 - Math.exp(-DT_MEAS / ERR_TAU);
      const eF = Math.hypot(m.est.x - tr.x, m.est.y - tr.y);
      m.err.fused = Number.isNaN(m.err.fused) ? eF : m.err.fused + beta * (eF - m.err.fused);
      if (m.plain.valid) {
        const eP = Math.hypot(m.plain.x - tr.x, m.plain.y - tr.y);
        m.err.plain = Number.isNaN(m.err.plain) ? eP : m.err.plain + beta * (eP - m.err.plain);
      }

      m.trail.push({ x: m.est.x, y: m.est.y });
      if (m.trail.length > TRAIL) m.trail.shift();
    }

    return {
      state: m,

      step(dt) {
        let rem = dt;
        while (rem > 1e-9) {
          const h = Math.min(rem, DT_SIM);
          rem -= h;
          moveTruth(h);
          m.t += h;
          m.tMeas += h;
          if (m.tMeas >= DT_MEAS - 1e-9) {
            m.tMeas -= DT_MEAS;
            measure();
          }
        }
      },

      setGoal(x, y) {
        const pad = 14;
        m.goal = { x: clamp(x, pad, W - pad), y: clamp(y, pad, H - pad) };
      },

      releaseGoal() { m.goal = null; },

      setFault(id, mode) {
        const s = m.sensors.find((q) => q.id === id);
        if (!s) return;
        s.fault = mode ? { mode, t0: m.t, angle: rng() * 2 * Math.PI } : null;
      },

      setSize(w, h) {
        const fx = w / W;
        const fy = h / H;
        const move = (p) => { p.x *= fx; p.y *= fy; };
        move(m.truth); move(m.est); move(m.plain);
        if (m.goal) move(m.goal);
        m.sensors.forEach((s) => s.hist.forEach(move));
        m.trail.length = 0;
        W = w;
        H = h;
      },

      // Each sensor's share of the total fusion weight (sums to 1, or all 0).
      shares() {
        const out = {};
        let total = 0;
        for (const s of m.sensors) {
          const w = s.z ? (s.trust * s.trust) / (s.sigma * s.sigma) : 0;
          out[s.id] = w;
          total += w;
        }
        for (const s of m.sensors) out[s.id] = total > 0 ? out[s.id] / total : 0;
        return out;
      },

      uncertainty() { return 2 * Math.sqrt(Math.max(m.est.Ppp, 0)); },
      scale,
    };
  }

  // ==== UI ================================================================

  const MODES = {
    bias: { label: 'drifting' },
    noise: { label: 'very noisy' },
    dropout: { label: 'silent' },
  };

  function initDemo(root) {
    const canvas = root.querySelector('[data-demo-canvas]');
    const ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;                     // stays hidden: nothing to show

    root.hidden = false;

    const select = root.querySelector('[data-demo-fault]');
    const pauseBtn = root.querySelector('[data-demo-pause]');
    const statusEl = root.querySelector('[data-demo-status]');
    const errFused = root.querySelector('[data-err="fused"]');
    const errPlain = root.querySelector('[data-err="plain"]');
    const cards = {};
    root.querySelectorAll('[data-demo-sensor]').forEach((li) => {
      cards[li.dataset.demoSensor] = {
        li,
        btn: li.querySelector('[data-break]'),
        fill: li.querySelector('[data-fill]'),
        pct: li.querySelector('[data-pct]'),
      };
    });

    const css = getComputedStyle(root);
    const token = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const COLOR = {
      a: token('--demo-a', '#3987e5'),
      b: token('--demo-b', '#c98500'),
      c: token('--demo-c', '#d55181'),
      est: token('--accent', '#4fd1c5'),
      text: token('--text', '#f5f7fa'),
      muted: token('--text-muted', '#a3b0c7'),
      plot: token('--demo-plot', '#132747'),
      grid: token('--demo-grid', 'rgba(148,163,184,0.09)'),
    };
    const FONT = token('--font-mono', 'monospace');

    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let model = null;
    let raf = 0;
    let last = 0;
    let visible = true;
    let paused = !!(motionQuery && motionQuery.matches);
    let interacted = false;
    let releaseTimer = 0;
    let statusTimer = 0;
    let readoutAt = 0;
    const broken = { a: false, b: false, c: false };

    // ---- sizing ---------------------------------------------------------
    function resize() {
      const w = canvas.clientWidth;       // content box: the 1px border is not drawable
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (model && w === W && h === H && nextDpr === dpr) return;
      dpr = nextDpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (!model) {
        model = createModel({ width: w, height: h });
        model.step(2);                    // warm-up so the first frame is settled
      } else {
        model.setSize(w, h);
      }
      W = w;
      H = h;
      draw();
    }

    // ---- drawing --------------------------------------------------------
    function shape(kind, x, y, r) {
      ctx.beginPath();
      if (kind === 'a') {                 // diamond
        ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 1.25, y);
        ctx.lineTo(x, y + r * 1.25); ctx.lineTo(x - r * 1.25, y);
      } else if (kind === 'b') {          // square
        ctx.rect(x - r, y - r, r * 2, r * 2);
      } else {                            // triangle
        ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.15, y + r * 0.9);
        ctx.lineTo(x - r * 1.15, y + r * 0.9);
      }
      ctx.closePath();
    }

    function draw() {
      if (!model) return;
      const m = model.state;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // faint measurement grid
      ctx.strokeStyle = COLOR.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 40; x < W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 40; y < H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();

      // estimate trail, drawn as a smooth curve through the samples
      const T = m.trail;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = COLOR.est;
      for (let i = 2; i < T.length; i++) {
        const p = T[i - 2];
        const q = T[i - 1];
        const r = T[i];
        ctx.globalAlpha = (i / T.length) * 0.5;
        ctx.beginPath();
        ctx.moveTo((p.x + q.x) / 2, (p.y + q.y) / 2);
        ctx.quadraticCurveTo(q.x, q.y, (q.x + r.x) / 2, (q.y + r.y) / 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // sensor measurements, fading with age and with distrust
      for (const s of m.sensors) {
        const trustAlpha = 0.35 + 0.65 * clamp(s.trust / 0.8, 0, 1);
        ctx.fillStyle = COLOR[s.id];
        for (const p of s.hist) {
          const age = (m.t - p.t) / FADE;
          if (age >= 1) continue;
          ctx.globalAlpha = (1 - age * 0.8) * trustAlpha;
          shape(s.id, p.x, p.y, 4);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // fused estimate, extrapolated to "now" so it moves smoothly between samples
      const e = m.est;
      const ahead = clamp(m.t - e.t, 0, 0.1);
      const ex = e.x + e.vx * ahead;
      const ey = e.y + e.vy * ahead;
      const ur = Math.max(5, model.uncertainty());
      ctx.beginPath();
      ctx.arc(ex, ey, ur, 0, Math.PI * 2);
      ctx.fillStyle = COLOR.est;
      ctx.globalAlpha = 0.12;
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = COLOR.est;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // plain average of the sensors (the baseline)
      if (m.plain.valid) {
        const { x, y } = m.plain;
        ctx.strokeStyle = COLOR.muted;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
      }

      // the true target
      ctx.strokeStyle = COLOR.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(m.truth.x, m.truth.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      // estimate dot with a surface ring so it reads on top of everything
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = COLOR.est;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = COLOR.plot;
      ctx.stroke();

      if (!interacted) {
        ctx.font = `12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = COLOR.muted;
        const hints = coarse
          ? ['Tap or drag to steer the target', 'Tap or drag to steer']
          : ['Move your pointer here to steer the target', 'Move here to steer the target', 'Move here to steer'];
        const fit = hints.find((t) => ctx.measureText(t).width < W - 24) || hints[hints.length - 1];
        ctx.fillText(fit, W / 2, H - 14);
      }
    }

    // ---- read-outs (DOM, ~5 Hz) -----------------------------------------
    const fmtErr = (v) => (Number.isFinite(v) ? `${Math.round(v)} px` : '–');

    function readouts() {
      const sh = model.shares();
      for (const s of model.state.sensors) {
        const c = cards[s.id];
        if (!c) continue;
        const pct = Math.round(sh[s.id] * 100);
        c.fill.style.setProperty('--w', sh[s.id].toFixed(3));
        c.pct.textContent = s.z || !s.fault ? `${pct}%` : 'no signal';
      }
      const { fused, plain } = model.state.err;
      const f = fmtErr(fused);
      const p = model.state.plain.valid || Number.isFinite(plain) ? fmtErr(plain) : '–';
      if (errFused.textContent !== f) errFused.textContent = f;
      if (errPlain.textContent !== p) errPlain.textContent = p;
    }

    // ---- loop -----------------------------------------------------------
    const running = () => visible && !paused && !document.hidden;

    function frame(ts) {
      raf = 0;
      const dt = Math.min(0.1, Math.max(0, (ts - last) / 1000));
      last = ts;
      model.step(dt);
      draw();
      if (ts - readoutAt > 200) { readoutAt = ts; readouts(); }
      if (running()) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf || !model || !running()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // Used while paused: show the result of a change without animating it.
    function fastForward(seconds) {
      model.step(seconds);
      draw();
      readouts();
    }

    function setPaused(next) {
      paused = next;
      pauseBtn.textContent = paused ? 'Play' : 'Pause';
      pauseBtn.setAttribute('aria-label', paused ? 'Play the animation' : 'Pause the animation');
      if (paused) stop(); else start();
    }

    // ---- status line (announced politely, once things have settled) -------
    function names(ids) {
      const up = ids.map((i) => i.toUpperCase());
      return up.length > 1 ? `${up.slice(0, -1).join(', ')} and ${up[up.length - 1]}` : up[0];
    }

    function announce() {
      const ids = Object.keys(broken).filter((k) => broken[k]);
      const sh = model.shares();
      const { fused, plain } = model.state.err;
      let msg;
      if (!ids.length) {
        msg = 'All sensors working again.';
      } else {
        const mode = MODES[select.value].label;
        const shareTxt = ids.map((i) => `${Math.round(sh[i] * 100)}%`).join(', ');
        msg = `Sensor${ids.length > 1 ? 's' : ''} ${names(ids)} ${ids.length > 1 ? 'are' : 'is'} ${mode}. `
          + `Share of the weight: ${shareTxt}. `
          + `Error: fused estimate ${fmtErr(fused)}, plain average ${fmtErr(plain)}.`;
        if (ids.length === 2) msg += ' Only one healthy sensor is left, so there is no majority to check it against.';
        if (ids.length === 3) msg += ' With all three broken there is nothing left to trust.';
      }
      statusEl.textContent = msg;
    }

    function scheduleAnnounce() {
      clearTimeout(statusTimer);
      if (paused) {
        fastForward(3);
        announce();
      } else {
        statusTimer = setTimeout(announce, 3000);
      }
    }

    // ---- controls -------------------------------------------------------
    function applyFaults() {
      for (const id of Object.keys(broken)) {
        model.setFault(id, broken[id] ? select.value : null);
        const c = cards[id];
        c.li.classList.toggle('is-broken', broken[id]);
        c.btn.textContent = broken[id] ? 'Fix' : 'Break';
        c.btn.setAttribute('aria-label', `${broken[id] ? 'Fix' : 'Break'} sensor ${id.toUpperCase()}`);
      }
    }

    Object.keys(cards).forEach((id) => {
      cards[id].btn.addEventListener('click', () => {
        broken[id] = !broken[id];
        applyFaults();
        scheduleAnnounce();
      });
    });

    select.addEventListener('change', () => {
      if (Object.values(broken).some(Boolean)) {
        applyFaults();
        scheduleAnnounce();
      }
    });

    pauseBtn.addEventListener('click', () => setPaused(!paused));

    // ---- pointer --------------------------------------------------------
    function steer(e) {
      const r = canvas.getBoundingClientRect();
      interacted = true;
      clearTimeout(releaseTimer);
      model.setGoal(e.clientX - r.left - canvas.clientLeft, e.clientY - r.top - canvas.clientTop);
      if (paused) draw();
    }

    function letGo(ms) {
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => model.releaseGoal(), ms);
    }

    canvas.addEventListener('pointerdown', steer);
    canvas.addEventListener('pointermove', steer);
    canvas.addEventListener('pointerleave', () => letGo(1500));
    canvas.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') letGo(4000); });
    canvas.addEventListener('pointercancel', () => letGo(4000));

    // ---- lifecycle ------------------------------------------------------
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
    }

    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

    if (motionQuery && motionQuery.addEventListener) {
      motionQuery.addEventListener('change', (e) => { if (e.matches) setPaused(true); });
    }

    resize();
    if (!model) { root.hidden = true; return; }   // canvas had no size: give up quietly
    setPaused(paused);
    readouts();
    applyFaults();
  }

  document.querySelectorAll('[data-demo]').forEach(initDemo);
})();
