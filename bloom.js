const width = 600;
const height = 468;
const bloomScale = 2;
// The square reveal area fits the outer petals with a little room for their dots.
const bloomFrame = 420 * bloomScale;
const pitch = 14;
const radius = 1.12;
const paper = [186, 177, 187];
const pink = [244, 54, 159];
const violet = [142, 94, 234];
const overprint = [105, 57, 162];
const brushRadius = 118;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = t => t * t * (3 - 2 * t);

function petalInk(x, y, offset) {
  const angle = Math.atan2(y, x) + offset;
  const distance = Math.hypot(x, y);
  const petal = .49 + .17 * Math.cos(5 * angle);
  const outer = 1 - Math.abs(distance - petal) / .15;
  const inner = 1 - Math.abs(distance - petal * .48) / .09;
  return clamp(Math.max(outer, inner));
}

// Scale the print around its centre while keeping the underlying dot lattice at its original pitch.
function makeDot(col, row, hasFlower) {
  let p = 0, v = 0;
  if (hasFlower) {
    const x = (col / 41 - .5) * 2.18 / bloomScale;
    const y = (row / 31 - .5) * 1.70 / bloomScale;
    p = petalInk(x, y, .12);
    v = petalInk(x, y, -.12);
  }
  const ink = Math.max(p, v);
  const overlap = Math.min(p, v) ** .8;
  const color = paper.map((grey, i) => {
    if (!ink) return grey - 26;
    const single = (pink[i] * p + violet[i] * v) / (p + v);
    return grey + (single + (overprint[i] - single) * overlap - grey) * Math.min(1, ink * 2.6);
  });
  return { x: 13 + col * pitch, y: 17 + row * pitch, ink, color, growth: .65 + 4.25 * Math.sqrt(ink), end: 0 };
}

function strengthAt(dot, time) {
  if (time >= dot.end) return 0;
  if (time <= dot.start) return dot.from;
  if (time < dot.peak) return dot.from + (dot.to - dot.from) * smooth((time - dot.start) / (dot.peak - dot.start));
  if (time < dot.release) return dot.to;
  return dot.to * (1 - smooth((time - dot.release) / (dot.end - dot.release)));
}

function installBloom(hero) {
  const canvas = hero.querySelector('.hero-ink');
  const ctx = canvas.getContext('2d');
  if (!ctx || !window.ResizeObserver) return;
  const background = hero.querySelector('.hero-dots');
  const pattern = background.querySelector('pattern');
  const field = hero.querySelector('.pattern-field');
  const button = field.querySelector('button');
  const inner = hero.querySelector('.hero-inner');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  let scaleX, scaleY, originX, originY, hasFlower;
  let frame = 0;
  let lastCell = '';

  function paint(now) {
    ctx.save();
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    for (const [key, dot] of active) {
      if (now >= dot.end) {
        active.delete(key);
        continue;
      }
      const strength = strengthAt(dot, now);
      if (strength <= 0) continue;
      const color = dot.color.map((channel, i) => Math.round(paper[i] + (channel - paper[i]) * strength));
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius + dot.growth * strength, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${color.join(',')})`;
      ctx.fill();
    }
  }

  function animate(now) {
    frame = 0;
    paint(now);
    if (active.size && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function reveal(x, y, wholeFlower = false) {
    const now = performance.now();
    const reach = wholeFlower ? bloomFrame / 2 : brushRadius;
    const firstCol = Math.ceil((x - reach - 13) / pitch);
    const lastCol = Math.floor((x + reach - 13) / pitch);
    const firstRow = Math.ceil((y - reach - 17) / pitch);
    const lastRow = Math.floor((y + reach - 17) / pitch);
    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const distance = Math.hypot(13 + col * pitch - x, 17 + row * pitch - y);
        if (!wholeFlower && distance >= brushRadius) continue;
        const key = `${col},${row}`;
        const dot = active.get(key) || makeDot(col, row, hasFlower);
        if (wholeFlower && !dot.ink) continue;
        const amount = wholeFlower ? 1 : smooth(1 - (distance / brushRadius) ** 2);
        if (now < dot.release && dot.to > amount) continue;
        dot.from = strengthAt(dot, now);
        dot.to = Math.max(dot.from, amount);
        dot.start = now + (motion.matches ? 0 : Math.min(distance, brushRadius) * .48);
        dot.peak = dot.start + (motion.matches ? 0 : 135);
        dot.release = dot.peak + 130 + 90 * amount;
        dot.end = dot.release + (motion.matches ? 150 : 520);
        active.set(key, dot);
      }
    }
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function brush(event) {
    if (!event.isPrimary) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left - originX) / scaleX;
    const y = (event.clientY - bounds.top - originY) / scaleY;
    const cell = `${Math.round((x - 13) / pitch)},${Math.round((y - 17) / pitch)}`;
    if (cell === lastCell && event.type !== 'pointerdown') return;
    lastCell = cell;
    reveal(x, y);
  }

  // Listen on the section so pointer and touch can pass through the artwork to links and text.
  hero.addEventListener('pointermove', brush, { passive: true });
  hero.addEventListener('pointerenter', brush, { passive: true });
  hero.addEventListener('pointerdown', brush, { passive: true });
  hero.addEventListener('pointerleave', () => { lastCell = ''; });
  button.addEventListener('click', event => {
    if (hasFlower && !event.detail) reveal(width / 2, height / 2, true);
  });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden) animate(performance.now());
  });

  function resize() {
    const bounds = field.getBoundingClientRect();
    const backdrop = background.getBoundingClientRect();
    if (!backdrop.width || !backdrop.height) return;
    hasFlower = bounds.width > 0 && bounds.height > 0;
    button.hidden = !hasFlower;
    const mobileScale = Math.min(inner.clientWidth, 432) / width;
    scaleX = hasFlower ? bounds.width / bloomFrame : mobileScale;
    scaleY = hasFlower ? bounds.height / bloomFrame : mobileScale;
    originX = hasFlower ? bounds.left - backdrop.left + (bounds.width - width * scaleX) / 2 : 0;
    originY = hasFlower ? bounds.top - backdrop.top + (bounds.height - height * scaleY) / 2 : 0;
    pattern.setAttribute('patternTransform', `matrix(${scaleX} 0 0 ${scaleY} ${originX} ${originY})`);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(backdrop.width * dpr));
    canvas.height = Math.max(1, Math.round(backdrop.height * dpr));
    const pixelX = canvas.width / backdrop.width, pixelY = canvas.height / backdrop.height;
    ctx.setTransform(pixelX * scaleX, 0, 0, pixelY * scaleY, pixelX * originX, pixelY * originY);
    active.clear();
    lastCell = '';
  }
  resize();
  const layout = new ResizeObserver(resize);
  layout.observe(field);
  layout.observe(inner);
  layout.observe(background);
}

document.querySelectorAll('.hero').forEach(installBloom);
