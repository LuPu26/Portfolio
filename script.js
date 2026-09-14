// deferred images: no network request goes out until an image actually scrolls
// into view (see the img[data-src] placeholder in style.css for the shimmer
// shown while it's still loading, and the slide-up-into-place once it starts)
const deferredImages = document.querySelectorAll('img[data-src]');
if (deferredImages.length) {
  const loadDeferredImage = (img) => {
    img.classList.add('is-entering');
    img.src = img.dataset.src;
    const markLoaded = () => img.classList.add('is-loaded');
    img.addEventListener('load', markLoaded, { once: true });
    img.addEventListener('error', markLoaded, { once: true });
  };
  const deferredImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      loadDeferredImage(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -5% 0px' });
  deferredImages.forEach((img) => deferredImageObserver.observe(img));
}

const contactForm = document.querySelector('.contact-form');
const hero = document.querySelector('.hero');
const draggableCategories = document.querySelectorAll('.category-photo');
const workTrack = document.querySelector('.work-track');
const workCards = document.querySelectorAll('.work-card');

// heading stays left-aligned (like the link below it) — only the (much wider) photo above it
// shifts so its own horizontal center lines up with the heading's center
const contactTitle = document.getElementById('contact-title');
const contactFace = document.querySelector('.contact-face');
const centerContactFaceOnHeading = () => {
  contactFace.style.marginLeft = '0px';
  const headingWidth = contactTitle.getBoundingClientRect().width;
  const faceWidth = contactFace.getBoundingClientRect().width;
  const naturalLeft = contactFace.getBoundingClientRect().left;
  let margin = (headingWidth - faceWidth) / 2;
  const minLeft = 24; // never let the (much wider) photo bleed past the viewport/nav edge
  if (naturalLeft + margin < minLeft) margin += minLeft - (naturalLeft + margin);
  contactFace.style.marginLeft = `${margin}px`;
};
window.addEventListener('resize', centerContactFaceOnHeading);
centerContactFaceOnHeading();

// farthest sticker reach, in units of --logo-w / --logo-h, measured from the logo's own
// center: |offset fraction| + half the sticker's own width/height fraction of the logo —
// the assembled (pre-burst) glasses now reach further than any burst/final position does
const FACE_HORIZONTAL_REACH = 1.05; // assembled face-5
const FACE_VERTICAL_REACH = 0.7503; // burst face-1
const LOGO_ASPECT = 0.664; // --logo-h = --logo-w * LOGO_ASPECT
const EDGE_MARGIN = 12;

const fitHeroFaces = () => {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const gutterPx = parseFloat(getComputedStyle(hero).paddingLeft) || 0;

  const preferredLogoW = viewportW < 1080 ? viewportW * 0.84 : Math.min(rootPx * 44, viewportW * 0.59);
  const maxByWidth = (viewportW / 2 - gutterPx - EDGE_MARGIN) / FACE_HORIZONTAL_REACH;
  const maxByHeight = ((viewportH / 2 - EDGE_MARGIN) / FACE_VERTICAL_REACH) / LOGO_ASPECT;

  const safeLogoW = Math.max(0, Math.min(preferredLogoW, maxByWidth, maxByHeight));
  hero.style.setProperty('--logo-w', `${safeLogoW}px`);
};
window.addEventListener('resize', fitHeroFaces);
fitHeroFaces();

// the stickers stay assembled into two little faces (see the .hero .category.face-N
// rules in style.css) until the visitor actually scrolls — that first scroll bursts
// them apart into their scattered final spots, and the drag-hint swaps from
// "Portfolio" to the tagline at the same moment
const dragHint = document.querySelector('.category.drag-hint');
const dragHintInner = dragHint ? dragHint.querySelector('.category-inner') : null;
const HERO_BURST_MS = 900;

const triggerHeroBurst = () => {
  hero.classList.add('is-bursting', 'is-burst');

  if (dragHint && dragHintInner) {
    dragHint.classList.add('is-fading');
    setTimeout(() => {
      dragHintInner.textContent = "I could burst with joy that you made it to my page!";
      dragHint.classList.add('is-message');
      dragHint.classList.remove('is-fading');
    }, 260);
  }

  setTimeout(() => {
    hero.classList.remove('is-bursting');
    heroSettled = true;
    scheduleIdleWobble();
  }, HERO_BURST_MS);
};

// the first scroll gesture stays pinned on the hero — it triggers the burst but
// blocks the page from actually moving until the burst has finished settling,
// so the visitor sees the new sticker layout before scrolling continues on
let heroLocked = true;
let heroBurstStarted = false;
const releaseHeroLock = () => {
  heroLocked = false;
  window.removeEventListener('wheel', interceptHeroScroll);
  window.removeEventListener('touchmove', interceptHeroScroll);
  window.removeEventListener('keydown', interceptHeroKey);
};
const interceptHeroScroll = (event) => {
  if (!heroLocked) return;
  event.preventDefault();
  if (heroBurstStarted) return;
  heroBurstStarted = true;
  triggerHeroBurst();
  setTimeout(releaseHeroLock, HERO_BURST_MS);
};
const HERO_SCROLL_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'End']);
const interceptHeroKey = (event) => {
  if (!heroLocked || !HERO_SCROLL_KEYS.has(event.key)) return;
  interceptHeroScroll(event);
};
window.addEventListener('wheel', interceptHeroScroll, { passive: false });
window.addEventListener('touchmove', interceptHeroScroll, { passive: false });
window.addEventListener('keydown', interceptHeroKey);

