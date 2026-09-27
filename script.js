const flowersButton = document.querySelector('#flowersButton');
const messageButton = document.querySelector('#messageButton');
const flowersCard = document.querySelector('#flowersCard');
const bouquetSvg = document.querySelector('#bouquetSvg');
const rotatingText = document.querySelector('#rotatingText');
const formulaBlock = document.querySelector('#formulaBlock');
const messageBox = document.querySelector('.message-box');
const phraseDots = document.querySelector('#phraseDots');
const canvas = document.querySelector('#celebration');
const ctx = canvas.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const slides = [
  {
    text: 'Flores amarillas porque mi cariño por ti corre como un while sin condición de salida.',
    formula: false
  },
  {
    text: 'Flores amarillas porque entre todas las variables de mi vida, tú eres la única constante.',
    formula: false
  },
  {
    text: 'Flores amarillas porque te dejaré de amar el día que esta función llegue a cero.',
    formula: true
  }
];

const flowers = [
  { cx: -8, cy: 188, r: 34, baseX: 60, tilt: -19, speed: 4.8, leaves: [0.32, 0.52] },
  { cx: 70, cy: 255, r: 39, baseX: 110, tilt: -16, speed: 4.4, leaves: [0.36, 0.58] },
  { cx: 116, cy: 105, r: 43, baseX: 165, tilt: -8, speed: 5.0, leaves: [0.48, 0.68] },
  { cx: 210, cy: 84, r: 47, baseX: 223, tilt: -1, speed: 4.6, leaves: [0.44, 0.64] },
  { cx: 228, cy: 202, r: 41, baseX: 231, tilt: 1, speed: 5.2, leaves: [0.50, 0.71] },
  { cx: 315, cy: 60, r: 55, baseX: 286, tilt: 7, speed: 4.7, leaves: [0.44, 0.70] },
  { cx: 387, cy: 115, r: 45, baseX: 330, tilt: 12, speed: 4.5, leaves: [0.56, 0.80] },
  { cx: 425, cy: 242, r: 36, baseX: 352, tilt: 16, speed: 4.8, leaves: [0.45, 0.67] }
];

let width = 0;
let height = 0;
let particles = [];
let currentSlide = 0;
let slideTimer;
let dots = [];

