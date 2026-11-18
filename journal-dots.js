// Ported from getcass/web-app: src/app/components/JournalDotPattern.tsx (22728ff).
const DESKTOP_GRID_SIZE = 33;
const DESKTOP_DOT_RADIUS = 1.4;
const MOBILE_GRID_SIZE_MIN = 25.5;
const MOBILE_GRID_SIZE_MAX = 30;
const MOBILE_GRID_SIZE_VIEWPORT_RATIO = 0.072;
const MOBILE_DOT_RADIUS_MIN = 0.82;
const MOBILE_DOT_RADIUS_MAX = 1.01;
const MOBILE_DOT_RADIUS_VIEWPORT_RATIO = 0.00235;
const TAU = Math.PI * 2;
const GREY = '#a8a8a8';
const PINK = '#ff23b6';
const PURPLE = '#8f5fff';
const COURTSHIP_DURATION_MIN = 20;
const COURTSHIP_DURATION_MAX = 26;
const DOT_SIZE_TRANSITION_SECONDS = 0.65;
const PATCH_SPAWN_DELAY_SECONDS = 0.7;
const COURTSHIP_START_SECONDS = 1.65;
const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
const randomBetween = (random, minimum, maximum) =>
  minimum + (maximum - minimum) * random();
const createSeed = () => {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
    return values[0];
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
};
const coordinateHash = (x, y, seed) => {
  let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
};
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (from, to, progress) => from + (to - from) * progress;
const smootherStep = (progress) => {
  const value = clamp01(progress);
  return value * value * value * (value * (value * 6 - 15) + 10);
};
const createField = (random, color) => {
  const elongated = random() > 0.45;
  return {
    angleBias: randomBetween(random, -0.12, 0.12),
    color,
    radiusX: randomBetween(random, 0.058, 0.088) * (elongated ? 1.18 : 1),
    radiusY: randomBetween(random, 0.048, 0.078) * (elongated ? 0.86 : 1),
    cosine: 1,
    currentX: 0,
    currentY: 0,
    sine: 0,
  };
};
const createPairs = (random, extentX, extentY, isDesktop) => {
  const pink = createField(random, 'pink');
  const purple = createField(random, 'purple');
  const axisExtent = isDesktop ? extentX : extentY;
  return [
    {
      anchorX: 0,
      anchorY: 0,
      baseAngle: isDesktop ? 0 : Math.PI / 2,
      cycleDuration: randomBetween(
        random,
        COURTSHIP_DURATION_MIN,
        COURTSHIP_DURATION_MAX,
      ),
      driftPhaseX: randomBetween(random, 0, TAU),
      driftPhaseY: randomBetween(random, 0, TAU),
      driftSpeedX: randomBetween(random, 0.48, 0.62),
      driftSpeedY: randomBetween(random, 0.4, 0.56),
      driftX: randomBetween(random, extentX * 0.22, extentX * 0.34),
      driftY: randomBetween(random, extentY * 0.22, extentY * 0.34),
      maxSeparation: axisExtent * 1.35,
      phaseOffset: 0,
      pink,
      purple,
    },
  ];
};
const sampleCourtshipPrelude = (progress) => {
  // Notice: hold a respectful distance and counter-sway without committing.
  if (progress < 0.1) {
    const localProgress = smootherStep(progress / 0.1);
    const sway = Math.sin(localProgress * Math.PI) * 0.035;
    return {
      axisTurns: 0,
      pinkAlong: -0.5,
      pinkLateral: sway,
      purpleAlong: 0.5,
      purpleLateral: -sway,
    };
  }

  // Approach: pink advances first, then purple chooses to reciprocate.
  if (progress < 0.25) {
    const localProgress = (progress - 0.1) / 0.15;
    const firstAdvance = smootherStep(localProgress / 0.48);
    const reply = smootherStep((localProgress - 0.38) / 0.62);
    const invitation = Math.sin(localProgress * Math.PI) * 0.045;
    return {
      axisTurns: 0,
      pinkAlong: mix(-0.5, -0.18, firstAdvance),
      pinkLateral: invitation,
      purpleAlong: mix(0.5, 0.26, reply),
      purpleLateral: -invitation * 0.55,
    };
  }

  // Test: purple recoils, pink waits, and both cautiously reset their distance.
  if (progress < 0.35) {
    const localProgress = (progress - 0.25) / 0.1;
    const recoil = smootherStep(localProgress / 0.45);
    const cautiousReturn = smootherStep((localProgress - 0.45) / 0.55);
    const feint = Math.sin(localProgress * Math.PI) * 0.08;
    const purpleRecoil = mix(mix(0.26, 0.5, recoil), 0.335, cautiousReturn);
    return {
      axisTurns: 0,
      pinkAlong: mix(-0.18, -0.335, cautiousReturn),
      pinkLateral: feint * 0.35,
      purpleAlong: purpleRecoil,
      purpleLateral: -feint,
    };
  }

  // Dance: orbit, cross sides, and answer one another with mirrored movement.
  if (progress < 0.53) {
    const localProgress = (progress - 0.35) / 0.18;
    const gather = smootherStep(localProgress / 0.45);
    const open = smootherStep((localProgress - 0.45) / 0.55);
    const separation = mix(mix(0.67, 0.46, gather), 0.6, open);
    const envelope = Math.sin(localProgress * Math.PI);
    const figureEight = Math.sin(localProgress * TAU) * envelope * envelope * 0.2;
    return {
      axisTurns: smootherStep(localProgress) * 0.47,
      pinkAlong: -separation / 2,
      pinkLateral: figureEight,
      purpleAlong: separation / 2,
      purpleLateral: -figureEight,
    };
  }

  // Separation: one leaves first and the other yields instead of chasing.
  if (progress < 0.64) {
    const localProgress = (progress - 0.53) / 0.11;
    const firstDeparture = smootherStep(localProgress / 0.55);
    const yieldingDeparture = smootherStep((localProgress - 0.25) / 0.75);
    return {
      axisTurns: 0.47,
      pinkAlong: mix(-0.3, -0.52, yieldingDeparture),
      pinkLateral: 0,
      purpleAlong: mix(0.3, 0.53, firstDeparture),
      purpleLateral: 0,
    };
  }

  // Fall: two reciprocal advances turn into a shared inward spiral.
  if (progress < 0.82) {
    const localProgress = (progress - 0.64) / 0.18;
    const firstAdvance = smootherStep(localProgress / 0.32);
    const reply = smootherStep((localProgress - 0.2) / 0.35);
    const mutualAdvance = smootherStep((localProgress - 0.58) / 0.42);
    const inwardSpiral = Math.sin(localProgress * Math.PI) * 0.12;
    const pinkFirstPosition = mix(-0.52, -0.22, firstAdvance);
    const purpleReplyPosition = mix(0.53, 0.27, reply);
    return {
      axisTurns: mix(0.47, 0.7, smootherStep(localProgress)),
      pinkAlong: mix(pinkFirstPosition, -0.11, mutualAdvance),
      pinkLateral: -inwardSpiral,
      purpleAlong: mix(purpleReplyPosition, 0.11, mutualAdvance),
      purpleLateral: inwardSpiral,
    };
  }

  // Bond: linger close, sway together, and exchange one quiet nuzzle.
  if (progress < 0.9) {
    const localProgress = (progress - 0.82) / 0.08;
    const envelope = Math.sin(localProgress * Math.PI);
    const nuzzle = Math.sin(localProgress * TAU) * envelope * envelope * 0.025;
    return {
      axisTurns: 0.7 + envelope * 0.035,
      pinkAlong: -0.11 + nuzzle,
      pinkLateral: nuzzle * 0.7,
      purpleAlong: 0.11 - nuzzle,
      purpleLateral: -nuzzle * 0.7,
    };
  }
  return {
    axisTurns: 0.7,
    pinkAlong: -0.11,
    pinkLateral: 0,
    purpleAlong: 0.11,
    purpleLateral: 0,
  };
};
const samplePlayfulCourtship = (progress) => {
  // Celebrate: open into a buoyant orbit, then return close.
  if (progress < 0.28) {
    const localProgress = progress / 0.28;
    const envelope = Math.sin(localProgress * Math.PI);
    const separation = 0.22 + envelope * 0.14;
    const orbit = Math.sin(localProgress * TAU) * envelope * 0.22;
    return {
      axisTurns: mix(0.7, 1.05, smootherStep(localProgress)),
      pinkAlong: -separation / 2,
      pinkLateral: orbit,
      purpleAlong: separation / 2,
      purpleLateral: -orbit,
    };
  }

  // Chase: take turns leading while travelling together.
  if (progress < 0.56) {
    const localProgress = (progress - 0.28) / 0.28;
    const envelope = Math.sin(localProgress * Math.PI);
    const separation = 0.22 + envelope * 0.18;
    const chase = Math.sin(localProgress * TAU) * envelope * 0.09;
    const sideStep = envelope * 0.12;
    return {
      axisTurns: mix(1.05, 1.3, smootherStep(localProgress)),
      pinkAlong: -separation / 2 + chase,
      pinkLateral: sideStep,
      purpleAlong: separation / 2 + chase,
      purpleLateral: -sideStep,
    };
  }

  // Play: trace a mirrored figure-eight around their shared path.
  if (progress < 0.82) {
    const localProgress = (progress - 0.56) / 0.26;
    const envelope = Math.sin(localProgress * Math.PI);
    const separation = 0.22 + envelope * 0.12;
    const figureEight = Math.sin(localProgress * TAU) * envelope * envelope * 0.25;
    return {
      axisTurns: mix(1.3, 1.58, smootherStep(localProgress)),
      pinkAlong: -separation / 2,
      pinkLateral: figureEight,
      purpleAlong: separation / 2,
      purpleLateral: -figureEight,
    };
  }

  // Rest: settle back together with one last playful nuzzle.
  const localProgress = (progress - 0.82) / 0.18;
  const envelope = Math.sin(localProgress * Math.PI);
  const nuzzle = Math.sin(localProgress * TAU) * envelope * envelope * 0.035;
  return {
    axisTurns: mix(1.58, 1.7, smootherStep(localProgress)),
    pinkAlong: -0.11 + nuzzle,
    pinkLateral: nuzzle * 0.8,
    purpleAlong: 0.11 - nuzzle,
    purpleLateral: -nuzzle * 0.8,
  };
};
const sampleCourtship = (progress) => {
  if (progress < 0.45) {
    return sampleCourtshipPrelude((progress / 0.45) * 0.9);
  }
  if (progress < 0.9) {
    return samplePlayfulCourtship((progress - 0.45) / 0.45);
  }

  // Release: drift apart while completing the rotation for a seamless new cycle.
  const release = smootherStep((progress - 0.9) / 0.1);
  return {
    axisTurns: mix(1.7, 2, release),
    pinkAlong: mix(-0.11, -0.5, release),
    pinkLateral: 0,
    purpleAlong: mix(0.11, 0.5, release),
    purpleLateral: 0,
  };
};
const positionPair = (pair, elapsedSeconds) => {
  const progress = (elapsedSeconds / pair.cycleDuration + pair.phaseOffset) % 1;
  const pose = sampleCourtship(progress);
  const separation = Math.abs(pose.purpleAlong - pose.pinkAlong);
  const togetherness = smootherStep(1 - clamp01((separation - 0.22) / 0.78));
  const centerX =
    pair.anchorX +
    Math.sin(elapsedSeconds * pair.driftSpeedX + pair.driftPhaseX) *
      pair.driftX *
      togetherness;
  const centerY =
    pair.anchorY +
    Math.sin(elapsedSeconds * pair.driftSpeedY + pair.driftPhaseY) *
      pair.driftY *
      togetherness;
  const angle = pair.baseAngle + pose.axisTurns * TAU;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const positionField = (field, along, lateral) => {
    const localX = along * pair.maxSeparation;
    const localY = lateral * pair.maxSeparation;
    field.currentX = centerX + localX * cosine - localY * sine;
    field.currentY = centerY + localX * sine + localY * cosine;
  };
  positionField(pair.pink, pose.pinkAlong, pose.pinkLateral);
  positionField(pair.purple, pose.purpleAlong, pose.purpleLateral);
  const connectionAngle = Math.atan2(
    pair.purple.currentY - pair.pink.currentY,
    pair.purple.currentX - pair.pink.currentX,
  );
  pair.pink.cosine = Math.cos(connectionAngle + pair.pink.angleBias);
  pair.pink.sine = Math.sin(connectionAngle + pair.pink.angleBias);
  pair.purple.cosine = Math.cos(connectionAngle + pair.purple.angleBias);
  pair.purple.sine = Math.sin(connectionAngle + pair.purple.angleBias);
};
const buildScene = (canvas, seed) => {
  const context = canvas.getContext('2d');
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  if (!context || width <= 0 || height <= 0) {
    return null;
  }
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  const largestDimension = Math.max(width, height);
  const isDesktop = window.matchMedia('(min-width: 64rem)').matches;
  const gridSize = isDesktop
    ? DESKTOP_GRID_SIZE
    : Math.min(
        MOBILE_GRID_SIZE_MAX,
        Math.max(MOBILE_GRID_SIZE_MIN, width * MOBILE_GRID_SIZE_VIEWPORT_RATIO),
      );
  const dotRadius = isDesktop
    ? DESKTOP_DOT_RADIUS
    : Math.min(
        MOBILE_DOT_RADIUS_MAX,
        Math.max(MOBILE_DOT_RADIUS_MIN, width * MOBILE_DOT_RADIUS_VIEWPORT_RATIO),
      );
  const extentX = width / largestDimension / 2;
  const extentY = height / largestDimension / 2;
  const random = createRandom(seed);
  const pairs = createPairs(random, extentX, extentY, isDesktop);
  const fields = pairs.flatMap(({ pink, purple }) => [pink, purple]);
  const dots = [];
  for (let y = 0, row = 0; y <= height; y += gridSize, row += 1) {
    for (let x = 0, column = 0; x <= width; x += gridSize, column += 1) {
      dots.push({
        activation: 0,
        color: null,
        edgeThreshold: 0.86 + coordinateHash(column, row, seed ^ 0x9e3779b9) * 0.26,
        normalizedX: (x - width / 2) / largestDimension,
        normalizedY: (y - height / 2) / largestDimension,
        x,
        y,
      });
    }
  }
  return {
    canvas,
    context,
    dotRadius,
    dots,
    fields,
    height,
    lastElapsedSeconds: null,
    pairs,
    pinkDotScales: [],
    pinkDots: [],
    purpleDotScales: [],
    purpleDots: [],
    width,
  };
};
const drawDots = (context, dots, color, radius) => {
  context.beginPath();
  dots.forEach(({ x, y }) => {
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, TAU);
  });
  context.fillStyle = color;
  context.fill();
};
const drawScaledDots = (context, dots, scales, color, baseRadius) => {
  context.beginPath();
  dots.forEach(({ x, y }, index) => {
    const radius = baseRadius * scales[index];
    context.moveTo(x + radius, y);
    context.arc(x, y, radius, 0, TAU);
  });
  context.fillStyle = color;
  context.fill();
};
const paintScene = (scene, elapsedSeconds, settleImmediately = false) => {
  const {
    context,
    dotRadius,
    dots,
    fields,
    pairs,
    pinkDotScales,
    pinkDots,
    purpleDotScales,
    purpleDots,
    width,
    height,
  } = scene;
  const isFirstPaint = scene.lastElapsedSeconds === null;
  const deltaSeconds = isFirstPaint
    ? 0
    : Math.min(0.05, Math.max(0, elapsedSeconds - (scene.lastElapsedSeconds ?? 0)));
  const activationStep = settleImmediately
    ? 1
    : deltaSeconds / DOT_SIZE_TRANSITION_SECONDS;
  const patchesHaveSpawned =
    settleImmediately || elapsedSeconds >= PATCH_SPAWN_DELAY_SECONDS;
  scene.lastElapsedSeconds = elapsedSeconds;
  pinkDotScales.length = 0;
  pinkDots.length = 0;
  purpleDotScales.length = 0;
  purpleDots.length = 0;
  const courtshipElapsedSeconds = Math.max(0, elapsedSeconds - COURTSHIP_START_SECONDS);
  pairs.forEach((pair) => positionPair(pair, courtshipElapsedSeconds));
  dots.forEach((dot) => {
    let closestDistance = Number.POSITIVE_INFINITY;
    let closestField = null;
    for (const field of fields) {
      const offsetX = dot.normalizedX - field.currentX;
      const offsetY = dot.normalizedY - field.currentY;
      const localX = (offsetX * field.cosine + offsetY * field.sine) / field.radiusX;
      const localY = (-offsetX * field.sine + offsetY * field.cosine) / field.radiusY;
      const distance = localX * localX + localY * localY;
      if (distance <= dot.edgeThreshold && distance < closestDistance) {
        closestDistance = distance;
        closestField = field;
      }
    }
    if (closestField && patchesHaveSpawned) {
      dot.color = closestField.color;
      dot.activation = Math.min(1, dot.activation + activationStep);
    } else {
      dot.activation = Math.max(0, dot.activation - activationStep);
      if (dot.activation === 0) {
        dot.color = null;
      }
    }
    if (!dot.color || dot.activation === 0) {
      return;
    }
    const dotScale = 1 + smootherStep(dot.activation);
    if (dot.color === 'pink') {
      pinkDots.push(dot);
      pinkDotScales.push(dotScale);
    } else {
      purpleDots.push(dot);
      purpleDotScales.push(dotScale);
    }
  });
  context.clearRect(0, 0, width, height);
  context.globalAlpha = 1;
  drawDots(context, dots, GREY, dotRadius);
  drawScaledDots(context, purpleDots, purpleDotScales, PURPLE, dotRadius);
  drawScaledDots(context, pinkDots, pinkDotScales, PINK, dotRadius);
};