// the wobble is the cue that the stickers are draggable — it only starts once
// the burst/explosion has actually happened (not during the assembled lead-in),
// then loops: every 2s of no interaction (scroll, click, drag, keypress) it
// wobbles again and re-arms itself, so it keeps going as long as the page sits
// idle, and any interaction resets the 2s countdown
const IDLE_WOBBLE_MS = 5000;
let heroSettled = false;
const wobbleStickers = () => {
  draggableCategories.forEach((category) => {
    const inner = category.querySelector('.category-inner');
    category.classList.add('wobble');
    inner.addEventListener('animationend', () => category.classList.remove('wobble'), { once: true });
  });
};
let idleWobbleTimer = null;
const scheduleIdleWobble = () => {
  if (!heroSettled) return;
  clearTimeout(idleWobbleTimer);
  idleWobbleTimer = setTimeout(() => {
    wobbleStickers();
    scheduleIdleWobble();
  }, IDLE_WOBBLE_MS);
};
window.addEventListener('scroll', scheduleIdleWobble, { passive: true });
window.addEventListener('pointerdown', scheduleIdleWobble);
window.addEventListener('keydown', scheduleIdleWobble);
window.addEventListener('wheel', scheduleIdleWobble, { passive: true });

// sticker PNGs are square/rectangular boxes with a lot of transparent padding around the
// actual drawn shape (glasses, mouth, ...) — without this, clicking anywhere in that empty
// corner still started a drag, since pointer events fire on the element's box, not its pixels
const loadAlphaMap = (img) => {
  const build = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      img.__alphaData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch (err) {
      img.__alphaData = null; // e.g. opened via file:// with a tainted canvas — skip the check
    }
  };
  if (img.complete && img.naturalWidth) build();
  else img.addEventListener('load', build, { once: true });
};

const isOnOpaquePixel = (img, clientX, clientY) => {
  if (!img.__alphaData) return true;
  const rect = img.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) * (img.naturalWidth / rect.width));
  const y = Math.floor((clientY - rect.top) * (img.naturalHeight / rect.height));
  if (x < 0 || y < 0 || x >= img.naturalWidth || y >= img.naturalHeight) return false;
  return img.__alphaData[(y * img.naturalWidth + x) * 4 + 3] >= 10;
};

const stickers = Array.from(draggableCategories).map((category) => {
  const inner = category.querySelector('.category-inner');
  loadAlphaMap(inner);
  return { category, inner, pos: { x: 0, y: 0 } };
});

// stickers overlap each other in the arrangement, so the topmost element at a given point
// isn't necessarily the one that's actually visible there — walk the full hit stack and drag
// whichever sticker is both under the cursor and opaque at that exact pixel
let activeDrag = null;

