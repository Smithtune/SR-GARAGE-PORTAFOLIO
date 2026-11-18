// SR Garage Performance — scroll-scrubbed hero film, services accordion (Nexus template motion), theme toggle.
// Layout is read once per resize, never inside the scroll render.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- theme toggle: dark is the brand default ---------- */
const root = document.documentElement;
const themeBtn = document.querySelector('.theme');
function applyTheme(t) {
  if (t === 'light') root.dataset.theme = 'light'; else delete root.dataset.theme;
  const light = t === 'light';
  themeBtn.setAttribute('aria-pressed', String(light));
  themeBtn.setAttribute('aria-label', light ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
  document.querySelector('meta[name="theme-color"]').content = light ? '#F4F4F2' : '#080808';
}
try { applyTheme(localStorage.getItem('sr-theme')); } catch (e) { applyTheme(null); }
themeBtn.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem('sr-theme', next); } catch (e) {}
});

/* ---------- phone menu (≤609px only): link list over the blurred page ---------- */
const phone = matchMedia('(max-width: 609px)');
const nav = document.querySelector('.nav');
const menuBtn = document.querySelector('.menu-btn');
const menuLinks = document.getElementById('nav-links');
const behind = [document.querySelector('main'), document.querySelector('.wa-fab')];
function setMenu(open, { focusBtn = false } = {}) {
  if (open && !phone.matches) return;
  nav.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Cerrar' : 'Menú';
  root.style.overflow = open ? 'hidden' : '';
  behind.forEach(el => el && (el.inert = open));
  if (open) menuLinks.querySelector('a').focus({ preventScroll: true });
  else if (focusBtn) menuBtn.focus();
}
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('menu-open')));
menuLinks.addEventListener('click', e => {
  if (!nav.classList.contains('menu-open')) return;
  if (e.target.closest('a')) setMenu(false);          // the link then scrolls to its section
  else if (e.target === menuLinks) setMenu(false);    // tap on the backdrop
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nav.classList.contains('menu-open')) setMenu(false, { focusBtn: true });
});
phone.addEventListener('change', () => { if (!phone.matches) setMenu(false); });

/* ---------- process: 13 stepped gradient rows ---------- */
const steps = document.getElementById('steps');
for (let i = 0; i < 13; i++) {
  const r = document.createElement('i');
  r.style.backgroundPosition = `${(i / 12) * 100}% 0`;
  steps.appendChild(r);
}

/* ---------- process cards: pop out once, then zoom as the mouse approaches ----------
   Both run on `scale`/`opacity` only (composite). The pop is a CSS keyframe (off the main thread);
   the zoom writes `style.scale` straight onto each card, never through an inherited CSS variable. */
const cardList = document.querySelector('.cards');
const cards = [...cardList.children];
if (!reduce.matches && 'IntersectionObserver' in window) {
  cardList.classList.add('will-pop');
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    cardList.classList.add('is-in');
    io.disconnect();                            // once
  }, { threshold: 0.21 });
  io.observe(cardList);
}

if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  // Listen on the window, not the section: the next section's curved top overlaps Proceso's bottom edge,
  // so a pointer approaching from below never reaches #proceso itself.
  const RANGE = 233, MAX = 0.06;               // px of "approach" around a card, peak extra scale
  let centers = null, cx0 = -1e6, cy0 = -1e6, queued = false, lifted = null;   // pointer in viewport coords
  const shown = cards.map(() => 1);            // last written scale per card: skip identical writes
  const measureCards = () => {                  // the only layout read; page coordinates, so scrolling never invalidates it
    centers = cards.map(c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2 + scrollX, r.top + r.height / 2 + scrollY, r.width / 2, r.height / 2]; });
  };
  const zoom = () => {
    queued = false;
    if (reduce.matches || (cardList.classList.contains('will-pop') && !cardList.classList.contains('is-in'))) return;
    if (!centers) measureCards();
    const px = cx0 + scrollX, py = cy0 + scrollY;   // page coords now, so scrolling under a still mouse also updates
    let best = -1, bestK = 0;
    centers.forEach(([cx, cy, hw, hh], i) => {
      // distance from the pointer to the card's edge (0 when inside it)
      const dx = Math.max(0, Math.abs(px - cx) - hw), dy = Math.max(0, Math.abs(py - cy) - hh);
      const k = clamp(1 - Math.hypot(dx, dy) / RANGE);
      const sc = Math.round((1 + MAX * k * k) * 1000) / 1000;   // eased falloff: grows faster as you get close
      if (sc !== shown[i]) { cards[i].style.scale = sc === 1 ? '' : String(sc); shown[i] = sc; }
      if (k > bestK) { bestK = k; best = i; }
    });
    const top = best >= 0 ? cards[best] : null;  // the nearest card sits above its neighbours while it grows
    if (top !== lifted) { if (lifted) lifted.style.zIndex = ''; if (top) top.style.zIndex = '1'; lifted = top; }
  };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    cx0 = e.clientX; cy0 = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(zoom); }
  }, { passive: true });
  addEventListener('scroll', () => { if (!queued && cy0 > -1e5) { queued = true; requestAnimationFrame(zoom); } }, { passive: true });   // only once a mouse has been seen
  document.documentElement.addEventListener('pointerleave', () => { cx0 = cy0 = -1e6; zoom(); });   // pointer left the window
  addEventListener('resize', () => { centers = null; }, { passive: true });
  cardList.addEventListener('animationend', () => { centers = null; });   // re-measure once the pop has settled
}

