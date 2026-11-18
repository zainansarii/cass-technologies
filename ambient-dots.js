// Alternate between different parts of the frame, rather than moving a single patch across it.
const anchors = [
  [.17, .23], [.82, .67], [.61, .14], [.24, .80],
  [.86, .28], [.12, .56], [.67, .85], [.39, .17],
];

function installAmbientDots(hero) {
  const grid = hero.querySelector('.hero-dots');
  const pattern = grid.querySelector('pattern');
  const layer = grid.querySelector('.hero-pockets');
  const copy = hero.querySelector('.hero-copy');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!window.ResizeObserver || !window.IntersectionObserver || !layer.animate) return;

  let pitch = 14;
  let centres = [];
  let sequence = 0;
  let visible = false;
  let timer;

  function pulse() {
    const [cx, cy] = centres[sequence % centres.length];
    const hue = sequence % 2 ? 283 : 319;
    sequence += 1;
    const tilt = Math.random() * .6 - .3;
    for (let row = -3; row <= 3; row++) {
      for (let col = -3; col <= 3; col++) {
        const distance = Math.hypot(col / 3.5, (row + tilt * col) / 2.5);
        if (distance >= 1 || Math.random() < .16) continue;
        const weight = 1 - distance;
        const dot = document.createElementNS(grid.namespaceURI, 'circle');
        dot.setAttribute('cx', cx + col * pitch);
        dot.setAttribute('cy', cy + row * pitch);
        dot.setAttribute('r', pitch * (.10 + .07 * weight));
        dot.setAttribute('fill', `hsl(${hue + col * 2} 44% 54%)`);
        dot.setAttribute('opacity', '0');
        layer.append(dot);
        const glow = dot.animate([
          { opacity: 0 },
          { opacity: .36 + .37 * weight, offset: .42 },
          { opacity: 0 },
        ], {
          duration: 1850,
          delay: (col + 3) * 60 + Math.random() * 120,
          easing: 'ease-in-out',
        });
        glow.onfinish = () => dot.remove();
      }
    }
    timer = window.setTimeout(pulse, 1800 + Math.random() * 800);
  }

  function updatePlayback() {
    clearTimeout(timer);
    layer.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    layer.replaceChildren();
    if (visible && !document.hidden && !reducedMotion.matches && centres.length) pulse();
  }

  function layout() {
    const frame = grid.getBoundingClientRect();
    const text = copy.getBoundingClientRect();
    pitch = Math.min(17, Math.max(8, frame.width * .011));
    pattern.setAttribute('patternTransform', `scale(${pitch / 14})`);

    // Reserve space for the entire pocket plus a clear margin around the real typeset copy.
    const edge = 3.5 * pitch;
    const clearance = edge + Math.max(24, 2 * pitch);
    centres = anchors.map(([x, y]) => [
      (Math.floor(x * frame.width / pitch) + .5) * pitch,
      (Math.floor(y * frame.height / pitch) + .5) * pitch,
    ]).filter(([x, y]) =>
      x >= edge && x <= frame.width - edge && y >= edge && y <= frame.height - edge &&
      (x < text.left - frame.left - clearance || x > text.right - frame.left + clearance ||
       y < text.top - frame.top - clearance || y > text.bottom - frame.top + clearance)
    );
    updatePlayback();
  }

  const resize = new ResizeObserver(layout);
  resize.observe(grid);
  resize.observe(copy);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  }).observe(hero);
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
}

document.querySelectorAll('.hero').forEach(installAmbientDots);
