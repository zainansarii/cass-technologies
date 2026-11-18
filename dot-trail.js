const lifetime = 220; // Milliseconds from a dot's last contact until its colour is gone.

function installTrail(hero) {
  const canvas = hero.querySelector('.hero-ink');
  const ctx = canvas.getContext('2d');
  if (!ctx || !window.ResizeObserver) return;

  const pattern = hero.querySelector('.hero-dots pattern');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  let width, height, pitch, columns, rows;
  let previous = null;
  let frame = 0;

  function draw(now) {
    frame = 0;
    ctx.clearRect(0, 0, width, height);
    for (const [key, dot] of active) {
      const remaining = Math.min(1, 1 - (now - dot.time) / lifetime);
      if (remaining <= 0) {
        active.delete(key);
        continue;
      }
      const intensity = remaining * dot.weight;
      ctx.globalAlpha = intensity;
      ctx.fillStyle = `hsl(${266 + 55 * intensity} 80% 60%)`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, pitch * (.08 + .24 * intensity), 0, Math.PI * 2);
      ctx.fill();
    }
    if (active.size) frame = requestAnimationFrame(draw);
  }

  function mark(x, y, time) {
    const radius = pitch * 2.6;
    const firstRow = Math.max(0, Math.ceil((y - radius) / pitch - .5));
    const lastRow = Math.min(rows - 1, Math.floor((y + radius) / pitch - .5));
    const firstCol = Math.max(0, Math.ceil((x - radius) / pitch - .5));
    const lastCol = Math.min(columns - 1, Math.floor((x + radius) / pitch - .5));
    for (let row = firstRow; row <= lastRow; row++) {
      const cy = (row + .5) * pitch;
      for (let col = firstCol; col <= lastCol; col++) {
        const cx = (col + .5) * pitch;
        const weight = 1 - ((cx - x) ** 2 + (cy - y) ** 2) / radius ** 2;
        if (weight <= 0) continue;
        const key = row * columns + col;
        const last = active.get(key);
        const residual = last ? last.weight * Math.max(0, 1 - (time - last.time) / lifetime) : 0;
        active.set(key, { x: cx, y: cy, weight: Math.max(weight, residual), time });
      }
    }
  }

  function track(event) {
    if (reducedMotion.matches || !event.isPrimary || !pitch) return;
    const bounds = canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const time = performance.now();
    if (previous && event.type === 'pointermove' && x === previous.x && y === previous.y) return;

    // Timestamp the points between browser events so fast sweeps leave a continuous, ordered trail.
    if (previous && previous.id === event.pointerId && time - previous.time < lifetime) {
      const dx = x - previous.x, dy = y - previous.y;
      const steps = Math.ceil(Math.hypot(dx, dy) / pitch);
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        mark(previous.x + dx * t, previous.y + dy * t, previous.time + (time - previous.time) * t);
      }
    }
    mark(x, y, time);
    previous = { x, y, time, id: event.pointerId };
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    active.clear();
    ctx.clearRect(0, 0, width, height);
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    pitch = Math.min(17, Math.max(8, width * .011));
    columns = Math.ceil(width / pitch);
    rows = Math.ceil(height / pitch);
    pattern.setAttribute('patternTransform', `scale(${pitch / 14})`);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    clear();
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  hero.addEventListener('pointermove', track, { passive: true });
  hero.addEventListener('pointerdown', track, { passive: true });
  hero.addEventListener('pointerleave', () => { previous = null; });
  hero.addEventListener('pointercancel', () => { previous = null; });
  reducedMotion.addEventListener('change', clear);
  document.addEventListener('visibilitychange', clear);
}

document.querySelectorAll('.hero').forEach(installTrail);
