// The paired pink and violet fields follow the dot grid of Cass's original landing page.
const palette = { grey: '#a8a8a8', pink: '#ff23b6', violet: '#8f5fff' };
const duration = 3600;
const tau = 2 * Math.PI;

function renderJournal(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !window.IntersectionObserver || !window.ResizeObserver) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let frame = 0;
  let elapsed = 0;
  let previousTime = null;
  let width = 0;
  let height = 0;
  let pitch = 0;
  let dots = [];

  function sizeGrid() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (width <= 0 || height <= 0) return;

    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    pitch = Math.max(10, Math.min(21, width / 28));
    dots = [];
    for (let y = pitch / 2, row = 0; y < height; y += pitch, row++) {
      for (let x = pitch / 2, col = 0; x < width; x += pitch, col++) {
        // Fixed coordinate noise breaks up the edge without flickering between frames.
        const noise = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
        dots.push({ x, y, edge: 0.86 + (noise - Math.floor(noise)) * 0.26 });
      }
    }
  }

  function paint(progress) {
    const eased = progress * progress * (3 - 2 * progress);
    const pinkX = width * (0.17 + 0.08 * eased);
    const pinkY = height * (0.29 + 0.03 * eased);
    const violetX = width * (0.83 - 0.06 * eased);
    const violetY = height * (0.72 - 0.06 * eased);
    const radiusX = Math.max(3 * pitch, width * 0.15);
    const radiusY = Math.max(2 * pitch, height * 0.19);
    ctx.clearRect(0, 0, width, height);

    for (const dot of dots) {
      const pink = ((dot.x - pinkX) / radiusX) ** 2 + ((dot.y - pinkY) / radiusY) ** 2;
      const violet = ((dot.x - violetX) / radiusX) ** 2 + ((dot.y - violetY) / radiusY) ** 2;
      const strength = Math.min(1, Math.max(0, (dot.edge - Math.min(pink, violet)) * 2));
      const radius = pitch * 0.067 * (1 + strength);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, radius, 0, tau);
      ctx.fillStyle = palette.grey;
      ctx.fill();
      if (strength > 0) {
        ctx.globalAlpha = strength;
        ctx.fillStyle = pink < violet ? palette.pink : palette.violet;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    canvas.dataset.ready = '';
  }

  let needsLayout = true;
  function draw(time) {
    frame = 0;
    if (!visible || document.hidden) return;
    if (needsLayout) {
      sizeGrid();
      needsLayout = false;
    }
    if (!width || !height) return;

    if (reduced.matches) elapsed = duration;
    else if (previousTime !== null) elapsed = Math.min(duration, elapsed + time - previousTime);
    previousTime = time;
    paint(elapsed / duration);
    if (elapsed < duration) frame = requestAnimationFrame(draw);
  }

  function update() {
    if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
    } else if (!frame) {
      frame = requestAnimationFrame(draw);
    }
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(canvas);
  new ResizeObserver(() => {
    needsLayout = true;
    update();
  }).observe(canvas);
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
}

document.querySelectorAll('canvas.journal-dots').forEach(renderJournal);