function installJournalDots(canvas) {
  const seed = createSeed();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scene = null;
  let resizePending = true;
  let onScreen = true;
  let frame = null;
  let elapsedMilliseconds = 0;
  let lastTimestamp = null;

  function schedule() {
    if (frame === null && onScreen && !document.hidden) {
      frame = requestAnimationFrame(render);
    }
  }

  function render(timestamp) {
    frame = null;
    if (resizePending) {
      scene = buildScene(canvas, seed);
      resizePending = false;
      canvas.toggleAttribute('data-painted', Boolean(scene));
    }
    if (!scene) return;

    if (lastTimestamp !== null && !reducedMotion.matches) {
      elapsedMilliseconds += Math.min(timestamp - lastTimestamp, 50);
    }
    lastTimestamp = timestamp;
    paintScene(
      scene,
      reducedMotion.matches ? COURTSHIP_START_SECONDS : elapsedMilliseconds / 1000,
      reducedMotion.matches,
    );
    if (!reducedMotion.matches) schedule();
  }

  function refreshPlayback() {
    cancelAnimationFrame(frame);
    frame = null;
    lastTimestamp = null;
    schedule();
  }

  function resize() {
    resizePending = true;
    schedule();
  }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize, { passive: true });
  if (window.IntersectionObserver) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      refreshPlayback();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', refreshPlayback);
  reducedMotion.addEventListener('change', () => {
    elapsedMilliseconds = 0;
    resizePending = true;
    refreshPlayback();
  });
  schedule();
}

document.querySelectorAll('canvas.hero-dots').forEach(installJournalDots);
