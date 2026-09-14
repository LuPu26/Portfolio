// deferred images: no network request goes out until an image actually scrolls
// into view (see the img[data-src] placeholder in project.css for the shimmer
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
contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  contactForm.querySelector('.form-status').textContent = "Thanks, I'll get back to you soon.";
  contactForm.reset();
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

// reading-progress rail: fills top-to-bottom as you scroll through the page
const scrollProgressFill = document.querySelector('.scroll-progress-fill');
const updateScrollProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  scrollProgressFill.style.height = `${progress * 100}%`;
};
window.addEventListener('scroll', updateScrollProgress, { passive: true });
window.addEventListener('resize', updateScrollProgress);
updateScrollProgress();

// contrast-aware text color: rather than a hand-picked list of "dark"
// sections, this samples what's actually behind an element — a background
// photo's pixels, or a solid background-color — and picks whichever of
// black/white gives the higher WCAG contrast ratio against it
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

const sampleCanvas = document.createElement('canvas');
sampleCanvas.width = 16;
sampleCanvas.height = 16;
const sampleCtx = sampleCanvas.getContext('2d');

// maps a viewport rect onto an object-fit:cover image's natural pixels (using
// its current, already-transformed getBoundingClientRect, so parallax and
// responsive sizing are accounted for automatically) and averages that patch's
// raw color — luminance is computed afterwards, once any overlay is blended in
const averageColorOfImageRegion = (img, rect) => {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const imgRect = img.getBoundingClientRect();
  const scale = Math.max(imgRect.width / img.naturalWidth, imgRect.height / img.naturalHeight);
  const offsetX = imgRect.left - (img.naturalWidth * scale - imgRect.width) / 2;
  const offsetY = imgRect.top - (img.naturalHeight * scale - imgRect.height) / 2;
  const left = Math.max(rect.left, imgRect.left);
  const right = Math.min(rect.right, imgRect.right);
  const top = Math.max(rect.top, imgRect.top);
  const bottom = Math.min(rect.bottom, imgRect.bottom);
  if (right <= left || bottom <= top) return null;
  const sx = (left - offsetX) / scale;
  const sy = (top - offsetY) / scale;
  const sw = (right - left) / scale;
  const sh = (bottom - top) / scale;
  try {
    sampleCtx.clearRect(0, 0, 16, 16);
    sampleCtx.drawImage(img, sx, sy, sw, sh, 0, 0, 16, 16);
    const data = sampleCtx.getImageData(0, 0, 16, 16).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
    return [r / count, g / count, b / count];
  } catch (err) {
    return null; // tainted canvas — opening the page via file:// blocks pixel
    // readback even for a same-folder image, since Chrome treats every
    // file:// document as its own opaque origin; only matters offline, since
    // a real (http/https) host never triggers this
  }
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

// the nav is fixed, so as the page scrolls, whichever top-level section is
// behind its vertical center determines its color — a photo section gets
// sampled directly, everything else just reads its own background-color
const navEl = document.querySelector('.site-nav');
const contrastSections = Array.from(document.querySelectorAll('main > section, footer'));
const updateNavTheme = () => {
  const rect = navEl.getBoundingClientRect();
  const y = rect.top + rect.height / 2;
  const section = contrastSections.find((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= y && r.bottom >= y;
  });
  if (!section) return;
  // escape hatch for photos whose sampled patch is borderline but read
  // wrong in practice (e.g. knitting-blind's hero averages mid-bright even
  // though the nav clearly needs to read white against it)
  if (section.dataset.navForce === 'white') {
    navEl.classList.add('on-dark');
    return;
  }
  // the nav only ever sits in the hero's top portion, above where its dark
  // gradient overlay has faded out (see updateHeroContrast below), so a raw
  // pixel sample needs no blending here — unlike the hero text lower down
  const bgImg = section.querySelector('.hero-parallax img');
  const color = bgImg ? averageColorOfImageRegion(bgImg, rect) : null;
  let luminance = color ? relativeLuminance(color) : null;
  if (luminance === null && bgImg?.dataset.navLuminance) luminance = Number(bgImg.dataset.navLuminance);
  let forceWhite = false;
  if (luminance === null) {
    const bgColor = effectiveBackgroundColor(section);
    luminance = averageLuminanceOfColor(bgColor);
    forceWhite = isBrandRed(bgColor);
  }
  if (luminance === null) return;
  navEl.classList.toggle('on-dark', forceWhite || bestTextColor(luminance) === '#fff');
};
window.addEventListener('scroll', updateNavTheme, { passive: true });
window.addEventListener('resize', updateNavTheme);
updateNavTheme();

// same idea for the hero's own title/lead/tags: sampled against the exact
// patch of the hero photo sitting behind that text block. That patch also
// sits under .project-hero::before's dark gradient, which the canvas sample
// can't see (it only ever sees the raw <img> pixels) — so its contribution is
// blended in manually, in the same sRGB space the browser composites in,
// using the sample rect's own position within the gradient
const heroOverlay = document.querySelector('.hero-overlay');
const heroSection = document.querySelector('.project-hero');
const heroPhotoImg = document.querySelector('.project-hero .hero-parallax img');
const GRADIENT_RGB = [12, 7, 6];
const GRADIENT_MAX_ALPHA = 0.65;
const GRADIENT_FADE_FRACTION = 0.55; // fully transparent by 55% up from the hero's bottom
const blendGradientOverlay = (color, rect) => {
  const heroRect = heroSection.getBoundingClientRect();
  const centerY = (rect.top + rect.bottom) / 2;
  const fractionFromBottom = (heroRect.bottom - centerY) / heroRect.height;
  const alpha = fractionFromBottom >= GRADIENT_FADE_FRACTION
    ? 0
    : GRADIENT_MAX_ALPHA * (1 - fractionFromBottom / GRADIENT_FADE_FRACTION);
  return color.map((c, i) => GRADIENT_RGB[i] * alpha + c * (1 - alpha));
};
const updateHeroContrast = () => {
  if (!heroOverlay || !heroPhotoImg) return;
  const rect = heroOverlay.getBoundingClientRect();
  const rawColor = averageColorOfImageRegion(heroPhotoImg, rect);
  let luminance = rawColor ? relativeLuminance(blendGradientOverlay(rawColor, rect)) : null;
  if (luminance === null && heroPhotoImg.dataset.bgLuminance) luminance = Number(heroPhotoImg.dataset.bgLuminance);
  if (luminance === null) return;
  heroOverlay.classList.toggle('is-on-light', bestTextColor(luminance) === '#000');
};
window.addEventListener('scroll', updateHeroContrast, { passive: true });
window.addEventListener('resize', updateHeroContrast);
if (heroPhotoImg && !heroPhotoImg.complete) heroPhotoImg.addEventListener('load', updateHeroContrast);
updateHeroContrast();

// simple parallax drift on the hero photo: the oversized image trails the scroll
// position at a fraction of its speed, then stops once the hero scrolls out of view
const heroParallax = document.querySelector('.hero-parallax');
let ticking = false;
const updateParallax = () => {
  ticking = false;
  const heroHeight = heroSection.offsetHeight;
  const offset = Math.min(Math.max(window.scrollY, 0), heroHeight);
  heroParallax.style.transform = `translateY(${offset * 0.3}px)`;
};
window.addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(updateParallax);
  }
}, { passive: true });
window.addEventListener('resize', updateParallax);
updateParallax();

