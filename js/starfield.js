/* ============================================================
   starfield.js — the sky for harrischu.com
   Vanilla SVG + CSS. No libraries. ~50 lines of logic.
   - Static scattered stars (base atmosphere, always on)
   - Three particle streams along bezier paths (dust + twinkles)
   - Scroll parallax on outer groups; idle twinkle on stars
   - Mobile: fewer grains, no parallax (twinkle stays)
   - prefers-reduced-motion: everything static, nothing blinks
   ============================================================ */
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = matchMedia('(max-width: 768px)').matches;

  /* ---------- static sky ---------- */
  const sky = document.getElementById('sky');
  const SKY_COUNT = compact ? 45 : 90;
  for (let i = 0; i < SKY_COUNT; i++) {
    const s = document.createElement('div');
    s.className = 'sky-star';
    const r = Math.random() * 1.5 + 0.4;
    s.style.cssText =
      `left:${Math.random() * 100}%;top:${Math.random() * 100}%;` +
      `width:${r}px;height:${r}px;opacity:${.4 + Math.random() * .55}`;
    // half of the static sky stars flash, desynchronized
    if (!reduced && Math.random() < .5) {
      s.classList.add('sky-tw');
      s.style.setProperty('--sd', (2 + Math.random() * 4).toFixed(2) + 's');
      s.style.setProperty('--sd2', (-Math.random() * 5).toFixed(2) + 's');
    }
    sky.appendChild(s);
  }

  /* ---------- dust + twinkles along stream paths ---------- */
  function gauss() { // Box-Muller
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const build = (id, color, bigN, warmP, jitter, dustStep, keep) => {
    const g = document.getElementById(id);
    if (!g) return;
    // both the ghost spine and the dust path share one geometry
    const path = g.querySelector('.ghost-line') || g.querySelector('.stream-line');
    const L = path.getTotalLength();

    for (let s = 0; s < L; s += dustStep) {
      if (Math.random() > keep) continue;             // density gaps
      const p = path.getPointAtLength(s);
      const far = Math.random() < .08 ? jitter * 3.2 : jitter; // stray clusters
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', (p.x + far * gauss()).toFixed(1));
      c.setAttribute('cy', (p.y + gauss() * jitter * .55).toFixed(1));
      c.setAttribute('r', (0.35 + Math.random() * 0.55).toFixed(2));
      c.setAttribute('fill', color);
      c.setAttribute('fill-opacity', (0.3 + Math.random() * 0.5).toFixed(2));
      // 50% of dust grains fade (perf knob after desktop jank with 100%)
      if (!reduced && Math.random() < .5) {
        c.classList.add('tw-d');
        c.style.setProperty('--td', (2.6 + Math.random() * 3.4).toFixed(2) + 's');
        c.style.setProperty('--de', (-Math.random() * 5).toFixed(2) + 's');
      }
      g.appendChild(c);
    }

    for (let i = 0; i < bigN; i++) {                  // twinkling stars + afterglow halos
      const p = path.getPointAtLength(Math.random() * L);
      const warm = Math.random() < warmP;
      const hex = warm ? '#ffd9c2' : '#eaf2ff';
      // demo-scale: 1–2px diameter feel (SVG uses radius) — warm ones hold a touch more
      const r = warm ? 0.8 + Math.random() * 0.4 : 0.5 + Math.random() * 0.5;
      // shared flash timing: star and halo breathe together (no lag, user's call)
      const tds = (2.4 + Math.random() * 3.6).toFixed(2);
      const de  = -Math.random() * parseFloat(tds);
      const deHalo = de;

      const halo = document.createElementNS(SVGNS, 'circle');
      halo.setAttribute('cx', (p.x + (Math.random() - .5) * 46).toFixed(1));
      halo.setAttribute('cy', (p.y + (Math.random() - .5) * 46).toFixed(1));
      halo.setAttribute('r', (r * 2.6).toFixed(2));
      halo.setAttribute('fill', hex);
      halo.setAttribute('fill-opacity', '0.22');
      halo.setAttribute('class', 'tw-halo ' + (warm ? 'big-star warm' : 'big-star'));
      halo.style.setProperty('--td', tds + 's');
      halo.style.setProperty('--de', deHalo + 's');
      g.appendChild(halo);

      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', halo.getAttribute('cx'));
      c.setAttribute('cy', halo.getAttribute('cy'));
      c.setAttribute('r', r.toFixed(2));
      c.setAttribute('class', 'tw ' + (warm ? 'big-star warm' : 'big-star'));
      c.style.setProperty('--td', tds + 's');
      c.style.setProperty('--de', de.toFixed(2) + 's');
      g.appendChild(c);
    }
  };

  const n = compact ? 0.45 : 1; // fewer grains on small screens
  build('dust-1', '#9fc0ff', Math.round(16 * n), .12, 11, Math.round(6 * n), .72);
  build('dust-2', '#8fdcdc', Math.round(12 * n), .08,  9, Math.round(5 * n), .62);
  build('dust-3', '#ffd0b3', Math.round(10 * n), .35, 13, Math.round(7 * n), .55);

  /* ---------- scroll parallax (outer groups only) ----------
     Desktop: rAF loop. Mobile: passive scroll listener with rAF throttling
     and weaker amplitude — motion only while actually scrolling. */
  if (reduced) return;
  const AMP = compact ? 0.45 : 1;
  const layers = [
    { el: document.getElementById('par-1'), x:  80, y: -60 },
    { el: document.getElementById('par-2'), x: 150, y: -140 },
    { el: document.getElementById('par-3'), x: 260, y: -260 }
  ];
  const apply = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const t = max > 0 ? scrollY / max : 0;
    for (const l of layers)
      l.el.style.transform = `translate(${t * l.x * AMP}px, ${t * l.y * AMP}px)`;
  };
  if (compact) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { apply(); ticking = false; });
    }, { passive: true });
    apply();
  } else {
    requestAnimationFrame(function loop() { apply(); requestAnimationFrame(loop); });
  }
})();