hero.addEventListener('pointerdown', (event) => {
  const stack = document.elementsFromPoint(event.clientX, event.clientY);
  const sticker = stack
    .map((el) => stickers.find((s) => s.inner === el))
    .find((s) => s && isOnOpaquePixel(s.inner, event.clientX, event.clientY));
  if (!sticker) return;
  event.preventDefault();
  activeDrag = {
    sticker,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPosX: sticker.pos.x,
    startPosY: sticker.pos.y,
  };
  sticker.category.classList.add('is-dragging');
  hero.setPointerCapture(event.pointerId);
});

hero.addEventListener('pointermove', (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  const { sticker } = activeDrag;
  sticker.pos.x = activeDrag.startPosX + (event.clientX - activeDrag.startX);
  sticker.pos.y = activeDrag.startPosY + (event.clientY - activeDrag.startY);
  // the individual `translate` property, not `transform: translate(...)` — the
  // wobble animates the individual `rotate` property on this same element, and
  // individual transform properties compose in a fixed, predictable order
  // (translate, then rotate, then scale) always pivoting around the element's
  // own center; mixing drag's translate into the `transform` property instead
  // would apply it in the rotated element's local frame, making the wobble's
  // pivot appear to swing around rather than stay centered on a dragged sticker
  sticker.inner.style.translate = `${sticker.pos.x}px ${sticker.pos.y}px`;
});

const endDrag = (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  activeDrag.sticker.category.classList.remove('is-dragging');
  hero.releasePointerCapture(event.pointerId);
  activeDrag = null;
};

hero.addEventListener('pointerup', endDrag);
hero.addEventListener('pointercancel', endDrag);

// filtering hides non-matching cards entirely (display:none), so the scroll-driven paging
// below always paces itself against the currently visible set, not the full original list
const getVisibleCards = () => Array.from(workCards).filter((card) => !card.classList.contains('is-hidden'));

// above the tablet/mobile breakpoint, the gallery is a static 3x2 grid — no
// "active" card to track. Below it, it's a plain side-by-side slider (script
// further down) that auto-advances on a timer instead.
const MOBILE_BREAKPOINT = 1080;
const isMobileWork = () => window.innerWidth < MOBILE_BREAKPOINT;
let mobileActiveIndex = 0;

const updateWorkSlider = () => {
  if (!isMobileWork() || !workTrack) return;
  const visible = getVisibleCards();
  const activeIndex = visible.length ? mobileActiveIndex % visible.length : -1;
  workTrack.style.transform = `translateX(-${Math.max(0, activeIndex) * 100}%)`;
};

// auto-advance: the mobile slider steps to the next visible card every 3s,
// starting 3s after load — scroll/resize still refresh the desktop version
const advanceMobileWorkSlider = () => {
  if (!isMobileWork()) return;
  const visible = getVisibleCards();
  if (!visible.length) return;
  mobileActiveIndex = (mobileActiveIndex + 1) % visible.length;
  updateWorkSlider();
};
// restartable so a manual swipe gets a fresh 3s before the next auto-step,
// instead of possibly auto-advancing again a moment later
let mobileAutoTimer = null;
const restartMobileAutoAdvance = () => {
  if (mobileAutoTimer) clearInterval(mobileAutoTimer);
  mobileAutoTimer = setInterval(advanceMobileWorkSlider, 3000);
};
restartMobileAutoAdvance();

// finger-swipe support for the mobile slider — desktop keeps its own
// scroll-jacked carousel and never fires pointer events on this element
const workSlider = document.querySelector('.work-slider');
let workDrag = null;
if (workSlider && workTrack) {
  workSlider.addEventListener('pointerdown', (event) => {
    if (!isMobileWork()) return;
    workDrag = { pointerId: event.pointerId, startX: event.clientX, deltaX: 0 };
    workTrack.style.transition = 'none';
    workSlider.setPointerCapture(event.pointerId);
  });
  workSlider.addEventListener('pointermove', (event) => {
    if (!workDrag || event.pointerId !== workDrag.pointerId) return;
    workDrag.deltaX = event.clientX - workDrag.startX;
    const activeIndex = Math.max(0, mobileActiveIndex);
    workTrack.style.transform = `translateX(calc(-${activeIndex * 100}% + ${workDrag.deltaX}px))`;
  });
  const endWorkDrag = (event) => {
    if (!workDrag || event.pointerId !== workDrag.pointerId) return;
    const visible = getVisibleCards();
    const threshold = workSlider.clientWidth * 0.15;
    workTrack.style.transition = '';
    if (visible.length && workDrag.deltaX <= -threshold) {
      mobileActiveIndex = (mobileActiveIndex + 1) % visible.length;
    } else if (visible.length && workDrag.deltaX >= threshold) {
      mobileActiveIndex = (mobileActiveIndex - 1 + visible.length) % visible.length;
    }
    workDrag = null;
    updateWorkSlider();
    restartMobileAutoAdvance();
  };
  workSlider.addEventListener('pointerup', endWorkDrag);
  workSlider.addEventListener('pointercancel', endWorkDrag);
}