/* ---------- specialists: reveal once, then the badge tilts toward the mouse ---------- */
const about = document.getElementById('especialistas');
if (!reduce.matches && 'IntersectionObserver' in window) {
  about.classList.add('will-reveal');
  const aboutIO = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    about.classList.add('is-in');
    aboutIO.disconnect();
  }, { threshold: 0.21 });
  aboutIO.observe(about);
}
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const badgeWrap = about.querySelector('.badge-wrap');
  const TILT = 8;                               // max degrees
  let box = null, tx = 0, ty = 0, tQueued = false;
  const tilt = () => {
    tQueued = false;
    if (reduce.matches) return;
    if (!box) { const r = badgeWrap.getBoundingClientRect(); box = [r.left + scrollX + r.width / 2, r.top + scrollY + r.height / 2, r.width]; }
    const nx = clamp((tx + scrollX - box[0]) / box[2], -1, 1), ny = clamp((ty + scrollY - box[1]) / box[2], -1, 1);
    badgeWrap.style.transform = `perspective(610px) rotateX(${(-ny * TILT).toFixed(2)}deg) rotateY(${(nx * TILT).toFixed(2)}deg)`;
  };
  about.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!tQueued) { tQueued = true; requestAnimationFrame(tilt); }
  }, { passive: true });
  about.addEventListener('pointerleave', () => { badgeWrap.style.transform = ''; });
  addEventListener('resize', () => { box = null; }, { passive: true });
}

/* ---------- services: kinetic accordion (behaviour from the Nexus template) ----------
   Mouse: hover or focus opens a column, leaving the accordion closes it.
   Touch: tap opens, tapping the open column closes it. Escape always closes.
   Closed columns keep their details inert, so Tab never lands on invisible links. */
const accordion = document.getElementById('accordion');
const slices = [...accordion.querySelectorAll('.slice')];
const hoverCapable = matchMedia('(hover: hover) and (pointer: fine)').matches;

function setActiveSlice(target) {
  slices.forEach(slice => {
    const on = slice === target;
    slice.classList.toggle('active', on);
    slice.querySelector('.slice-toggle').setAttribute('aria-expanded', String(on));
    slice.querySelector('.slice-reveal').inert = !on;
  });
}
slices.forEach(slice => {
  const toggle = slice.querySelector('.slice-toggle');
  if (hoverCapable) slice.addEventListener('mouseenter', () => setActiveSlice(slice));
  // keyboard focus opens the column; a tap also focuses the button, but its click does the toggling
  toggle.addEventListener('focus', () => { if (toggle.matches(':focus-visible')) setActiveSlice(slice); });
  toggle.addEventListener('click', () => {
    setActiveSlice(slice.classList.contains('active') && !hoverCapable ? null : slice);
  });
});
if (hoverCapable) accordion.addEventListener('mouseleave', () => {
  if (!accordion.contains(document.activeElement)) setActiveSlice(null);
});
accordion.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = slices.find(sl => sl.classList.contains('active'));
  open?.querySelector('.slice-toggle').focus({ preventScroll: true });   // focus first (it would reopen), then close
  setActiveSlice(null);
});
accordion.addEventListener('focusout', e => {
  if (!accordion.contains(e.relatedTarget)) setActiveSlice(null);
});

/* ---------- hero film: 96 stills of carbackground.mp4 (served by Cloudinary), scrubbed by scroll ----------
   The MP4 has a single keyframe, so seeking it backwards stutters. Stills on a canvas
   scrub cleanly both ways: scroll down plays forward, scroll up plays in reverse. */
const FILM_COUNT = 96;
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');
const film = new Array(FILM_COUNT);           // decoded images, filled as they arrive
let filmShown = -1, filmWanted = 0, filmLoading = false;
// Cloudinary cuts each still from the uploaded MP4 on request (so_ = start offset in seconds) and caches it on its CDN.
// Phones get 720 px frames: 96 decoded 1280 px frames need ~350 MB of memory, 720 px ~112 MB.
const FILM_URL = 'https://res.cloudinary.com/ql2k8tv7/video/upload/so_{t},w_{w}/v1795040223/carbackground.webp';
// Phones held upright (≤609 CSS px, portrait) get the 9:16 film (720×1280, 8 s — same timing as the 16:9 one).
// Empty it to fall back to the 16:9 film over a blurred fill (the haze path in drawFilm).
const FILM_URL_PORTRAIT = 'https://res.cloudinary.com/ql2k8tv7/video/upload/so_{t},w_{w}/v1795043998/A_car_store_logo_is_animated_wit_986836_mvp.webp';
const FILM_SECONDS = 8;
let filmWidth = 1280, filmUrl = FILM_URL, filmGen = 0;
const filmSrc = i => filmUrl.replace('{t}', (i * FILM_SECONDS / FILM_COUNT).toFixed(3)).replace('{w}', filmWidth);
const phonePortrait = () => !!FILM_URL_PORTRAIT && canvas.clientWidth > 0 && canvas.clientWidth <= 609 && canvas.clientHeight > canvas.clientWidth;

function sizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
  if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; filmShown = -1; }
}
function nearestLoaded(i) {                   // never blank: show the closest frame that has arrived
  for (let d = 0; d < FILM_COUNT; d++) { if (film[i - d]) return i - d; if (film[i + d]) return i + d; }
  return -1;
}
const haze = document.createElement('canvas');   // tiny copy, scaled back up = a cheap blur that works in every browser
haze.width = 34; haze.height = 21;
const hazeCtx = haze.getContext('2d');

function drawFilm(i) {
  const k = nearestLoaded(i);
  if (k < 0 || k === filmShown || !canvas.width) return;
  const img = film[k], W = canvas.width, H = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
  if (ih > iw) {
    // the 9:16 film on a phone: cover, but never trim more than 7% per side — the finished logo
    // spans nearly the whole frame width. On very tall phones the thin gap above/below gets the blur fill.
    const s = Math.min(Math.max(W / iw, H / ih), W / (iw * 0.86)), w = iw * s, h = ih * s;
    if (h < H) { hazeCtx.drawImage(img, 0, 0, haze.width, haze.height); ctx.imageSmoothingEnabled = true; ctx.drawImage(haze, 0, 0, W, H); }
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  } else if (W >= H) {
    // landscape: object-fit cover, the film fills the screen
    const s = Math.max(W / iw, H / ih), w = iw * s, h = ih * s;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  } else {
    // portrait (phones): cover would cut the logo, so blur-fill the screen and show the frame
    // at full width (6% trimmed per side), centred, so the whole logo stays visible
    hazeCtx.drawImage(img, 0, 0, haze.width, haze.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(haze, 0, 0, W, H);
    ctx.fillStyle = 'rgb(8 8 8 / .55)';
    ctx.fillRect(0, 0, W, H);
    const s = W / (iw * 0.88), w = iw * s, h = ih * s;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
  filmShown = k;
}
function loadFilm() {
  if (filmLoading) return;
  filmLoading = true;
  sizeCanvas();
  filmWidth = canvas.clientWidth && canvas.clientWidth <= 820 ? 720 : 1280;   // CSS px, not device px: a 3x iPhone is still a phone
  filmUrl = phonePortrait() ? FILM_URL_PORTRAIT : FILM_URL;
  const gen = filmGen;
  let next = 0;                               // frame 1 first, then in order, 4 requests at a time
  const worker = async () => {
    while (next < FILM_COUNT && gen === filmGen) {
      const i = next++;
      const img = new Image();
      img.src = filmSrc(i);
      try { await img.decode(); if (gen !== filmGen) return; film[i] = img; drawFilm(filmWanted); } catch (e) { /* skip a missing frame */ }
    }
  };
  for (let n = 0; n < 4; n++) worker();
}

/* ---------- scroll loop ---------- */
const hero = document.getElementById('hero');
let ticking = false;

let heroTop = 0, heroTravel = 1;            // hero geometry, measured on load/resize only
function measure() {
  heroTop = hero.getBoundingClientRect().top + scrollY;
  heroTravel = Math.max(1, hero.offsetHeight - innerHeight);
}

function render() {
  ticking = false;
  if (reduce.matches) return;

  // HERO — scroll position picks the film frame (down = forward, up = reverse)
  filmWanted = Math.round(clamp((scrollY - heroTop) / heroTravel) * (FILM_COUNT - 1));
  canvas.dataset.frame = filmWanted + 1;      // exposed for testing
  drawFilm(filmWanted);

}

function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => {
  measure(); sizeCanvas(); filmShown = -1;
  // a phone rotated between portrait and landscape switches between the 9:16 and 16:9 films
  if (filmLoading && (phonePortrait() ? FILM_URL_PORTRAIT : FILM_URL) !== filmUrl) {
    filmGen++; film.fill(undefined); filmLoading = false; loadFilm();
  }
  onScroll();
});
reduce.addEventListener('change', () => {
  measure();
  if (!reduce.matches) loadFilm();           // reduced motion keeps the poster still and loads nothing
  render();
});
measure();
addEventListener('load', () => { measure(); onScroll(); });   // fonts/images can shift the hero's position
if (!reduce.matches) loadFilm();
render();