function svgEl(name, attrs = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function addDefs() {
  bouquetSvg.innerHTML = `
    <defs>
      <radialGradient id="petalFill" cx="34%" cy="20%" r="82%">
        <stop offset="0" stop-color="#fff9cf"/>
        <stop offset="0.48" stop-color="#ffd84d"/>
        <stop offset="1" stop-color="#ffc92f"/>
      </radialGradient>
      <linearGradient id="stemFill" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#29814a"/>
        <stop offset="0.55" stop-color="#68cb7a"/>
        <stop offset="1" stop-color="#2a8b4e"/>
      </linearGradient>
      <radialGradient id="centerFill" cx="34%" cy="28%" r="70%">
        <stop offset="0" stop-color="#996012"/>
        <stop offset="0.56" stop-color="#6d430a"/>
        <stop offset="1" stop-color="#2d1b05"/>
      </radialGradient>
      <linearGradient id="leafFill" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#72d482"/>
        <stop offset="1" stop-color="#36a45a"/>
      </linearGradient>
    </defs>
  `;
}

function pointOnCurve(startX, startY, controlX, controlY, endX, endY, t) {
  const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
  const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;
  const dx = 2 * (1 - t) * (controlX - startX) + 2 * t * (endX - controlX);
  const dy = 2 * (1 - t) * (controlY - startY) + 2 * t * (endY - controlY);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return { x, y, angle };
}

function addLeaf(group, x, y, angle, side, scale = 1) {
  const leaf = svgEl('ellipse', {
    class: 'flower-leaf',
    cx: x,
    cy: y,
    rx: 8.6 * scale,
    ry: 23 * scale,
    fill: 'url(#leafFill)',
    transform: `rotate(${angle + side * 48} ${x} ${y})`
  });
  group.appendChild(leaf);
}

function renderFlower(flower, index) {
  const group = svgEl('g', { class: 'flower-group' });
  const startX = flower.baseX;
  const startY = 590;
  const endX = flower.cx;
  const endY = flower.cy + flower.r * 0.72;
  const controlX = (startX + endX) / 2 + flower.tilt * 1.45;
  const controlY = (startY + endY) / 2 - 18;

  const stem = svgEl('path', {
    class: 'flower-stem',
    d: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    fill: 'none',
    stroke: 'url(#stemFill)',
    'stroke-width': '7.2',
    'stroke-linecap': 'round'
  });
  group.appendChild(stem);

  const leafStops = flower.leaves || [0.42, 0.62];
  leafStops.forEach((t, leafIndex) => {
    const point = pointOnCurve(startX, startY, controlX, controlY, endX, endY, t);
    const side = (index + leafIndex) % 2 === 0 ? -1 : 1;
    const scale = leafIndex === 0 ? 0.95 : 0.82;
    addLeaf(group, point.x, point.y, point.angle, side, scale);
  });

  const bloomOuter = svgEl('g', {
    transform: `translate(${flower.cx} ${flower.cy}) rotate(${flower.tilt * 0.3})`
  });
  const bloom = svgEl('g', {
    class: 'flower-bloom',
    style: `--speed:${flower.speed}s`
  });

  const petalCount = flower.r > 50 ? 14 : 12;
  for (let i = 0; i < petalCount; i += 1) {
    const angle = i * (360 / petalCount);
    bloom.appendChild(svgEl('ellipse', {
      cx: '0',
      cy: -flower.r * 0.52,
      rx: flower.r * 0.14,
      ry: flower.r * 0.38,
      fill: 'url(#petalFill)',
      transform: `rotate(${angle})`
    }));

    if (i % 2 === 0) {
      bloom.appendChild(svgEl('ellipse', {
        cx: 0,
        cy: -flower.r * 0.54,
        rx: flower.r * 0.06,
        ry: flower.r * 0.11,
        fill: '#fff7cf',
        opacity: '0.58',
        transform: `rotate(${angle}) translate(0 3)`
      }));
    }
  }

  const centerBack = svgEl('circle', {
    cx: 3.5,
    cy: 6,
    r: flower.r * 0.23,
    fill: '#2a1904',
    opacity: '0.52'
  });
  const center = svgEl('circle', {
    cx: 0,
    cy: 0,
    r: flower.r * 0.23,
    fill: 'url(#centerFill)'
  });
  bloom.append(centerBack, center);

  [[-0.10, -0.08, 0.05], [0.08, 0.04, 0.042], [-0.02, 0.12, 0.035]].forEach(([x, y, r]) => {
    bloom.appendChild(svgEl('circle', {
      cx: flower.r * x,
      cy: flower.r * y,
      r: flower.r * r,
      fill: '#3c2505',
      opacity: '0.68'
    }));
  });

  bloomOuter.appendChild(bloom);
  group.appendChild(bloomOuter);
  bouquetSvg.appendChild(group);
}

function addBase() {
  bouquetSvg.appendChild(svgEl('ellipse', {
    cx: 218,
    cy: 538,
    rx: 144,
    ry: 44,
    fill: 'rgba(255, 216, 77, 0.22)',
    stroke: 'rgba(255, 232, 128, 0.18)',
    'stroke-width': 2
  }));
}

function renderBouquet() {
  addDefs();
  addBase();
  flowers.forEach(renderFlower);
}

function updateDots() {
  dots.forEach((dot, index) => {
    dot.classList.toggle('is-active', index === currentSlide);
    dot.setAttribute('aria-current', index === currentSlide ? 'true' : 'false');
  });
}

function setSlide(index, initial = false) {
  currentSlide = index;
  const slide = slides[index];
  updateDots();

  if (initial || reducedMotion) {
    rotatingText.textContent = slide.text;
    formulaBlock.classList.toggle('is-visible', slide.formula);
    return;
  }

  messageBox.classList.add('is-changing');
  window.setTimeout(() => {
    rotatingText.textContent = slide.text;
    formulaBlock.classList.toggle('is-visible', slide.formula);
    messageBox.classList.remove('is-changing');
  }, 380);
}

function nextSlide() {
  const nextIndex = (currentSlide + 1) % slides.length;
  setSlide(nextIndex);
}

function restartSlides() {
  clearInterval(slideTimer);
  slideTimer = window.setInterval(nextSlide, 3500);
}

function startSlides() {
  setSlide(0, true);
  restartSlides();
}

function createDots() {
  phraseDots.innerHTML = '';
  dots = slides.map((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.setAttribute('aria-label', `Mostrar frase ${index + 1}`);
    dot.addEventListener('click', () => {
      setSlide(index);
      restartSlides();
    });
    phraseDots.appendChild(dot);
    return dot;
  });
  updateDots();
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makeParticle(x, y) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 2.6 + Math.random() * 7.2;
  const shapes = ['petal', 'circle', 'star'];

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 2.5,
    gravity: 0.08 + Math.random() * 0.08,
    size: 5 + Math.random() * 11,
    rotation: Math.random() * Math.PI,
    spin: -0.19 + Math.random() * 0.38,
    alpha: 1,
    life: 74 + Math.random() * 42,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    color: Math.random() > 0.28 ? '#ffd84d' : '#fff4a8'
  };
}

function drawStar(size) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? size : size * 0.42;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

function drawParticle(particle) {
  ctx.save();
  ctx.globalAlpha = Math.max(particle.alpha, 0);
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  ctx.fillStyle = particle.color;
  ctx.shadowColor = 'rgba(255, 216, 77, 0.48)';
  ctx.shadowBlur = 6;

  if (particle.shape === 'star') {
    drawStar(particle.size * 0.72);
  } else if (particle.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * 0.46, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size * 0.44, particle.size, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach(drawParticle);
}

function animateCelebration() {
  ctx.clearRect(0, 0, width, height);

  particles = particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += particle.gravity;
    particle.vx *= 0.988;
    particle.rotation += particle.spin;
    particle.life -= 1;
    particle.alpha = Math.min(1, particle.life / 48);
    drawParticle(particle);
    return particle.life > 0 && particle.y < height + 90;
  });

  if (!reducedMotion) requestAnimationFrame(animateCelebration);
}

function celebrateFromElement(element, amount = 140) {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height * 0.34;

  for (let i = 0; i < amount; i += 1) {
    particles.push(makeParticle(centerX, centerY));
  }

  if (reducedMotion) drawParticles();
}

function scrollToElement(selector, block = 'start') {
  document.querySelector(selector).scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block
  });
}

flowersButton.addEventListener('click', () => {
  scrollToElement('#flores', 'start');
  window.setTimeout(() => celebrateFromElement(flowersCard, 80), reducedMotion ? 0 : 650);
});

messageButton.addEventListener('click', () => {
  scrollToElement('#mensaje', 'start');
});

flowersCard.addEventListener('click', () => celebrateFromElement(flowersCard, 45));

renderBouquet();
createDots();
resizeCanvas();
startSlides();
if (!reducedMotion) animateCelebration();
window.addEventListener('resize', resizeCanvas);