// click a slide to see it bigger, centered, over a dimmed backdrop
const lightbox = document.querySelector('.lightbox');
const lightboxImg = lightbox.querySelector('.lightbox-img');
const lightboxVideo = lightbox.querySelector('.lightbox-video');
const openLightbox = (slide) => {
  if (lightboxVideo) {
    lightboxVideo.pause();
    lightboxVideo.removeAttribute('src');
    lightboxVideo.hidden = true;
  }
  lightboxImg.hidden = false;
  lightboxImg.src = slide.src;
  lightboxImg.alt = slide.alt;
  lightbox.classList.add('is-open');
};
// same overlay, but for a phone-mockup video: plays the clip full-size and
// unmuted, with no phone frame around it
const openLightboxVideo = (video) => {
  lightboxImg.hidden = true;
  lightboxVideo.hidden = false;
  lightboxVideo.src = video.currentSrc || video.src;
  lightboxVideo.muted = false;
  lightboxVideo.play().catch(() => {});
  lightbox.classList.add('is-open');
};
const closeLightbox = () => {
  lightbox.classList.remove('is-open');
  if (lightboxVideo) lightboxVideo.pause();
};
lightbox.addEventListener('click', (event) => {
  if (event.target === lightboxVideo) return;
  closeLightbox();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
});

// any standalone reference image (not part of a slider) can opt into the
// same click-to-enlarge lightbox by carrying this class
document.querySelectorAll('.zoomable-image').forEach((img) => {
  img.addEventListener('click', () => openLightbox(img));
});

// tapping a phone-mockup video opens the same lightbox, minus the phone frame
document.querySelectorAll('.phone-video').forEach((video) => {
  video.addEventListener('click', () => openLightboxVideo(video));
});

// auto-advancing sliders: each .slider cycles its .slide children on its own
// timer (data-interval, ms), crossfading via the .is-active class. the arrow
// buttons step manually and reset the timer; clicking the current slide opens it
document.querySelectorAll('.slider').forEach((slider) => {
  const slides = Array.from(slider.querySelectorAll('.slide'));
  if (slides.length < 2) return;
  const interval = Number(slider.dataset.interval) || 4000;
  let current = slides.findIndex((slide) => slide.classList.contains('is-active'));
  if (current === -1) current = 0;
  let timer;

  const show = (index) => {
    slides[current].classList.remove('is-active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('is-active');
  };
  const restart = () => {
    clearInterval(timer);
    timer = setInterval(() => show(current + 1), interval);
  };

  slider.querySelector('.slider-arrow.prev').addEventListener('click', () => {
    show(current - 1);
    restart();
  });
  slider.querySelector('.slider-arrow.next').addEventListener('click', () => {
    show(current + 1);
    restart();
  });
  slides.forEach((slide) => slide.addEventListener('click', () => openLightbox(slide)));

  restart();
});

// belt-and-suspenders: the autoplay attribute alone sometimes doesn't kick
// in (e.g. a large local file not yet ready at parse time), so also ask
// each phone-mockup video to play explicitly once it's loaded
document.querySelectorAll('.phone-video').forEach((video) => {
  const tryPlay = () => video.play().catch(() => {});
  if (video.readyState >= 2) tryPlay();
  else video.addEventListener('loadeddata', tryPlay, { once: true });
});

// phone-mockup videos autoplay muted (a browser requirement) — this icon is
// the one explicit opt-in to sound. It always shows what tapping it will do
// next: a pulsing speaker while muted (tap to turn sound on), a still,
// crossed-out speaker once sound is on (tap to mute again)
document.querySelectorAll('.phone-sound-toggle').forEach((button) => {
  const video = document.querySelector(button.dataset.target);
  if (!video) return;
  const sync = () => {
    const on = !video.muted;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Mute sound' : 'Turn sound on');
  };
  button.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) video.play();
    sync();
  });
  sync();
});
