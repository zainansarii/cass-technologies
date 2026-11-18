// Two offset inks share one fixed grid, like the dot fields on the original Cass site.
const fieldWidth = 600;
const fieldHeight = 468;
const pitch = 14;
const columns = 42;
const rows = 32;
const names = ['Waves', 'Ripples', 'Bloom', 'Weave'];
const home = { x: .5, y: .5 };
const marginX = (fieldWidth - (columns - 1) * pitch) / 2;
const marginY = (fieldHeight - (rows - 1) * pitch) / 2;
const inks = { paper: [186, 177, 187], pink: [244, 54, 159], violet: [142, 94, 234], overlap: [105, 57, 162] };
const clamp = value => Math.max(0, Math.min(1, value));

function band(distance, width) {
  return clamp(1 - Math.abs(distance) / width);
}

function inkStrength(pattern, x, y, ink) {
  switch (pattern) {
    case 0: { // Three parallel waves, printed slightly out of register.
      const curve = .37 * Math.sin(2.9 * x - .25) - .31 * x + .075 * Math.sin(5 * x + .4);
      const offset = y - curve - ink * (.057 + .026 * Math.cos(3 * x));
      return Math.max(band(offset, .094), band(offset - .34, .085), band(offset + .34, .085));
    }
    case 1: {
      const radius = Math.hypot(x * .90 - .09 * ink, y * 1.1 + .04 * ink);
      return band(radius - .30 * Math.round(radius / .30), .080);
    }
    case 2: {
      const angle = Math.atan2(y, x) + ink * .12;
      const radius = Math.hypot(x, y);
      const petals = .49 + .17 * Math.cos(5 * angle);
      return Math.max(band(radius - petals, .15), band(radius - petals * .48, .09));
    }
    default: {
      const first = Math.sin(7 * (x * .90 + y * .66) + .95 * Math.sin(3.6 * y));
      const second = Math.sin(7 * (y * .90 - x * .66) + .95 * Math.sin(3.6 * x));
      return band(ink > 0 ? first : second, .72);
    }
  }
}

function dotStyle(pattern, nx, ny, anchor) {
  const x = (nx - .5) * 2.18 - (anchor.x - .5) * .35;
  const y = (ny - .5) * 1.70 - (anchor.y - .5) * .30;
  const edge = clamp((1.04 - Math.hypot(x * .94, y * 1.09)) * 5.5);
  const pink = inkStrength(pattern, x, y, 1) * edge;
  const violet = inkStrength(pattern, x, y, -1) * edge;
  const amount = Math.max(pink, violet);
  const total = pink + violet || 1;
  const overlap = Math.min(pink, violet) ** .8;
  const color = inks.paper.map((paper, i) => {
    const single = (inks.pink[i] * pink + inks.violet[i] * violet) / total;
    const printed = single + (inks.overlap[i] - single) * overlap;
    return Math.round(paper + (printed - paper) * Math.min(1, amount * 2.6));
  });
  return [1.12 + 4.9 * Math.sqrt(amount), ...color];
}

function makeField(pattern, anchor) {
  return Array.from({ length: columns * rows }, (_, i) =>
    dotStyle(pattern, (i % columns) / (columns - 1), Math.floor(i / columns) / (rows - 1), anchor));
}

function installGrid(figure) {
  const button = figure.querySelector('button');
  const canvas = figure.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx || !window.ResizeObserver) return;

  const label = figure.querySelector('.pattern-name');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 0;
  let current = makeField(mode, home);
  let start = current;
  let target = current;
  let cell = -1;
  let lastPressed = -1;
  let frame = 0;
  let startedAt = 0;

  function paint() {
    ctx.clearRect(0, 0, fieldWidth, fieldHeight);
    for (let i = 0; i < current.length; i++) {
      const [r, red, green, blue] = current[i];
      const x = marginX + (i % columns) * pitch;
      const y = marginY + Math.floor(i / columns) * pitch;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${Math.round(red)},${Math.round(green)},${Math.round(blue)})`;
      ctx.fill();
      if (i === cell) {
        ctx.beginPath();
        ctx.arc(x, y, 6.3, 0, Math.PI * 2);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = '#332c35';
        ctx.stroke();
      }
    }
  }

  function animate(now) {
    frame = 0;
    const t = reducedMotion.matches ? 1 : clamp((now - startedAt) / 185);
    const mix = 1 - (1 - t) ** 3;
    current = t === 1 ? target : target.map((dot, i) => dot.map((v, j) => start[i][j] + (v - start[i][j]) * mix));
    paint();
    if (t < 1) frame = requestAnimationFrame(animate);
  }

  function select(pattern, nextCell) {
    if (cell === nextCell && mode === pattern) return;
    mode = pattern;
    cell = nextCell;
    const anchor = cell < 0 ? home : { x: (cell % columns) / (columns - 1), y: Math.floor(cell / columns) / (rows - 1) };
    start = current;
    target = makeField(mode, anchor);
    startedAt = performance.now();
    label.textContent = names[mode];
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function locate(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * fieldWidth;
    const y = (event.clientY - bounds.top) / bounds.height * fieldHeight;
    const col = Math.min(columns - 1, Math.max(0, Math.round((x - marginX) / pitch)));
    const row = Math.min(rows - 1, Math.max(0, Math.round((y - marginY) / pitch)));
    return { index: row * columns + col, region: (col >= columns / 2 ? 1 : 0) + (row >= rows / 2 ? 2 : 0) };
  }

  button.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || event.buttons) return;
    const point = locate(event);
    select(point.region, point.index);
  });
  button.addEventListener('pointerleave', () => select(mode, -1));
  button.addEventListener('click', event => {
    const next = (mode + 1) % names.length;
    if (!event.detail) select(next, -1); // Native keyboard and assistive technology activation.
    else {
      const point = locate(event);
      select(point.index === lastPressed || point.region === mode ? next : point.region, point.index);
      lastPressed = point.index;
    }
    figure.querySelector('[role="status"]').textContent = names[mode] + ' pattern';
  });
  figure.classList.add('interactive');
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    ctx.setTransform(canvas.width / fieldWidth, 0, 0, canvas.height / fieldHeight, 0, 0);
    paint();
  }
  resize();
  new ResizeObserver(resize).observe(button);
}

document.querySelectorAll('.dot-study').forEach(installGrid);