window.addEventListener('resize', updateWorkSlider);
updateWorkSlider();

// category boxes are a single-select filter row; "All Projects" is the default/reset option
const filterButtons = document.querySelectorAll('.work-category-box');
let activeFilter = 'all';

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.filter === activeFilter));
    workCards.forEach((card) => {
      const cardCategories = card.dataset.category.split(' ');
      card.classList.toggle('is-hidden', activeFilter !== 'all' && !cardCategories.includes(activeFilter));
    });
    mobileActiveIndex = 0;
    updateWorkSlider();
  });
});

// mobile-only hamburger toggle for the top-bar nav; the button and dropdown
// are both display:none on desktop so this never has anything to do there
const siteNav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.nav-toggle');
if (siteNav && navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  siteNav.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  contactForm.querySelector('.form-status').textContent = "Thanks, I'll get back to you soon.";
  contactForm.reset();
});

// contrast-aware text color: rather than a hand-picked list of "dark"
// sections, this reads what's actually behind the nav — its background-color
// — and picks whichever of black/white gives the higher WCAG contrast ratio
const relativeLuminance = ([r, g, b]) => {
  const toLinear = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [rl, gl, bl] = [r, g, b].map(toLinear);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};
const contrastRatio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
const bestTextColor = (bgLuminance) =>
  (contrastRatio(bgLuminance, 1) > contrastRatio(bgLuminance, 0) ? '#fff' : '#000');
// the brand red is dark enough that black technically edges out white on
// contrast math, but white reads better against it here — an explicit,
// deliberate exception rather than a computed one
const isBrandRed = (colorStr) => {
  const m = colorStr.match(/[\d.]+/g);
  if (!m || m.length < 3) return false;
  const [r, g, b] = m.slice(0, 3).map(Number);
  return r > 180 && g < 100 && b < 80;
};
const averageLuminanceOfColor = (colorStr) => {
  const m = colorStr.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  return relativeLuminance(m.slice(0, 3).map(Number));
};

// most sections don't set their own background — they just show the page's
// paper color through — so a transparent computed color isn't "no color",
// it means keep looking up the tree for the color actually being painted
const effectiveBackgroundColor = (el) => {
  let node = el;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    const nums = bg.match(/[\d.]+/g);
    const isTransparent = !nums || (nums.length === 4 && Number(nums[3]) === 0);
    if (!isTransparent) return bg;
    node = node.parentElement;
  }
  return getComputedStyle(document.body).backgroundColor;
};

// the nav is fixed, so as the page scrolls, whichever top-level section sits
// behind its vertical center determines its color
const navEl = document.querySelector('.site-nav');
const contrastSections = Array.from(document.querySelectorAll('main > section'));
const updateNavTheme = () => {
  const rect = navEl.getBoundingClientRect();
  const y = rect.top + rect.height / 2;
  const section = contrastSections.find((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= y && r.bottom >= y;
  });
  if (!section) return;
  const bgColor = effectiveBackgroundColor(section);
  const luminance = averageLuminanceOfColor(bgColor);
  if (luminance === null) return;
  const textColor = isBrandRed(bgColor) ? '#fff' : bestTextColor(luminance);
  navEl.classList.toggle('on-dark', textColor === '#fff');
};
window.addEventListener('scroll', updateNavTheme, { passive: true });
window.addEventListener('resize', updateNavTheme);
updateNavTheme();
