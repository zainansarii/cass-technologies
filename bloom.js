const width = 600;
const height = 468;
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

// Print the flower once in grid coordinates. Input only controls how much ink is visible.
function makeDots() {
  const dots = [];
  for (let row = 0; row < 32; row++) {
    for (let col = 0; col < 42; col++) {
      const nx = (col / 41 - .5) * 2.18;
      const ny = (row / 31 - .5) * 1.70;
      const p = petalInk(nx, ny, .12);
      const v = petalInk(nx, ny, -.12);
      const ink = Math.max(p, v);
      const overlap = Math.min(p, v) ** .8;
      const color = paper.map((grey, i) => {
        if (!ink) return grey - 26;
        const single = (pink[i] * p + violet[i] * v) / (p + v);
        return grey + (single + (overprint[i] - single) * overlap - grey) * Math.min(1, ink * 2.6);
      });
      dots.push({ x: 13 + col * pitch, y: 17 + row * pitch, ink, color, growth: .65 + 4.25 * Math.sqrt(ink), end: 0 });
    }
  }
  return dots;
}

function strengthAt(dot, time) {
  if (time >= dot.end) return 0;
  if (time <= dot.start) return dot.from;
  if (time < dot.peak) return dot.from + (dot.to - dot.from) * smooth((time - dot.start) / (dot.peak - dot.start));
  if (time < dot.release) return dot.to;
  return dot.to * (1 - smooth((time - dot.release) / (dot.end - dot.release)));
}

function installBloom(button) {
  const canvas = button.querySelector('canvas');
  const background = button.closest('.hero').querySelector('.hero-dots');
  const pattern = background.querySelector('pattern');
  const ctx = canvas.getContext('2d');
  if (!ctx || !window.ResizeObserver) return;
  const dots = makeDots();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let lastCell = -1;

  function paint(now) {
    ctx.clearRect(0, 0, width, height);
    let remaining = false;
    for (const dot of dots) {
      if (now >= dot.end) continue;
      remaining = true;
      const strength = strengthAt(dot, now);
      if (strength <= 0) continue;
      const color = dot.color.map((channel, i) => Math.round(paper[i] + (channel - paper[i]) * strength));
      const r = radius + dot.growth * strength;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${color.join(',')})`;
      ctx.fill();
    }
    return remaining;
  }

  function animate(now) {
    frame = 0;
    if (paint(now) && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function reveal(x, y, wholeFlower = false) {
    const now = performance.now();
    for (const dot of dots) {
      const distance = Math.hypot(dot.x - x, dot.y - y);
      if (wholeFlower ? !dot.ink : distance >= brushRadius) continue;
      const amount = wholeFlower ? 1 : smooth(1 - (distance / brushRadius) ** 2);
      const previous = strengthAt(dot, now);
      // A grazing pass should never snuff out a brighter, still-opening petal.
      if (now < dot.release && dot.to > amount) continue;
      dot.from = previous;
      dot.to = Math.max(previous, amount);
      dot.start = now + (motion.matches ? 0 : Math.min(distance, brushRadius) * .48);
      dot.peak = dot.start + (motion.matches ? 0 : 135);
      dot.release = dot.peak + 130 + 90 * amount;
      dot.end = dot.release + (motion.matches ? 150 : 520);
    }
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function brush(event, repeat = false) {
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * width / bounds.width;
    const y = (event.clientY - bounds.top) * height / bounds.height;
    const col = Math.round((x - 13) / pitch);
    const row = Math.round((y - 17) / pitch);
    const cell = row * 44 + col;
    if (cell === lastCell && !repeat) return;
    lastCell = cell;
    reveal(x, y);
  }

  button.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch') brush(event);
  });
  button.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') brush(event);
  });
  button.addEventListener('pointerleave', () => { lastCell = -1; });
  button.addEventListener('click', event => {
    if (!event.detail) reveal(width / 2, height / 2, true);
    else brush(event, true);
  });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!document.hidden) animate(performance.now());
  });

  button.hidden = false;
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const backdrop = background.getBoundingClientRect();
    // Continue the flower's lattice across the hero from the same origin and at the same scale.
    const offsetX = bounds.left - backdrop.left;
    const offsetY = bounds.top - backdrop.top;
    pattern.setAttribute('patternTransform', `matrix(${bounds.width / width} 0 0 ${bounds.height / height} ${offsetX} ${offsetY})`);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    paint(performance.now());
  }
  resize();
  const layout = new ResizeObserver(resize);
  layout.observe(button);
  layout.observe(background);
}

document.querySelectorAll('.pattern-control').forEach(installBloom);
