/* lightbox.js
   Projects page: click a figure to see it large. Previous/next move through the
   figures of the same project (keys, buttons or swipe). Vanilla JS, native <dialog>.
   The <img> tags in the HTML stay as they are: this script wraps each one in a button.
   Optional: give an <img> a data-full="path/to/larger-file.png" to show a higher-resolution
   version in the viewer while the strip keeps the light one. */
(() => {
  'use strict';

  const strips = document.querySelectorAll('.figure-strip');
  if (!strips.length || typeof HTMLDialogElement !== 'function') return;

  // ==== VIEWER (built once) ===============================================

  const ICON = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = `
    <button type="button" class="lb-btn lb-close" aria-label="Close">${icon('close')}</button>
    <button type="button" class="lb-btn lb-prev" aria-label="Previous figure">${icon('prev')}</button>
    <button type="button" class="lb-btn lb-next" aria-label="Next figure">${icon('next')}</button>
    <figure class="lb-figure">
      <img class="lb-img" alt="">
      <figcaption class="lb-caption"><span class="lb-text"></span><span class="lb-count"></span></figcaption>
    </figure>`;
  document.body.append(dialog);

  const view = dialog.querySelector('.lb-img');
  const text = dialog.querySelector('.lb-text');
  const count = dialog.querySelector('.lb-count');

  let thumbs = [];   // the <img> elements of the strip being viewed
  let buttons = [];  // their wrapper buttons (focus goes back to one of them on close)
  let current = 0;

  const fullSrc = img => img.dataset.full || img.currentSrc || img.src;

  function show(n) {
    current = (n + thumbs.length) % thumbs.length;   // wraps around at both ends
    const img = thumbs[current];
    view.src = fullSrc(img);
    view.alt = img.alt;
    text.textContent = img.alt;
    count.textContent = `${current + 1} / ${thumbs.length}`;
    [current - 1, current + 1].forEach(k => {       // warm the neighbours so the next click is instant
      const near = thumbs[(k + thumbs.length) % thumbs.length];
      if (near && near !== img) new Image().src = fullSrc(near);
    });
  }

  const step = d => show(current + d);

  // ---- page scroll lock, without the page jumping sideways when the scrollbar disappears
  const root = document.documentElement;
  function lockScroll() {
    const bar = window.innerWidth - root.clientWidth;
    if (bar > 0) root.style.paddingRight = `${bar}px`;
    root.classList.add('lb-open');
  }
  function unlockScroll() {
    root.classList.remove('lb-open');
    root.style.paddingRight = '';
  }

  function open(strip, imgs, btns, n) {
    thumbs = imgs;
    buttons = btns;
    dialog.setAttribute('aria-label', strip.getAttribute('aria-label') || 'Figure viewer');
    dialog.classList.toggle('lb-single', imgs.length < 2);
    show(n);
    lockScroll();
    dialog.showModal();
  }

  dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.lb-prev').addEventListener('click', () => step(-1));
  dialog.querySelector('.lb-next').addEventListener('click', () => step(1));

  // a click on the dark area (not on the image, its caption or a button) closes the viewer
  dialog.addEventListener('click', e => {
    if (!e.target.closest('.lb-btn, .lb-img, .lb-caption')) dialog.close();
  });

  // arrow keys work whenever the viewer is open, wherever the focus is
  document.addEventListener('keydown', e => {
    if (!dialog.open || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  });

  // swipe left/right on touch screens (ignored while the page is pinch-zoomed)
  let startX = null;
  dialog.addEventListener('touchstart', e => {
    startX = e.touches.length === 1 ? e.touches[0].clientX : null;
  }, { passive: true });
  dialog.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    const zoomed = window.visualViewport && window.visualViewport.scale > 1.01;
    if (!zoomed && Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Esc, the close button and the dark area all end up here
  dialog.addEventListener('close', () => {
    unlockScroll();
    view.removeAttribute('src');
    if (buttons[current]) buttons[current].focus();   // back to the figure you were looking at
  });

  // ==== THUMBNAILS: wrap each image of every strip in a button ==============

  strips.forEach(strip => {
    const imgs = [...strip.querySelectorAll('img')];
    const btns = imgs.map((img, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'figure-btn';
      btn.setAttribute('aria-label', `Enlarge: ${img.alt}`);
      btn.setAttribute('aria-haspopup', 'dialog');
      img.before(btn);
      btn.append(img);
      btn.addEventListener('click', () => open(strip, imgs, btns, i));
      return btn;
    });
    strip.removeAttribute('tabindex');   // the buttons are now the focusable, scrollable-into-view items
  });
})();
